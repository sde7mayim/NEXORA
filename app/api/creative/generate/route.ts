import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ImageCreativeService } from "@/lib/ai/creative/image-service";
import { LyricsCreativeService } from "@/lib/ai/creative/lyrics-service";
import { MusicCreativeService } from "@/lib/ai/creative/music-service";
import { AudioCreativeService } from "@/lib/ai/creative/audio-service";
import { EntitlementEngine } from "@/lib/entitlements/engine";
import { PlanTier } from "@/lib/entitlements/types";

const CreativeRequestSchema = z.object({
  type: z.enum(["image", "edited-image", "lyrics", "music", "voice", "transcription"]),
  prompt: z.string().optional(),
  planTier: z.enum(["free", "pro", "family", "enterprise"]).default("free"),
  userId: z.string().default("usr_anonymous"),
  options: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = CreativeRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload", details: parsed.error }, { status: 400 });
    }

    const { type, prompt = "", planTier, userId, options = {} } = parsed.data;

    // 1. Quota Check based on Creative Type
    let quotaType: "image" | "image-edit" | "lyrics" | "music" | "audio" = "image";
    if (type === "edited-image") quotaType = "image-edit";
    else if (type === "lyrics") quotaType = "lyrics";
    else if (type === "music") quotaType = "music";
    else if (type === "voice" || type === "transcription") quotaType = "audio";

    const quotaCheck = EntitlementEngine.checkCreativeQuota(planTier as PlanTier, quotaType, 0);
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.reason }, { status: 429 });
    }

    // 2. Reserve Quota
    const reservationId = await EntitlementEngine.reserveQuota(userId, "creative");

    let artifact = null;

    try {
      switch (type) {
        case "image":
          artifact = await ImageCreativeService.generateImage({
            prompt,
            aspectRatio: options.aspectRatio || "1:1",
            style: options.style || "cinematic",
            seed: options.seed,
          });
          break;

        case "edited-image":
          if (!options.originalImageUrl) {
            return NextResponse.json({ error: "Original image URL or base64 is required for image editing" }, { status: 400 });
          }
          artifact = await ImageCreativeService.editImage({
            originalImageUrl: options.originalImageUrl,
            instruction: prompt || options.instruction || "Enhance image",
            operation: options.operation || "remove-bg",
            targetBackground: options.targetBackground,
            aspectRatio: options.aspectRatio || "1:1",
          });
          break;

        case "lyrics":
          artifact = await LyricsCreativeService.generateLyrics({
            theme: prompt || options.theme || "Love and hope",
            language: options.language || "English",
            genre: options.genre || "Romantic Melody",
            mood: options.mood || "Love",
            vocalStyle: options.vocalStyle || "Duet",
            songLength: options.songLength || "standard",
          });
          break;

        case "music":
          artifact = await MusicCreativeService.generateMusic({
            prompt: prompt || "Soothing acoustic melody",
            genre: options.genre || "Tamil Melody",
            mood: options.mood || "Romantic",
            lyricsSnippet: options.lyricsSnippet,
            isInstrumental: options.isInstrumental ?? true,
            tempoBpm: options.tempoBpm || 88,
            durationSeconds: options.durationSeconds || 24,
          });
          break;

        case "voice":
          artifact = await AudioCreativeService.generateVoice({
            text: prompt || options.text || "Hello from Nexora Creative Studio.",
            voiceName: options.voiceName || "nova",
            speed: options.speed || 1.0,
          });
          break;

        case "transcription":
          artifact = await AudioCreativeService.transcribeAudio({
            audioBase64: options.audioBase64,
            fileName: options.fileName || "audio-recording.wav",
          });
          break;
      }

      await EntitlementEngine.reconcileReservation(reservationId);
      return NextResponse.json({ success: true, artifact });
    } catch (procErr: any) {
      await EntitlementEngine.releaseReservation(reservationId);
      console.error("[Creative API] Processing error:", procErr);
      return NextResponse.json({ error: procErr.message || "Creative operation failed" }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

