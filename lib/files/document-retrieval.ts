import { ConversationDocument, DocumentRetrievalResult, QueryIntent } from "./document-types";
import { ConversationDocumentStore } from "./document-store";

export class DocumentRetrievalService {
  /**
   * Classifies user query intent.
   */
  static classifyIntent(query: string): QueryIntent {
    const q = query.toLowerCase().trim();

    if (/\b(that module|this module|second option|first option|what about|tell me more|furthermore|regarding that)\b/i.test(q)) {
      return "follow_up";
    }
    if (/\b(summarize|summary|overview|tldr|tl;dr|high-level|synopsis)\b/i.test(q)) {
      return "summarization";
    }
    if (/\b(compare|comparison|difference|differences|versus|vs|how does .* differ)\b/i.test(q)) {
      return "comparison";
    }
    if (/\b(extract|acceptance criteria|criteria|all modules|all requirements|list of|names of|dates)\b/i.test(q)) {
      return "information_extraction";
    }
    if (/\b(table|checklist|tabular|spreadsheet view|matrix)\b/i.test(q)) {
      return "lists_and_tables";
    }
    if (/\b(steps|step-by-step|roadmap|sequence|phase|procedure|workflow|how do we implement)\b/i.test(q)) {
      return "step_by_step";
    }
    if (/\b(why is|why are|explain|what does .* mean|clarify|elaborate)\b/i.test(q)) {
      return "explanation";
    }
    if (/\b(analyze|analysis|risks|gaps|what is missing|dependencies|trade-offs)\b/i.test(q)) {
      return "analysis";
    }
    if (/\b(recommend|recommendation|recommendations|simplify|what should we|suggestions|advice)\b/i.test(q)) {
      return "recommendation";
    }
    if (/\b(it|next|why is this)\b/i.test(q)) {
      return "follow_up";
    }

    return "question_answering";
  }

  /**
   * Resolves the target document for the active query and conversation context.
   */
  static resolveTargetDocument(params: {
    query: string;
    conversationId: string;
    userId?: string;
    directDocuments?: ConversationDocument[];
  }): { document: ConversationDocument | null; isAmbiguous: boolean; candidateDocs: ConversationDocument[] } {
    const { query, conversationId, userId, directDocuments } = params;

    // 1. Gather all active documents in this conversation
    const storedDocs = ConversationDocumentStore.getActiveDocuments(conversationId, userId);
    const allCandidates = directDocuments && directDocuments.length > 0 ? directDocuments : storedDocs;

    if (allCandidates.length === 0) {
      return { document: null, isAmbiguous: false, candidateDocs: [] };
    }

    if (allCandidates.length === 1) {
      return { document: allCandidates[0], isAmbiguous: false, candidateDocs: allCandidates };
    }

    // 2. If multiple documents exist, check if query specifically mentions a filename or title
    const qLower = query.toLowerCase();
    const explicitMatch = allCandidates.find((d) => {
      const baseName = d.fileName.toLowerCase().replace(/\.[^/.]+$/, "");
      return qLower.includes(d.fileName.toLowerCase()) || qLower.includes(baseName);
    });

    if (explicitMatch) {
      return { document: explicitMatch, isAmbiguous: false, candidateDocs: allCandidates };
    }

    // Check for distinct keywords in document titles (e.g. "daztrix" vs "quantum")
    const keywordMatches = allCandidates.filter((d) => {
      const words = d.fileName.toLowerCase().replace(/[^a-z0-9]/g, " ").split(/\s+/).filter((w) => w.length > 3);
      return words.some((w) => qLower.includes(w));
    });

    if (keywordMatches.length === 1) {
      return { document: keywordMatches[0], isAmbiguous: false, candidateDocs: allCandidates };
    }

    // Multiple documents are available and query does not specify which
    return { document: null, isAmbiguous: true, candidateDocs: allCandidates };
  }

  /**
   * Retrieves relevant sections and constructs the grounded prompt context for AI completion.
   */
  static processDocumentContext(params: {
    query: string;
    conversationId: string;
    userId?: string;
    directDocuments?: ConversationDocument[];
  }): DocumentRetrievalResult {
    const { query, conversationId, userId, directDocuments } = params;
    const intent = this.classifyIntent(query);

    const { document, isAmbiguous, candidateDocs } = this.resolveTargetDocument({
      query,
      conversationId,
      userId,
      directDocuments,
    });

    // 1. Ambiguity case: Multiple files available and target is unclear
    if (isAmbiguous) {
      const docList = candidateDocs.map((d) => `• ${d.fileName} (${d.structure.sections.length} sections)`).join("\n");
      const clarificationPrompt = `I noticed multiple documents are active in this conversation:\n${docList}\n\nWhich document would you like me to answer from? (Or specify if you'd like a comparison).`;
      return {
        targetDocument: null,
        intent,
        mode: "clarification_needed",
        retrievedSections: [],
        clarificationPrompt,
        groundedSystemPrompt: `[DOCUMENT AMBIGUITY NOTICE: Multiple documents are available. Ask the user for clarification before answering.]`,
      };
    }

    // 2. No document active
    if (!document) {
      return {
        targetDocument: null,
        intent,
        mode: "no_document",
        retrievedSections: [],
        groundedSystemPrompt: "",
      };
    }

    // 3. For small and medium documents (< 40,000 words), provide the complete document
    // This guarantees 100% context coverage without dropping tables, lists, or dependencies.
    const isFullDocAppropriate =
      document.structure.wordCount < 40000 ||
      intent === "summarization" ||
      intent === "comparison" ||
      intent === "analysis" ||
      query.toLowerCase().includes("all") ||
      query.toLowerCase().includes("complete");

    if (isFullDocAppropriate) {
      const groundedPrompt = this.buildFullDocumentPrompt(document, intent, query);
      return {
        targetDocument: document,
        intent,
        mode: "full_document",
        retrievedSections: document.structure.sections.map((s) => ({
          heading: s.heading,
          content: s.content,
          relevanceScore: 1.0,
          pageNumber: s.pageNumber,
        })),
        groundedSystemPrompt: groundedPrompt,
      };
    }

    // 4. For very large documents, perform targeted section retrieval
    const relevantSections = this.retrieveRelevantSections(document, query);
    const targetedPrompt = this.buildTargetedSectionsPrompt(document, relevantSections, intent, query);

    return {
      targetDocument: document,
      intent,
      mode: "targeted_sections",
      retrievedSections: relevantSections,
      groundedSystemPrompt: targetedPrompt,
    };
  }

  /**
   * Retrieves the most relevant sections for a specific query from a document.
   */
  private static retrieveRelevantSections(
    document: ConversationDocument,
    query: string
  ): Array<{ heading: string; content: string; relevanceScore: number; pageNumber?: number }> {
    const qTokens = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scored = document.structure.sections.map((sec) => {
      const headingLower = sec.heading.toLowerCase();
      const contentLower = sec.content.toLowerCase();

      let headingMatches = 0;
      let contentMatches = 0;

      for (const token of qTokens) {
        if (headingLower.includes(token)) headingMatches += 3; // Boost heading match
        if (contentLower.includes(token)) contentMatches += 1;
      }

      const totalMatches = headingMatches + contentMatches;
      const score = qTokens.length > 0 ? totalMatches / (qTokens.length * 2) : 0;

      return {
        heading: sec.heading,
        content: sec.content,
        relevanceScore: Math.min(1.0, parseFloat(score.toFixed(2))),
        pageNumber: sec.pageNumber,
      };
    });

    // Sort by relevance score descending
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Pick top 5 matching sections, or fallback to first 3 if low scores
    const topScored = scored.filter((s) => s.relevanceScore > 0.15).slice(0, 5);
    if (topScored.length === 0) {
      return scored.slice(0, 3);
    }
    return topScored;
  }

  /**
   * Constructs an authoritative grounded system prompt containing the full document.
   */
  private static buildFullDocumentPrompt(
    document: ConversationDocument,
    intent: QueryIntent,
    query: string
  ): string {
    return [
      `=== AUTHORITATIVE USER-UPLOADED DOCUMENT CONTEXT ===`,
      `Document Name: ${document.fileName}`,
      `Document Version: ${document.version}`,
      `File Size: ${(document.fileSizeBytes / 1024).toFixed(1)} KB`,
      `Headings Outline: ${document.structure.headings.map((h) => h.title).join(" > ")}`,
      ``,
      `--- START OF DOCUMENT CONTENT: ${document.fileName} ---`,
      document.fullText,
      `--- END OF DOCUMENT CONTENT: ${document.fileName} ---`,
      ``,
      `=== CRITICAL SYSTEM DIRECTIVES FOR DOCUMENT GROUNDING ===`,
      `1. GROUNDING & FIDELITY:`,
      `   - Ground your answer strictly and truthfully in the uploaded document above.`,
      `   - Preserve the exact terminology, facts, priorities (e.g. P0, P1, P2), module names, and technical criteria stated in the document.`,
      `   - Do NOT invent, assume, or hallucinate facts, statistics, quotations, or features not present in the document.`,
      ``,
      `2. MISSING INFORMATION HANDLING:`,
      `   - If the user asks about a detail, feature, or fact that is NOT mentioned in the document, explicitly say:`,
      `     "This information is not specified in the uploaded document."`,
      `   - Do not attempt to guess or fill gaps with unverified assumptions.`,
      ``,
      `3. QUESTION-SPECIFIC FORMATTING:`,
      `   - Answer the EXACT question asked (${intent}). Do NOT force every question into a generic summary format.`,
      `   - If asked for a list or table, format clearly using Markdown bullet points or tables.`,
      `   - If asked for an explanation or comparison, directly address the comparison points.`,
      `   - If asked for step-by-step guidance, follow the documented sequence.`,
      ``,
      `4. CONTENT DISTINCTION & LABELS:`,
      `   - Clearly distinguish between:`,
      `     * Document content: What the file explicitly states.`,
      `     * Inference: A reasonable deduction derived from the file.`,
      `     * Recommendation: Additional advice requested by the user beyond what the document states.`,
      `     * External information: If external search was specifically requested.`,
      `======================================================`,
    ].join("\n");
  }

  /**
   * Constructs a grounded prompt containing targeted retrieved sections.
   */
  private static buildTargetedSectionsPrompt(
    document: ConversationDocument,
    sections: Array<{ heading: string; content: string; relevanceScore: number; pageNumber?: number }>,
    intent: QueryIntent,
    query: string
  ): string {
    const formattedSections = sections
      .map(
        (s, i) =>
          `[Section ${i + 1}: ${s.heading}${s.pageNumber ? ` (Page ${s.pageNumber})` : ""}]\n${s.content}`
      )
      .join("\n\n");

    return [
      `=== TARGETED RETRIEVED DOCUMENT SECTIONS ===`,
      `Source Document: ${document.fileName} (v${document.version})`,
      `Document Overview Summary: ${document.summary}`,
      ``,
      `--- RELEVANT RETRIEVED SECTIONS ---`,
      formattedSections,
      `--- END RETRIEVED SECTIONS ---`,
      ``,
      `=== CRITICAL SYSTEM DIRECTIVES ===`,
      `1. Answer the user's specific question (${intent}) strictly using the retrieved sections above.`,
      `2. If the answer is not contained in these sections, state: "This information is not specified in the uploaded document."`,
      `3. Preserve exact module names, priorities, and criteria.`,
      `4. Answer the specific question asked without unnecessary preamble.`,
      `==========================================`,
    ].join("\n");
  }
}

