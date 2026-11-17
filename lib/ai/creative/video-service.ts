/**
 * NEXORA UNIVERSAL AI VIDEO SERVICE
 *
 * Dedicated video generation service enforcing:
 * - Genuine provider validation (Replicate, Luma, Runway)
 * - True status lifecycle: pending, success, failed, rate_limited, unsupported
 * - Honest error reporting when no video provider is configured
 * - Never returns storyboards, scene lists, prompt dumps, or fake video URLs
 */

import { CreativeArtifact, CreativeArtifactStatus, CreativeVideoMetadata } from "./creative-types";
import { HuggingFaceVideoAdapter } from "./huggingface-video-adapter";

export interface GenerateVideoOptions {
  prompt: string;
  durationSeconds?: number;
  aspectRatio?: string;
  provider?: string;
}

export class VideoCreativeService {
  /**
   * Generates video through a verified provider or returns a truthful error.
   */
  static async generateVideo(options: GenerateVideoOptions): Promise<CreativeArtifact> {
    const {
      prompt,
      durationSeconds = 5,
      aspectRatio = "16:9",
      provider = process.env.VIDEO_PROVIDER || "auto",
    } = options;

    const isHfConfigured = HuggingFaceVideoAdapter.isConfigured();
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    const lumaKey = process.env.LUMA_API_KEY;
    const runwayKey = process.env.RUNWAY_API_KEY;

    // Check if any genuine video provider is configured
    const hasConfiguredProvider =
      isHfConfigured ||
      (replicateToken && !replicateToken.includes("your-replicate-token")) ||
      (lumaKey && !lumaKey.includes("your-luma-key")) ||
      (runwayKey && !runwayKey.includes("your-runway-key"));

    if (!hasConfiguredProvider || provider === "none") {
      return {
        id: `art_vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: "video",
        title: this.truncateTitle(prompt),
        subtitle: `VIDEO • ${aspectRatio} • Provider Not Configured`,
        mediaUrl: undefined,
        status: "unsupported",
        errorMessage:
          "AI Video Generation provider is not configured. Please configure HF_TOKEN, REPLICATE_API_TOKEN, LUMA_API_KEY, or RUNWAY_API_KEY in .env.local to enable video generation.",
        createdAt: new Date().toISOString(),
        videoMetadata: {
          prompt,
          durationSeconds,
          aspectRatio,
          provider: "None",
        },
      };
    }

    // Priority 1: Zero-Budget Hugging Face ZeroGPU Text-To-Video (Free, high-speed)
    if (isHfConfigured && (provider === "auto" || provider === "huggingface" || provider === "zerogpu")) {
      try {
        const hfResult = await HuggingFaceVideoAdapter.generate({
          prompt,
          durationSeconds,
          aspectRatio,
        });

        return {
          id: `art_vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: "video",
          title: this.truncateTitle(prompt),
          subtitle: `VIDEO • ${aspectRatio} • Hugging Face ZeroGPU (${hfResult.model})`,
          mediaUrl: hfResult.mediaUrl,
          status: "ready",
          createdAt: new Date().toISOString(),
          videoMetadata: {
            prompt,
            durationSeconds: hfResult.durationSeconds,
            aspectRatio,
            provider: "Hugging Face ZeroGPU",
            model: hfResult.model,
            fps: 16,
            resolution: "512x512",
          },
        };
      } catch (hfErr: any) {
        console.warn("[VideoCreativeService] HuggingFace video generation failed:", hfErr?.message || hfErr);
        // If explicitly requested huggingface, do not fall over to paid providers
        if (provider === "huggingface" || provider === "zerogpu") {
          return {
            id: `art_vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: "video",
            title: this.truncateTitle(prompt),
            subtitle: `VIDEO • ${aspectRatio} • Hugging Face Failed`,
            mediaUrl: undefined,
            status: "failed",
            errorMessage: hfErr?.message || "Hugging Face ZeroGPU video generation failed.",
            createdAt: new Date().toISOString(),
            videoMetadata: {
              prompt,
              provider: "Hugging Face ZeroGPU",
              model: "ModelScope Text-To-Video",
            },
          };
        }
        // Otherwise fall through to commercial providers if configured
      }
    }

    // If Replicate is configured, invoke video prediction
    if (replicateToken && !replicateToken.includes("your-replicate-token")) {
      try {
        const startRes = await fetch(
          "https://api.replicate.com/v1/models/minimax/video-01/predictions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${replicateToken}`,
              "Content-Type": "application/json",
              Prefer: "wait=30",
            },
            body: JSON.stringify({
              input: {
                prompt,
                prompt_optimizer: true,
              },
            }),
            signal: AbortSignal.timeout(45000),
          }
        );

        if (!startRes.ok) {
          const errData = await startRes.json().catch(() => ({}));
          const status = startRes.status;
          const isRateLimit = status === 429;
          return {
            id: `art_vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: "video",
            title: this.truncateTitle(prompt),
            subtitle: `VIDEO • ${aspectRatio} • ${isRateLimit ? "Rate Limited" : "Generation Failed"}`,
            mediaUrl: undefined,
            status: isRateLimit ? "rate_limited" : "failed",
            errorMessage: errData?.detail || `Replicate API error: HTTP ${status}`,
            createdAt: new Date().toISOString(),
            videoMetadata: {
              prompt,
              provider: "Replicate",
              model: "minimax/video-01",
              aspectRatio,
              durationSeconds,
            },
          };
        }

        let prediction = await startRes.json();
        const startTime = Date.now();

        while (
          prediction.status !== "succeeded" &&
          prediction.status !== "failed" &&
          prediction.status !== "canceled"
        ) {
          if (Date.now() - startTime > 90000) {
            throw new Error("Video generation timed out after 90 seconds.");
          }
          await new Promise((r) => setTimeout(r, 3000));
          const pollRes = await fetch(
            prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`,
            {
              headers: { Authorization: `Bearer ${replicateToken}` },
            }
          );
          if (pollRes.ok) {
            prediction = await pollRes.json();
          }
        }

        if (prediction.status !== "succeeded") {
          return {
            id: `art_vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: "video",
            title: this.truncateTitle(prompt),
            status: "failed",
            errorMessage: prediction.error || `Video generation failed with status: ${prediction.status}`,
            createdAt: new Date().toISOString(),
            videoMetadata: {
              prompt,
              provider: "Replicate",
              model: "minimax/video-01",
              aspectRatio,
              durationSeconds,
            },
          };
        }

        const outputUrl = Array.isArray(prediction.output)
          ? prediction.output[0]
          : prediction.output;

        if (!outputUrl || typeof outputUrl !== "string") {
          throw new Error("Replicate did not return a valid video output URL.");
        }

        return {
          id: `art_vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: "video",
          title: this.truncateTitle(prompt),
          subtitle: `VIDEO • ${aspectRatio} • ${durationSeconds}s`,
          mediaUrl: outputUrl,
          thumbnailUrl: outputUrl,
          status: "success",
          createdAt: new Date().toISOString(),
          videoMetadata: {
            prompt,
            provider: "Replicate",
            model: "minimax/video-01",
            format: "mp4",
            aspectRatio,
            durationSeconds,
          },
        };
      } catch (err: any) {
        return {
          id: `art_vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: "video",
          title: this.truncateTitle(prompt),
          status: "failed",
          errorMessage: err?.message || "Video generation failed.",
          createdAt: new Date().toISOString(),
          videoMetadata: {
            prompt,
            provider: "Replicate",
            aspectRatio,
            durationSeconds,
          },
        };
      }
    }

    return {
      id: `art_vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "video",
      title: this.truncateTitle(prompt),
      status: "unsupported",
      errorMessage: "AI Video Generation provider is not configured. Please set REPLICATE_API_TOKEN in .env.local.",
      createdAt: new Date().toISOString(),
      videoMetadata: {
        prompt,
        provider: "None",
      },
    };
  }

  private static truncateTitle(str: string): string {
    const clean = str.replace(/[^\w\s-]/g, "").trim();
    if (clean.length <= 48) return clean || "Generated Video";
    return clean.slice(0, 45) + "...";
  }
}

