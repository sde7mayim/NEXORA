import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ModelRouter } from "@/lib/ai/router";
import { ModelOrchestrator } from "@/lib/ai/orchestrator";
import { EntitlementEngine } from "@/lib/entitlements/engine";
import { WebResearchService } from "@/lib/research/search-adapter";
import { MemoryService, UserMemoryItem } from "@/lib/memory/memory-service";
import { DocumentParser } from "@/lib/files/document-parser";
import { ConversationDocumentStore } from "@/lib/files/document-store";
import { DocumentRetrievalService } from "@/lib/files/document-retrieval";

const ChatRequestSchema = z.object({
  modelSelectionId: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
      attachments: z
        .array(
          z.object({
            name: z.string(),
            size: z.number().optional(),
            content: z.string().optional(),
            fileId: z.string().optional(),
            mimeType: z.string().optional(),
          })
        )
        .optional(),
    })
  ),
  conversationId: z.string().default("conv-default"),
  files: z
    .array(
      z.object({
        name: z.string(),
        content: z.string().optional(),
        fileId: z.string().optional(),
        size: z.number().optional(),
        mimeType: z.string().optional(),
      })
    )
    .optional(),
  fileContexts: z.array(z.string()).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(16384).optional(),
  includeWebSearch: z.boolean().optional(),
  planTier: z.enum(["free", "pro", "enterprise"]).default("free"),
  userId: z.string().default("usr_anonymous"),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = ChatRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      modelSelectionId,
      messages,
      conversationId,
      files,
      temperature,
      maxTokens,
      includeWebSearch,
      planTier,
      userId,
    } = parsed.data;

    // 0. Model Capability Validation
    const capabilityCheck = ModelRouter.validateRequestCapabilities(modelSelectionId, {
      requiresWebSearch: includeWebSearch,
      requiresDocuments: !!(
        (files && files.length > 0) ||
        ConversationDocumentStore.getActiveDocuments(conversationId, userId).length > 0
      ),
    });
    if (!capabilityCheck.valid) {
      return NextResponse.json({ error: capabilityCheck.reason }, { status: 400 });
    }

    // 1. Quota Pre-Check
    const quotaCheck = EntitlementEngine.checkMessageQuota(planTier, {
      dailyMessages: 0,
      monthlyMessages: 0,
    });
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.reason }, { status: 429 });
    }

    // 2. Atomic Quota Reservation
    const reservationId = await EntitlementEngine.reserveQuota(userId, "message");

    // 3. Ingest any files passed in the request or in recent message attachments
    const incomingFiles: Array<{ name: string; content?: string; size?: number; mimeType?: string }> = [
      ...(files || []),
    ];

    for (const msg of messages) {
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.content && !incomingFiles.some((f) => f.name.toLowerCase() === att.name.toLowerCase())) {
            incomingFiles.push({
              name: att.name,
              content: att.content,
              size: att.size,
              mimeType: att.mimeType,
            });
          }
        }
      }
    }

    for (const f of incomingFiles) {
      if (f.content && f.content.trim().length > 0) {
        const uint8 = new TextEncoder().encode(f.content);
        const parsedDoc = DocumentParser.parse(uint8, f.name);
        ConversationDocumentStore.addDocument({
          conversationId,
          userId,
          fileName: f.name,
          fileSizeBytes: f.size || f.content.length,
          mimeType: f.mimeType || parsedDoc.mimeType,
          fileType: parsedDoc.fileType,
          fullText: parsedDoc.fullText,
          summary: parsedDoc.summary,
          structure: parsedDoc.structure,
        });
      }
    }

    // 4. Resolve active user prompt and document context
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const userPrompt = lastUserMessage?.content || "";

    const docResult = DocumentRetrievalService.processDocumentContext({
      query: userPrompt,
      conversationId,
      userId,
    });

    // 4a. If clarification is needed among multiple ambiguous documents
    if (docResult.mode === "clarification_needed" && docResult.clarificationPrompt) {
      await EntitlementEngine.releaseReservation(reservationId);
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                text: docResult.clarificationPrompt,
                isComplete: true,
                modelUsed: modelSelectionId,
              })}\n\n`
            )
          );
          controller.close();
        },
      });
      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    let contextualMessages = [...messages];
    let researchCitations: Array<{ title: string; url: string; snippet: string }> = [];

    // If a document is active and relevant sections / full document were retrieved, attach grounded context
    if (docResult.targetDocument && docResult.groundedSystemPrompt) {
      contextualMessages.push({
        role: "system",
        content: docResult.groundedSystemPrompt,
      });

      if (docResult.retrievedSections.length > 0) {
        const docCitations = docResult.retrievedSections.slice(0, 3).map((s) => ({
          title: `${docResult.targetDocument!.fileName} - ${s.heading}`,
          url: `#${s.heading.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          snippet: s.content.slice(0, 250),
        }));
        researchCitations = [...docCitations];
      }
    }

    // 5. Persistent Personal Memory: candidate extraction & safe merge
    let extractedMemoriesSummary: string | null = null;
    if (userPrompt && userId) {
      try {
        const candidates = await MemoryService.extractCandidateMemories(userId, userPrompt, {
          type: "conversation",
          reference: "Active Chat",
        });
        if (candidates.length > 0) {
          const mergedResults = [];
          for (const cand of candidates) {
            const res = await MemoryService.mergeMemoryUpdate(userId, cand);
            mergedResults.push(res);
          }
          const novelOrUpdated = mergedResults.filter(
            (r) => r.action === "created" || r.action === "merged" || r.action === "updated"
          );
          if (novelOrUpdated.length > 0) {
            extractedMemoriesSummary = novelOrUpdated.map((r) => r.memory.summary).join("; ");
          }
        }
      } catch (memExtractErr) {
        console.warn("[MemoryService] Candidate extraction skipped:", memExtractErr);
      }
    }

    // 6. Retrieve relevant memories for the current prompt
    let retrievedMemoriesList: UserMemoryItem[] = [];
    if (userPrompt && userId) {
      try {
        const { contextText, retrievedMemories } = await MemoryService.buildMemoryContext(
          userId,
          userPrompt
        );
        retrievedMemoriesList = retrievedMemories;
        if (contextText) {
          contextualMessages.push({
            role: "system",
            content: contextText,
          });
        }
      } catch (memRetrieveErr) {
        console.warn("[MemoryService] Context retrieval skipped:", memRetrieveErr);
      }
    }

    // 7. Base System Instruction
    const baseSystemPrompt = `You are Nexora, an advanced, highly knowledgeable, and articulate AI assistant created to provide ChatGPT Plus and Gemini Advanced level intelligence.

CORE RESPONSE GUIDELINES:
1. DEPTH & FIDELITY:
   - Provide comprehensive, thorough, and in-depth answers. Do NOT give brief or superficial 1-2 sentence answers unless the user explicitly requests brevity.
   - Structure answers clearly using markdown: use clear section headers (###), bullet points, bold key terms, and numbered steps where appropriate.
   - When an uploaded document is present in context, adhere strictly to the document directives: preserve technical criteria, module priorities, and facts faithfully.
   - When asked for a specific detail, comparison, extraction, or explanation, answer that EXACT question. Do NOT force every document question into a summary format.
   - If the requested detail is not specified in the document, clearly state: "This information is not specified in the uploaded document."

2. RELEVANCE & ACCURACY:
   - Deeply analyze and answer the exact question the user asks.
   - Never output meta-commentary, excuses, or disclaimers about cut-off dates.
   - When persistent memory context about the user is present, answer directly without requiring them to repeat details.`;

    const existingSystemIdx = contextualMessages.findIndex((m) => m.role === "system");
    if (existingSystemIdx >= 0) {
      contextualMessages[existingSystemIdx] = {
        role: "system",
        content: baseSystemPrompt + "\n\n" + contextualMessages[existingSystemIdx].content,
      };
    } else {
      contextualMessages.unshift({
        role: "system",
        content: baseSystemPrompt,
      });
    }

    // 8. Live Web Research (if requested)
    const isLiveQuery =
      Boolean(includeWebSearch) ||
      /\b(weather|temperature|forecast|climate|rain|humidity|today|now|current|latest|live|news|time in|score|rate)\b/i.test(
        userPrompt
      );

    if (isLiveQuery && lastUserMessage) {
      try {
        const searchResults = await WebResearchService.searchWeb(lastUserMessage.content);
        if (searchResults.length > 0) {
          researchCitations = [...researchCitations, ...searchResults];
          const citationsText = searchResults
            .map((r, i) => `[Verified Live Data ${i + 1}] ${r.title}\n${r.snippet}`)
            .join("\n\n");

          contextualMessages.push({
            role: "system",
            content: `VERIFIED REAL-TIME LIVE DATA FOR USER QUERY:\n\n${citationsText}\n\nPresent this verified live information directly, clearly, and naturally in response to the user's question without any disclaimers.`,
          });
        }
      } catch (searchError) {
        console.warn("[WebResearch] Search skipped:", searchError);
      }
    }

    // 9. Stream AI response with intelligent model orchestrator
    const orchestration = await ModelOrchestrator.orchestrateStream({
      modelSelectionId,
      messages: contextualMessages,
      temperature,
      maxTokens,
      userId,
      userPlanId: planTier,
      fileContexts: docResult.targetDocument ? [docResult.targetDocument.fileName] : undefined,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send initial metadata: correlation ID, active document disclosure, and fallback status
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "metadata",
                correlationId: orchestration.correlationId,
                actualModel: orchestration.actualModelId,
                fallbackTriggered: orchestration.fallbackTriggered,
                memoryCount: retrievedMemoriesList.length,
                newlyLearned: extractedMemoriesSummary,
                activeDocument: docResult.targetDocument
                  ? {
                      id: docResult.targetDocument.id,
                      fileName: docResult.targetDocument.fileName,
                      version: docResult.targetDocument.version,
                      intent: docResult.intent,
                      mode: docResult.mode,
                    }
                  : null,
              })}\n\n`
            )
          );

          // If citations exist, send them as citations event
          if (researchCitations.length > 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "citations", citations: researchCitations })}\n\n`
              )
            );
          }

          for await (const chunk of orchestration.stream) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  text: chunk.textDelta,
                  isComplete: chunk.isComplete,
                  modelUsed: orchestration.actualModelId,
                  provider: orchestration.providerKey,
                  usage: chunk.usage,
                })}\n\n`
              )
            );
          }

          // Reconcile reservation on success
          await EntitlementEngine.reconcileReservation(reservationId);
          controller.close();
        } catch (err) {
          await EntitlementEngine.releaseReservation(reservationId);
          const errorMsg = (err as Error).message || "Streaming failed";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
