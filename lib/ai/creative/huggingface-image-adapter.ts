/**
 * NEXORA HUGGING FACE ZEROGPU IMAGE ADAPTER
 *
 * Genuine server-side adapter connecting to Hugging Face ZeroGPU Spaces:
 * - Primary Space: black-forest-labs/FLUX.1-schnell (Zero-A10G, Gradio v5 SSE)
 * - Fallback Space: ByteDance/SDXL-Lightning (Zero-A10G, Gradio v4 SSE)
 *
 * Benefits:
 * - ₹0 infrastructure cost: Runs on Hugging Face free-tier ZeroGPU allocation
 * - Real high-quality diffusion inference in 1-4 seconds
 * - Binary magic bytes verification (WebP, PNG, JPEG)
 * - Safe credential handling: HF_TOKEN is never sent to the client browser
 */

import { ImageAspectRatio, CreativeErrorCategory } from "./creative-types";
import { ImageGenerationParams, ImageGenerationResult, ImageProviderAdapter } from "./image-provider-adapter";
import { ZeroGpuGradioClient } from "./hf-gradio-client";

export interface HuggingFaceConfig {
  token?: string;
  model: string;
  routerUrl: string;
  timeoutMs: number;
}

export class HuggingFaceImageAdapter {
  private static readonly PRIMARY_SPACE = "black-forest-labs/FLUX.1-schnell";
  private static readonly FALLBACK_SPACE = "ByteDance/SDXL-Lightning";

  /**
   * Retrieves server-side configuration for Hugging Face inference.
   */
  static getConfig(): HuggingFaceConfig {
    const rawToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "";
    const cleanToken = rawToken.trim();
    const isPlaceholder = !cleanToken || cleanToken.includes("your-hf-token") || cleanToken.includes("placeholder");

    const model = (process.env.HF_IMAGE_MODEL || this.PRIMARY_SPACE).trim();
    const timeoutMs = Math.min(60000, Math.max(5000, Number(process.env.HF_TIMEOUT_MS) || 45000));

    return {
      token: isPlaceholder ? undefined : cleanToken,
      model,
      routerUrl: "https://router.huggingface.co/hf-inference/models",
      timeoutMs,
    };
  }

  /**
   * Checks whether Hugging Face inference credentials are configured.
   */
  static isConfigured(): boolean {
    const config = this.getConfig();
    return Boolean(config.token);
  }

  /**
   * Validates binary image response from Hugging Face.
   */
  static validateBinaryImage(buffer: Buffer, contentType: string): "png" | "jpeg" | "webp" {
    if (!buffer || buffer.length < 1024) {
      throw new Error(`Hugging Face returned invalid or truncated payload (${buffer?.length || 0} bytes < 1KB threshold).`);
    }

    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isWebp = buffer.toString("utf8", 0, 4) === "RIFF" && buffer.toString("utf8", 8, 12) === "WEBP";

    if (isPng) return "png";
    if (isJpg) return "jpeg";
    if (isWebp) return "webp";

    throw new Error("Hugging Face binary response does not match PNG, JPEG, or WebP magic bytes.");
  }

  /**
   * Generates a genuine image via Hugging Face ZeroGPU Spaces.
   */
  static async generate(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    const config = this.getConfig();

    if (!config.token) {
      const err: any = new Error(
        "HF_TOKEN is not configured in .env.local. Add your Hugging Face access token to generate images with Hugging Face ZeroGPU."
      );
      err.category = "missing_api_key";
      throw err;
    }

    const { width, height } = params.width && params.height
      ? { width: params.width, height: params.height }
      : ImageProviderAdapter.resolveDimensions(params.aspectRatio, params.quality);

    // FLUX.1-schnell supports dimensions up to 1024, step count 4
    const clampedWidth = Math.min(1024, Math.max(256, Math.round(width / 16) * 16));
    const clampedHeight = Math.min(1024, Math.max(256, Math.round(height / 16) * 16));
    const cleanPrompt = (params.enhancedPrompt || params.prompt).trim();
    const seed = params.seed ?? Math.floor(Math.random() * 2147483647);

    const startTime = Date.now();

    // 1. Try Primary Space: FLUX.1-schnell (fn_index: 2 -> /infer)
    try {
      const outputData = await ZeroGpuGradioClient.runJob({
        spaceId: this.PRIMARY_SPACE,
        fnIndex: 2,
        data: [
          cleanPrompt,
          seed,
          true, // randomize_seed
          clampedWidth,
          clampedHeight,
          4, // num_inference_steps
        ],
        timeoutMs: config.timeoutMs,
        token: config.token,
      });

      // Output from FLUX.1-schnell fn_index 2 is: [ { path, url, ... }, seed ]
      const fileData = Array.isArray(outputData) ? outputData[0] : outputData;
      if (!fileData) {
        throw new Error("FLUX.1-schnell returned empty output data.");
      }

      const host = ZeroGpuGradioClient.getSpaceHost(this.PRIMARY_SPACE);
      const downloaded = await ZeroGpuGradioClient.downloadGradioMedia(host, fileData, config.token);
      this.validateBinaryImage(downloaded.buffer, downloaded.mimeType || "image/webp");

      console.log("[HuggingFaceImageAdapter] FLUX.1-schnell success:", {
        bytes: downloaded.size,
        mimeType: downloaded.mimeType,
        latencyMs: Date.now() - startTime,
      });

      return {
        mediaUrl: downloaded.dataUri,
        revisedPrompt: cleanPrompt,
        provider: "Hugging Face ZeroGPU",
        model: "FLUX.1-schnell",
        width: clampedWidth,
        height: clampedHeight,
        format: downloaded.mimeType || "image/webp",
      };
    } catch (primaryErr: any) {
      console.warn("[HuggingFaceImageAdapter] Primary FLUX.1-schnell Space error, attempting fallback:", primaryErr?.message);

      // If missing API key, invalid token, rate limit, or model loading, fail immediately
      if (
        primaryErr?.category === "missing_api_key" ||
        primaryErr?.category === "invalid_credentials" ||
        primaryErr?.category === "rate_limited" ||
        primaryErr?.category === "provider_unavailable"
      ) {
        throw primaryErr;
      }

      // 2. Try Fallback Space: SDXL-Lightning (fn_index: 0 -> /generate_image)
      try {
        const fallbackOutput = await ZeroGpuGradioClient.runJob({
          spaceId: this.FALLBACK_SPACE,
          fnIndex: 0,
          data: [
            cleanPrompt,
            "4-Steps", // num_inference_steps
          ],
          timeoutMs: Math.max(15000, config.timeoutMs - (Date.now() - startTime)),
          token: config.token,
        });

        const fileData = Array.isArray(fallbackOutput) ? fallbackOutput[0] : fallbackOutput;
        if (!fileData) {
          throw new Error("SDXL-Lightning returned empty output data.");
        }

        const host = ZeroGpuGradioClient.getSpaceHost(this.FALLBACK_SPACE);
        const downloaded = await ZeroGpuGradioClient.downloadGradioMedia(host, fileData, config.token);
        this.validateBinaryImage(downloaded.buffer, downloaded.mimeType || "image/jpeg");

        return {
          mediaUrl: downloaded.dataUri,
          revisedPrompt: cleanPrompt,
          provider: "Hugging Face ZeroGPU",
          model: "SDXL-Lightning",
          width: clampedWidth,
          height: clampedHeight,
          format: downloaded.mimeType || "image/jpeg",
          isFallback: true,
        };
      } catch (fallbackErr: any) {
        console.error("[HuggingFaceImageAdapter] Both FLUX and SDXL Spaces failed:", fallbackErr?.message);
        throw primaryErr; // Rethrow primary error for accurate diagnosis
      }
    }
  }
}
