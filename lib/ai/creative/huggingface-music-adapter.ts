/**
 * NEXORA HUGGING FACE ZEROGPU MUSIC ADAPTER
 *
 * Server-side music adapter connecting to Hugging Face ZeroGPU Spaces:
 * - Primary Space: sanchit-gandhi/musicgen-streaming (Zero-A10G, Gradio v6 SSE)
 * - Model: Meta MusicGen Small / Medium running on ZeroGPU
 *
 * Benefits:
 * - ₹0 infrastructure cost: Real neural music synthesis without Suno/Udio paid API keys
 * - Fast audio generation (typically 5-10 seconds for 10-15s tracks)
 * - Binary magic bytes verification (ADTS AAC / WAV container)
 * - Clean server-side isolation: HF_TOKEN is never sent to the client browser
 */

import { MusicGenerationResult, MusicTrackParams } from "./music-provider-adapter";
import { ZeroGpuGradioClient } from "./hf-gradio-client";

export class HuggingFaceMusicAdapter {
  private static readonly PRIMARY_SPACE = "sanchit-gandhi/musicgen-streaming";

  static isConfigured(): boolean {
    const rawToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "";
    const cleanToken = rawToken.trim();
    return Boolean(cleanToken && !cleanToken.includes("placeholder") && !cleanToken.includes("your-hf-token"));
  }

  static validateBinaryAudio(buffer: Buffer): void {
    if (!buffer || buffer.length < 1024) {
      throw new Error(`Audio payload is invalid or truncated (${buffer?.length || 0} bytes).`);
    }

    const isWav = buffer.toString("utf8", 0, 4) === "RIFF" && buffer.toString("utf8", 8, 12) === "WAVE";
    const isAac = buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0;
    const isMp3 = (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) || buffer.toString("utf8", 0, 3) === "ID3";

    if (!isWav && !isAac && !isMp3) {
      throw new Error("Generated audio file failed binary verification (invalid WAV, AAC, or MP3 container signature).");
    }
  }

  static async generate(params: MusicTrackParams): Promise<MusicGenerationResult> {
    const token = (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "").trim();
    if (!token || token.includes("placeholder") || token.includes("your-hf-token")) {
      const err: any = new Error(
        "HF_TOKEN is not configured in .env.local. Add your Hugging Face access token to generate music with Hugging Face ZeroGPU."
      );
      err.category = "missing_api_key";
      throw err;
    }

    const promptParts = [params.prompt];
    if (params.genre && !params.prompt.toLowerCase().includes(params.genre.toLowerCase())) {
      promptParts.push(params.genre);
    }
    if (params.mood && !params.prompt.toLowerCase().includes(params.mood.toLowerCase())) {
      promptParts.push(params.mood);
    }
    const cleanPrompt = promptParts.join(", ").trim();

    // Sanchit-Gandhi MusicGen Space constraints:
    // duration: min 10, max 30
    // streaming_interval: 1.5 to 2.5
    // seed: min 0, max 10
    const durationSeconds = Math.min(30, Math.max(10, Math.round(params.durationSeconds || 15)));
    const streamingInterval = 2.0;
    const seed = Math.floor(Math.random() * 11); // 0 to 10

    const spaceId = process.env.HF_MUSIC_SPACE || this.PRIMARY_SPACE;
    const timeoutMs = 75000; // 75-second bounded timeout

    const startTime = Date.now();

    try {
      const outputData = await ZeroGpuGradioClient.runJob({
        spaceId,
        fnIndex: 3, // /generate_audio
        data: [
          cleanPrompt,
          durationSeconds,
          streamingInterval,
          seed,
        ],
        timeoutMs,
        token,
      });

      const fileData = Array.isArray(outputData) ? outputData[0] : outputData;
      if (!fileData) {
        throw new Error("ZeroGPU MusicGen model returned empty output.");
      }

      const host = ZeroGpuGradioClient.getSpaceHost(spaceId);
      const downloaded = await ZeroGpuGradioClient.downloadGradioMedia(host, fileData, token);
      this.validateBinaryAudio(downloaded.buffer);

      console.log("[HuggingFaceMusicAdapter] Real music generation success:", {
        bytes: downloaded.size,
        mimeType: downloaded.mimeType,
        latencyMs: Date.now() - startTime,
      });

      return {
        audioUrl: downloaded.dataUri,
        provider: "Hugging Face ZeroGPU (MusicGen)",
        durationSeconds,
        format: downloaded.mimeType === "audio/aac" ? "audio/mp3" : "audio/wav",
        isInstrumental: true,
      };
    } catch (err: any) {
      console.error("[HuggingFaceMusicAdapter] Music generation error:", err?.message || err);
      throw err;
    }
  }
}
