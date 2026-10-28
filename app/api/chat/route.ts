import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ModelRouter } from "@/lib/ai/router";
import { ModelOrchestrator } from "@/lib/ai/orchestrator";
import { EntitlementEngine } from "@/lib/entitlements/engine";
import { WebResearchService } from "@/lib/research/search-adapter";
import { MemoryService, UserMemoryItem } from "@/lib/memory/memory-service";

const ChatRequestSchema = z.object({
  modelSelectionId: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
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

    const { modelSelectionId, messages, temperature, maxTokens, includeWebSearch, planTier, userId } =
      parsed.data;

    // 0. Model Capability Validation
    const capabilityCheck = ModelRouter.validateRequestCapabilities(modelSelectionId, {
      requiresWebSearch: includeWebSearch,
    });
    if (!capabilityCheck.valid) {
      return NextResponse.json({ error: capabilityCheck.reason }, { status: 400 });
    }

    // 1. Quota Pre-Check (simulate current user daily/monthly counts)
    const quotaCheck = EntitlementEngine.checkMessageQuota(planTier, {
      dailyMessages: 0,
      monthlyMessages: 0,
    });

    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.reason }, { status: 429 });
    }

    // 2. Atomic Quota Reservation
    const reservationId = await EntitlementEngine.reserveQuota(userId, "message");

    // 3. Web Research augmentation & Anti-Disclaimer System Prompt
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const userPrompt = lastUserMessage?.content || "";
    const isLiveQuery =
      Boolean(includeWebSearch) ||
      /\b(weather|temperature|forecast|climate|rain|humidity|today|now|current|latest|live|news|time in|score|rate)\b/i.test(
        userPrompt
      );

    let contextualMessages = [...messages];
    let researchCitations: Array<{ title: string; url: string; snippet: string }> = [];

    // 3a. Persistent Personal Memory: candidate extraction & safe merge
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
        console.warn("[MemoryService] Candidate extraction/merge skipped:", memExtractErr);
      }
    }

    // 3b. Retrieve relevant memories for the current prompt and build memory context
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

    // System instruction: ChatGPT / Gemini level depth, structure, and authoritative answers
    const baseSystemPrompt = `You are Nexora, an advanced, highly knowledgeable, and articulate AI assistant created to provide ChatGPT Plus and Gemini Advanced level intelligence.

CORE RESPONSE GUIDELINES:
1. DEPTH & QUALITY:
   - Provide comprehensive, thorough, and in-depth answers. Do NOT give brief or superficial 1-2 sentence answers unless the user explicitly requests brevity.
   - Structure answers clearly using markdown: use clear section headers (###), bullet points, bold key terms, and numbered steps where appropriate.
   - Include core definitions, technical context, practical explanations, real-world examples, and code snippets whenever relevant.

2. RELEVANCE & ACCURACY:
   - Deeply analyze and answer the exact question the user asks across any domain (programming, science, mathematics, history, business, lifestyle, weather, etc.).
   - Never output meta-commentary, excuses, or disclaimers about cut-off dates.
   - NEVER refuse by saying "I don't have access to real-time live data", "I don't have internet access", or telling the user to "check Google Search / check weather apps".
   - When live search or weather data is provided in context, present the factual findings, temperatures, metrics, and details seamlessly, authoritatively, and naturally.
   - When persistent memory context about the user's skills, experience, or preferences is present, answer directly based on that accumulated profile without requiring them to re-upload files or repeat details.`;

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

    if (isLiveQuery && lastUserMessage) {
      try {
        const searchResults = await WebResearchService.searchWeb(lastUserMessage.content);
        if (searchResults.length > 0) {
          researchCitations = searchResults;
          const citationsText = searchResults
            .map((r, i) => `[Verified Live Data ${i + 1}] ${r.title}\n${r.snippet}`)
            .join("\n\n");

          contextualMessages.push({
            role: "system",
            content: `VERIFIED REAL-TIME LIVE DATA FOR USER QUERY:\n\n${citationsText}\n\nPresent this verified live information directly, clearly, and naturally in response to the user's question without any disclaimers.`,
          });
        }
      } catch (searchError) {
        console.warn("[WebResearch] Search skipped due to configuration or error:", searchError);
      }
    }

    // 4. Stream AI response with intelligent model orchestrator & circuit breaker
    const orchestration = await ModelOrchestrator.orchestrateStream({
      modelSelectionId,
      messages: contextualMessages,
      temperature,
      maxTokens,
      userId,
      userPlanId: planTier,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send initial metadata: correlation ID and fallback disclosure
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "metadata",
                correlationId: orchestration.correlationId,
                actualModel: orchestration.actualModelId,
                fallbackTriggered: orchestration.fallbackTriggered,
                memoryCount: retrievedMemoriesList.length,
                newlyLearned: extractedMemoriesSummary,
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
