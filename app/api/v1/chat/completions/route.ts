import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, recordRequestUsage } from "@/lib/api-keys/auth-middleware";
import { ModelRouter } from "@/lib/ai/router";
import { TelemetryLogger } from "@/lib/telemetry/logger";

export async function POST(req: NextRequest) {
  // 1. Authenticate API Key with chat:write scope
  const auth = await authenticateApiRequest(req, { requiredScope: "chat:write" });
  if (!auth.success) {
    return auth.response;
  }

  const { context } = auth;
  const endpoint = "/api/v1/chat/completions";
  const correlationId = context.correlationId;
  const startTime = context.startTime;

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      recordRequestUsage(context, endpoint, 400, 0);
      return NextResponse.json(
        { error: { message: "Invalid JSON request body.", type: "invalid_request_error" } },
        { status: 400, headers: auth.headers }
      );
    }

    const { model = "nexora-core", messages, temperature, max_tokens } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      recordRequestUsage(context, endpoint, 400, 0);
      return NextResponse.json(
        { error: { message: "messages array is required.", type: "invalid_request_error" } },
        { status: 400, headers: auth.headers }
      );
    }

    // 2. Generate response via Nexora's ModelRouter
    const result = await ModelRouter.generateWithFallback({
      modelSelectionId: model,
      messages,
      userId: context.userId,
      userPlanId: "enterprise",
      temperature,
      maxTokens: max_tokens,
    });

    const duration = Date.now() - startTime;
    const totalTokens = (result.promptTokens || 0) + (result.completionTokens || 0);

    // 3. Record API Key Usage
    recordRequestUsage(context, endpoint, 200, totalTokens, {
      provider: result.providerKey,
      model: result.modelUsed,
    });

    // 4. Record Structured Telemetry
    const estimatedCost = (result.promptTokens * 0.15 + result.completionTokens * 0.6) / 1000000;
    TelemetryLogger.recordEvent({
      correlationId,
      actorHash: TelemetryLogger.hashActor(context.userId),
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
        ...auth.headers,
        "x-correlation-id": correlationId,
        "x-nexora-provider": result.providerKey,
        "x-nexora-model": result.modelUsed,
      },
    });
  } catch (err) {
    recordRequestUsage(context, endpoint, 500, 0);
    return NextResponse.json(
      {
        error: {
          message: (err as Error).message,
          type: "server_error",
          correlation_id: correlationId,
        },
      },
      { status: 500, headers: { ...auth.headers, "x-correlation-id": correlationId } }
    );
  }
}
