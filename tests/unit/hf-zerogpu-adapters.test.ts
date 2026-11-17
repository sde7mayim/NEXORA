import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ZeroGpuGradioClient } from "@/lib/ai/creative/hf-gradio-client";
import { HuggingFaceImageAdapter } from "@/lib/ai/creative/huggingface-image-adapter";
import { HuggingFaceMusicAdapter } from "@/lib/ai/creative/huggingface-music-adapter";
import { HuggingFaceVideoAdapter } from "@/lib/ai/creative/huggingface-video-adapter";
import { VideoCreativeService } from "@/lib/ai/creative/video-service";
import { MusicProviderAdapter } from "@/lib/ai/creative/music-provider-adapter";
import { MusicCreativeService } from "@/lib/ai/creative/music-service";

describe("NEXORA — ZERO-BUDGET HUGGING FACE ZEROGPU ADAPTERS", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("1. ZeroGpuGradioClient Core Mechanics", () => {
    it("normalizes Space IDs to correct public hf.space subdomains", () => {
      expect(ZeroGpuGradioClient.getSpaceHost("black-forest-labs/FLUX.1-schnell")).toBe(
        "black-forest-labs-flux-1-schnell.hf.space"
      );
      expect(ZeroGpuGradioClient.getSpaceHost("mediasynthesismuseum/modelscope-text-to-video")).toBe(
        "mediasynthesismuseum-modelscope-text-to-video.hf.space"
      );
      expect(ZeroGpuGradioClient.getSpaceHost("sanchit-gandhi/musicgen-streaming")).toBe(
        "sanchit-gandhi-musicgen-streaming.hf.space"
      );
      expect(ZeroGpuGradioClient.getSpaceHost("ByteDance/SDXL-Lightning")).toBe(
        "bytedance-sdxl-lightning.hf.space"
      );
    });

    it("detects image MIME type from genuine WebP magic bytes (RIFF....WEBP)", async () => {
      const webpHeader = Buffer.from("RIFF\x20\x00\x00\x00WEBPVP8 ");
      const padding = Buffer.alloc(1024);
      const buffer = Buffer.concat([webpHeader, padding]);
      const arrayBuf = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => arrayBuf,
        headers: new Headers({ "content-type": "application/octet-stream" }),
      } as any);

      const res = await ZeroGpuGradioClient.downloadGradioMedia(
        "test-host.hf.space",
        { path: "output.webp", mime_type: null }
      );

      expect(res.mimeType).toBe("image/webp");
      expect(res.dataUri).toContain("data:image/webp;base64,");
    });

    it("detects video MIME type from genuine MP4 ftyp magic bytes", async () => {
      const mp4Header = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
      const padding = Buffer.alloc(2048);
      const buffer = Buffer.concat([mp4Header, padding]);
      const arrayBuf = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => arrayBuf,
        headers: new Headers(),
      } as any);

      const res = await ZeroGpuGradioClient.downloadGradioMedia(
        "test-host.hf.space",
        { path: "video.mp4" }
      );

      expect(res.mimeType).toBe("video/mp4");
      expect(res.dataUri).toContain("data:video/mp4;base64,");
    });
  });

  describe("2. HuggingFaceImageAdapter (FLUX.1-schnell & SDXL-Lightning)", () => {
    it("reports configured when HF_TOKEN is valid", () => {
      process.env.HF_TOKEN = "hf_valid_test_token_abc";
      expect(HuggingFaceImageAdapter.isConfigured()).toBe(true);
    });

    it("reports unconfigured when HF_TOKEN is placeholder or empty", () => {
      process.env.HF_TOKEN = "your-hf-token-here";
      expect(HuggingFaceImageAdapter.isConfigured()).toBe(false);
      delete process.env.HF_TOKEN;
      expect(HuggingFaceImageAdapter.isConfigured()).toBe(false);
    });

    it("validates WebP binary raster magic bytes", () => {
      const webpHeader = Buffer.from("RIFF\x20\x00\x00\x00WEBPVP8 ");
      const buffer = Buffer.concat([webpHeader, Buffer.alloc(1024)]);
      expect(HuggingFaceImageAdapter.validateBinaryImage(buffer, "image/webp")).toBe("webp");
    });
  });

  describe("3. HuggingFaceVideoAdapter (ModelScope ZeroGPU)", () => {
    it("validates binary video container integrity", () => {
      const validMp4 = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]), // ftyp
        Buffer.alloc(2048),
      ]);
      expect(() => HuggingFaceVideoAdapter.validateBinaryVideo(validMp4)).not.toThrow();
    });

    it("rejects non-video or truncated payloads", () => {
      const truncated = Buffer.from([0x00, 0x00, 0x00, 0x10]);
      expect(() => HuggingFaceVideoAdapter.validateBinaryVideo(truncated)).toThrow(/invalid or truncated/i);

      const fakeVideo = Buffer.from("Not a real video at all" + "0".repeat(2000));
      expect(() => HuggingFaceVideoAdapter.validateBinaryVideo(fakeVideo)).toThrow(/missing MP4 container signature/i);
    });

    it("throws a clean error when HF_TOKEN is missing", async () => {
      delete process.env.HF_TOKEN;
      delete process.env.HUGGINGFACE_API_KEY;

      await expect(
        HuggingFaceVideoAdapter.generate({ prompt: "A drone flying over mountains" })
      ).rejects.toMatchObject({
        category: "missing_api_key",
      });
    });
  });

  describe("4. HuggingFaceMusicAdapter (MusicGen ZeroGPU)", () => {
    it("validates audio magic bytes for AAC, WAV, and MP3", () => {
      // ADTS AAC
      const aac = Buffer.concat([Buffer.from([0xff, 0xf1, 0x54, 0x40]), Buffer.alloc(2048)]);
      expect(() => HuggingFaceMusicAdapter.validateBinaryAudio(aac)).not.toThrow();

      // RIFF WAVE
      const wav = Buffer.concat([Buffer.from("RIFF\x24\x00\x00\x00WAVEfmt "), Buffer.alloc(2048)]);
      expect(() => HuggingFaceMusicAdapter.validateBinaryAudio(wav)).not.toThrow();

      // ID3 MP3
      const id3 = Buffer.concat([Buffer.from("ID3\x04\x00\x00\x00\x00"), Buffer.alloc(2048)]);
      expect(() => HuggingFaceMusicAdapter.validateBinaryAudio(id3)).not.toThrow();
    });

    it("rejects corrupted audio binary data", () => {
      const corrupted = Buffer.from("CORRUPT_AUDIO_STREAM" + "0".repeat(2000));
      expect(() => HuggingFaceMusicAdapter.validateBinaryAudio(corrupted)).toThrow(
        /invalid WAV, AAC, or MP3 container signature/i
      );
    });
  });

  describe("5. VideoCreativeService ZeroGPU Integration", () => {
    it("reports unsupported honestly when no provider is configured", async () => {
      delete process.env.HF_TOKEN;
      delete process.env.REPLICATE_API_TOKEN;
      delete process.env.LUMA_API_KEY;
      delete process.env.RUNWAY_API_KEY;

      const artifact = await VideoCreativeService.generateVideo({
        prompt: "Sunset over a tranquil lake",
      });

      expect(artifact.status).toBe("unsupported");
      expect(artifact.mediaUrl).toBeUndefined();
      expect(artifact.errorMessage).toContain("not configured");
    });
  });

  describe("6. MusicProviderAdapter ZeroGPU Integration", () => {
    it("identifies huggingface as configured when HF_TOKEN is set", () => {
      process.env.HF_TOKEN = "hf_music_valid_token_xyz";
      expect(MusicProviderAdapter.isProviderConfigured("huggingface")).toBe(true);
    });

    it("resolves huggingface provider when requested explicitly", () => {
      process.env.HF_TOKEN = "hf_music_valid_token_xyz";
      const resolution = MusicProviderAdapter.resolveProvider("huggingface");
      expect(resolution.provider).toBe("huggingface");
      expect(resolution.isConfigured).toBe(true);
    });
  });
});
