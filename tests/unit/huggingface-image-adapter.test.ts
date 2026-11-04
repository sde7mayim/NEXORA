import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HuggingFaceImageAdapter } from "@/lib/ai/creative/huggingface-image-adapter";
import { ImageProviderAdapter } from "@/lib/ai/creative/image-provider-adapter";
import { ImageCreativeService } from "@/lib/ai/creative/image-service";
import { ModelRegistry } from "@/lib/ai/model-registry";

describe("NEXORA — HUGGING FACE INFERENCE IMAGE ENGINE", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("1. Server-Side Configuration & Security", () => {
    it("parses server-side HF_TOKEN and defaults to FLUX.1-schnell on active router", () => {
      process.env.HF_TOKEN = "hf_valid_test_token_12345";
      delete process.env.HF_IMAGE_MODEL;

      const config = HuggingFaceImageAdapter.getConfig();
      expect(config.token).toBe("hf_valid_test_token_12345");
      expect(config.model).toBe("black-forest-labs/FLUX.1-schnell");
      expect(config.routerUrl).toBe("https://router.huggingface.co/hf-inference/models");
      expect(HuggingFaceImageAdapter.isConfigured()).toBe(true);
    });

    it("treats placeholder dummy tokens as unconfigured", () => {
      process.env.HF_TOKEN = "your-hf-token-here";
      expect(HuggingFaceImageAdapter.isConfigured()).toBe(false);
      expect(HuggingFaceImageAdapter.getConfig().token).toBeUndefined();
    });

    it("respects custom HF_IMAGE_MODEL override (e.g. SDXL)", () => {
      process.env.HF_TOKEN = "hf_token_custom_model";
      process.env.HF_IMAGE_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";

      const config = HuggingFaceImageAdapter.getConfig();
      expect(config.model).toBe("stabilityai/stable-diffusion-xl-base-1.0");
    });
  });

  describe("2. Binary Raster Image Integrity (Magic Bytes)", () => {
    it("validates genuine binary PNG magic bytes (0x89 0x50 0x4E 0x47)", () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const padding = Buffer.alloc(1024);
      const buffer = Buffer.concat([pngHeader, padding]);

      const format = HuggingFaceImageAdapter.validateBinaryImage(buffer, "image/png");
      expect(format).toBe("png");
    });

    it("validates genuine binary JPEG magic bytes (0xFF 0xD8 0xFF)", () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const padding = Buffer.alloc(1024);
      const buffer = Buffer.concat([jpegHeader, padding]);

      const format = HuggingFaceImageAdapter.validateBinaryImage(buffer, "image/jpeg");
      expect(format).toBe("jpeg");
    });

    it("rejects payloads smaller than 1024 bytes threshold", () => {
      const smallBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      expect(() => {
        HuggingFaceImageAdapter.validateBinaryImage(smallBuffer, "image/png");
      }).toThrow(/truncated payload/i);
    });

    it("rejects HTML or JSON masquerading under image MIME type", () => {
      const htmlBuffer = Buffer.from("<html><body>502 Bad Gateway</body></html>" + "x".repeat(1024));
      expect(() => {
        HuggingFaceImageAdapter.validateBinaryImage(htmlBuffer, "image/jpeg");
      }).toThrow(/does not match PNG, JPEG, or WebP/i);
    });
  });

  describe("3. Upstream Error Handling & Model Loading States", () => {
    it("throws a clean missing_api_key error when HF_TOKEN is absent", async () => {
      delete process.env.HF_TOKEN;
      delete process.env.HUGGINGFACE_API_KEY;

      await expect(
        HuggingFaceImageAdapter.generate({
          prompt: "A sports car",
          enhancedPrompt: "A sports car",
        })
      ).rejects.toMatchObject({
        category: "missing_api_key",
        message: expect.stringContaining("HF_TOKEN is not configured"),
      });
    });

    it("truthfully handles HTTP 401 invalid user credentials", async () => {
      process.env.HF_TOKEN = "hf_invalid_token";

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: new Headers(),
        text: async () => JSON.stringify({ error: "Invalid username or password." }),
        json: async () => ({ error: "Invalid username or password." }),
      } as any);

      await expect(
        HuggingFaceImageAdapter.generate({
          prompt: "A sports car",
          enhancedPrompt: "A sports car",
        })
      ).rejects.toMatchObject({
        category: "invalid_credentials",
        message: expect.stringContaining("Invalid access token"),
      });
    });

    it("handles HTTP 503 model-loading state with estimated wait time", async () => {
      process.env.HF_TOKEN = "hf_valid_token";

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        headers: new Headers(),
        text: async () => JSON.stringify({ error: "Model is currently loading", estimated_time: 20.5 }),
        json: async () => ({ error: "Model is currently loading", estimated_time: 20.5 }),
      } as any);

      await expect(
        HuggingFaceImageAdapter.generate({
          prompt: "A sports car",
          enhancedPrompt: "A sports car",
        })
      ).rejects.toMatchObject({
        category: "provider_unavailable",
        message: expect.stringContaining("estimated loading time: 21s"),
      });
    });
  });

  describe("4. End-to-End Generation & Failover Isolation", () => {
    it("returns genuine raster data URI when Hugging Face succeeds", async () => {
      process.env.HF_TOKEN = "hf_live_working_token";

      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const padding = Buffer.alloc(2048);
      const genuinePngBuffer = Buffer.concat([pngHeader, padding]);
      const uint8Array = new Uint8Array(genuinePngBuffer);

      vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
        if (String(url).includes("router.huggingface.co")) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "image/png" }),
            arrayBuffer: async () => uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength),
          } as any;
        }
        throw new Error("Unexpected fetch call: " + url);
      });

      const res = await ImageProviderAdapter.generate({
        provider: "huggingface",
        prompt: "A luxury sports car on a mountain road",
        enhancedPrompt: "A luxury sports car on a mountain road, 8k photorealistic",
        aspectRatio: "16:9",
      });

      expect(res.provider).toBe("Hugging Face");
      expect(res.model).toBe("black-forest-labs/FLUX.1-schnell");
      expect(res.format).toBe("png");
      expect(res.mediaUrl.startsWith("data:image/png;base64,")).toBe(true);
    });

    it("NEVER falls back to OpenAI or Gemini when Hugging Face is explicitly requested and fails", async () => {
      process.env.HF_TOKEN = "hf_token_failing";
      process.env.OPENAI_API_KEY = "sk-proj-do-not-call-this";
      process.env.GEMINI_API_KEY = "AQ-do-not-call-this";

      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
        const u = String(url);
        if (u.includes("huggingface.co")) {
          return {
            ok: false,
            status: 429,
            statusText: "Too Many Requests",
            headers: new Headers(),
            text: async () => JSON.stringify({ error: "Rate limit exceeded" }),
          } as any;
        }
        if (u.includes("openai.com") || u.includes("googleapis.com")) {
          throw new Error("VIOLATION: Paid commercial API called during Hugging Face request!");
        }
        throw new Error("Unexpected fetch: " + u);
      });

      await expect(
        ImageProviderAdapter.generate({
          provider: "huggingface",
          prompt: "A sports car",
          enhancedPrompt: "A sports car",
        })
      ).rejects.toThrow(/Rate limit exceeded/i);

      // Verify fetch was only called for Hugging Face endpoints
      for (const call of fetchSpy.mock.calls) {
        expect(String(call[0])).toContain("huggingface.co");
      }
    });

    it("produces a clean user-friendly card without fake images when HF token is missing", async () => {
      delete process.env.HF_TOKEN;
      delete process.env.HUGGINGFACE_API_KEY;

      const artifact = await ImageCreativeService.generateImage({
        prompt: "I want to create an image of a sports car",
        provider: "huggingface",
      });

      expect(artifact.status).toBe("unsupported");
      expect(artifact.mediaUrl).toBeUndefined();
      expect(artifact.errorCategory).toBe("missing_api_key");
      expect(artifact.subtitle).toContain("HF Token Required");
      expect(artifact.errorMessage).toContain("Hugging Face access token is not configured");
      expect(artifact.suggestedNextStep).toContain("https://huggingface.co/settings/tokens");
    });
  });

  describe("5. Model Registry & Routing Verification", () => {
    it("registers Hugging Face models in the verified registry", () => {
      const fluxModel = ModelRegistry.getExternalModel("huggingface:flux-schnell");
      expect(fluxModel).toBeDefined();
      expect(fluxModel?.providerKey).toBe("huggingface");
      expect(fluxModel?.capabilities.supportsImageGeneration).toBe(true);
      expect(fluxModel?.endpointUrl).toContain("router.huggingface.co");

      const sdxlModel = ModelRegistry.getExternalModel("huggingface:sdxl-base");
      expect(sdxlModel).toBeDefined();
      expect(sdxlModel?.providerKey).toBe("huggingface");
      expect(sdxlModel?.capabilities.supportsImageGeneration).toBe(true);
    });

    it("routes nexora-image@1.0.0 through huggingface as an enabled fallback", () => {
      const routes = ModelRegistry.getRoutesForVersion("nexora-image@1.0.0");
      const hfRoute = routes.find((r) => r.externalModelId === "huggingface:flux-schnell");
      expect(hfRoute).toBeDefined();
      expect(hfRoute?.enabled).toBe(true);
    });
  });
});
