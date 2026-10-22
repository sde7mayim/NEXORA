import { NextRequest, NextResponse } from "next/server";
import { ApiKeyService } from "@/lib/developer/api-keys";
import { ModelRouter } from "@/lib/ai/router";
import { TelemetryLogger } from "@/lib/telemetry/logger";

export async function POST(req: NextRequest) {
  const correlationId = TelemetryLogger.generateCorrelationId();
  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("authorization") || "";
    const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();

    // 1. Authenticate API Key with chat:write scope
    const auth = ApiKeyService.authenticateKey(apiKey, "chat:write");
    if (!auth.valid) {
      return NextResponse.json(
        { error: { message: auth.error, type: "authentication_error", code: "unauthorized" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { model = "nexora-core", messages, temperature, max_tokens, stream = false } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: { message: "messages array is required.", type: "invalid_request_error" } },
        { status: 400 }
      );
    }

    // 2. Generate response via Nexora's ModelRouter
    const result = await ModelRouter.generateWithFallback({
      modelSelectionId: model,
      messages,
      userId: auth.record!.userId,
      userPlanId: "enterprise",
      temperature,
      maxTokens: max_tokens,
    });

    const duration = Date.now() - startTime;
    const totalTokens = result.promptTokens + result.completionTokens;

    // 3. Record API Key Usage
    ApiKeyService.recordUsage(auth.record!.id, "/api/v1/chat/completions", 200, totalTokens);

    // 4. Record Structured Telemetry
    const estimatedCost = (result.promptTokens * 0.15 + result.completionTokens * 0.6) / 1000000;
    TelemetryLogger.recordEvent({
      correlationId,
      actorHash: TelemetryLogger.hashActor(auth.record!.userId),
      modelSelected: model,
      providerKey: result.providerKey,
      actualModelId: result.modelUsed,
      latencyMs: duration,
      tokensIn: result.promptTokens,
      tokensOut: result.completionTokens,
      estimatedCostUSD: estimatedCost,
      fallbackTriggered: false,
      circuitBreakerState: "CLOSED",
      status: "success",
      timestamp: new Date().toISOString(),
    });

    // 5. OpenAI-compatible completion response
    const responsePayload = {
      id: `chatcmpl-${correlationId}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: `${model}@${result.modelUsed}`,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: result.content,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
        total_tokens: totalTokens,
      },
      nexora_routing: {
        provider_used: result.providerKey,
        fallback_triggered: false,
        correlation_id: correlationId,
        latency_ms: duration,
      },
    };

    return NextResponse.json(responsePayload, {
      headers: {
        "x-correlation-id": correlationId,
        "x-nexora-provider": result.providerKey,
        "x-nexora-model": result.modelUsed,
      },
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    return NextResponse.json(
      {
        error: {
          message: (err as Error).message,
          type: "server_error",
          correlation_id: correlationId,
        },
      },
      { status: 500, headers: { "x-correlation-id": correlationId } }
    );
  }
}
