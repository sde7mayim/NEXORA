import { describe, it, expect } from "vitest";
import { HuggingFaceImageAdapter } from "@/lib/ai/creative/huggingface-image-adapter";
import { ImageProviderAdapter } from "@/lib/ai/creative/image-provider-adapter";
import { ImageCreativeService } from "@/lib/ai/creative/image-service";

describe("Live AI Image Generation Verification", () => {
  it("checks Hugging Face configuration and handles prompt 'A photorealistic red sports car driving on a coastal highway at sunset, cinematic photography.'", async () => {
    const isHfConfigured = HuggingFaceImageAdapter.isConfigured();
    console.log("Hugging Face configured:", isHfConfigured);

    if (!isHfConfigured) {
      console.log("Status: NOT_CONFIGURED (HF_TOKEN is not configured on this device)");

      // Verify that calling Hugging Face throws explicit NOT_CONFIGURED error without retry
      await expect(
        HuggingFaceImageAdapter.generate({
          prompt: "A photorealistic red sports car driving on a coastal highway at sunset, cinematic photography.",
          enhancedPrompt: "A photorealistic red sports car driving on a coastal highway at sunset, cinematic photography.",
          aspectRatio: "1:1",
        })
      ).rejects.toThrow(/HF_TOKEN is not configured/);

      // Verify that ImageCreativeService does NOT fall back to paid engines or fabricate mock images
      const serviceResult = await ImageCreativeService.generateImage({
        prompt: "A photorealistic red sports car driving on a coastal highway at sunset, cinematic photography.",
        provider: "huggingface",
      });

      console.log("Service result status:", serviceResult.status);
      console.log("Service result errorMessage:", serviceResult.errorMessage);
      console.log("Service result mediaUrl:", serviceResult.mediaUrl);

      expect(serviceResult.status).toBe("unsupported");
      expect(serviceResult.mediaUrl).toBeUndefined();
      expect(serviceResult.errorMessage).toContain("Hugging Face access token is not configured");
    }
  });
});
