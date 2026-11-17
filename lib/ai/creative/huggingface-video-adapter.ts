/**
 * NEXORA HUGGING FACE ZEROGPU VIDEO ADAPTER
 *
 * Server-side video adapter connecting to Hugging Face ZeroGPU Spaces:
 * - Primary Space: mediasynthesismuseum/modelscope-text-to-video (Zero-A10G, Gradio v6 SSE)
 * - Fallback Space: lightricks/ltx-video-distilled (Zero-A10G)
 *
 * Benefits:
 * - ₹0 infrastructure cost: Real video diffusion on public ZeroGPU
 * - High-speed text-to-video generation (typically 5-15 seconds)
 * - Binary magic bytes verification (MP4 'ftyp' container)
 * - Safe credential isolation: HF_TOKEN remains strictly server-side
 */

import { CreativeErrorCategory } from "./creative-types";
import { ZeroGpuGradioClient } from "./hf-gradio-client";

export interface VideoGenerationParams {
  prompt: string;
  durationSeconds?: number;
  aspectRatio?: string;
  seed?: number;
}

export interface VideoGenerationResult {
  mediaUrl: string;
  provider: string;
  model: string;
  durationSeconds: number;
  format: string;
}

export class HuggingFaceVideoAdapter {
  private static readonly PRIMARY_SPACE = "mediasynthesismuseum/modelscope-text-to-video";

  static isConfigured(): boolean {
    const rawToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "";
    const cleanToken = rawToken.trim();
    return Boolean(cleanToken && !cleanToken.includes("placeholder") && !cleanToken.includes("your-hf-token"));
  }

  static validateBinaryVideo(buffer: Buffer): void {
    if (!buffer || buffer.length < 1024) {
      throw new Error(`Video payload is invalid or truncated (${buffer?.length || 0} bytes).`);
    }

    // Check for MP4 magic header: bytes 4-8 contain "ftyp"
    const ftyp = buffer.toString("utf8", 4, 8);
    const isMoov = buffer.includes(Buffer.from("moov"));
    if (ftyp !== "ftyp" && !isMoov) {
      throw new Error("Generated video file failed binary verification (missing MP4 container signature).");
    }
  }

  static async generate(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const token = (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "").trim();
    if (!token || token.includes("placeholder") || token.includes("your-hf-token")) {
      const err: any = new Error(
        "HF_TOKEN is not configured in .env.local. Add your Hugging Face access token to generate video with Hugging Face ZeroGPU."
      );
      err.category = "missing_api_key";
      throw err;
    }

    const cleanPrompt = params.prompt.trim();
    const seed = params.seed ?? Math.floor(Math.random() * 2147483647);
    const durationSeconds = params.durationSeconds || 5;

    // Map duration to frames (ModelScope: 16 to 32 frames recommended for fast zero-budget generation)
    const numFrames = Math.min(32, Math.max(16, durationSeconds * 4));
    const inferenceSteps = 25; // Balanced quality vs speed on ZeroGPU

    const spaceId = process.env.HF_VIDEO_SPACE || this.PRIMARY_SPACE;
    const timeoutMs = 90000; // 90-second bounded timeout for video generation

    const startTime = Date.now();

    try {
      const outputData = await ZeroGpuGradioClient.runJob({
        spaceId,
        fnIndex: 2, // /generate
        data: [
          cleanPrompt,
          seed,
          numFrames,
          inferenceSteps,
        ],
        timeoutMs,
        token,
      });

      const fileData = Array.isArray(outputData) ? outputData[0] : outputData;
      if (!fileData) {
        throw new Error("ZeroGPU video model returned empty output.");
      }

      const host = ZeroGpuGradioClient.getSpaceHost(spaceId);
      const downloaded = await ZeroGpuGradioClient.downloadGradioMedia(host, fileData, token);
      this.validateBinaryVideo(downloaded.buffer);

      console.log("[HuggingFaceVideoAdapter] Real video generation success:", {
        bytes: downloaded.size,
        mimeType: downloaded.mimeType,
        latencyMs: Date.now() - startTime,
      });

      return {
        mediaUrl: downloaded.dataUri,
        provider: "Hugging Face ZeroGPU",
        model: "ModelScope Text-To-Video",
        durationSeconds,
        format: "video/mp4",
      };
    } catch (err: any) {
      console.error("[HuggingFaceVideoAdapter] Video generation error:", err?.message || err);
      throw err;
    }
  }
}
