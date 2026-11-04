/**
 * NEXORA HUGGING FACE INFERENCE IMAGE ADAPTER
 *
 * Genuine server-side adapter connecting to Hugging Face Serverless Inference:
 * - Uses the active official endpoint: https://router.huggingface.co/hf-inference/models/{model_id}
 * - Fallback endpoint: https://api-inference.huggingface.co/models/{model_id}
 * - Supports genuine diffusion models:
 *   - black-forest-labs/FLUX.1-schnell (Default)
 *   - stabilityai/stable-diffusion-xl-base-1.0
 *   - runwayml/stable-diffusion-v1-5
 *   - ByteDance/SDXL-Lightning
 *
 * Rules:
 * - Reads HF_TOKEN exclusively on the server (never exposed to browser or client logs)
 * - Validates genuine binary magic bytes (PNG, JPEG, WebP)
 * - Honest error reporting for 401, 403, 429, 503 model loading states
 * - Zero fallback to paid providers when Hugging Face is selected
 */

import { ImageAspectRatio, CreativeErrorCategory } from "./creative-types";
import { ImageGenerationParams, ImageGenerationResult, ImageProviderAdapter } from "./image-provider-adapter";

export interface HuggingFaceConfig {
  token?: string;
  model: string;
  routerUrl: string;
  timeoutMs: number;
}

export class HuggingFaceImageAdapter {
  private static readonly PRIMARY_ROUTER = "https://router.huggingface.co/hf-inference/models";
  private static readonly LEGACY_ROUTER = "https://api-inference.huggingface.co/models";

  /**
   * Retrieves server-side configuration for Hugging Face inference.
   */
  static getConfig(): HuggingFaceConfig {
    const rawToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "";
    const cleanToken = rawToken.trim();
    const isPlaceholder = !cleanToken || cleanToken.includes("your-hf-token") || cleanToken.includes("placeholder");

    const model = (process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell").trim();
    // Strict 30-second bounded timeout by default
    const timeoutMs = Math.min(30000, Math.max(5000, Number(process.env.HF_TIMEOUT_MS) || 30000));

    return {
      token: isPlaceholder ? undefined : cleanToken,
      model,
      routerUrl: this.PRIMARY_ROUTER,
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

    const cType = contentType.toLowerCase();
    if (cType.includes("text") || cType.includes("html") || cType.includes("json") || cType.includes("svg")) {
      const sample = buffer.toString("utf8", 0, Math.min(200, buffer.length));
      throw new Error(`Hugging Face returned non-raster content (${cType}): ${sample}`);
    }

    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isJpg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isWebp = buffer.toString("utf8", 0, 4) === "RIFF" && buffer.toString("utf8", 8, 12) === "WEBP";

    if (isPng) return "png";
    if (isJpg) return "jpeg";
    if (isWebp) return "webp";

    // If content-type claimed image but magic bytes don't match
    throw new Error("Hugging Face binary response does not match PNG, JPEG, or WebP magic bytes.");
  }

  /**
   * Generates a genuine image via Hugging Face Serverless Inference API.
   */
  static async generate(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    const config = this.getConfig();

    if (!config.token) {
      const err: any = new Error(
        "HF_TOKEN is not configured in .env.local. Add your Hugging Face access token to generate images with Hugging Face."
      );
      err.category = "missing_api_key";
      throw err;
    }

    const { width, height } = params.width && params.height
      ? { width: params.width, height: params.height }
      : ImageProviderAdapter.resolveDimensions(params.aspectRatio, params.quality);

    const cleanPrompt = (params.enhancedPrompt || params.prompt).trim();

    // Prepare candidate endpoints: Primary router with at most 1 fallback attempt for network reachability
    const endpoints = [
      `${this.PRIMARY_ROUTER}/${config.model}`,
      `${this.LEGACY_ROUTER}/${config.model}`,
    ];

    let lastError: any = null;
    const startTime = Date.now();

    for (let attempt = 0; attempt < endpoints.length; attempt++) {
      const endpoint = endpoints[attempt];
      const remainingTime = Math.max(1000, config.timeoutMs - (Date.now() - startTime));
      if (remainingTime < 1000) {
        const timeoutErr: any = new Error(
          `Hugging Face inference request timed out after ${Math.round(config.timeoutMs / 1000)}s.`
        );
        timeoutErr.category = "provider_timeout";
        throw timeoutErr;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), remainingTime);

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.token}`,
            "Content-Type": "application/json",
            Accept: "image/png, image/jpeg, image/webp",
          },
          body: JSON.stringify({
            inputs: cleanPrompt,
            parameters: {
              width,
              height,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        const elapsedMs = Date.now() - startTime;
        const contentType = res.headers.get("content-type") || "";

        // Safe diagnostic logging (NEVER logs HF_TOKEN or credentials)
        console.log("[HuggingFaceImageAdapter] Safe diagnostics:", {
          status: res.status,
          statusText: res.statusText,
          contentType,
          elapsedMs,
          model: config.model,
          endpointDomain: new URL(endpoint).hostname,
        });

        if (!res.ok) {
          const status = res.status;
          
          // Bounded response body read with 5-second limit
          const rawText = await Promise.race([
            res.text(),
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Response read timeout")), 5000))
          ]).catch(() => "");

          let parsedError = rawText;
          let estimatedWait: number | undefined;

          try {
            const json = JSON.parse(rawText);
            parsedError = json.error || json.message || rawText;
            if (json.estimated_time) {
              estimatedWait = Math.round(Number(json.estimated_time));
            }
          } catch {}

          // Sanitize error message (never expose tokens or private request headers)
          const cleanErrorMsg = String(parsedError)
            .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer [REDACTED]")
            .slice(0, 300);

          if (status === 401) {
            const err: any = new Error(
              `Hugging Face Error: Invalid access token (HTTP 401). Please verify your HF_TOKEN in .env.local.`
            );
            err.category = "invalid_credentials";
            throw err;
          }

          if (status === 403) {
            const err: any = new Error(
              `Hugging Face Error: Model access forbidden (HTTP 403). The model '${config.model}' may require Pro subscription or gated agreement acceptance on huggingface.co (${cleanErrorMsg}).`
            );
            err.category = "invalid_credentials";
            throw err;
          }

          if (status === 404) {
            // Model not found on this endpoint, try legacy fallback once
            lastError = new Error(`Hugging Face Error: Model '${config.model}' not found on endpoint.`);
            continue;
          }

          if (status === 429) {
            const err: any = new Error(
              `Hugging Face Error: Rate limit or free-tier usage limit exceeded (HTTP 429). Please wait before retrying (${cleanErrorMsg}).`
            );
            err.category = "rate_limited";
            throw err;
          }

          if (status === 503) {
            const timeNote = estimatedWait ? ` (estimated loading time: ${estimatedWait}s)` : "";
            const err: any = new Error(
              `Hugging Face Error: Model '${config.model}' is currently loading on serverless infrastructure. Please retry in a few moments${timeNote} (${cleanErrorMsg}).`
            );
            err.category = "provider_unavailable";
            throw err;
          }

          const err: any = new Error(`Hugging Face Error (HTTP ${status}): ${cleanErrorMsg}`);
          err.category = "provider_unavailable";
          throw err;
        }

        const effectiveContentType = contentType || "image/jpeg";
        const arrayBuffer = await Promise.race([
          res.arrayBuffer(),
          new Promise<ArrayBuffer>((_, reject) => setTimeout(() => reject(new Error("Image stream download timeout")), 15000))
        ]);
        const buffer = Buffer.from(arrayBuffer);

        // Enforce genuine raster image binary verification
        const format = this.validateBinaryImage(buffer, effectiveContentType);
        const base64 = buffer.toString("base64");
        const mediaUrl = `data:image/${format};base64,${base64}`;

        return {
          mediaUrl,
          revisedPrompt: cleanPrompt,
          provider: "Hugging Face",
          model: config.model,
          width,
          height,
          format,
          isFallback: false,
        };
      } catch (err: any) {
        clearTimeout(timer);
        if (err.category) throw err; // Re-throw categorized operational errors immediately

        const elapsedMs = Date.now() - startTime;
        if (err?.name === "AbortError" || err?.name === "TimeoutError" || elapsedMs >= config.timeoutMs) {
          const timeoutErr: any = new Error(
            `Hugging Face inference request timed out after ${Math.round(config.timeoutMs / 1000)}s.`
          );
          timeoutErr.category = "provider_timeout";
          throw timeoutErr;
        }

        lastError = err;
      }
    }

    const finalErr: any = lastError || new Error("Failed to reach Hugging Face Serverless Inference API.");
    finalErr.category = finalErr.category || "provider_unavailable";
    throw finalErr;
  }
}
