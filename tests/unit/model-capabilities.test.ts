import { describe, it, expect } from "vitest";
import { ModelRouter } from "@/lib/ai/router";

describe("Model Capability Verification Engine", () => {
  it("should reject vision requests for models that do not support vision", () => {
    // Nexora Swift does not support vision
    const check = ModelRouter.validateRequestCapabilities("nexora-swift", {
      requiresVision: true,
    });
    expect(check.valid).toBe(false);
    expect(check.reason).toContain("does not support image or visual analysis");
  });

  it("should accept vision requests for Nexora Vision, Core, Reason, and GPT-4o", () => {
    const visionCheck = ModelRouter.validateRequestCapabilities("nexora-vision", {
      requiresVision: true,
    });
    expect(visionCheck.valid).toBe(true);

    const coreCheck = ModelRouter.validateRequestCapabilities("nexora-core", {
      requiresVision: true,
    });
    expect(coreCheck.valid).toBe(true);

    const gpt4oCheck = ModelRouter.validateRequestCapabilities("openai:gpt-4o", {
      requiresVision: true,
    });
    expect(gpt4oCheck.valid).toBe(true);
  });

  it("should validate document capability requirements", () => {
    const docCheck = ModelRouter.validateRequestCapabilities("nexora-core", {
      requiresDocuments: true,
    });
    expect(docCheck.valid).toBe(true);
  });

  it("should validate web search capability requirements", () => {
    const searchCheck = ModelRouter.validateRequestCapabilities("nexora-reason", {
      requiresWebSearch: true,
    });
    expect(searchCheck.valid).toBe(true);
  });

  it("should reject unrecognized model identifiers gracefully", () => {
    const check = ModelRouter.validateRequestCapabilities("unknown-model-xyz", {
      requiresVision: true,
    });
    expect(check.valid).toBe(false);
    expect(check.reason).toContain("Unrecognized model identity");
  });
});
