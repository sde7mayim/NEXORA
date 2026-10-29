import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ProviderStatusService, AIProviderKey } from "@/lib/ai/provider-status";
import { ModelRouter } from "@/lib/ai/router";
import { ModelOrchestrator } from "@/lib/ai/orchestrator";
import { CircuitBreaker } from "@/lib/ai/circuit-breaker";

describe("AI Provider Configuration, Routing & Failover Resilience", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    ProviderStatusService.resetCache();
    CircuitBreaker.resetAll();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // 1. Safe Environment Reading and Sanitization
  it("scenario 1: correctly sanitizes and reads environment variables with quotes and whitespace", () => {
    process.env.GEMINI_API_KEY = '  "AIzaSyMockKeyForGemini12345"  ';
    process.env.OPENAI_API_KEY = "  'sk-mockopenaiwithsingleq'  ";
    delete process.env.ANTHROPIC_API_KEY;

    ProviderStatusService.resetCache();

    expect(ProviderStatusService.getApiKey("gemini")).toBe("AIzaSyMockKeyForGemini12345");
    expect(ProviderStatusService.getApiKey("openai")).toBe("sk-mockopenaiwithsingleq");
    expect(ProviderStatusService.getApiKey("anthropic")).toBeUndefined();
    expect(ProviderStatusService.isConfigured("gemini")).toBe(true);
    expect(ProviderStatusService.isConfigured("openai")).toBe(true);
    expect(ProviderStatusService.isConfigured("anthropic")).toBe(false);
  });

  // 2. Zero Keys Configured
  it("scenario 2: zero keys configured emits setup notice without network requests or errors", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    vi.spyOn(ProviderStatusService, "getApiKey").mockReturnValue(undefined);

    expect(ProviderStatusService.getConfiguredProviders()).toHaveLength(0);

    const result = await ModelOrchestrator.orchestrateStream({
      modelSelectionId: "nexora-vision",
      userPlanId: "pro",
      messages: [{ role: "user", content: "Hello" }],
    });

    const chunks = [];
    for await (const chunk of result.stream) {
      chunks.push(chunk.textDelta);
    }
    const fullText = chunks.join("");
    expect(fullText).toContain("[AI Provider Notice: No AI Providers Configured]");
    expect(fullText).toContain("GEMINI_API_KEY");
  });

  // 3. Only Gemini Configured
  it("scenario 3: only Gemini configured routes to Gemini and completely excludes OpenAI and Anthropic", () => {
    vi.spyOn(ProviderStatusService, "isConfigured").mockImplementation((key) => key === "gemini");
    vi.spyOn(ProviderStatusService, "getConfiguredProviders").mockReturnValue(["gemini"]);

    const routes = ModelRouter.resolveRoutes("nexora-core", "free");
    expect(routes.length).toBeGreaterThan(0);
    for (const r of routes) {
      expect(r.externalModel.providerKey).toBe("gemini");
    }
  });

  // 4. Only OpenAI Configured
  it("scenario 4: only OpenAI configured routes to OpenAI and completely excludes Gemini and Anthropic", () => {
    vi.spyOn(ProviderStatusService, "isConfigured").mockImplementation((key) => key === "openai");
    vi.spyOn(ProviderStatusService, "getConfiguredProviders").mockReturnValue(["openai"]);

    const routes = ModelRouter.resolveRoutes("nexora-core", "free");
    expect(routes.length).toBeGreaterThan(0);
    for (const r of routes) {
      expect(r.externalModel.providerKey).toBe("openai");
    }
  });

  // 5. Only Anthropic Configured
  it("scenario 5: only Anthropic configured routes to Anthropic and excludes others", () => {
    vi.spyOn(ProviderStatusService, "isConfigured").mockImplementation((key) => key === "anthropic");
    vi.spyOn(ProviderStatusService, "getConfiguredProviders").mockReturnValue(["anthropic"]);

    const routes = ModelRouter.resolveRoutes("nexora-core", "pro");
    expect(routes.length).toBeGreaterThan(0);
    for (const r of routes) {
      expect(r.externalModel.providerKey).toBe("anthropic");
    }
  });

  // 6. Direct Model Validation for Unconfigured Provider
  it("scenario 6: requesting unconfigured direct model rejects upfront with clear instructions", async () => {
    vi.spyOn(ProviderStatusService, "isConfigured").mockImplementation((key) => key === "gemini");
    vi.spyOn(ProviderStatusService, "getConfiguredProviders").mockReturnValue(["gemini"]);

    const directCheck = ModelRouter.validateDirectModelConfig("anthropic:claude-3-5-sonnet");
    expect(directCheck.valid).toBe(false);
    expect(directCheck.error).toContain("ANTHROPIC_API_KEY");

    const result = await ModelOrchestrator.orchestrateStream({
      modelSelectionId: "anthropic:claude-3-5-sonnet",
      messages: [{ role: "user", content: "Tell me a story" }],
    });

    const chunks = [];
    for await (const chunk of result.stream) {
      chunks.push(chunk.textDelta);
    }
    const fullText = chunks.join("");
    expect(fullText).toContain("[AI Provider Notice: Provider Not Configured]");
    expect(fullText).toContain("ANTHROPIC_API_KEY");
  });

  // 7. Error Categorization: 401 Auth Error
  it("scenario 7: accurately categorizes 401 Unauthorized as auth_error", () => {
    const error401 = new Error("Incorrect API key provided: sk-proj-12345");
    (error401 as any).status = 401;

    expect(ProviderStatusService.categorizeError(error401)).toBe("auth_error");
    ProviderStatusService.recordError("openai", error401);
    expect(ProviderStatusService.getStatus("openai").state).toBe("auth_error");
  });

  // 8. Error Categorization: 429 Quota Exceeded vs Rate Limited
  it("scenario 8: accurately distinguishes quota_error from rate_limited for 429", () => {
    const quotaErr = new Error("You exceeded your current quota, please check your plan and billing details.");
    (quotaErr as any).status = 429;
    expect(ProviderStatusService.categorizeError(quotaErr)).toBe("quota_error");

    const rateLimitErr = new Error("Rate limit reached for requests per minute. Try again in 20s.");
    (rateLimitErr as any).status = 429;
    expect(ProviderStatusService.categorizeError(rateLimitErr)).toBe("rate_limited");
  });

  // 9. Error Categorization: 500/503 Temporary Failure and 404 Model Unavailable
  it("scenario 9: categorizes 503 as temporary_failure and 404 as model_unavailable", () => {
    const err503 = new Error("The service is temporarily unavailable (503)");
    (err503 as any).status = 503;
    expect(ProviderStatusService.categorizeError(err503)).toBe("temporary_failure");

    const err404 = new Error("models/gemini-3.5-flash is not found for API version v1beta");
    (err404 as any).status = 404;
    expect(ProviderStatusService.categorizeError(err404)).toBe("model_unavailable");
  });

  // 10. Fallback Cascade Skips Unconfigured Providers Completely
  it("scenario 10: failover skips unconfigured providers without attempting them", async () => {
    // Gemini & OpenAI are configured; Anthropic is NOT configured.
    vi.spyOn(ProviderStatusService, "isConfigured").mockImplementation(
      (key) => key === "openai" || key === "gemini"
    );
    vi.spyOn(ProviderStatusService, "getConfiguredProviders").mockReturnValue(["openai", "gemini"]);

    // Mock OpenAI adapter to fail with 429 quota error
    const mockOpenAIStream = vi.fn().mockImplementation(() => {
      throw Object.assign(new Error("You exceeded your current quota"), { status: 429 });
    });
    vi.spyOn(ModelOrchestrator["openaiAdapter"], "streamCompletion").mockImplementation(mockOpenAIStream);

    // Mock Gemini adapter to succeed
    async function* mockGeminiSuccess() {
      yield {
        id: "chunk_1",
        textDelta: "Hello from Gemini Fallback!",
        isComplete: false,
      };
      yield {
        id: "chunk_2",
        textDelta: "",
        isComplete: true,
      };
    }
    const mockGeminiStream = vi.fn().mockReturnValue(mockGeminiSuccess());
    vi.spyOn(ModelOrchestrator["geminiAdapter"], "streamCompletion").mockImplementation(mockGeminiStream);

    const mockAnthropicStream = vi.fn();
    vi.spyOn(ModelOrchestrator["anthropicAdapter"], "streamCompletion").mockImplementation(mockAnthropicStream);

    const result = await ModelOrchestrator.orchestrateStream({
      modelSelectionId: "nexora-vision",
      userPlanId: "pro",
      messages: [{ role: "user", content: "Generate report" }],
    });

    const chunks = [];
    for await (const chunk of result.stream) {
      chunks.push(chunk.textDelta);
    }
    const fullText = chunks.join("");

    expect(fullText).toContain("Hello from Gemini Fallback!");
    // Anthropic was NOT configured, so it must NEVER be called!
    expect(mockAnthropicStream).not.toHaveBeenCalled();
    // OpenAI was attempted once (no retries for 429)
    expect(mockOpenAIStream).toHaveBeenCalledTimes(1);
    // Gemini was attempted and succeeded
    expect(mockGeminiStream).toHaveBeenCalledTimes(1);
  });

  // 11. No Fabricated Fallback Responses When All Fail
  it("scenario 11: when all configured providers fail, emits clear diagnostic without fake code or articles", async () => {
    vi.spyOn(ProviderStatusService, "isConfigured").mockImplementation((key) => key === "openai");
    vi.spyOn(ProviderStatusService, "getConfiguredProviders").mockReturnValue(["openai"]);

    vi.spyOn(ModelOrchestrator["openaiAdapter"], "streamCompletion").mockImplementation(() => {
      throw Object.assign(new Error("Billing quota exceeded"), { status: 429 });
    });

    const result = await ModelOrchestrator.orchestrateStream({
      modelSelectionId: "nexora-core",
      messages: [{ role: "user", content: "Tell me about React" }],
    });

    const chunks = [];
    for await (const chunk of result.stream) {
      chunks.push(chunk.textDelta);
    }
    const fullText = chunks.join("");

    expect(fullText).toContain("[AI Provider Notice: All attempted AI model providers encountered an error]");
    expect(fullText).toContain("OPENAI");
    expect(fullText).toContain("Quota exceeded or credits exhausted");
    // Ensure no fabricated React paragraphs
    expect(fullText).not.toContain("Virtual DOM");
    expect(fullText).not.toContain("open-source, component-based");
  });

  // 12. Safe Diagnostics Never Leak Secret Keys
  it("scenario 12: safe status summary never exposes secret API keys", () => {
    process.env.GEMINI_API_KEY = "AIzaSySuperSecretGeminiKey999";
    process.env.OPENAI_API_KEY = "sk-proj-SuperSecretOpenAIKey888";
    ProviderStatusService.resetCache();

    const summary = ProviderStatusService.getSafeStatusSummary();

    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain("AIzaSySuperSecretGeminiKey999");
    expect(serialized).not.toContain("sk-proj-SuperSecretOpenAIKey888");

    expect(summary.gemini.isConfigured).toBe(true);
    expect(summary.gemini.state).toBe("configured_unverified");
    expect(summary.openai.isConfigured).toBe(true);
    expect(summary.anthropic.isConfigured).toBe(false);
  });

  // 13. Dynamic Default Model Selection
  it("scenario 13: getDefaultModelSelection selects appropriate model based on configured providers", () => {
    vi.spyOn(ProviderStatusService, "isConfigured").mockImplementation((key) => key === "gemini");
    const geminiDefault = ModelRouter.getDefaultModelSelection("free");
    expect(geminiDefault).toBe("nexora-core");

    vi.spyOn(ProviderStatusService, "isConfigured").mockImplementation((key) => key === "anthropic");
    const anthropicDefault = ModelRouter.getDefaultModelSelection("pro");
    expect(anthropicDefault).toBe("nexora-core");
  });

  // 14. Circuit Breaker and Provider Status Integration
  it("scenario 14: records success and resets failure counters", () => {
    ProviderStatusService.recordSuccess("gemini");
    const status = ProviderStatusService.getStatus("gemini");
    expect(status.state).toBe("available");
    expect(status.isConfigured).toBe(true);
    expect(status.consecutiveFailures).toBe(0);
  });

  // 15. Transient 503 Retries Once Before Failing Over
  it("scenario 15: retries transient 503 error boundedly before failing over", async () => {
    vi.spyOn(ProviderStatusService, "isConfigured").mockImplementation(
      (key) => key === "openai" || key === "gemini"
    );
    vi.spyOn(ProviderStatusService, "getConfiguredProviders").mockReturnValue(["openai", "gemini"]);

    let openaiCallCount = 0;
    vi.spyOn(ModelOrchestrator["openaiAdapter"], "streamCompletion").mockImplementation(() => {
      openaiCallCount++;
      throw Object.assign(new Error("Service Unavailable"), { status: 503 });
    });

    async function* mockGeminiSuccess() {
      yield { id: "1", textDelta: "Gemini rescued transient failure", isComplete: true };
    }
    vi.spyOn(ModelOrchestrator["geminiAdapter"], "streamCompletion").mockReturnValue(mockGeminiSuccess());

    const result = await ModelOrchestrator.orchestrateStream({
      modelSelectionId: "nexora-vision",
      userPlanId: "pro",
      messages: [{ role: "user", content: "Hello" }],
    });

    const chunks = [];
    for await (const chunk of result.stream) {
      chunks.push(chunk.textDelta);
    }
    const fullText = chunks.join("");

    expect(fullText).toContain("Gemini rescued transient failure");
    // OpenAI should have attempted twice (initial + 1 bounded retry)
    expect(openaiCallCount).toBe(2);
  });
});
