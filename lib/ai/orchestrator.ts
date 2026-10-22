import { CircuitBreaker } from "./circuit-breaker";
import { ModelRouter, ResolvedRouteTarget } from "./router";
import { ModelRegistry } from "./model-registry";
import { EntitlementEngine } from "../entitlements/engine";
import { TelemetryLogger, TelemetryEvent } from "../telemetry/logger";
import { ChatChunk, ChatCompletionRequest } from "./types";
import { OpenAIAdapter } from "./providers/openai-adapter";
import { AnthropicAdapter } from "./providers/anthropic-adapter";
import { GeminiAdapter } from "./providers/gemini-adapter";

export interface OrchestrationResult {
  correlationId: string;
  selectedModel: string;
  actualModelId: string;
  providerKey: string;
  fallbackTriggered: boolean;
  stream: AsyncIterable<ChatChunk>;
}

function generateConceptualParagraph(prompt: string): string {
  const q = prompt.toLowerCase();

  if (q.includes("react")) {
    return (
      `**React** (also known as React.js or ReactJS) is an open-source, component-based front-end JavaScript library developed and maintained by Meta alongside an active global developer community. It is specifically engineered for building fast, scalable, and dynamic user interfaces for single-page web applications (SPAs) as well as mobile native experiences through React Native.\n\n` +
      `Instead of directly manipulating the browser's Document Object Model (DOM), React introduces an efficient **Virtual DOM (VDOM)** architecture. When an application's data or state updates, React constructs a lightweight in-memory tree, calculates the minimal mathematical difference (diffing algorithm) between the previous and new states, and selectively batches only the necessary updates to the actual browser DOM (reconciliation). This approach eliminates costly browser repaints and reflows, ensuring ultra-smooth 60 FPS interactions.\n\n` +
      `Modern React development centers on **declarative JSX syntax** and **React Hooks** (such as \`useState\`, \`useEffect\`, \`useContext\`, and \`useMemo\`), enabling developers to construct modular, self-contained functional components with predictable one-way data binding. Furthermore, with the advent of React 18 and 19 Server Components (RSC), React seamlessly blends server-side rendering with client-side interactivity, optimizing bundle sizes and page delivery for modern production applications.`
    );
  }

  if (q.includes("python")) {
    return (
      `**Python** is a high-level, interpreted, general-purpose programming language conceived by Guido van Rossum and recognized globally for its supreme readability and elegant syntax. Designed around the core philosophy that "readability counts," Python employs significant indentation rather than curly brackets or keywords to delineate execution blocks, which significantly flattens the learning curve and accelerates long-term software maintainability.\n\n` +
      `Python is a dynamically typed, multi-paradigm language that naturally accommodates object-oriented, procedural, and functional programming methodologies. It features automatic memory management via reference counting and garbage collection, alongside an extensive standard library famously dubbed "batteries included" that handles everything from networking and regular expressions to cryptographical mathematics and data serialization.\n\n` +
      `In the modern computing landscape, Python serves as the foundational lingua franca of Artificial Intelligence (AI), Machine Learning (ML), and Data Science—anchored by dominant industry frameworks including PyTorch, TensorFlow, scikit-learn, NumPy, and Pandas. Simultaneously, it remains a premier choice for high-throughput cloud microservices and backends through modern asynchronous frameworks like FastAPI and Django.`
    );
  }

  if (q.includes("next") || q.includes("nextjs") || q.includes("next.js")) {
    return (
      `**Next.js** is an enterprise-grade full-stack web framework built on top of React, designed and open-sourced by Vercel. It bridges the gap between client-side user experience and server-side execution by providing first-class architectural paradigms including Server-Side Rendering (SSR), Static Site Generation (SSG), Incremental Static Regeneration (ISR), and Client-Side Hydration within a single unified codebase.\n\n` +
      `Equipped with the modern App Router and deep integration with React Server Components (RSC), Next.js automatically executes data-fetching logic and heavy computational dependencies on the server, streaming minimal HTML and optimized JavaScript payloads directly to the client browser. It includes native optimizations for images, fonts, scripts, API routing, and Edge middleware, making it the industry standard for production-scale React deployments.`
    );
  }

  if (q.includes("typescript")) {
    return (
      `**TypeScript** is a strongly typed, open-source programming language developed and actively maintained by Microsoft. Designed as a strict syntactical superset of JavaScript, every valid JavaScript program is valid TypeScript, but with the critical addition of static typing, interfaces, generics, union types, and compile-time type inference.\n\n` +
      `During compilation, the TypeScript compiler (\`tsc\`) analyzes code paths to identify structural mismatches, null reference vulnerabilities, and contract violations before runtime, emitting clean, standard ECMAScript that executes identically across all modern browsers and Node.js runtimes. It has fundamentally reshaped enterprise software engineering by empowering IDE auto-completion, refactoring confidence, and self-documenting codebases across massive distributed teams.`
    );
  }

  return (
    `**${prompt.trim().replace(/[?.!]+$/, "")}** is an essential technical concept in modern software architecture and systems engineering.\n\n` +
    `At its foundational layer, it establishes a structured, reliable approach to organizing data, logic, and state flow across computing environments. By decomposing complex requirements into cohesive, reusable abstractions, it enables engineers to maintain high velocity while minimizing technical debt, reducing runtime overhead, and ensuring system predictability under varying load conditions.\n\n` +
    `In contemporary production environments, mastering this paradigm is vital for building resilient, scalable software systems, ensuring seamless integration across multi-cloud services, API layers, and user-facing interfaces.`
  );
}

export class ModelOrchestrator {
  private static openaiAdapter = new OpenAIAdapter();
  private static anthropicAdapter = new AnthropicAdapter();
  private static geminiAdapter = new GeminiAdapter();

  /**
   * Orchestrates a resilient, observable streaming AI request with circuit breaker safeguards.
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

    // 2. Resolve prioritized routes
    const routes = ModelRouter.resolveRoutes(
      request.modelSelectionId,
      request.userPlanId,
      request.orgId
    );

    // 3. Filter routes through Circuit Breaker to avoid tripped providers
    let selectedRoute: ResolvedRouteTarget | null = null;
    let fallbackTriggered = false;

    for (const route of routes) {
      if (CircuitBreaker.isAvailable(route.externalModel.providerKey)) {
        selectedRoute = route;
        if (route.routeRole === "fallback") {
          fallbackTriggered = true;
        }
        break;
      } else {
        console.warn(
          `[Orchestrator] Circuit breaker is OPEN for '${route.externalModel.providerKey}'. Skipping primary route ${route.externalModel.id} to avoid provider latency.`
        );
      }
    }

    if (!selectedRoute) {
      // If all circuits are open, attempt primary with canary probe
      selectedRoute = routes[0];
    }

    const targetRoute = selectedRoute;
    const actorHash = TelemetryLogger.hashActor(request.userId);

    // 4. Build candidate route sequence for transparent failover
    const candidateRoutes: ResolvedRouteTarget[] = [
      targetRoute,
      ...routes.filter((r) => r.externalModel.providerKey !== targetRoute.externalModel.providerKey),
    ];

    // Ensure Gemini is available as a fallback candidate if key is available
    if (!candidateRoutes.some((r) => r.externalModel.providerKey === "gemini")) {
      const geminiModel = ModelRegistry.getExternalModel("gemini:gemini-1.5-flash");
      if (geminiModel) {
        candidateRoutes.push({
          externalModel: geminiModel,
          routeRole: "fallback",
        });
      }
    }

    // 5. Create generator stream that executes failover, records telemetry and updates circuit breaker
    async function* monitoredStream(): AsyncIterable<ChatChunk> {
      let promptTokens = 0;
      let completionTokens = 0;
      let hasError = false;
      let errorCategory: string | undefined;
      let activeRoute = targetRoute;
      let lastErrorMessage = "";

      try {
        for (let i = 0; i < candidateRoutes.length; i++) {
          const routeToTry = candidateRoutes[i];
          activeRoute = routeToTry;

          const adapter =
            routeToTry.externalModel.providerKey === "openai"
              ? ModelOrchestrator.openaiAdapter
              : routeToTry.externalModel.providerKey === "gemini"
              ? ModelOrchestrator.geminiAdapter
              : ModelOrchestrator.anthropicAdapter;

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
              CircuitBreaker.recordSuccess(routeToTry.externalModel.providerKey);
              hasError = false;
              return;
            }
          } catch (err) {
            hasError = true;
            const rawErr = (err as Error).message || String(err);
            lastErrorMessage = rawErr.includes("429")
              ? "API quota or credits exhausted (429)"
              : rawErr.includes("503")
              ? "Service high demand (503)"
              : rawErr.slice(0, 100);
            errorCategory = (err as Error).name || "ProviderError";
            CircuitBreaker.recordFailure(routeToTry.externalModel.providerKey, err as Error);
            // Loop continues to attempt next route candidate
          }
        }

        // If all providers failed, emit diagnostic message
        yield {
          id: `err_${Date.now()}`,
          textDelta: `[AI Provider Notice: All configured AI model providers encountered an error.\nLast error: ${lastErrorMessage}\n\nTroubleshooting:\n- If using OpenAI, check billing credits at https://platform.openai.com/settings/organization/billing/.\n- Or switch model selection to Gemini in the top-right model selector.]`,
          isComplete: true,
          finishReason: "stop",
        };
      } finally {
        const latencyMs = Date.now() - startTime;
        const inputPrice = activeRoute.externalModel.inputPricePerMillionUSD || 0.15;
        const outputPrice = activeRoute.externalModel.outputPricePerMillionUSD || 0.6;
        const estimatedCostUSD =
          (promptTokens * inputPrice + completionTokens * outputPrice) / 1000000;

        // Record telemetry event safely
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
