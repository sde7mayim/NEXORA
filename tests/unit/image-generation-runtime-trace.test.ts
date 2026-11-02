import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ImageProviderAdapter } from "@/lib/ai/creative/image-provider-adapter";
import { ImageCreativeService } from "@/lib/ai/creative/image-service";
import { CreativeDetector } from "@/lib/ai/creative/creative-detector";

describe("NEXORA — IMAGE GENERATION RUNTIME TRACE & ERROR VALIDATION", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ==========================================================================
  // 1. END-TO-END TRACE: PROMPT -> INTENT DETECTION
  // ==========================================================================
  describe("1. Request Trace & Intent Detection", () => {
    it("traces 'Create a realistic image of a dog playing with a ball in a sunny park.' to image generation", () => {
      const prompt = "Create a realistic image of a dog playing with a ball in a sunny park.";
      const detection = CreativeDetector.detect(prompt);

      expect(detection.isCreativeIntent).toBe(true);
      expect(detection.creativeType).toBe("image");
      expect(detection.prompt?.toLowerCase()).toContain("dog playing with a ball");
      expect(detection.parameters?.style).toBe("realistic");
    });
  });

  // ==========================================================================
  // 2. IMAGE DATA VALIDATION (MIME, MAGIC BYTES, DATA URI, HTTPS)
  // ==========================================================================
  describe("2. Image Data Binary Validation", () => {
    it("accepts valid PNG data URI with real PNG magic header", () => {
      // 89 50 4E 47 0D 0A 1A 0A followed by dummy data > 100 bytes
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(120).fill(0)]);
      const validPngDataUri = `data:image/png;base64,${pngHeader.toString("base64")}`;

      expect(() => {
        ImageProviderAdapter.validateImageData(validPngDataUri, 1024, 1024);
      }).not.toThrow();
    });

    it("accepts valid JPEG data URI with real JPEG magic header", () => {
      const jpgHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...new Array(120).fill(0)]);
      const validJpgDataUri = `data:image/jpeg;base64,${jpgHeader.toString("base64")}`;

      expect(() => {
        ImageProviderAdapter.validateImageData(validJpgDataUri, 1024, 1024);
      }).not.toThrow();
    });

    it("accepts valid HTTPS image URL", () => {
      expect(() => {
        ImageProviderAdapter.validateImageData("https://oaidalleapiprodscus.blob.core.windows.net/test-image.png");
      }).not.toThrow();
    });

    it("rejects truncated or empty data URI (< 100 bytes)", () => {
      const emptyUri = "data:image/png;base64,iVBORw0KGgo=";
      expect(() => {
        ImageProviderAdapter.validateImageData(emptyUri);
      }).toThrow(/truncated|empty/i);
    });

    it("rejects corrupt binary with invalid magic bytes", () => {
      const fakeHeader = Buffer.from([0x00, 0x00, 0x00, 0x00, ...new Array(120).fill(0)]);
      const corruptUri = `data:image/png;base64,${fakeHeader.toString("base64")}`;

      expect(() => {
        ImageProviderAdapter.validateImageData(corruptUri);
      }).toThrow(/magic binary header/i);
    });
  });

  // ==========================================================================
  // 3. GOOGLE GEMINI IMAGE GENERATION (GEMINI-2.5-FLASH-IMAGE VIA GENERATECONTENT)
  // ==========================================================================
  describe("3. Google Gemini Image Provider Integration", () => {
    it("uses gemini-2.5-flash-image generateContent endpoint and never calls retired predict", async () => {
      process.env.GEMINI_API_KEY = "test_gemini_key_123";

      let capturedUrl = "";
      let capturedBody: any = null;

      const mockPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(120).fill(0)]);
      const mockBase64 = mockPngHeader.toString("base64");

      vi.spyOn(global, "fetch").mockImplementation(async (url: any, init: any) => {
        capturedUrl = url.toString();
        capturedBody = JSON.parse(init.body as string);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: "image/png",
                        data: mockBase64,
                      },
                    },
                  ],
                },
              },
            ],
          }),
        } as any;
      });

      const result = await ImageProviderAdapter.generate({
        prompt: "A cute dog in the park",
        enhancedPrompt: "A cute dog in the park, 8k",
        provider: "gemini",
        aspectRatio: "16:9",
      });

      expect(capturedUrl).toContain("gemini-2.5-flash-image:generateContent");
      expect(capturedUrl).not.toContain("imagen-3.0-generate-002:predict");
      expect(capturedBody.generationConfig.responseModalities).toEqual(["IMAGE"]);
      expect(capturedBody.generationConfig.imageConfig.aspectRatio).toBe("16:9");
      expect(result.mediaUrl.startsWith("data:image/png;base64,")).toBe(true);
      expect(result.provider).toBe("Google Gemini");
    });
  });

  // ==========================================================================
  // 4. OPENAI IMAGE GENERATION (GPT-IMAGE & DALL-E-3 PARAMETER SANITIZATION)
  // ==========================================================================
  describe("4. OpenAI Image Provider Integration", () => {
    it("sanitizes parameters for gpt-image models (no style or response_format)", async () => {
      process.env.OPENAI_API_KEY = "test_openai_key_123";
      process.env.OPENAI_IMAGE_MODEL = "gpt-image-1.5";

      let capturedBody: any = null;

      vi.spyOn(global, "fetch").mockImplementation(async (_url: any, init: any) => {
        capturedBody = JSON.parse(init.body as string);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                url: "https://oaidalleapiprodscus.blob.core.windows.net/success-image.png",
                revised_prompt: "A realistic dog playing with a ball in sunny park",
              },
            ],
          }),
        } as any;
      });

      const result = await ImageProviderAdapter.generate({
        prompt: "A dog playing with a ball",
        enhancedPrompt: "A dog playing with a ball, photorealistic",
        provider: "openai",
        style: "realistic",
        aspectRatio: "1:1",
      });

      expect(capturedBody.model).toBe("gpt-image-1.5");
      expect(capturedBody.style).toBeUndefined(); // Style must NOT be sent to gpt-image models
      expect(capturedBody.response_format).toBeUndefined(); // response_format must NOT be sent
      expect(result.mediaUrl).toBe("https://oaidalleapiprodscus.blob.core.windows.net/success-image.png");
      expect(result.provider).toBe("OpenAI");
    });

    it("parses base64 b64_json payloads from OpenAI", async () => {
      process.env.OPENAI_API_KEY = "test_openai_key_123";

      const mockPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(120).fill(0)]);
      const mockBase64 = mockPngHeader.toString("base64");

      vi.spyOn(global, "fetch").mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                b64_json: mockBase64,
                revised_prompt: "A realistic dog in park",
              },
            ],
          }),
        } as any;
      });

      const result = await ImageProviderAdapter.generate({
        prompt: "A dog in the park",
        enhancedPrompt: "A dog in the park",
        provider: "openai",
      });

      expect(result.mediaUrl.startsWith("data:image/png;base64,")).toBe(true);
    });
  });

  // ==========================================================================
  // 5. TRUTHFUL ERROR CATEGORIZATION (9 DISTINCT CATEGORIES)
  // ==========================================================================
  describe("5. Truthful Error Categorization & Action Guidance", () => {
    it("categorizes OpenAI credit exhaustion as provider_credits_exhausted", async () => {
      process.env.OPENAI_API_KEY = "test_key";

      vi.spyOn(global, "fetch").mockImplementation(async () => {
        return {
          ok: false,
          status: 429,
          json: async () => ({
            error: {
              message: "You have no credits remaining. Add credits to continue using the API.",
              type: "insufficient_quota",
              code: "credit_balance_exhausted",
            },
          }),
        } as any;
      });

      const artifact = await ImageCreativeService.generateImage({
        prompt: "A dog in the park",
        provider: "openai",
      });

      expect(artifact.status).toBe("rate_limited");
      expect(artifact.errorCategory).toBe("provider_credits_exhausted");
      expect(artifact.mediaUrl).toBeUndefined(); // Never returns fake image
      expect(artifact.suggestedNextStep).toContain("Add credits in OpenAI");
    });

    it("categorizes Google quota exhaustion as provider_credits_exhausted", async () => {
      process.env.GEMINI_API_KEY = "test_key";

      vi.spyOn(global, "fetch").mockImplementation(async () => {
        return {
          ok: false,
          status: 429,
          json: async () => ({
            error: {
              code: 429,
              message: "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0",
              status: "RESOURCE_EXHAUSTED",
            },
          }),
        } as any;
      });

      const artifact = await ImageCreativeService.generateImage({
        prompt: "A dog in the park",
        provider: "gemini",
      });

      expect(artifact.status).toBe("rate_limited");
      expect(artifact.errorCategory).toBe("provider_credits_exhausted");
      expect(artifact.suggestedNextStep).toContain("Google AI Studio");
    });

    it("categorizes missing API key as missing_api_key with configuration guidance", async () => {
      delete process.env.OPENAI_API_KEY;

      const artifact = await ImageCreativeService.generateImage({
        prompt: "A dog in the park",
        provider: "openai",
      });

      expect(artifact.status).toBe("unsupported");
      expect(artifact.errorCategory).toBe("missing_api_key");
      expect(artifact.suggestedNextStep).toContain(".env.local");
    });

    it("categorizes unknown parameter as invalid_provider_request", async () => {
      process.env.OPENAI_API_KEY = "test_key";

      vi.spyOn(global, "fetch").mockImplementation(async () => {
        return {
          ok: false,
          status: 400,
          json: async () => ({
            error: {
              message: "Unknown parameter: 'response_format'.",
              code: "unknown_parameter",
            },
          }),
        } as any;
      });

      const artifact = await ImageCreativeService.generateImage({
        prompt: "A dog in the park",
        provider: "openai",
      });

      expect(artifact.status).toBe("failed");
      expect(artifact.errorCategory).toBe("invalid_provider_request");
    });

    it("categorizes model not found as unsupported_model", async () => {
      process.env.OPENAI_API_KEY = "test_key";

      vi.spyOn(global, "fetch").mockImplementation(async () => {
        return {
          ok: false,
          status: 400,
          json: async () => ({
            error: {
              message: "The model 'dall-e-3' does not exist.",
              code: "invalid_value",
            },
          }),
        } as any;
      });

      const artifact = await ImageCreativeService.generateImage({
        prompt: "A dog in the park",
        provider: "openai",
      });

      expect(artifact.status).toBe("unsupported");
      expect(artifact.errorCategory).toBe("unsupported_model");
    });
  });
});

