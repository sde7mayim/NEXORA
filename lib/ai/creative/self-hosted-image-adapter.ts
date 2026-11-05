/**
 * NEXORA SELF-HOSTED OPEN-WEIGHT IMAGE ENGINE ADAPTER
 *
 * Provider-independent adapter for self-hosted and local open-weight diffusion runtimes:
 * - SDXL Turbo, Stable Diffusion XL, FLUX.1-schnell, Stable Diffusion 1.5
 * - LocalAI, vLLM, ComfyUI, Automatic1111 / SD-WebUI, or custom HTTP inference servers
 *
 * Features:
 * - Keeps model inference strictly decoupled from Next.js server runtime
 * - Zero reliance on commercial cloud API credits (OpenAI / Gemini)
 * - Verifies real binary image payloads with magic bytes (PNG, JPEG, WebP)
 * - Transparent offline and configuration diagnostics (never falsely claims credits exhausted)
 * - Preserves aspect ratio, prompt fidelity, and quality settings
 */

import { ImageAspectRatio, ImageStylePreset, CreativeErrorCategory } from "./creative-types";
import { ImageGenerationParams, ImageGenerationResult } from "./image-provider-adapter";

export interface SelfHostedEngineConfig {
  url: string;
  model: string;
  apiKey?: string;
  timeoutMs: number;
  enabled: boolean;
}

export interface SelfHostedEngineHealth {
  online: boolean;
  endpoint: string;
  model?: string;
  latencyMs?: number;
  error?: string;
}

export class SelfHostedImageAdapter {
  /**
   * Retrieves server-side configuration for the self-hosted engine.
   */
  static getConfig(): SelfHostedEngineConfig {
    const rawUrl = process.env.NEXORA_IMAGE_ENGINE_URL || "";
    const cleanUrl = rawUrl.trim().replace(/\/+$/, "");
    const model = (process.env.NEXORA_IMAGE_ENGINE_MODEL || "sdxl-turbo").trim();
    const apiKey = process.env.NEXORA_IMAGE_ENGINE_API_KEY || "";
    const timeoutMs = Math.max(10000, Number(process.env.NEXORA_IMAGE_ENGINE_TIMEOUT_MS) || 60000);
    const enabledSetting = (process.env.NEXORA_IMAGE_ENGINE_ENABLED || "").toLowerCase().trim();

    // Enabled by default if an explicit URL is provided, or if explicitly enabled
    const enabled = enabledSetting === "false" ? false : Boolean(cleanUrl || enabledSetting === "true");

    return {
      url: cleanUrl,
      model,
      apiKey: apiKey && !apiKey.includes("your-api-key") ? apiKey : undefined,
      timeoutMs,
      enabled,
    };
  }

  /**
   * Determines if the self-hosted engine is configured and eligible for routing.
   */
  static isConfigured(): boolean {
    const config = this.getConfig();
    return config.enabled && Boolean(process.env.NEXORA_IMAGE_ENGINE_URL || process.env.NEXORA_IMAGE_ENGINE_ENABLED === "true");
  }

  /**
   * Checks health and reachability of the configured self-hosted inference endpoint.
   */
  static async checkHealth(): Promise<SelfHostedEngineHealth> {
    const config = this.getConfig();
    if (!config.url) {
      return {
        online: false,
        endpoint: "",
        error: "NEXORA_IMAGE_ENGINE_URL is not configured.",
      };
    }

    const start = Date.now();
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    // Try common health endpoints in order: /health, /v1/models, /sdapi/v1/options
    const probeEndpoints = [
      `${config.url}/health`,
      `${config.url}/v1/models`,
      `${config.url}/sdapi/v1/options`,
    ];

    for (const endpoint of probeEndpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          const latencyMs = Date.now() - start;
          let discoveredModel = config.model;

          try {
            const data = await res.json();
            if (data?.data?.[0]?.id) {
              discoveredModel = data.data[0].id;
            } else if (data?.sd_model_name) {
              discoveredModel = data.sd_model_name;
            }
          } catch { }

          return {
            online: true,
            endpoint: config.url,
            model: discoveredModel,
            latencyMs,
          };
        }
      } catch {
        // Continue to next probe endpoint
      }
    }

    return {
      online: false,
      endpoint: config.url,
      error: `Could not reach self-hosted inference server at ${config.url}. Please verify it is running.`,
    };
  }

  /**
   * Resolves diffusion-compatible image dimensions (multiples of 64 or 8)
   * tailored to open-weight architectures (SDXL, FLUX, SD 1.5).
   */
  static resolveDimensions(
    aspectRatio: ImageAspectRatio = "1:1",
    quality: "standard" | "hd" = "standard",
    model: string = "sdxl-turbo"
  ): { width: number; height: number } {
    const isSD15 = /sd-?1\.?5|stable-diffusion-v1/i.test(model);

    if (isSD15) {
      switch (aspectRatio) {
        case "16:9":
          return { width: 768, height: 432 };
        case "9:16":
          return { width: 432, height: 768 };
        case "4:3":
          return { width: 640, height: 480 };
        case "3:4":
          return { width: 480, height: 640 };
        case "1:1":
        default:
          return { width: 512, height: 512 };
      }
    }

    // Default SDXL / FLUX architecture (optimal at ~1024x1024 or 1M pixel buckets)
    if (quality === "hd") {
      switch (aspectRatio) {
        case "16:9":
          return { width: 1344, height: 768 };
        case "9:16":
          return { width: 768, height: 1344 };
        case "4:3":
          return { width: 1152, height: 864 };
        case "3:4":
          return { width: 864, height: 1152 };
        case "1:1":
        default:
          return { width: 1024, height: 1024 };
      }
    }

    switch (aspectRatio) {
      case "16:9":
        return { width: 1024, height: 576 };
      case "9:16":
        return { width: 576, height: 1024 };
      case "4:3":
        return { width: 1024, height: 768 };
      case "3:4":
        return { width: 768, height: 1024 };
      case "1:1":
      default:
        return { width: 1024, height: 1024 };
    }
  }

  /**
   * Validates binary image response from the self-hosted engine.
   * Enforces genuine image headers (PNG, JPEG, WebP) and rejects fake SVG/HTML outputs.
   */
  static validateImageBinary(mediaUrl: string): { format: "png" | "jpeg" | "webp"; byteLength: number } {
    if (!mediaUrl || typeof mediaUrl !== "string") {
      throw new Error("Invalid self-hosted engine response: Media payload is empty.");
    }

    if (mediaUrl.startsWith("data:")) {
      const match = mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        throw new Error("Invalid self-hosted engine response: Malformed data URI format.");
      }

      const mimeType = match[1].toLowerCase();
      if (mimeType.includes("svg") || mimeType.includes("html") || mimeType.includes("text")) {
        throw new Error(`Self-hosted engine returned non-image content type: ${mimeType}. Expected binary raster image.`);
      }

      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.length < 1024) {
        throw new Error(`Self-hosted engine returned truncated payload (${buffer.length} bytes < 1KB threshold).`);
      }

      // Check magic headers
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      const isJpg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
      const isWebp = buffer.toString("utf8", 0, 4) === "RIFF" && buffer.toString("utf8", 8, 12) === "WEBP";

      if (isPng) return { format: "png", byteLength: buffer.length };
      if (isJpg) return { format: "jpeg", byteLength: buffer.length };
      if (isWebp) return { format: "webp", byteLength: buffer.length };

      throw new Error("Self-hosted engine returned invalid binary data: Magic byte signature does not match PNG, JPEG, or WebP.");
    }

    if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
      return { format: "png", byteLength: 0 };
    }

    throw new Error("Invalid self-hosted engine response: Expected base64 data URI or HTTP URL.");
  }

  /**
   * Generates a genuine image using the configured self-hosted open-weight model engine.
   */
  static async generate(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    const config = this.getConfig();

    if (!config.url) {
      const err: any = new Error(
        "Nexora Image Engine is not configured. Please set NEXORA_IMAGE_ENGINE_URL in .env.local to point to your self-hosted inference server."
      );
      err.category = "self_hosted_engine_misconfigured";
      throw err;
    }

    const { width, height } = params.width && params.height
      ? { width: params.width, height: params.height }
      : this.resolveDimensions(params.aspectRatio, params.quality, config.model);

    const promptText = (params.enhancedPrompt || params.prompt).trim();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    let rawMediaUrl = "";

    // Strategy 1: OpenAI-compatible image generations endpoint (/v1/images/generations)
    // Supported by LocalAI, vLLM, Diffusers-serve, Ollama proxies
    const openaiEndpoint = `${config.url}/v1/images/generations`;

    try {
      const res = await fetch(openaiEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: config.model,
          prompt: promptText,
          n: 1,
          size: `${width}x${height}`,
          response_format: "b64_json",
          seed: params.seed,
        }),
        signal: AbortSignal.timeout(config.timeoutMs),
      });

      if (res.ok) {
        const data = await res.json();
        const item = data?.data?.[0];
        if (item?.b64_json) {
          rawMediaUrl = `data:image/png;base64,${item.b64_json}`;
        } else if (item?.url) {
          rawMediaUrl = item.url;
        }
      } else if (res.status === 404) {
        // Endpoint not found, try Strategy 2 (SD-WebUI / Automatic1111)
      } else {
        const errText = await res.text().catch(() => "");
        console.warn(`[SelfHostedImageAdapter] /v1/images/generations returned HTTP ${res.status}:`, errText);
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.name === "TimeoutError") {
        const timeoutErr: any = new Error(
          `Nexora Image Engine timed out after ${Math.round(config.timeoutMs / 1000)}s generating image on self-hosted server.`
        );
        timeoutErr.category = "provider_timeout";
        throw timeoutErr;
      }
      // If network refused, fail fast
      if (err?.code === "ECONNREFUSED" || /ECONNREFUSED|Failed to fetch/i.test(err?.message)) {
        const connErr: any = new Error(
          `Nexora Image Engine is offline or unreachable at ${config.url}. Please ensure your self-hosted inference server is running and listening.`
        );
        connErr.category = "self_hosted_engine_offline";
        throw connErr;
      }
    }

    // Strategy 2: Automatic1111 / SD-WebUI endpoint (/sdapi/v1/txt2img)
    if (!rawMediaUrl) {
      const sdWebUiEndpoint = `${config.url}/sdapi/v1/txt2img`;
      try {
        const res = await fetch(sdWebUiEndpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            prompt: promptText,
            negative_prompt: "blurry, low quality, distorted, watermark, deformed",
            width,
            height,
            steps: 20,
            cfg_scale: 7.0,
            seed: params.seed ?? -1,
          }),
          signal: AbortSignal.timeout(config.timeoutMs),
        });

        if (res.ok) {
          const data = await res.json();
          const firstImg = data?.images?.[0];
          if (firstImg) {
            rawMediaUrl = `data:image/png;base64,${firstImg}`;
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError" || err?.name === "TimeoutError") {
          const timeoutErr: any = new Error(
            `Nexora Image Engine timed out after ${Math.round(config.timeoutMs / 1000)}s generating image on self-hosted server.`
          );
          timeoutErr.category = "provider_timeout";
          throw timeoutErr;
        }
      }
    }

    // If both strategies failed or returned no image
    if (!rawMediaUrl) {
      const offlineErr: any = new Error(
        `Nexora Image Engine is offline or returned no valid image at ${config.url}. Please ensure the local inference runtime is active with model '${config.model}'.`
      );
      offlineErr.category = "self_hosted_engine_offline";
      throw offlineErr;
    }

    // Validate binary integrity of returned payload
    const { format } = this.validateImageBinary(rawMediaUrl);

    return {
      mediaUrl: rawMediaUrl,
      revisedPrompt: params.enhancedPrompt || params.prompt,
      provider: "Nexora Image Engine (Self-Hosted)",
      model: config.model,
      width,
      height,
      format,
      isFallback: false,
    };
  }
}
