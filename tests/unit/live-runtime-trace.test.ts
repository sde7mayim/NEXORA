import { describe, it, expect } from "vitest";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { ImageCreativeService } from "@/lib/ai/creative/image-service";
import { CreativeDetector } from "@/lib/ai/creative/creative-detector";

describe("LIVE RUNTIME TRACE — SIMPLE PROMPT TO REAL PROVIDER", () => {
  it("traces real execution for prompt: 'Create a realistic image of a dog playing with a ball in a sunny park.'", async () => {
    const prompt = "Create a realistic image of a dog playing with a ball in a sunny park.";

    // 1. Intent Detection
    const detection = CreativeDetector.detect(prompt);
    console.log("[LIVE TRACE] Step 1 Detection:", {
      isCreativeIntent: detection.isCreativeIntent,
      intent: detection.intent,
      creativeType: detection.creativeType,
      prompt: detection.prompt,
      parameters: detection.parameters,
    });

    expect(detection.isCreativeIntent).toBe(true);
    expect(detection.creativeType).toBe("image");

    // 2. Real Execution across configured providers
    const artifact = await ImageCreativeService.generateImage({
      prompt: detection.prompt || prompt,
      style: (detection.parameters?.style as any) || "realistic",
      provider: "auto",
    });

    console.log("[LIVE TRACE] Step 2 Result Artifact:", {
      status: artifact.status,
      title: artifact.title,
      subtitle: artifact.subtitle,
      errorCategory: artifact.errorCategory,
      errorMessage: artifact.errorMessage,
      suggestedNextStep: artifact.suggestedNextStep,
      mediaUrlPresent: !!artifact.mediaUrl,
      provider: artifact.imageMetadata?.provider,
    });

    // 3. Must NEVER return placeholder graphic as success
    if (artifact.status === "ready") {
      expect(artifact.mediaUrl).toBeDefined();
      expect(artifact.mediaUrl).not.toContain("svg");
    } else {
      // Must return truthful status and category
      expect(["rate_limited", "unsupported", "failed"]).toContain(artifact.status);
      expect(artifact.errorCategory).toBeDefined();
      expect(artifact.suggestedNextStep).toBeDefined();
      expect(artifact.mediaUrl).toBeUndefined();
    }
  }, 45000);
});

