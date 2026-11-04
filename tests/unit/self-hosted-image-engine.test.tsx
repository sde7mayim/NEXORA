import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SelfHostedImageAdapter } from "@/lib/ai/creative/self-hosted-image-adapter";
import { ImageProviderAdapter } from "@/lib/ai/creative/image-provider-adapter";
import { ImageCreativeService } from "@/lib/ai/creative/image-service";
import { CreativeArtifactCard } from "@/components/chat/creative-artifact-card";
import { LiveCodePreview } from "@/components/live-code-preview";
import { CreativeArtifact } from "@/lib/ai/creative/creative-types";

describe("NEXORA — SELF-HOSTED OPEN-WEIGHT IMAGE ENGINE ARCHITECTURE", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("1. Configuration & Open-Weight Model Resolution", () => {
    it("parses server-side configuration for self-hosted diffusion runtimes", () => {
      process.env.NEXORA_IMAGE_ENGINE_URL = "http://127.0.0.1:8000";
      process.env.NEXORA_IMAGE_ENGINE_MODEL = "sdxl-turbo";
      process.env.NEXORA_IMAGE_ENGINE_API_KEY = "test_key_123";

      const config = SelfHostedImageAdapter.getConfig();
      expect(config.url).toBe("http://127.0.0.1:8000");
      expect(config.model).toBe("sdxl-turbo");
      expect(config.apiKey).toBe("test_key_123");
      expect(config.enabled).toBe(true);
      expect(SelfHostedImageAdapter.isConfigured()).toBe(true);
    });

    it("resolves diffusion-compatible dimensions for SDXL Turbo and SD 1.5", () => {
      // SDXL Turbo / FLUX dimensions (multiples of 64)
      const sdxl11 = SelfHostedImageAdapter.resolveDimensions("1:1", "standard", "sdxl-turbo");
      expect(sdxl11).toEqual({ width: 1024, height: 1024 });

      const sdxl169 = SelfHostedImageAdapter.resolveDimensions("16:9", "standard", "sdxl-turbo");
      expect(sdxl169).toEqual({ width: 1024, height: 576 });

      const sdxl916 = SelfHostedImageAdapter.resolveDimensions("9:16", "standard", "sdxl-turbo");
      expect(sdxl916).toEqual({ width: 576, height: 1024 });

      // SD 1.5 dimensions (512 base)
      const sd1511 = SelfHostedImageAdapter.resolveDimensions("1:1", "standard", "stable-diffusion-v1-5");
      expect(sd1511).toEqual({ width: 512, height: 512 });

      const sd15169 = SelfHostedImageAdapter.resolveDimensions("16:9", "standard", "stable-diffusion-v1-5");
      expect(sd15169).toEqual({ width: 768, height: 432 });
    });

    it("detects when self-hosted engine is offline during health check", async () => {
      process.env.NEXORA_IMAGE_ENGINE_URL = "http://127.0.0.1:9999";
      vi.spyOn(global, "fetch").mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:9999"));

      const health = await SelfHostedImageAdapter.checkHealth();
      expect(health.online).toBe(false);
      expect(health.error).toContain("Could not reach self-hosted inference server");
    });
  });

  describe("2. Binary Payload Validation (No SVG / HTML Fakes)", () => {
    it("validates genuine binary PNG data with magic byte headers", () => {
      // 1024-byte dummy buffer starting with PNG magic header
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const padding = Buffer.alloc(1024);
      const fullPng = Buffer.concat([pngHeader, padding]);
      const validPngUri = `data:image/png;base64,${fullPng.toString("base64")}`;

      const res = SelfHostedImageAdapter.validateImageBinary(validPngUri);
      expect(res.format).toBe("png");
      expect(res.byteLength).toBeGreaterThanOrEqual(1024);
    });

    it("rejects SVG masquerading as an image file", () => {
      const svgUri = "data:image/svg+xml;base64,PHN2Zz48Y2lyY2xlLz48L3N2Zz4=";
      expect(() => SelfHostedImageAdapter.validateImageBinary(svgUri)).toThrow(
        /returned non-image content type/i
      );
    });

    it("rejects truncated or corrupted binary payloads < 1KB", () => {
      const shortBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]);
      const shortUri = `data:image/png;base64,${shortBuf.toString("base64")}`;
      expect(() => SelfHostedImageAdapter.validateImageBinary(shortUri)).toThrow(
        /truncated payload/i
      );
    });
  });

  describe("3. Routing Priority & Honest Error Reporting", () => {
    it("routes image requests to self-hosted engine when NEXORA_IMAGE_ENGINE_URL is configured", async () => {
      process.env.NEXORA_IMAGE_ENGINE_URL = "http://127.0.0.1:8000";
      process.env.NEXORA_IMAGE_ENGINE_MODEL = "sdxl-turbo";
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const padding = Buffer.alloc(1024);
      const fakePngB64 = Buffer.concat([pngHeader, padding]).toString("base64");

      vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
        if (typeof url === "string" && url.includes("/v1/images/generations")) {
          return {
            ok: true,
            json: async () => ({
              data: [{ b64_json: fakePngB64 }],
            }),
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const artifact = await ImageCreativeService.generateImage({
        prompt: "A high-speed industrial robotics arm in a cleanroom",
      });

      expect(artifact.status).toBe("ready");
      expect(artifact.mediaUrl).toBeDefined();
      expect(artifact.imageMetadata?.provider).toContain("Self-Hosted");
      expect(artifact.imageMetadata?.model).toBe("sdxl-turbo");
      expect(artifact.imageMetadata?.format).toBe("png");
    });

    it("honestly reports 'Engine Offline' and NEVER claims 'Credits Exhausted' when self-hosted engine is unreachable", async () => {
      process.env.NEXORA_IMAGE_ENGINE_URL = "http://127.0.0.1:8000";
      process.env.NEXORA_IMAGE_ENGINE_MODEL = "flux-schnell";
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      vi.spyOn(global, "fetch").mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:8000"));

      const artifact = await ImageCreativeService.generateImage({
        prompt: "A sports car parked in front of modern architecture",
      });

      expect(artifact.status).toBe("failed");
      expect(artifact.errorCategory).toBe("self_hosted_engine_offline");
      expect(artifact.errorMessage).toContain("Nexora Image Engine is currently unreachable");
      expect(artifact.errorMessage).not.toContain("credits");
      expect(artifact.errorMessage).not.toContain("billing");
      expect(artifact.suggestedNextStep).toContain("Start your local or self-hosted image inference engine");
      expect(artifact.mediaUrl).toBeUndefined();
    });

    it("honestly reports 'Setup Required' when requested provider is nexora but no engine URL is configured", async () => {
      delete process.env.NEXORA_IMAGE_ENGINE_URL;
      delete process.env.NEXORA_IMAGE_ENGINE_ENABLED;
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";

      const artifact = await ImageCreativeService.generateImage({
        prompt: "a majestic golden retriever",
        provider: "nexora",
      });

      expect(artifact.status).toBe("unsupported");
      expect(artifact.errorCategory).toBe("self_hosted_engine_misconfigured");
      expect(artifact.errorMessage).toContain("Nexora Image Engine is not configured");
      expect(artifact.suggestedNextStep).toContain("Set NEXORA_IMAGE_ENGINE_URL in .env.local");
    });
  });

  describe("4. Eradication of False SVG Badges and Previews in UI", () => {
    it("renders clean error card with 'Engine Offline' badge and NO svg badge", () => {
      const offlineArtifact: CreativeArtifact = {
        id: "art_offline_123",
        type: "image",
        title: "a sports car",
        subtitle: "Engine Offline • 1:1",
        status: "failed",
        errorCategory: "self_hosted_engine_offline",
        errorMessage: "Nexora Image Engine is currently unreachable. Please ensure your self-hosted inference server is running.",
        suggestedNextStep: "Start your local or self-hosted image inference engine (e.g. LocalAI, ComfyUI, SD-WebUI) or check NEXORA_IMAGE_ENGINE_URL in .env.local.",
        createdAt: new Date().toISOString(),
      };

      const html = renderToStaticMarkup(
        <CreativeArtifactCard artifact={offlineArtifact} onAction={() => {}} />
      );

      expect(html).toContain("Engine Offline");
      expect(html).toContain("Nexora Image Engine Offline");
      expect(html).toContain("Retry Generation");
      // Zero SVG badges/labels
      expect(html).not.toMatch(/>\s*svg\s*</i);
      expect(html).not.toContain("<img");
    });

    it("suppresses LiveCodePreview when language is svg but code is not valid SVG markup", () => {
      // When code contains an error string or empty text inside ```svg ```
      const html = renderToStaticMarkup(
        <LiveCodePreview code="Request error: Failed to fetch. If provider API keys are not yet configured..." language="svg" />
      );

      // Must render nothing (null), not a code block with an "SVG" badge!
      expect(html).toBe("");
    });
  });

  describe("5. End-to-End Image Generation, Rendering & Persistence", () => {
    it("generates a real raster PNG, renders <img> in chat, and persists across conversation store reloads", async () => {
      process.env.NEXORA_IMAGE_ENGINE_URL = "http://127.0.0.1:8000";
      process.env.NEXORA_IMAGE_ENGINE_MODEL = "sdxl-turbo";

      // 1. Genuine 1024-byte binary PNG payload with standard magic bytes
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const padding = Buffer.alloc(1024, 0x42);
      const fakePngB64 = Buffer.concat([pngHeader, padding]).toString("base64");

      vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
        if (typeof url === "string" && url.includes("/v1/images/generations")) {
          return {
            ok: true,
            json: async () => ({
              created: Date.now(),
              data: [{ b64_json: fakePngB64 }],
            }),
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      // 2. Call ImageCreativeService with the exact user prompt
      const prompt = "I want to create an image of a sports car.";
      const artifact = await ImageCreativeService.generateImage({ prompt });

      // 3. Confirm exact engine and model
      expect(artifact.status).toBe("ready");
      expect(artifact.imageMetadata?.provider).toContain("Self-Hosted");
      expect(artifact.imageMetadata?.model).toBe("sdxl-turbo");
      expect(artifact.imageMetadata?.format).toBe("png");
      expect(artifact.mediaUrl).toBeDefined();
      expect(artifact.mediaUrl?.startsWith("data:image/png;base64,")).toBe(true);

      // 4. Verify rendered HTML contains real <img> tag and no error states
      const html = renderToStaticMarkup(
        <CreativeArtifactCard artifact={artifact} onAction={() => {}} />
      );
      expect(html).toContain("<img");
      expect(html).toContain("data:image/png;base64,");
      expect(html).not.toContain("Credits Exhausted");
      expect(html).not.toContain("Generation Failed");
      expect(html).not.toMatch(/>\s*svg\s*</i);

      // 5. Verify conversation persistence
      const { ConversationStore } = await import("@/lib/chat/conversation-store");
      const conv = ConversationStore.createConversation("Sports Car Chat", "nexora-image", "user@example.com");
      const message = {
        id: "msg_sports_car_1",
        role: "assistant" as const,
        content: "",
        modelUsed: "nexora-image",
        creativeArtifacts: [artifact],
        createdAt: new Date().toISOString(),
      };

      ConversationStore.saveMessage(conv.id, message, "user@example.com");

      // Reload conversation from store
      const conversations = ConversationStore.getConversations("user@example.com");
      const foundConv = conversations.find((c) => c.id === conv.id);
      expect(foundConv).toBeDefined();

      const foundMsg = foundConv?.messages.find((m) => m.id === "msg_sports_car_1");
      expect(foundMsg).toBeDefined();
      expect(foundMsg?.creativeArtifacts).toBeDefined();
      expect(foundMsg?.creativeArtifacts?.[0].mediaUrl).toBe(artifact.mediaUrl);
      expect(foundMsg?.creativeArtifacts?.[0].status).toBe("ready");
      expect(foundMsg?.creativeArtifacts?.[0].imageMetadata?.format).toBe("png");
    });
  });
});
