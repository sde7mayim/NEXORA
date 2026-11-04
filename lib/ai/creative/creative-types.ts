export type CreativeArtifactType =
  | "image"
  | "edited-image"
  | "lyrics"
  | "music"
  | "voice"
  | "transcription"
  | "video";

export type CreativeIntentType =
  | "image_generation"
  | "image_edit"
  | "image_variation"
  | "music_generation"
  | "lyrics_generation"
  | "video_generation"
  | "ordinary_text_chat";

export type CreativeArtifactStatus =
  | "pending"
  | "success"
  | "ready"
  | "failed"
  | "rate_limited"
  | "unsupported";

export type CreativeErrorCategory =
  | "missing_api_key"
  | "invalid_credentials"
  | "unsupported_model"
  | "invalid_provider_request"
  | "provider_rate_limit"
  | "rate_limited"
  | "provider_credits_exhausted"
  | "quota_exhausted"
  | "billing_inactive"
  | "nexora_quota_exceeded"
  | "provider_timeout"
  | "provider_unavailable"
  | "invalid_image_response"
  | "invalid_response"
  | "self_hosted_engine_offline"
  | "self_hosted_engine_misconfigured"
  | "storage_failure"
  | "unknown";

export type ImageAspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
export type ImageStylePreset =
  | "realistic"
  | "cinematic"
  | "3d"
  | "anime"
  | "product"
  | "logo"
  | "social"
  | "watercolor"
  | "oil-painting"
  | "digital-art"
  | "fantasy"
  | "sci-fi"
  | "minimalist"
  | "vintage"
  | "vector"
  | "sketch"
  | "abstract";

export interface CreativeImageMetadata {
  prompt: string;
  revisedPrompt?: string;
  aspectRatio: ImageAspectRatio;
  style?: ImageStylePreset;
  resolution?: string;
  provider: string;
  model?: string;
  format?: string;
  seed?: number;
  quality?: "standard" | "hd";
  isVariation?: boolean;
  sourceArtifactId?: string;
  variations?: string[];
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
  language?: string;
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

export interface CreativeVideoMetadata {
  prompt: string;
  durationSeconds?: number;
  resolution?: string;
  aspectRatio?: string;
  provider?: string;
  model?: string;
  format?: string;
}

export interface CreativeArtifact {
  id: string;
  type: CreativeArtifactType;
  title: string;
  subtitle?: string;
  mediaUrl?: string; // Image URL, data URL, audio URL, video URL
  thumbnailUrl?: string;
  status: CreativeArtifactStatus;
  errorMessage?: string;
  errorCategory?: CreativeErrorCategory;
  suggestedNextStep?: string;
  createdAt: string;
  imageMetadata?: CreativeImageMetadata;
  lyricsMetadata?: CreativeLyricsMetadata;
  musicMetadata?: CreativeMusicMetadata;
  voiceMetadata?: CreativeVoiceMetadata;
  transcriptionMetadata?: CreativeTranscriptionMetadata;
  videoMetadata?: CreativeVideoMetadata;
}

export interface CreativeDetectionResult {
  isCreativeIntent: boolean;
  intent: CreativeIntentType;
  creativeType?: CreativeArtifactType;
  prompt?: string;
  parameters?: Record<string, unknown>;
}

