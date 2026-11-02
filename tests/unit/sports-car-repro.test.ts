import { describe, it, expect } from "vitest";
import { ModelRouter } from "@/lib/ai/router";
import { ModelRegistry } from "@/lib/ai/model-registry";

describe("MODEL ROUTING VERIFICATION", () => {
  it("resolves routes for nexora-image", () => {
    const routes = ModelRouter.resolveRoutes("nexora-image", "free");
    console.log("nexora-image routes:", routes.map(r => ({
      provider: r.externalModel.providerKey,
      model: r.externalModel.providerModelId,
      capabilities: r.externalModel.capabilities
    })));
    expect(routes.length).toBeGreaterThan(0);
  });

  it("checks nexora-core capabilities", () => {
    const routes = ModelRouter.resolveRoutes("nexora-core", "free");
    console.log("nexora-core routes:", routes.map(r => ({
      provider: r.externalModel.providerKey,
      model: r.externalModel.providerModelId,
      capabilities: r.externalModel.capabilities
    })));
  });
});
