import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiRequest, recordRequestUsage } from "@/lib/api-keys/auth-middleware";
import { VideoCreativeService } from "@/lib/ai/creative/video-service";

const VideoGenerationSchema = z.object({
  prompt: z.string().min(1, "prompt is required"),
  duration_seconds: z.number().int().min(2).max(60).optional().default(5),
  aspect_ratio: z.enum(["16:9", "9:16", "1:1", "4:3"]).optional().default("16:9"),
  provider: z.string().optional().default("auto"),
});

export async function POST(req: NextRequest) {
  // 1. Authenticate API Key with videos:generate scope
  const auth = await authenticateApiRequest(req, { requiredScope: "videos:generate" });
  if (!auth.success) {
    return auth.response;
  }

  const { context } = auth;
  const endpoint = "/api/v1/videos/generations";

  try {
    let rawBody: any;
    try {
      rawBody = await req.json();
    } catch {
      recordRequestUsage(context, endpoint, 400, 0);
      return NextResponse.json(
        { error: { message: "Invalid JSON request body.", type: "invalid_request_error", code: "bad_json" } },
        { status: 400, headers: auth.headers }
      );
    }

    // 2. Validate input schema
    const parseResult = VideoGenerationSchema.safeParse(rawBody);
    if (!parseResult.success) {
      recordRequestUsage(context, endpoint, 400, 0);
      return NextResponse.json(
        {
          error: {
            message: parseResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
            type: "invalid_request_error",
            code: "validation_error",
          },
        },
        { status: 400, headers: auth.headers }
      );
    }

    const { prompt, duration_seconds, aspect_ratio, provider } = parseResult.data;

    // 3. Test mode isolation: explicit honest sandbox response without fabricated video files or fake URLs
    if (context.environment === "test") {
      recordRequestUsage(context, endpoint, 200, 0, {
        provider: "nexora-sandbox",
        model: "video-diffusion-sandbox",
      });

      return NextResponse.json(
        {
          object: "video.sandbox",
          sandbox: true,
          simulated: true,
          billing_units: 0,
          artifact_generated: false,
          message: "Sandbox execution completed. No AI inference was performed.",
          request_validation: {
            status: "valid",
            endpoint,
            parameters: {
              prompt,
              duration_seconds,
              aspect_ratio,
              provider,
            },
          },
          nexora_execution: {
            environment: "test",
            sandbox: true,
            simulated: true,
            billing_units: 0,
            artifact_generated: false,
            correlation_id: context.correlationId,
            latency_ms: Date.now() - context.startTime,
            status: "simulated_success",
          },
        },
        {
          status: 200,
          headers: {
            ...auth.headers,
            "x-nexora-environment": "test",
          },
        }
      );
    }

    // 4. Live execution via VideoCreativeService
    const artifact = await VideoCreativeService.generateVideo({
      prompt,
      durationSeconds: duration_seconds,
      aspectRatio: aspect_ratio,
      provider,
    });

    const durationMs = Date.now() - context.startTime;
    const isUnconfigured =
      artifact.status === "unsupported" ||
      (artifact.errorMessage && /not configured|missing.*token|replicate.*not configured/i.test(artifact.errorMessage));

    // Return honest NOT_CONFIGURED without fabricating fake video assets
    if (isUnconfigured || !artifact.mediaUrl) {
      const code = isUnconfigured ? "NOT_CONFIGURED" : "PROVIDER_ERROR";
      const status = isUnconfigured ? 503 : 502;
      recordRequestUsage(context, endpoint, status, 0, {
        provider: artifact.videoMetadata?.provider || provider,
        model: "video-diffusion-v1",
      });

      return NextResponse.json(
        {
          error: {
            message: artifact.errorMessage || "Video generation provider is not configured or unavailable.",
            type: "provider_error",
            code,
            provider: artifact.videoMetadata?.provider || provider,
          },
        },
        { status, headers: auth.headers }
      );
    }

    // 5. Successful generation
    recordRequestUsage(context, endpoint, 200, 1, {
      provider: artifact.videoMetadata?.provider || provider,
      model: "video-diffusion-v1",
    });

    return NextResponse.json(
      {
        id: artifact.id,
        object: "video.generation",
        created: Math.floor(Date.now() / 1000),
        title: artifact.title,
        subtitle: artifact.subtitle,
        prompt,
        media_url: artifact.mediaUrl,
        duration_seconds: artifact.videoMetadata?.durationSeconds || duration_seconds,
        aspect_ratio: artifact.videoMetadata?.aspectRatio || aspect_ratio,
        nexora_execution: {
          environment: context.environment,
          correlation_id: context.correlationId,
          latency_ms: durationMs,
          status: "success",
        },
      },
      {
        status: 200,
        headers: {
          ...auth.headers,
          "x-nexora-environment": context.environment,
        },
      }
    );
  } catch (err) {
    const errorMsg = (err as Error).message || "Internal server error during video generation.";
    recordRequestUsage(context, endpoint, 500, 0);
    return NextResponse.json(
      {
        error: {
          message: errorMsg,
          type: "api_error",
          code: "video_generation_failed",
        },
      },
      { status: 500, headers: auth.headers }
    );
  }
}
