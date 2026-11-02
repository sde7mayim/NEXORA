import { describe, it, expect } from "vitest";
import { CreativeDetector } from "@/lib/ai/creative/creative-detector";
import { ImageCreativeService } from "@/lib/ai/creative/image-service";
import { MusicCreativeService } from "@/lib/ai/creative/music-service";
import { LyricsCreativeService } from "@/lib/ai/creative/lyrics-service";
import { VideoCreativeService } from "@/lib/ai/creative/video-service";

describe("Creative Studio — Output Isolation & Intent Classification", () => {
  // --------------------------------------------------------------------------
  // TEST 1: "i want a image a dog playing with a ball"
  // --------------------------------------------------------------------------
  it("Request 1: correctly classifies 'i want a image a dog playing with a ball' and cleans prompt", async () => {
    const query = "i want a image a dog playing with a ball";
    const detection = CreativeDetector.detect(query);

    expect(detection.isCreativeIntent).toBe(true);
    expect(detection.intent).toBe("image_generation");
    expect(detection.creativeType).toBe("image");
    expect(detection.prompt!.toLowerCase()).toContain("dog playing with a ball");
    // Ensure prompt does not keep colloquial prefix
    expect(detection.prompt!.toLowerCase()).not.toContain("i want a image");

    // Generate image artifact
    const artifact = await ImageCreativeService.generateImage({
      prompt: detection.prompt!,
      aspectRatio: "1:1",
      style: "realistic",
    });

    // Must be an image artifact with valid status (ready, success, rate_limited, or failed)
    expect(artifact.type).toBe("image");
    expect(["ready", "success", "rate_limited", "failed"]).toContain(artifact.status);

    if (artifact.status === "ready" || artifact.status === "success") {
      expect(artifact.mediaUrl).toBeDefined();
      // Must NOT contain abstract placeholder stamped prompt text
      if (artifact.mediaUrl?.startsWith("data:image/svg+xml")) {
        const decodedSvg = decodeURIComponent(artifact.mediaUrl);
        expect(decodedSvg).not.toContain("NEXORA STUDIO • NATIVE HD");
        expect(decodedSvg).not.toContain("I WANT A IMAGE");
      }
    } else {
      // If quota/credit exhausted, must provide truthful error message
      expect(artifact.errorMessage).toBeDefined();
      expect(artifact.errorMessage!.length).toBeGreaterThan(10);
    }
  });

  // --------------------------------------------------------------------------
  // TEST 2: "generate a song about friendship"
  // --------------------------------------------------------------------------
  it("Request 2: correctly classifies 'generate a song about friendship' and returns playable audio", async () => {
    const query = "generate a song about friendship";
    const detection = CreativeDetector.detect(query);

    expect(detection.isCreativeIntent).toBe(true);
    expect(detection.intent).toBe("music_generation");
    expect(detection.creativeType).toBe("music");

    // Generate music artifact
    const artifact = await MusicCreativeService.generateMusic({
      prompt: detection.prompt || "Song about friendship",
      genre: "Acoustic Pop",
      mood: "Friendship",
    });

    expect(artifact.type).toBe("music");
    expect(artifact.status).toBe("ready");
    expect(artifact.mediaUrl).toBeDefined();
    // Must be playable audio data URL
    expect(artifact.mediaUrl?.startsWith("data:audio/")).toBe(true);
    expect(artifact.musicMetadata).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // TEST 3: "write lyrics about friendship"
  // --------------------------------------------------------------------------
  it("Request 3: correctly classifies 'write lyrics about friendship' and returns lyrics only (no audio)", async () => {
    const query = "write lyrics about friendship";
    const detection = CreativeDetector.detect(query);

    expect(detection.isCreativeIntent).toBe(true);
    expect(detection.intent).toBe("lyrics_generation");
    expect(detection.creativeType).toBe("lyrics");

    // Generate lyrics artifact
    const artifact = await LyricsCreativeService.generateLyrics({
      theme: detection.prompt || "Friendship",
      language: "English",
    });

    expect(artifact.type).toBe("lyrics");
    expect(artifact.status).toBe("ready");
    // Lyrics artifact must NOT contain audio media URL
    expect(artifact.mediaUrl).toBeUndefined();
    expect(artifact.lyricsMetadata).toBeDefined();
    expect(artifact.lyricsMetadata?.sections.length).toBeGreaterThan(0);

    // Verify sections have proper musical structure
    const sectionNames =
      artifact.lyricsMetadata?.sections.map((s) => (s.label || s.type).toLowerCase()) || [];
    expect(sectionNames.some((n) => n.includes("intro") || n.includes("verse") || n.includes("chorus"))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST 4: "make a video of a dog running on a beach"
  // --------------------------------------------------------------------------
  it("Request 4: correctly classifies 'make a video of a dog running on a beach' and reports provider status honestly", async () => {
    const query = "make a video of a dog running on a beach";
    const detection = CreativeDetector.detect(query);

    expect(detection.isCreativeIntent).toBe(true);
    expect(detection.intent).toBe("video_generation");
    expect(detection.creativeType).toBe("video");
    expect(detection.prompt!.toLowerCase()).toContain("dog running on a beach");

    // Generate video artifact without configured provider
    const artifact = await VideoCreativeService.generateVideo({
      prompt: detection.prompt!,
    });

    expect(artifact.type).toBe("video");
    // When unconfigured, must report truthful unsupported status
    expect(["unsupported", "failed", "ready"]).toContain(artifact.status);
    if (artifact.status === "unsupported") {
      expect(artifact.errorMessage).toContain("provider is not configured");
      expect(artifact.mediaUrl).toBeUndefined();
    }
  });

  // --------------------------------------------------------------------------
  // TEST 5: Educational / technical query must NOT trigger creative generation
  // --------------------------------------------------------------------------
  it("routes 'explain how image generation works' to ordinary text chat", () => {
    const query = "explain how image generation works";
    const detection = CreativeDetector.detect(query);

    expect(detection.isCreativeIntent).toBe(false);
    expect(detection.intent).toBe("ordinary_text_chat");
  });

  it("routes 'what is diffusion model' to ordinary text chat", () => {
    const query = "what is diffusion model in ai";
    const detection = CreativeDetector.detect(query);

    expect(detection.isCreativeIntent).toBe(false);
    expect(detection.intent).toBe("ordinary_text_chat");
  });

  // --------------------------------------------------------------------------
  // TEST 6: Conversational Follow-up preserves previous creative subject
  // --------------------------------------------------------------------------
  it("preserves subject on follow-up request like 'make it cinematic'", () => {
    const history = [
      { role: "user", content: "generate a photo of a mountain cabin in snow" },
      { role: "assistant", content: "" },
    ];
    const followUp = "make it cinematic";
    const detection = CreativeDetector.detect(followUp, [], history);

    expect(detection.isCreativeIntent).toBe(true);
    expect(["image_generation", "image_variation"]).toContain(detection.intent);
    expect(detection.prompt!.toLowerCase()).toContain("cabin");
    expect(detection.parameters?.style).toBe("cinematic");
  });
});
