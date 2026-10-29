import { CircuitBreaker } from "./circuit-breaker";
import { ModelRouter, ResolvedRouteTarget } from "./router";
import { ModelRegistry } from "./model-registry";
import { EntitlementEngine } from "../entitlements/engine";
import { TelemetryLogger } from "../telemetry/logger";
import { ChatChunk, ChatCompletionRequest } from "./types";
import { OpenAIAdapter } from "./providers/openai-adapter";
import { AnthropicAdapter } from "./providers/anthropic-adapter";
import { GeminiAdapter } from "./providers/gemini-adapter";
import { ProviderStatusService, AIProviderKey } from "./provider-status";

export interface OrchestrationResult {
  correlationId: string;
  selectedModel: string;
  actualModelId: string;
  providerKey: string;
  fallbackTriggered: boolean;
  stream: AsyncIterable<ChatChunk>;
}

export class ModelOrchestrator {
  private static openaiAdapter = new OpenAIAdapter();
  private static anthropicAdapter = new AnthropicAdapter();
  private static geminiAdapter = new GeminiAdapter();

  /**
   * Helper to yield single notice chunks.
   */
  private static async *createNoticeStream(notice: string): AsyncIterable<ChatChunk> {
    yield {
      id: `notice_${Date.now()}`,
      textDelta: notice,
      isComplete: true,
      finishReason: "stop",
    };
  }

  /**
   * Helper to sleep for transient backoff.
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Orchestrates a resilient, observable streaming AI request with circuit breaker safeguards
   * and configuration-aware multi-provider failover.
   */
  static async orchestrateStream(
    request: ChatCompletionRequest
  ): Promise<OrchestrationResult> {
    const correlationId = TelemetryLogger.generateCorrelationId();
    const startTime = Date.now();
    let ttftRecorded = false;
    let timeToFirstTokenMs: number | undefined;

    // 1. Pre-flight Capability Validation
    const capabilityCheck = ModelRouter.validateRequestCapabilities(
      request.modelSelectionId,
      {
        requiresWebSearch: request.includeWebSearch,
        requiresDocuments: !!(request.fileContexts && request.fileContexts.length > 0),
      }
    );
    if (!capabilityCheck.valid) {
      throw new Error(`[CAPABILITY_MISMATCH] ${capabilityCheck.reason}`);
    }

    // 2. Direct external model configuration validation
    const directCheck = ModelRouter.validateDirectModelConfig(request.modelSelectionId);
    if (!directCheck.valid) {
      return {
        correlationId,
        selectedModel: request.modelSelectionId,
        actualModelId: request.modelSelectionId,
        providerKey: "none",
        fallbackTriggered: false,
        stream: ModelOrchestrator.createNoticeStream(
          `[AI Provider Notice: Provider Not Configured]\n\n${directCheck.error}\n\nTroubleshooting:\n- Select an available model from the model selector.\n- Or add the missing API key to .env.local and restart the server.\n- Run \`npm run ai:check\` to verify your environment keys.`
        ),
      };
    }

    // 3. Global check: Are ANY providers configured on this server?
    const configuredProviders = ProviderStatusService.getConfiguredProviders();
    if (configuredProviders.length === 0) {
      return {
        correlationId,
        selectedModel: request.modelSelectionId,
        actualModelId: request.modelSelectionId,
        providerKey: "none",
        fallbackTriggered: false,
        stream: ModelOrchestrator.createNoticeStream(
          `[AI Provider Notice: No AI Providers Configured]\n\nNo AI model provider API keys are configured on this server.\n\nTo enable AI responses in Nexora:\n1. Add at least one API key to your \`.env.local\` file in the project root:\n   • GEMINI_API_KEY=your_key_here (Free tier available at https://aistudio.google.com/)\n   • OPENAI_API_KEY=your_key_here (https://platform.openai.com/api-keys)\n   • ANTHROPIC_API_KEY=your_key_here (https://console.anthropic.com/)\n2. Restart the Next.js development server (\`npm run dev\`) for the changes to take effect.\n3. Run \`npm run ai:check\` to verify connectivity.`
        ),
      };
    }

    // 4. Resolve prioritized routes filtered by configured providers
    const allRoutes = ModelRouter.resolveRoutes(
      request.modelSelectionId,
      request.userPlanId || "free",
      request.orgId
    );

    // Filter to ONLY routes whose provider is currently configured
    const configuredRoutes = allRoutes.filter((r) =>
      configuredProviders.includes(r.externalModel.providerKey as AIProviderKey)
    );

    if (configuredRoutes.length === 0) {
      return {
        correlationId,
        selectedModel: request.modelSelectionId,
        actualModelId: request.modelSelectionId,
        providerKey: "none",
        fallbackTriggered: false,
        stream: ModelOrchestrator.createNoticeStream(
          `[AI Provider Notice: No Configured Provider for Model]\n\nNone of the providers configured on this server support the selected model "${request.modelSelectionId}".\n\nConfigured providers on this server: ${configuredProviders.join(", ")}\n\nPlease select another model from the model selector, or configure the required provider keys in .env.local.`
        ),
      };
    }

    // 5. Select primary route taking Circuit Breaker into account
    let selectedRoute: ResolvedRouteTarget = configuredRoutes[0];
    let fallbackTriggered = false;

    for (const route of configuredRoutes) {
      if (CircuitBreaker.isAvailable(route.externalModel.providerKey)) {
        selectedRoute = route;
        if (route.routeRole === "fallback") {
          fallbackTriggered = true;
        }
        break;
      } else {
        console.warn(
          `[Orchestrator] Circuit breaker is OPEN for '${route.externalModel.providerKey}'. Skipping primary route ${route.externalModel.id}.`
        );
      }
    }

    const targetRoute = selectedRoute;
    const actorHash = TelemetryLogger.hashActor(request.userId);

    // 6. Build ordered candidate route sequence for transparent failover
    // Start with the selected route, then any other configured routes
    const candidateRoutes: ResolvedRouteTarget[] = [
      targetRoute,
      ...configuredRoutes.filter((r) => r.externalModel.id !== targetRoute.externalModel.id),
    ];

    // Deduplicate candidate routes by providerKey if desired, or allow provider model variants
    const uniqueCandidateRoutes: ResolvedRouteTarget[] = [];
    const seenProviders = new Set<string>();
    for (const route of candidateRoutes) {
      if (!seenProviders.has(route.externalModel.providerKey)) {
        seenProviders.add(route.externalModel.providerKey);
        uniqueCandidateRoutes.push(route);
      }
    }

    // 7. Monitored generator stream executing failover, telemetry, and circuit breaker
    async function* monitoredStream(): AsyncIterable<ChatChunk> {
      let promptTokens = 0;
      let completionTokens = 0;
      let hasError = false;
      let errorCategory: string | undefined;
      let activeRoute = targetRoute;

      const attemptedFailures: Array<{
        provider: string;
        modelId: string;
        category: string;
        message: string;
      }> = [];

      try {
        for (let i = 0; i < uniqueCandidateRoutes.length; i++) {
          const routeToTry = uniqueCandidateRoutes[i];
          activeRoute = routeToTry;
          const providerKey = routeToTry.externalModel.providerKey as AIProviderKey;

          const adapter =
            providerKey === "openai"
              ? ModelOrchestrator.openaiAdapter
              : providerKey === "gemini"
              ? ModelOrchestrator.geminiAdapter
              : ModelOrchestrator.anthropicAdapter;

          // Attempt with bounded retry for transient network/503 errors (max 2 total attempts per route)
          let routeAttempt = 0;
          const maxRouteAttempts = 2;
          let routeSuccess = false;

          while (routeAttempt < maxRouteAttempts) {
            routeAttempt++;
            try {
              const stream = adapter.streamCompletion(
                routeToTry.externalModel.providerModelId,
                request.messages,
                {
                  temperature: request.temperature,
                  maxTokens: request.maxTokens,
                }
              );

              let streamedTokens = false;
              for await (const chunk of stream) {
                streamedTokens = true;
                if (!ttftRecorded && chunk.textDelta) {
                  ttftRecorded = true;
                  timeToFirstTokenMs = Date.now() - startTime;
                }

                if (chunk.usage) {
                  promptTokens = chunk.usage.promptTokens;
                  completionTokens = chunk.usage.completionTokens;
                }

                yield chunk;
              }

              if (streamedTokens) {
                CircuitBreaker.recordSuccess(providerKey);
                ProviderStatusService.recordSuccess(providerKey);
                hasError = false;
                routeSuccess = true;
                return;
              }
            } catch (err) {
              const cat = ProviderStatusService.categorizeError(err);
              errorCategory = cat;
              const rawMsg = (err as Error).message || String(err);

              // Record in provider health service & circuit breaker
              ProviderStatusService.recordError(providerKey, err);
              CircuitBreaker.recordFailure(providerKey, err as Error);

              // If it's a non-retryable error (auth_error, quota_error, model_unavailable), break out of retry loop immediately
              if (
                cat === "auth_error" ||
                cat === "quota_error" ||
                cat === "model_unavailable"
              ) {
                let friendlyDesc = rawMsg;
                if (cat === "auth_error") friendlyDesc = "Authentication failed (invalid or expired API key)";
                if (cat === "quota_error") friendlyDesc = "Quota exceeded or credits exhausted (429)";
                if (cat === "model_unavailable") friendlyDesc = "Model not found or unavailable in this region";

                attemptedFailures.push({
                  provider: providerKey.toUpperCase(),
                  modelId: routeToTry.externalModel.id,
                  category: cat,
                  message: friendlyDesc,
                });
                break; // Don't retry the same route, fall through to next provider route
              }

              // If transient failure and we have retry left, back off briefly
              if (routeAttempt < maxRouteAttempts) {
                await ModelOrchestrator.sleep(250);
                continue;
              } else {
                attemptedFailures.push({
                  provider: providerKey.toUpperCase(),
                  modelId: routeToTry.externalModel.id,
                  category: cat,
                  message: rawMsg.slice(0, 150),
                });
              }
            }
          }

          if (routeSuccess) {
            return;
          }
        }

        // All configured candidate routes failed
        hasError = true;

        // Build clear, honest diagnostic notice detailing actual attempted providers
        const failureLines = attemptedFailures.map(
          (f) => `• ${f.provider} (${f.modelId}): ${f.message}`
        );

        const troubleshootingHints: string[] = [];
        if (attemptedFailures.some((f) => f.category === "quota_error" && f.provider === "OPENAI")) {
          troubleshootingHints.push(
            "- OpenAI credits exhausted: Check your OpenAI billing and usage at https://platform.openai.com/settings/organization/billing/."
          );
        }
        if (attemptedFailures.some((f) => f.category === "quota_error" && f.provider === "GEMINI")) {
          troubleshootingHints.push(
            "- Gemini rate limit reached: Wait a minute before retrying, or check quota at https://aistudio.google.com/."
          );
        }
        if (attemptedFailures.some((f) => f.category === "auth_error")) {
          troubleshootingHints.push(
            "- API Key Authentication: Verify that your API keys in .env.local are correct and have not expired."
          );
        }
        if (troubleshootingHints.length === 0) {
          troubleshootingHints.push(
            "- Run `npm run ai:check` in your terminal to test connectivity to each configured provider."
          );
        }

        yield {
          id: `err_${Date.now()}`,
          textDelta: `[AI Provider Notice: All attempted AI model providers encountered an error]\n\nAttempted providers:\n${failureLines.join("\n")}\n\nTroubleshooting:\n${troubleshootingHints.join("\n")}`,
          isComplete: true,
          finishReason: "stop",
        };
      } finally {
        const latencyMs = Date.now() - startTime;
        const inputPrice = activeRoute.externalModel.inputPricePerMillionUSD || 0.15;
        const outputPrice = activeRoute.externalModel.outputPricePerMillionUSD || 0.6;
        const estimatedCostUSD =
          (promptTokens * inputPrice + completionTokens * outputPrice) / 1000000;

        TelemetryLogger.recordEvent({
          correlationId,
          actorHash,
          modelSelected: request.modelSelectionId,
          providerKey: activeRoute.externalModel.providerKey,
          actualModelId: activeRoute.externalModel.id,
          latencyMs,
          timeToFirstTokenMs,
          tokensIn: promptTokens,
          tokensOut: completionTokens,
          estimatedCostUSD: parseFloat(estimatedCostUSD.toFixed(6)),
          fallbackTriggered: activeRoute.externalModel.id !== targetRoute.externalModel.id,
          circuitBreakerState: CircuitBreaker.isAvailable(activeRoute.externalModel.providerKey) ? "CLOSED" : "OPEN",
          status: hasError ? "error" : "success",
          errorCategory,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return {
      correlationId,
      selectedModel: request.modelSelectionId,
      actualModelId: targetRoute.externalModel.id,
      providerKey: targetRoute.externalModel.providerKey,
      fallbackTriggered,
      stream: monitoredStream(),
    };
  }
}
