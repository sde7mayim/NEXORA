import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ImageCreativeService } from "@/lib/ai/creative/image-service";
import { ImageProviderAdapter } from "@/lib/ai/creative/image-provider-adapter";
import { CreativeArtifactCard } from "@/components/chat/creative-artifact-card";
import { LiveCodePreview } from "@/components/live-code-preview";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { CreativeArtifact } from "@/lib/ai/creative/creative-types";

describe("NEXORA — CLEAN IMAGE GENERATION ERROR STATE & COMPONENT ISOLATION", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("1. No Fake Image Result on Failure", () => {
    it("returns an artifact with no mediaUrl or thumbnailUrl when providers fail with quota exhaustion", async () => {
      process.env.GEMINI_API_KEY = "test_gemini_key";
      process.env.OPENAI_API_KEY = "test_openai_key";

      vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
        if (typeof url === "string" && url.includes("generativelanguage")) {
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
        }
        return {
          ok: false,
          status: 429,
          json: async () => ({
            error: {
              code: "credit_balance_exhausted",
              message: "You have no credits remaining. Add credits to continue using the API.",
            },
          }),
        } as any;
      });

      const artifact = await ImageCreativeService.generateImage({
        prompt: "a luxury sports car driving at sunset",
      });

      expect(artifact.mediaUrl).toBeUndefined();
      expect(artifact.thumbnailUrl).toBeUndefined();
      expect(artifact.status).toBe("rate_limited");
      expect(artifact.errorCategory).toBe("provider_credits_exhausted");
      expect(artifact.imageMetadata?.format).toBeUndefined();
      expect(artifact.imageMetadata?.format).not.toBe("svg");
    });

    it("renders no <img> tag, no SVG graphic preview, and no svg badge in CreativeArtifactCard when failed", () => {
      const failedArtifact: CreativeArtifact = {
        id: "art_failed_123",
        type: "image",
        title: "a luxury sports car",
        subtitle: "REALISTIC • 1:1 • Credits Exhausted",
        status: "rate_limited",
        errorCategory: "provider_credits_exhausted",
        errorMessage: "Image generation is temporarily unavailable because the configured providers have no available credits.",
        suggestedNextStep: "Add credits or enable billing in Google AI Studio or OpenAI billing settings.",
        createdAt: new Date().toISOString(),
        imageMetadata: {
          prompt: "a luxury sports car",
          aspectRatio: "1:1",
          style: "realistic",
          resolution: "1024x1024",
          provider: "Credits Exhausted",
        },
      };

      const html = renderToStaticMarkup(
        <CreativeArtifactCard artifact={failedArtifact} onAction={() => {}} />
      );

      // Must not render an <img> tag for broken image
      expect(html).not.toContain("<img");
      // Must not render an SVG preview or graphic
      expect(html).not.toContain("<image");
      // Must not render an svg badge or label (ignoring lucide icon class names)
      expect(html).not.toMatch(/>\s*svg\s*</i);
      // Must render clean user message
      expect(html).toContain("Image generation is temporarily unavailable because the configured providers have no available credits.");
      // Must render clear Retry button
      expect(html).toContain("Retry Generation");
      // Must not render raw API response or URLs
      expect(html).not.toContain("https://generativelanguage.googleapis.com");
      expect(html).not.toContain("https://api.openai.com");
      expect(html).not.toContain("RESOURCE_EXHAUSTED");
      expect(html).not.toContain("credit_balance_exhausted");
    });
  });

  describe("2. Clean, User-Friendly Error Messages & Diagnostics", () => {
    it("logs sanitized diagnostics to server console and produces clean user message without exposing keys or raw URLs", async () => {
      process.env.GEMINI_API_KEY = "super_secret_gemini_key_12345";
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.spyOn(global, "fetch").mockImplementation(async () => {
        return {
          ok: false,
          status: 429,
          json: async () => ({
            error: {
              code: 429,
              message: "Quota exceeded for key=super_secret_gemini_key_12345: free_tier_requests limit: 0",
              status: "RESOURCE_EXHAUSTED",
            },
          }),
        } as any;
      });

      const artifact = await ImageCreativeService.generateImage({
        prompt: "a majestic golden retriever",
        provider: "gemini",
      });

      // User facing message is clean
      expect(artifact.errorMessage).toBe(
        "Image generation is temporarily unavailable because the configured providers have no available credits."
      );
      expect(artifact.errorMessage).not.toContain("super_secret_gemini_key_12345");
      expect(artifact.errorMessage).not.toContain("free_tier_requests");

      // Server console log was sanitized
      const loggedMessages = consoleErrorSpy.mock.calls.map((c) => JSON.stringify(c)).join(" ");
      expect(loggedMessages).not.toContain("super_secret_gemini_key_12345");
      expect(loggedMessages).toContain("[REDACTED]");
    });

    it("provides correct clean message for provider rate limits", async () => {
      process.env.OPENAI_API_KEY = "test_openai_key";

      vi.spyOn(global, "fetch").mockImplementation(async () => {
        return {
          ok: false,
          status: 429,
          json: async () => ({
            error: {
              code: "rate_limit_exceeded",
              message: "Requests per minute limit exceeded. Please slow down.",
            },
          }),
        } as any;
      });

      const artifact = await ImageCreativeService.generateImage({
        prompt: "cyberpunk city skyline",
        provider: "openai",
      });

      expect(artifact.status).toBe("rate_limited");
      expect(artifact.errorCategory).toBe("rate_limited");
      expect(artifact.errorMessage).toContain("temporarily busy due to provider rate limits");
      expect(artifact.suggestedNextStep).toContain("Wait a few moments");
    });
  });

  describe("3. Correct Component State & SVG Preview Isolation", () => {
    it("does not render LiveCodePreview for empty or whitespace code blocks", () => {
      const html1 = renderToStaticMarkup(<LiveCodePreview code="" language="svg" />);
      expect(html1).toBe("");

      const html2 = renderToStaticMarkup(<LiveCodePreview code="   " language="svg" />);
      expect(html2).toBe("");
    });

    it("only renders SVG live preview when valid, complete <svg>...</svg> markup is intentionally passed", () => {
      const invalidSvg = renderToStaticMarkup(
        <LiveCodePreview code="Request error: Failed to fetch" language="svg" />
      );
      // When code is not valid SVG, it falls back to standard code block or does not build an SVG live sandbox
      expect(invalidSvg).not.toContain("title=\"Nexora Live Preview\"");

      const validSvgCode = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>';
      const validSvg = renderToStaticMarkup(
        <LiveCodePreview code={validSvgCode} language="svg" />
      );
      expect(validSvg).toContain("title=\"Nexora Live Preview\"");
    });

    it("MarkdownRenderer does not render duplicate SVG badges on error messages", () => {
      const markdown = "*Request error: Failed to fetch. If provider API keys are not yet configured in this environment, add them to .env.local.*";
      const html = renderToStaticMarkup(<MarkdownRenderer content={markdown} />);

      expect(html).not.toMatch(/>\s*svg\s*</i);
      expect(html).toContain("Request error: Failed to fetch");
    });
  });

  describe("4. Valid Image Generation Displays Real Output", () => {
    it("renders the real <img> with full quality and no error banner when generation succeeds", () => {
      const successArtifact: CreativeArtifact = {
        id: "art_success_456",
        type: "image",
        title: "Sports Car at Sunset",
        subtitle: "REALISTIC • 16:9 • 1792x1024",
        mediaUrl: "https://images.unsplash.com/photo-sports-car-real.png",
        thumbnailUrl: "https://images.unsplash.com/photo-sports-car-real.png",
        status: "ready",
        createdAt: new Date().toISOString(),
        imageMetadata: {
          prompt: "a luxury sports car driving at sunset",
          aspectRatio: "16:9",
          style: "realistic",
          resolution: "1792x1024",
          provider: "Google Gemini • gemini-2.5-flash-image",
          format: "png",
        },
      };

      const html = renderToStaticMarkup(
        <CreativeArtifactCard artifact={successArtifact} onAction={() => {}} />
      );

      expect(html).toContain("<img");
      expect(html).toContain("https://images.unsplash.com/photo-sports-car-real.png");
      expect(html).not.toContain("Credits Exhausted");
      expect(html).not.toContain("Generation Failed");
      expect(html).not.toContain("Retry Generation");
    });
  });
});

