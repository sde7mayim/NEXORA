import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiRequest, recordRequestUsage } from "@/lib/api-keys/auth-middleware";
import { MusicCreativeService } from "@/lib/ai/creative/music-service";

const MusicGenerationSchema = z.object({
  prompt: z.string().min(1, "prompt is required"),
  genre: z.string().optional().default("Acoustic Melody"),
  mood: z.string().optional().default("Uplifting"),
  lyrics: z.string().optional(),
  is_instrumental: z.boolean().optional().default(false),
  tempo_bpm: z.number().int().min(40).max(220).optional().default(88),
  duration_seconds: z.number().int().min(5).max(180).optional().default(30),
  provider: z.enum(["auto", "huggingface", "synthesizer", "suno", "udio", "replicate", "elevenlabs", "none"]).optional().default("auto"),
});

export async function POST(req: NextRequest) {
  // 1. Authenticate API Key with music:generate scope
  const auth = await authenticateApiRequest(req, { requiredScope: "music:generate" });
  if (!auth.success) {
    return auth.response;
  }

  const { context } = auth;
  const endpoint = "/api/v1/music/generations";

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
    const parseResult = MusicGenerationSchema.safeParse(rawBody);
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

    const { prompt, genre, mood, lyrics, is_instrumental, tempo_bpm, duration_seconds, provider } = parseResult.data;

    // 3. Test mode isolation: explicit honest sandbox response without fabricated audio files or fake URLs
    if (context.environment === "test") {
      recordRequestUsage(context, endpoint, 200, 0, {
        provider: "nexora-sandbox",
        model: "music-v1-sandbox",
      });

      return NextResponse.json(
        {
          object: "music.sandbox",
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
              genre,
              mood,
              lyrics,
              is_instrumental,
              tempo_bpm,
              duration_seconds,
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

    // 4. Live execution via MusicCreativeService
    const artifact = await MusicCreativeService.generateMusic({
      prompt,
      genre,
      mood,
      fullExactLyrics: lyrics,
      isInstrumental: is_instrumental,
      tempoBpm: tempo_bpm,
      durationSeconds: duration_seconds,
      provider,
    });

    const durationMs = Date.now() - context.startTime;
    const isUnconfigured =
      artifact.status === "unsupported" ||
      (artifact.errorMessage && /not configured|missing.*key|suno.*not configured/i.test(artifact.errorMessage));

    // Handle unconfigured or failed states honestly
    if (isUnconfigured || !artifact.mediaUrl) {
      const code = isUnconfigured ? "NOT_CONFIGURED" : "PROVIDER_ERROR";
      const status = isUnconfigured ? 503 : 502;
      recordRequestUsage(context, endpoint, status, 0, {
        provider: artifact.musicMetadata?.provider || provider,
        model: "music-v1",
      });

      return NextResponse.json(
        {
          error: {
            message: artifact.errorMessage || "Music generation provider is not configured or unavailable.",
            type: "provider_error",
            code,
            provider: artifact.musicMetadata?.provider || provider,
          },
        },
        { status, headers: auth.headers }
      );
    }

    // 5. Successful generation
    recordRequestUsage(context, endpoint, 200, 1, {
      provider: artifact.musicMetadata?.provider || provider,
      model: "music-v1",
    });

    return NextResponse.json(
      {
        id: artifact.id,
        object: "music.generation",
        created: Math.floor(Date.now() / 1000),
        title: artifact.title,
        subtitle: artifact.subtitle,
        prompt,
        genre: artifact.musicMetadata?.genre || genre,
        mood: artifact.musicMetadata?.mood || mood,
        media_url: artifact.mediaUrl,
        is_instrumental: artifact.musicMetadata?.isInstrumental ?? is_instrumental,
        musical_metadata: {
          tempo_bpm: artifact.musicMetadata?.tempoBpm || tempo_bpm,
          duration_seconds: artifact.musicMetadata?.durationSeconds || duration_seconds,
          instruments: artifact.musicMetadata?.instruments || [],
          key_signature: artifact.musicMetadata?.keySignature,
        },
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
    const errorMsg = (err as Error).message || "Internal server error during music generation.";
    recordRequestUsage(context, endpoint, 500, 0);
    return NextResponse.json(
      {
        error: {
          message: errorMsg,
          type: "api_error",
          code: "music_generation_failed",
        },
      },
      { status: 500, headers: auth.headers }
    );
  }
}
