import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiRequest, recordRequestUsage } from "@/lib/api-keys/auth-middleware";
import { LyricsCreativeService } from "@/lib/ai/creative/lyrics-service";

const LyricsGenerationSchema = z.object({
  prompt: z.string().min(1, "prompt or theme is required").optional(),
  theme: z.string().min(1).optional(),
  language: z.string().optional().default("English"),
  genre: z.string().optional().default("Pop / Modern Melody"),
  mood: z.string().optional().default("Inspiring"),
  vocalStyle: z.enum(["Male", "Female", "Duet"]).optional().default("Duet"),
  songLength: z.enum(["short", "standard", "extended"]).optional().default("standard"),
});

export async function POST(req: NextRequest) {
  // 1. Authenticate API Key with lyrics:generate scope
  const auth = await authenticateApiRequest(req, { requiredScope: "lyrics:generate" });
  if (!auth.success) {
    return auth.response;
  }

  const { context } = auth;
  const endpoint = "/api/v1/lyrics/generations";

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
    const parseResult = LyricsGenerationSchema.safeParse(rawBody);
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

    const { prompt, theme, language, genre, mood, vocalStyle, songLength } = parseResult.data;
    const resolvedTheme = prompt || theme;
    if (!resolvedTheme) {
      recordRequestUsage(context, endpoint, 400, 0);
      return NextResponse.json(
        { error: { message: "Either 'prompt' or 'theme' must be provided.", type: "invalid_request_error", code: "missing_parameter" } },
        { status: 400, headers: auth.headers }
      );
    }

    // 3. Test mode isolation: explicit honest sandbox response without fabricated lyrics
    if (context.environment === "test") {
      recordRequestUsage(context, endpoint, 200, 0, {
        provider: "nexora-sandbox",
        model: "lyrics-v1-sandbox",
      });

      return NextResponse.json(
        {
          object: "lyrics.sandbox",
          sandbox: true,
          simulated: true,
          billing_units: 0,
          artifact_generated: false,
          message: "Sandbox execution completed. No AI inference was performed.",
          request_validation: {
            status: "valid",
            endpoint,
            parameters: {
              prompt: resolvedTheme,
              language,
              genre,
              mood,
              vocalStyle,
              songLength,
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
          headers: { ...auth.headers, "x-nexora-environment": "test" },
        }
      );
    }

    // 4. Live generation using genuine configured upstream text provider
    const artifact = await LyricsCreativeService.generateLyricsWithLLM({
      theme: resolvedTheme,
      language,
      genre,
      mood,
      vocalStyle,
      songLength,
    });

    const lyricsMeta = artifact.lyricsMetadata;
    const durationMs = Date.now() - context.startTime;
    const fullLyricsText =
      lyricsMeta?.sections?.map((s) => `[${s.label}]\n${s.lines.join("\n")}`).join("\n\n") || "";

    // Record usage (1 creative lyrics generation unit)
    recordRequestUsage(context, endpoint, 200, 1, {
      provider: "nexora-creative",
      model: "lyrics-v1",
    });

    return NextResponse.json(
      {
        id: artifact.id,
        object: "lyrics.generation",
        created: Math.floor(Date.now() / 1000),
        status: artifact.status,
        title: artifact.title,
        subtitle: artifact.subtitle,
        theme: resolvedTheme,
        language: lyricsMeta?.language || language,
        genre: lyricsMeta?.genre || genre,
        mood: lyricsMeta?.mood || mood,
        vocal_style: lyricsMeta?.vocalStyle || vocalStyle,
        musical_metadata: {
          tempo_bpm: lyricsMeta?.tempoBpm || 84,
          key_signature: lyricsMeta?.keySignature || "C Major",
          instruments: lyricsMeta?.instruments || ["Acoustic Guitar", "Piano", "Bass", "Drums"],
        },
        sections: lyricsMeta?.sections || [],
        lyrics_text: fullLyricsText,
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
  } catch (err: any) {
    const errorMsg = err?.message || "Failed to generate lyrics.";
    const isUnconfigured = errorMsg.includes("not configured") || errorMsg.includes("API key");
    const status = isUnconfigured ? 503 : 500;
    const errorCode = isUnconfigured ? "NOT_CONFIGURED" : "generation_failed";

    recordRequestUsage(context, endpoint, status, 0);

    return NextResponse.json(
      {
        error: {
          message: errorMsg,
          type: isUnconfigured ? "configuration_error" : "api_error",
          code: errorCode,
        },
      },
      { status, headers: auth.headers }
    );
  }
}
