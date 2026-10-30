export type CreativeArtifactType =
  | "image"
  | "edited-image"
  | "lyrics"
  | "music"
  | "voice"
  | "transcription";

export type ImageAspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
export type ImageStylePreset =
  | "realistic"
  | "cinematic"
  | "3d"
  | "anime"
  | "product"
  | "logo"
  | "social";

export interface CreativeImageMetadata {
  prompt: string;
  revisedPrompt?: string;
  aspectRatio: ImageAspectRatio;
  style?: ImageStylePreset;
  resolution?: string;
  provider: string;
  seed?: number;
  originalImagePreviewUrl?: string; // For edited images
  editInstruction?: string;          // For edited images
  editOperation?: "remove-bg" | "replace-bg" | "colorize" | "stylize" | "restore" | "custom";
}

export interface CreativeLyricsSection {
  type: "intro" | "verse" | "pre-chorus" | "chorus" | "bridge" | "outro" | "hook";
  label: string;
  lines: string[];
}

export interface CreativeLyricsMetadata {
  title: string;
  language: string; // e.g. "Tamil", "English", etc.
  genre: string;    // e.g. "Romantic Melody", "Pop", "Rap / Hip-Hop"
  mood: string;     // e.g. "Love", "Melancholy", "Motivational"
  theme: string;
  vocalStyle?: "Male" | "Female" | "Duet";
  rhymeScheme?: string;
  tempoBpm?: number;
  keySignature?: string;
  instruments?: string[];
  sections: CreativeLyricsSection[];
  copyrightOriginalNotice: string;
}

export interface CreativeMusicMetadata {
  title: string;
  prompt?: string;
  lyricsSnippet?: string;
  exactLyrics?: string;
  lyricsSections?: CreativeLyricsSection[];
  genre: string;
  mood: string;
  vocalStyle?: "Male" | "Female" | "Duet" | "Instrumental";
  keySignature?: string;
  instruments?: string[];
  durationSeconds: number;
  tempoBpm: number;
  isInstrumental: boolean;
  format: "audio/wav" | "audio/mp3";
  provider: string;
  waveformSamples?: number[];
  lyricsPreservationNote?: string;
}

export interface CreativeVoiceMetadata {
  text: string;
  voiceName: string;
  durationSeconds: number;
  format: string;
  speed: number;
  provider: string;
}

export interface CreativeTranscriptionMetadata {
  fileName: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
  languageDetected?: string;
  transcript: string;
  summary: string;
  keyTakeaways: string[];
  sentiment?: "positive" | "neutral" | "negative" | "mixed";
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface CreativeArtifact {
  id: string;
  type: CreativeArtifactType;
  title: string;
  subtitle?: string;
  mediaUrl?: string; // Image URL, data URL, audio URL
  thumbnailUrl?: string;
  status: "ready" | "processing" | "failed";
  errorMessage?: string;
  createdAt: string;
  imageMetadata?: CreativeImageMetadata;
  lyricsMetadata?: CreativeLyricsMetadata;
  musicMetadata?: CreativeMusicMetadata;
  voiceMetadata?: CreativeVoiceMetadata;
  transcriptionMetadata?: CreativeTranscriptionMetadata;
}

export interface CreativeDetectionResult {
  isCreativeIntent: boolean;
  creativeType?: CreativeArtifactType;
  prompt?: string;
  parameters?: Record<string, unknown>;
}

