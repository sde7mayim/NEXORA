import { describe, it, expect } from "vitest";
import { ModelRegistry, NEXORA_MODEL_VERSIONS } from "@/lib/ai/model-registry";
import { ModelRouter } from "@/lib/ai/router";

describe("Model Registry & Routing Framework", () => {
  it("should retrieve verified external foundation models by provider ID", () => {
    const gpt4oMini = ModelRegistry.getExternalModel("openai:gpt-4o-mini");
    expect(gpt4oMini).toBeDefined();
    expect(gpt4oMini?.providerKey).toBe("openai");
    expect(gpt4oMini?.capabilities.supportsStreaming).toBe(true);

    const sonnet = ModelRegistry.getExternalModel("anthropic:claude-3-5-sonnet");
    expect(sonnet).toBeDefined();
    expect(sonnet?.providerKey).toBe("anthropic");
    expect(sonnet?.contextWindow).toBe(200000);
  });

  it("should maintain immutable published Nexora model versions", () => {
    const version = ModelRegistry.getModelVersion("nexora-core@1.0.0");
    expect(version).toBeDefined();
    expect(version?.status).toBe("published");
    expect(version?.versionLabel).toBe("1.0");
  });

  it("should resolve primary and fallback routes for branded profile", () => {
    const routes = ModelRouter.resolveRoutes("nexora-core", "pro");
    expect(routes.length).toBeGreaterThanOrEqual(2);
    expect(routes[0].routeRole).toBe("primary");
    expect(routes[1].routeRole).toBe("fallback");
  });

  it("should restrict Pro-only models for Free tier users", () => {
    expect(() => {
      ModelRouter.resolveRoutes("nexora-reason", "free");
    }).toThrow(/requires a Pro or Enterprise subscription/);

    expect(() => {
      ModelRouter.resolveRoutes("openai:gpt-4o", "free");
    }).toThrow(/requires a Pro or Enterprise subscription/);
  });

  it("should allow Free tier users to access Nexora Swift and Core", () => {
    const swiftRoutes = ModelRouter.resolveRoutes("nexora-swift", "free");
    expect(swiftRoutes.length).toBeGreaterThan(0);

    const coreRoutes = ModelRouter.resolveRoutes("nexora-core", "free");
    expect(coreRoutes.length).toBeGreaterThan(0);
  });
});
