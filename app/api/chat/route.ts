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

    // 3. Web Research augmentation if requested
    let contextualMessages = [...messages];
    let researchCitations: Array<{ title: string; url: string; snippet: string }> = [];

    if (includeWebSearch) {
      const researchQuota = EntitlementEngine.checkResearchQuota(planTier, 0);
      if (researchQuota.allowed) {
        const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
        if (lastUserMessage) {
          try {
            const searchResults = await WebResearchService.searchWeb(lastUserMessage.content);
            if (searchResults.length > 0) {
              researchCitations = searchResults;
              const citationsText = searchResults
                .map((r, i) => `[Source ${i + 1}] ${r.title} (${r.url})\n${r.snippet}`)
                .join("\n\n");

              contextualMessages.push({
                role: "system",
                content: `You have access to the following verified web research evidence. Cite sources using [Source X] where appropriate:\n\n${citationsText}`,
              });
            }
          } catch (searchError) {
            console.warn("[WebResearch] Search skipped due to configuration or error:", searchError);
          }
        }
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
