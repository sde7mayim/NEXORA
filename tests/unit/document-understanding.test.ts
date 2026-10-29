import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { DocumentParser } from "../../lib/files/document-parser";
import { ConversationDocumentStore } from "../../lib/files/document-store";
import { DocumentRetrievalService } from "../../lib/files/document-retrieval";
import { ConversationStore } from "../../lib/chat/conversation-store";

describe("Document Understanding & Context-Aware QA Engine", () => {
  const daztrixPath = path.resolve(__dirname, "../fixtures/Daztrix ERP Mobile Web Complete Plan.md");
  const quantumPath = path.resolve(__dirname, "../fixtures/Quantum Computing Architecture.md");

  const daztrixContent = fs.readFileSync(daztrixPath, "utf-8");
  const quantumContent = fs.readFileSync(quantumPath, "utf-8");

  beforeEach(() => {
    ConversationDocumentStore.clearAll();
    ConversationStore.clearUserConversations("test_user@nexora.ai");
  });

  // =========================================================================
  // SCENARIO 1: Document Parsing & Structure Extraction
  // =========================================================================
  it("Scenario 1: parses Markdown documents extracting headings, sections, tables, and summary", () => {
    const uint8 = new TextEncoder().encode(daztrixContent);
    const parsed = DocumentParser.parse(uint8, "Daztrix ERP Mobile Web Complete Plan.md");

    expect(parsed.fileType).toBe("markdown");
    expect(parsed.fullText).toContain("Daztrix Enterprise Resource Planning (ERP)");
    expect(parsed.structure.sections.length).toBeGreaterThanOrEqual(7);
    expect(parsed.structure.headings.some((h) => h.title.includes("Executive Summary & Purpose"))).toBe(true);
    expect(parsed.structure.headings.some((h) => h.title.includes("Module Breakdown & Prioritization Matrix"))).toBe(true);
    expect(parsed.structure.tablesCount).toBeGreaterThanOrEqual(1);
    expect(parsed.summary).toContain("Daztrix");
  });

  // =========================================================================
  // SCENARIO 2: Summarization Intent & Grounded Prompt
  // =========================================================================
  it("Scenario 2: classifies summarization queries and constructs grounded context", () => {
    const convId = "conv-sum-1";
    const uint8 = new TextEncoder().encode(daztrixContent);
    const parsed = DocumentParser.parse(uint8, "Daztrix ERP Mobile Web Complete Plan.md");

    ConversationDocumentStore.addDocument({
      conversationId: convId,
      userId: "test_user@nexora.ai",
      fileName: "Daztrix ERP Mobile Web Complete Plan.md",
      fileSizeBytes: uint8.length,
      mimeType: "text/markdown",
      fileType: "markdown",
      fullText: parsed.fullText,
      summary: parsed.summary,
      structure: parsed.structure,
    });

    const intent = DocumentRetrievalService.classifyIntent("Can you give me an executive summary of the Daztrix ERP plan?");
    expect(intent).toBe("summarization");

    const result = DocumentRetrievalService.processDocumentContext({
      query: "Can you give me an executive summary of the Daztrix ERP plan?",
      conversationId: convId,
      userId: "test_user@nexora.ai",
    });

    expect(result.mode).toBe("full_document");
    expect(result.targetDocument?.fileName).toBe("Daztrix ERP Mobile Web Complete Plan.md");
    expect(result.groundedSystemPrompt).toContain("=== AUTHORITATIVE USER-UPLOADED DOCUMENT CONTEXT ===");
    expect(result.groundedSystemPrompt).toContain("Daztrix Enterprise Resource Planning (ERP)");
    expect(result.groundedSystemPrompt).toContain("GROUNDING & FIDELITY");
  });

  // =========================================================================
  // SCENARIO 3: Specific Question Answering (Facts, Priorities, Features)
  // =========================================================================
  it("Scenario 3: handles specific fact & priority retrieval (e.g. highest priority modules)", () => {
    const convId = "conv-qa-1";
    const uint8 = new TextEncoder().encode(daztrixContent);
    const parsed = DocumentParser.parse(uint8, "Daztrix ERP Mobile Web Complete Plan.md");

    ConversationDocumentStore.addDocument({
      conversationId: convId,
      userId: "test_user@nexora.ai",
      fileName: "Daztrix ERP Mobile Web Complete Plan.md",
      fileSizeBytes: uint8.length,
      mimeType: "text/markdown",
      fileType: "markdown",
      fullText: parsed.fullText,
      summary: parsed.summary,
      structure: parsed.structure,
    });

    const query = "Which modules have the highest priority in the Daztrix ERP plan?";
    const intent = DocumentRetrievalService.classifyIntent(query);
    expect(intent).toBe("question_answering");

    const result = DocumentRetrievalService.processDocumentContext({
      query,
      conversationId: convId,
      userId: "test_user@nexora.ai",
    });

    expect(result.targetDocument).not.toBeNull();
    // Verify priority matrix is present in grounded prompt
    expect(result.groundedSystemPrompt).toContain("Authentication & RBAC");
    expect(result.groundedSystemPrompt).toContain("P0");
    expect(result.groundedSystemPrompt).toContain("Inventory Management");
    expect(result.groundedSystemPrompt).toContain("P1");
  });

  // =========================================================================
  // SCENARIO 4: Information Extraction (Lists, Benchmarks, Acceptance Criteria)
  // =========================================================================
  it("Scenario 4: classifies information extraction and preserves acceptance criteria & performance benchmarks", () => {
    const convId = "conv-extract-1";
    const uint8 = new TextEncoder().encode(daztrixContent);
    const parsed = DocumentParser.parse(uint8, "Daztrix ERP Mobile Web Complete Plan.md");

    ConversationDocumentStore.addDocument({
      conversationId: convId,
      userId: "test_user@nexora.ai",
      fileName: "Daztrix ERP Mobile Web Complete Plan.md",
      fileSizeBytes: uint8.length,
      mimeType: "text/markdown",
      fileType: "markdown",
      fullText: parsed.fullText,
      summary: parsed.summary,
      structure: parsed.structure,
    });

    const query = "Extract all acceptance criteria and latency benchmarks from the document";
    const intent = DocumentRetrievalService.classifyIntent(query);
    expect(intent).toBe("information_extraction");

    const result = DocumentRetrievalService.processDocumentContext({
      query,
      conversationId: convId,
      userId: "test_user@nexora.ai",
    });

    expect(result.groundedSystemPrompt).toContain("Barcode Scan Latency");
    expect(result.groundedSystemPrompt).toContain("200 milliseconds");
    expect(result.groundedSystemPrompt).toContain("Offline Sync Recovery");
    expect(result.groundedSystemPrompt).toContain("1,000 pending offline mutations");
    expect(result.groundedSystemPrompt).toContain("500 concurrent order placements");
  });

  // =========================================================================
  // SCENARIO 5: Explanations (Architectural Decisions & Rationales)
  // =========================================================================
  it("Scenario 5: targets architectural rationale when explaining why a module was prioritized", () => {
    const convId = "conv-exp-1";
    const uint8 = new TextEncoder().encode(daztrixContent);
    const parsed = DocumentParser.parse(uint8, "Daztrix ERP Mobile Web Complete Plan.md");

    ConversationDocumentStore.addDocument({
      conversationId: convId,
      userId: "test_user@nexora.ai",
      fileName: "Daztrix ERP Mobile Web Complete Plan.md",
      fileSizeBytes: uint8.length,
      mimeType: "text/markdown",
      fileType: "markdown",
      fullText: parsed.fullText,
      summary: parsed.summary,
      structure: parsed.structure,
    });

    const query = "Why is Authentication prioritized at P0 and Inventory at P1?";
    const intent = DocumentRetrievalService.classifyIntent(query);
    expect(intent).toBe("explanation");

    const result = DocumentRetrievalService.processDocumentContext({
      query,
      conversationId: convId,
      userId: "test_user@nexora.ai",
    });

    expect(result.groundedSystemPrompt).toContain("Why Authentication is Prioritized at P0");
    expect(result.groundedSystemPrompt).toContain("Why Inventory Management is Prioritized at P1");
    expect(result.groundedSystemPrompt).toContain("irreversible security and data isolation risks");
  });

  // =========================================================================
  // SCENARIO 6: Architectural Comparisons (Web vs Mobile Responsibilities)
  // =========================================================================
  it("Scenario 6: identifies comparison intent and supplies both comparison scopes", () => {
    const convId = "conv-comp-1";
    const uint8 = new TextEncoder().encode(daztrixContent);
    const parsed = DocumentParser.parse(uint8, "Daztrix ERP Mobile Web Complete Plan.md");

    ConversationDocumentStore.addDocument({
      conversationId: convId,
      userId: "test_user@nexora.ai",
      fileName: "Daztrix ERP Mobile Web Complete Plan.md",
      fileSizeBytes: uint8.length,
      mimeType: "text/markdown",
      fileType: "markdown",
      fullText: parsed.fullText,
      summary: parsed.summary,
      structure: parsed.structure,
    });

    const query = "Compare the architectural responsibilities of the Web Enterprise Core versus Mobile Operations Suite";
    const intent = DocumentRetrievalService.classifyIntent(query);
    expect(intent).toBe("comparison");

    const result = DocumentRetrievalService.processDocumentContext({
      query,
      conversationId: convId,
      userId: "test_user@nexora.ai",
    });

    expect(result.groundedSystemPrompt).toContain("Web Enterprise Core Responsibilities");
    expect(result.groundedSystemPrompt).toContain("Master Data Management");
    expect(result.groundedSystemPrompt).toContain("Mobile Operations Suite Responsibilities");
    expect(result.groundedSystemPrompt).toContain("Barcode & RFID Scanning");
    expect(result.groundedSystemPrompt).toContain("Offline Data Sync");
  });

  // =========================================================================
  // SCENARIO 7: Scope Control & Recommendations
  // =========================================================================
  it("Scenario 7: captures documented scope control recommendations and enforces recommendation boundaries", () => {
    const convId = "conv-rec-1";
    const uint8 = new TextEncoder().encode(daztrixContent);
    const parsed = DocumentParser.parse(uint8, "Daztrix ERP Mobile Web Complete Plan.md");

    ConversationDocumentStore.addDocument({
      conversationId: convId,
      userId: "test_user@nexora.ai",
      fileName: "Daztrix ERP Mobile Web Complete Plan.md",
      fileSizeBytes: uint8.length,
      mimeType: "text/markdown",
      fileType: "markdown",
      fullText: parsed.fullText,
      summary: parsed.summary,
      structure: parsed.structure,
    });

    const query = "What architectural simplification recommendations are documented to control scope?";
    const intent = DocumentRetrievalService.classifyIntent(query);
    expect(intent).toBe("recommendation");

    const result = DocumentRetrievalService.processDocumentContext({
      query,
      conversationId: convId,
      userId: "test_user@nexora.ai",
    });

    expect(result.groundedSystemPrompt).toContain("Scope Control & Architectural Simplification Recommendations");
    expect(result.groundedSystemPrompt).toContain("Unified API Gateway");
    expect(result.groundedSystemPrompt).toContain("Differential Delta Replication");
    expect(result.groundedSystemPrompt).toContain("Phased Offline Capability");
    // Directives should mandate distinguishing documented vs external recommendations
    expect(result.groundedSystemPrompt).toContain("CONTENT DISTINCTION & LABELS");
  });

  // =========================================================================
  // SCENARIO 8: Step-by-Step Implementation Sequence
  // =========================================================================
  it("Scenario 8: extracts step-by-step implementation phases in structured sequence", () => {
    const convId = "conv-seq-1";
    const uint8 = new TextEncoder().encode(daztrixContent);
    const parsed = DocumentParser.parse(uint8, "Daztrix ERP Mobile Web Complete Plan.md");

    ConversationDocumentStore.addDocument({
      conversationId: convId,
      userId: "test_user@nexora.ai",
      fileName: "Daztrix ERP Mobile Web Complete Plan.md",
      fileSizeBytes: uint8.length,
      mimeType: "text/markdown",
      fileType: "markdown",
      fullText: parsed.fullText,
      summary: parsed.summary,
      structure: parsed.structure,
    });

    const query = "What are the step-by-step implementation phases and sequence for the rollout?";
    const intent = DocumentRetrievalService.classifyIntent(query);
    expect(intent).toBe("step_by_step");

    const result = DocumentRetrievalService.processDocumentContext({
      query,
      conversationId: convId,
      userId: "test_user@nexora.ai",
    });

    expect(result.groundedSystemPrompt).toContain("Phase 1: Foundational Core (Weeks 1 - 12)");
    expect(result.groundedSystemPrompt).toContain("Phase 2: Operations & Fulfillment (Weeks 13 - 24)");
    expect(result.groundedSystemPrompt).toContain("Phase 3: Finance & Ecosystem Integration (Weeks 25 - 36)");
  });

  // =========================================================================
  // SCENARIO 9: Handling Missing Information (Anti-Hallucination Directive)
  // =========================================================================
  it("Scenario 9: explicitly includes strict instructions to say 'This information is not specified in the uploaded document' for unmentioned topics", () => {
    const convId = "conv-missing-1";
    const uint8 = new TextEncoder().encode(daztrixContent);
    const parsed = DocumentParser.parse(uint8, "Daztrix ERP Mobile Web Complete Plan.md");

    ConversationDocumentStore.addDocument({
      conversationId: convId,
      userId: "test_user@nexora.ai",
      fileName: "Daztrix ERP Mobile Web Complete Plan.md",
      fileSizeBytes: uint8.length,
      mimeType: "text/markdown",
      fileType: "markdown",
      fullText: parsed.fullText,
      summary: parsed.summary,
      structure: parsed.structure,
    });

    const query = "Does Daztrix ERP support autonomous drone deliveries and cryptocurrency payments?";
    const result = DocumentRetrievalService.processDocumentContext({
      query,
      conversationId: convId,
      userId: "test_user@nexora.ai",
    });

    expect(result.groundedSystemPrompt).toContain('This information is not specified in the uploaded document.');
    expect(result.groundedSystemPrompt).toContain("Do NOT invent, assume, or hallucinate facts");
  });

  // =========================================================================
  // SCENARIO 10: Follow-up Questions & Multi-Turn Persistence
  // =========================================================================
  it("Scenario 10: retains document context across multi-turn conversation without forcing re-upload", () => {
    const convId = "conv-turn-1";
    const userEmail = "test_user@nexora.ai";

    // 1. Initial message with attachment
    const newConv = ConversationStore.createConversation("Daztrix Discussion", "nexora-core", userEmail);
    const userMsg1 = {
      id: "msg_1",
      role: "user" as const,
      content: "Here is the implementation plan for Daztrix ERP.",
      createdAt: new Date().toISOString(),
      attachments: [
        {
          name: "Daztrix ERP Mobile Web Complete Plan.md",
          size: daztrixContent.length,
          content: daztrixContent,
          mimeType: "text/markdown",
        },
      ],
    };
    ConversationStore.saveMessage(newConv.id, userMsg1, userEmail);

    // Verify document is now registered in conversation store
    const activeDocs = ConversationStore.getActiveDocuments(newConv.id, userEmail);
    expect(activeDocs.length).toBe(1);
    expect(activeDocs[0].fileName).toBe("Daztrix ERP Mobile Web Complete Plan.md");

    // Also register in ConversationDocumentStore (as /api/chat does on ingestion)
    const uint8 = new TextEncoder().encode(daztrixContent);
    const parsed = DocumentParser.parse(uint8, "Daztrix ERP Mobile Web Complete Plan.md");
    ConversationDocumentStore.addDocument({
      conversationId: newConv.id,
      userId: userEmail,
      fileName: "Daztrix ERP Mobile Web Complete Plan.md",
      fileSizeBytes: uint8.length,
      mimeType: "text/markdown",
      fileType: "markdown",
      fullText: parsed.fullText,
      summary: parsed.summary,
      structure: parsed.structure,
    });

    // 2. Follow-up question without re-uploading file
    const followUpQuery = "What about the estimated timeline for Phase 2?";
    const intent = DocumentRetrievalService.classifyIntent(followUpQuery);
    expect(intent).toBe("follow_up");

    const result = DocumentRetrievalService.processDocumentContext({
      query: followUpQuery,
      conversationId: newConv.id,
      userId: userEmail,
    });

    expect(result.mode).toBe("full_document");
    expect(result.targetDocument?.fileName).toBe("Daztrix ERP Mobile Web Complete Plan.md");
    expect(result.groundedSystemPrompt).toContain("Phase 2: Operations & Fulfillment (Weeks 13 - 24)");
  });

  // =========================================================================
  // SCENARIO 11: Multi-Document Ambiguity Clarification & Cross-Conversation Isolation
  // =========================================================================
  it("Scenario 11: detects multi-document ambiguity, requests clarification, and isolates documents between conversations", () => {
    const convA = "conv-multi-A";
    const convB = "conv-multi-B";
    const userEmail = "test_user@nexora.ai";

    const uint8Daztrix = new TextEncoder().encode(daztrixContent);
    const parsedDaztrix = DocumentParser.parse(uint8Daztrix, "Daztrix ERP Mobile Web Complete Plan.md");
    ConversationDocumentStore.addDocument({
      conversationId: convA,
      userId: userEmail,
      fileName: "Daztrix ERP Mobile Web Complete Plan.md",
      fileSizeBytes: uint8Daztrix.length,
      mimeType: "text/markdown",
      fileType: "markdown",
      fullText: parsedDaztrix.fullText,
      summary: parsedDaztrix.summary,
      structure: parsedDaztrix.structure,
    });

    const uint8Quantum = new TextEncoder().encode(quantumContent);
    const parsedQuantum = DocumentParser.parse(uint8Quantum, "Quantum Computing Architecture.md");
    ConversationDocumentStore.addDocument({
      conversationId: convA,
      userId: userEmail,
      fileName: "Quantum Computing Architecture.md",
      fileSizeBytes: uint8Quantum.length,
      mimeType: "text/markdown",
      fileType: "markdown",
      fullText: parsedQuantum.fullText,
      summary: parsedQuantum.summary,
      structure: parsedQuantum.structure,
    });

    // Case 1: Ambiguous query in convA (doesn't specify which document)
    const ambiguousResult = DocumentRetrievalService.processDocumentContext({
      query: "What is the P0 priority subsystem?",
      conversationId: convA,
      userId: userEmail,
    });
    expect(ambiguousResult.mode).toBe("clarification_needed");
    expect(ambiguousResult.clarificationPrompt).toContain("multiple documents are active");
    expect(ambiguousResult.clarificationPrompt).toContain("Daztrix ERP Mobile Web Complete Plan.md");
    expect(ambiguousResult.clarificationPrompt).toContain("Quantum Computing Architecture.md");

    // Case 2: Specific keyword resolves the correct document in convA
    const specificResult = DocumentRetrievalService.processDocumentContext({
      query: "What is the target dilution temperature in the quantum architecture?",
      conversationId: convA,
      userId: userEmail,
    });
    expect(specificResult.mode).toBe("full_document");
    expect(specificResult.targetDocument?.fileName).toBe("Quantum Computing Architecture.md");
    expect(specificResult.groundedSystemPrompt).toContain("15 millikelvin");

    // Case 3: Conversation isolation: ConvB has zero documents
    const convBResult = DocumentRetrievalService.processDocumentContext({
      query: "What are the P0 modules?",
      conversationId: convB,
      userId: userEmail,
    });
    expect(convBResult.mode).toBe("no_document");
    expect(convBResult.targetDocument).toBeNull();
  });

  // =========================================================================
  // SCENARIO 12: Version Replacement & Multi-Format Parsing (PDF/DOCX/CSV/TXT/JSON)
  // =========================================================================
  it("Scenario 12: updates document version in-place and preserves structure across diverse formats", () => {
    const convId = "conv-ver-1";
    const userEmail = "test_user@nexora.ai";

    // 1. Initial version
    const uint8v1 = new TextEncoder().encode("# Title v1\n\nInitial version content.");
    const parsedV1 = DocumentParser.parse(uint8v1, "spec.md");
    const doc1 = ConversationDocumentStore.addDocument({
      conversationId: convId,
      userId: userEmail,
      fileName: "spec.md",
      fileSizeBytes: uint8v1.length,
      mimeType: "text/markdown",
      fileType: "markdown",
      fullText: parsedV1.fullText,
      summary: parsedV1.summary,
      structure: parsedV1.structure,
    });
    expect(doc1.version).toBe(1);

    // 2. Updated version of same filename increments version
    const uint8v2 = new TextEncoder().encode("# Title v2\n\nUpdated version content with new requirements.");
    const parsedV2 = DocumentParser.parse(uint8v2, "spec.md");
    const doc2 = ConversationDocumentStore.addDocument({
      conversationId: convId,
      userId: userEmail,
      fileName: "spec.md",
      fileSizeBytes: uint8v2.length,
      mimeType: "text/markdown",
      fileType: "markdown",
      fullText: parsedV2.fullText,
      summary: parsedV2.summary,
      structure: parsedV2.structure,
    });
    expect(doc2.version).toBe(2);
    expect(doc2.fullText).toContain("Updated version content");

    // Only 1 active document should exist for convId
    const active = ConversationDocumentStore.getActiveDocuments(convId, userEmail);
    expect(active.length).toBe(1);
    expect(active[0].version).toBe(2);

    // 3. Multi-format parsing tests: CSV, JSON, TXT, Code, PDF
    // CSV
    const csvContent = "Module,Priority,Scope\nAuth,P0,Core\nInventory,P1,Operations";
    const csvParsed = DocumentParser.parse(new TextEncoder().encode(csvContent), "data.csv");
    expect(csvParsed.fileType).toBe("csv");
    expect(csvParsed.structure.tablesCount).toBe(1);

    // JSON
    const jsonContent = JSON.stringify({ system: "Nexora", status: "Active", nodes: 12 });
    const jsonParsed = DocumentParser.parse(new TextEncoder().encode(jsonContent), "config.json");
    expect(jsonParsed.fileType).toBe("json");
    expect(jsonParsed.structure.sections.length).toBeGreaterThanOrEqual(1);

    // Code (TypeScript)
    const codeContent = "export function calculateMetric(a: number, b: number): number {\n  return a * b;\n}";
    const codeParsed = DocumentParser.parse(new TextEncoder().encode(codeContent), "metric.ts");
    expect(codeParsed.fileType).toBe("code");
    expect(codeParsed.structure.lineCount).toBe(3);

    // PDF Simulation
    const pdfDummy = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    const pdfParsed = DocumentParser.parse(pdfDummy, "whitepaper.pdf");
    expect(pdfParsed.fileType).toBe("pdf");
    expect(pdfParsed.structure.sections.length).toBeGreaterThanOrEqual(1);
    expect(pdfParsed.warning).toContain("Scanned or image-based PDF");
  });
});

