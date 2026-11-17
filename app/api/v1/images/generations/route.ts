import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiRequest, recordRequestUsage } from "@/lib/api-keys/auth-middleware";
import { ImageCreativeService } from "@/lib/ai/creative/image-service";
import { ImageAspectRatio, ImageStylePreset } from "@/lib/ai/creative/creative-types";
import { ImageProviderType } from "@/lib/ai/creative/image-provider-adapter";

const ImageGenerationSchema = z.object({
  prompt: z.string().min(1, "prompt is required"),
  aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"]).optional().default("1:1"),
  style: z
    .enum([
      "photorealistic",
      "realistic",
      "cinematic",
      "anime",
      "digital-art",
      "fantasy",
      "neon-cyberpunk",
      "minimalist",
      "oil-painting",
      "3d-render",
    ])
    .optional()
    .default("photorealistic"),
  quality: z.enum(["standard", "hd"]).optional().default("standard"),
  provider: z.enum(["auto", "huggingface", "nexora", "gemini", "openai", "replicate"]).optional().default("auto"),
  seed: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  // 1. Authenticate API Key with images:generate scope
  const auth = await authenticateApiRequest(req, { requiredScope: "images:generate" });
  if (!auth.success) {
    return auth.response;
  }

  const { context } = auth;
  const endpoint = "/api/v1/images/generations";

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
    const parseResult = ImageGenerationSchema.safeParse(rawBody);
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

    const { prompt, aspect_ratio, style, quality, provider, seed } = parseResult.data;

    // 3. Test mode isolation: explicit honest sandbox response without fabricated image files or fake URLs
    if (context.environment === "test") {
      recordRequestUsage(context, endpoint, 200, 0, {
        provider: "nexora-sandbox",
        model: "flux-schnell-sandbox",
      });

      return NextResponse.json(
        {
          object: "image.sandbox",
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
              aspect_ratio,
              style,
              quality,
              provider,
              seed,
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

    // 4. Live execution via ImageCreativeService
    const artifact = await ImageCreativeService.generateImage({
      prompt,
      aspectRatio: aspect_ratio as ImageAspectRatio,
      style: style as ImageStylePreset,
      quality,
      provider: provider as ImageProviderType,
      seed,
    });

    const durationMs = Date.now() - context.startTime;
    const isUnconfigured =
      artifact.status === "unsupported" ||
      (artifact.errorMessage && /not configured|missing.*key|hf_token/i.test(artifact.errorMessage));

    // If engine is unconfigured, return honest NOT_CONFIGURED error without generating fake images
    if (isUnconfigured || !artifact.mediaUrl) {
      const code = isUnconfigured ? "NOT_CONFIGURED" : "PROVIDER_ERROR";
      const status = isUnconfigured ? 503 : 502;
      recordRequestUsage(context, endpoint, status, 0, {
        provider: artifact.imageMetadata?.provider || provider,
        model: "flux-schnell",
      });

      return NextResponse.json(
        {
          error: {
            message: artifact.errorMessage || "Image generation engine is currently unavailable.",
            type: "provider_error",
            code,
            provider: artifact.imageMetadata?.provider || provider,
            status_reason: artifact.errorCategory || "missing_api_key",
          },
        },
        { status, headers: auth.headers }
      );
    }

    // 5. Successful real image generation
    recordRequestUsage(context, endpoint, 200, 1, {
      provider: artifact.imageMetadata?.provider || provider,
      model: "flux-schnell",
    });

    return NextResponse.json(
      {
        id: artifact.id,
        object: "image.generation",
        created: Math.floor(Date.now() / 1000),
        prompt,
        data: [
          {
            url: artifact.mediaUrl,
            revised_prompt: artifact.imageMetadata?.revisedPrompt || prompt,
            mime_type: artifact.mediaUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg",
          },
        ],
        aspect_ratio,
        resolution: artifact.imageMetadata?.resolution,
        provider: artifact.imageMetadata?.provider,
        style,
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
    const errorMsg = (err as Error).message || "Internal server error during image generation.";
    recordRequestUsage(context, endpoint, 500, 0);
    return NextResponse.json(
      {
        error: {
          message: errorMsg,
          type: "api_error",
          code: "image_generation_failed",
        },
      },
      { status: 500, headers: auth.headers }
    );
  }
}
