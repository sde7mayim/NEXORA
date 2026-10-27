import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ModelRouter } from "@/lib/ai/router";
import { ModelOrchestrator } from "@/lib/ai/orchestrator";
import { EntitlementEngine } from "@/lib/entitlements/engine";
import { WebResearchService } from "@/lib/research/search-adapter";

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

    // System instruction: strictly forbid generic refusals or telling users to check Google Search
    const baseSystemPrompt = `You are Nexora, an authoritative and intelligent AI assistant.
CRITICAL INSTRUCTIONS:
- Directly answer the user's question clearly, informatively, and accurately.
- NEVER refuse by saying "I don't have access to real-time live data", "I don't have internet access", or telling the user to "check Google Search / check weather apps".
- NEVER output meta-commentary, excuses, or disclaimers about cut-off dates.
- When live research or weather evidence is provided, state the exact facts, numbers, temperatures, and conditions directly to the user.`;

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
