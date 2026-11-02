import {
  ExternalModel,
  NexoraModelFamily,
  NexoraModelVersion,
  NexoraModelRoute,
} from "./types";

// ============================================================================
// VERIFIED EXTERNAL MODELS (Official IDs & verified capabilities)
// ============================================================================
export const EXTERNAL_MODELS: ExternalModel[] = [
  {
    id: "openai:gpt-4o-mini",
    providerKey: "openai",
    providerModelId: "gpt-4o-mini",
    displayName: "GPT-4o mini",
    description: "Fast, lightweight model for everyday tasks with high efficiency.",
    identifierKind: "mutable_alias",
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsDocumentInput: true,
      supportsWebSearch: true,
      supportsJsonOutput: true,
    },
    contextWindow: 128000,
    maxOutputTokens: 16384,
    inputPricePerMillionUSD: 0.15,
    outputPricePerMillionUSD: 0.6,
    status: "active",
    verifiedAt: "2026-10-21T00:00:00Z",
  },
  {
    id: "openai:gpt-4o",
    providerKey: "openai",
    providerModelId: "gpt-4o",
    displayName: "GPT-4o (Omni)",
    description: "Flagship multimodal intelligence for complex analysis and reasoning.",
    identifierKind: "mutable_alias",
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsDocumentInput: true,
      supportsWebSearch: true,
      supportsJsonOutput: true,
    },
    contextWindow: 128000,
    maxOutputTokens: 16384,
    inputPricePerMillionUSD: 2.5,
    outputPricePerMillionUSD: 10.0,
    status: "active",
    verifiedAt: "2026-10-21T00:00:00Z",
  },
  {
    id: "anthropic:claude-3-5-haiku",
    providerKey: "anthropic",
    providerModelId: "claude-3-5-haiku-20241022",
    displayName: "Claude 3.5 Haiku",
    description: "Next-generation ultra-fast intelligence with exceptional coding responsiveness.",
    identifierKind: "immutable_snapshot",
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: false,
      supportsDocumentInput: true,
      supportsWebSearch: true,
      supportsJsonOutput: true,
    },
    contextWindow: 200000,
    maxOutputTokens: 8192,
    inputPricePerMillionUSD: 1.0,
    outputPricePerMillionUSD: 5.0,
    status: "active",
    verifiedAt: "2026-10-21T00:00:00Z",
  },
  {
    id: "anthropic:claude-3-5-sonnet",
    providerKey: "anthropic",
    providerModelId: "claude-3-5-sonnet-20241022",
    displayName: "Claude 3.5 Sonnet",
    description: "Industry-leading reasoning and vision model for sophisticated engineering and research.",
    identifierKind: "immutable_snapshot",
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsDocumentInput: true,
      supportsWebSearch: true,
      supportsJsonOutput: true,
    },
    contextWindow: 200000,
    maxOutputTokens: 8192,
    inputPricePerMillionUSD: 3.0,
    outputPricePerMillionUSD: 15.0,
    status: "active",
    verifiedAt: "2026-10-21T00:00:00Z",
  },
  {
    id: "gemini:gemini-1.5-flash",
    providerKey: "gemini",
    providerModelId: "gemini-1.5-flash",
    displayName: "Gemini 1.5 Flash",
    description: "Fast, versatile multimodal performance with lightweight latency.",
    identifierKind: "mutable_alias",
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsDocumentInput: true,
      supportsWebSearch: true,
      supportsJsonOutput: true,
    },
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    inputPricePerMillionUSD: 0.075,
    outputPricePerMillionUSD: 0.3,
    status: "active",
    verifiedAt: "2026-10-22T00:00:00Z",
  },
  {
    id: "gemini:gemini-1.5-pro",
    providerKey: "gemini",
    providerModelId: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro",
    description: "Google's breakthrough 2M token context window model with complex multimodal reasoning.",
    identifierKind: "mutable_alias",
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsDocumentInput: true,
      supportsWebSearch: true,
      supportsJsonOutput: true,
    },
    contextWindow: 2097152,
    maxOutputTokens: 8192,
    inputPricePerMillionUSD: 1.25,
    outputPricePerMillionUSD: 5.0,
    status: "active",
    verifiedAt: "2026-10-22T00:00:00Z",
  },
  {
    id: "gemini:imagen-3",
    providerKey: "gemini",
    providerModelId: "gemini-2.5-flash-image",
    displayName: "Google Imagen 3 / Gemini Image",
    description: "Google's highest quality photorealistic image generation model with invisible SynthID metadata.",
    identifierKind: "mutable_alias",
    capabilities: {
      supportsStreaming: false,
      supportsTools: false,
      supportsVision: false,
      supportsDocumentInput: false,
      supportsWebSearch: false,
      supportsJsonOutput: false,
      supportsImageGeneration: true,
    },
    contextWindow: 4096,
    maxOutputTokens: 2048,
    status: "active",
    verifiedAt: "2026-10-28T00:00:00Z",
  },
  {
    id: "openai:dall-e-3",
    providerKey: "openai",
    providerModelId: "dall-e-3",
    displayName: "OpenAI DALL-E 3 / GPT-Image",
    description: "High fidelity image synthesis with fine detail, precise style matching, and clean typography.",
    identifierKind: "mutable_alias",
    capabilities: {
      supportsStreaming: false,
      supportsTools: false,
      supportsVision: false,
      supportsDocumentInput: false,
      supportsWebSearch: false,
      supportsJsonOutput: false,
      supportsImageGeneration: true,
    },
    contextWindow: 4096,
    maxOutputTokens: 2048,
    status: "active",
    verifiedAt: "2026-10-28T00:00:00Z",
  },
  {
    id: "replicate:flux-schnell",
    providerKey: "replicate",
    providerModelId: "black-forest-labs/flux-schnell",
    displayName: "FLUX.1-schnell",
    description: "Ultra-fast high-resolution open weights image generation model.",
    identifierKind: "mutable_alias",
    capabilities: {
      supportsStreaming: false,
      supportsTools: false,
      supportsVision: false,
      supportsDocumentInput: false,
      supportsWebSearch: false,
      supportsJsonOutput: false,
      supportsImageGeneration: true,
      supportedInputTypes: ["text/plain"],
      supportedOutputTypes: ["image/webp", "image/png"],
      maxResolution: "1792x1024",
    },
    contextWindow: 1024,
    maxOutputTokens: 1024,
    status: "active",
    verifiedAt: "2026-10-28T00:00:00Z",
    endpointUrl: "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
    planEligibility: ["free", "pro", "family", "enterprise"],
  },
  {
    id: "replicate:minimax-video",
    providerKey: "replicate",
    providerModelId: "minimax/video-01",
    displayName: "MiniMax Video-01",
    description: "High-definition AI video generator rendering cinematic clips from natural language.",
    identifierKind: "mutable_alias",
    capabilities: {
      supportsStreaming: false,
      supportsTools: false,
      supportsVision: false,
      supportsDocumentInput: false,
      supportsWebSearch: false,
      supportsJsonOutput: false,
      supportsVideoGeneration: true,
      supportedInputTypes: ["text/plain"],
      supportedOutputTypes: ["video/mp4"],
      maxResolution: "1280x720",
      maxDurationSeconds: 6,
    },
    contextWindow: 1024,
    maxOutputTokens: 1024,
    status: "active",
    verifiedAt: "2026-10-30T00:00:00Z",
    endpointUrl: "https://api.replicate.com/v1/models/minimax/video-01/predictions",
    planEligibility: ["pro", "enterprise"],
  },
  {
    id: "suno:v3-5",
    providerKey: "suno",
    providerModelId: "chirp-v3-5",
    displayName: "Suno v3.5 Studio",
    description: "Industry-standard generative music platform for full vocal and instrumental songs.",
    identifierKind: "mutable_alias",
    capabilities: {
      supportsStreaming: false,
      supportsTools: false,
      supportsVision: false,
      supportsDocumentInput: false,
      supportsWebSearch: false,
      supportsJsonOutput: false,
      supportsMusicGeneration: true,
      supportedInputTypes: ["text/plain"],
      supportedOutputTypes: ["audio/mp3"],
      maxDurationSeconds: 120,
    },
    contextWindow: 4096,
    maxOutputTokens: 1024,
    status: "active",
    verifiedAt: "2026-10-30T00:00:00Z",
    endpointUrl: "https://api.suno.ai/v1/generate",
    planEligibility: ["pro", "enterprise"],
  },
  {
    id: "nexora:synthesizer",
    providerKey: "nexora",
    providerModelId: "nexora-synthesizer-v1",
    displayName: "Nexora Studio Multi-Track Synthesizer",
    description: "Deterministic 16-bit 44.1kHz stereo multi-track instrumental synthesis engine.",
    identifierKind: "immutable_snapshot",
    capabilities: {
      supportsStreaming: false,
      supportsTools: false,
      supportsVision: false,
      supportsDocumentInput: false,
      supportsWebSearch: false,
      supportsJsonOutput: false,
      supportsMusicGeneration: true,
      supportedInputTypes: ["text/plain"],
      supportedOutputTypes: ["audio/wav"],
      maxDurationSeconds: 60,
    },
    contextWindow: 2048,
    maxOutputTokens: 1024,
    status: "active",
    verifiedAt: "2026-10-30T00:00:00Z",
    planEligibility: ["free", "pro", "family", "enterprise"],
  },
];

// ============================================================================
// NEXORA BRANDED MODEL FAMILIES
// Transparent routing profiles managed by Nexora
// ============================================================================
export const NEXORA_MODEL_FAMILIES: NexoraModelFamily[] = [
  {
    id: "family-chat",
    slug: "nexora-chat",
    displayName: "Nexora Chat",
    description: "Everyday conversational AI, assistant directives, and fast reasoning.",
    status: "active",
    primaryModality: "text",
    versionLabel: "1.0",
  },
  {
    id: "family-swift",
    slug: "nexora-swift",
    displayName: "Nexora Swift",
    description: "Optimized for ultra-low latency, real-time responses, and high-frequency queries.",
    status: "active",
    primaryModality: "text",
    versionLabel: "1.0",
  },
  {
    id: "family-core",
    slug: "nexora-core",
    displayName: "Nexora Core",
    description: "Balanced, general-purpose intelligence for daily workflows, writing, and summaries.",
    status: "active",
    primaryModality: "text",
    versionLabel: "1.0",
  },
  {
    id: "family-reason",
    slug: "nexora-reason",
    displayName: "Nexora Reason",
    description: "Deep analytical intelligence engineered for multi-step math, logic, and architecture.",
    status: "active",
    primaryModality: "text",
    versionLabel: "1.0",
  },
  {
    id: "family-vision",
    slug: "nexora-vision",
    displayName: "Nexora Vision",
    description: "High-acuity multimodal reasoning across diagrams, documents, and technical imagery.",
    status: "active",
    primaryModality: "document",
    versionLabel: "1.0",
  },
  {
    id: "family-image",
    slug: "nexora-image",
    displayName: "Nexora Image",
    description: "Universal visual generation engine powering photorealism, vector graphics, and studio branding.",
    status: "active",
    primaryModality: "image",
    versionLabel: "1.0",
  },
  {
    id: "family-music",
    slug: "nexora-music",
    displayName: "Nexora Music",
    description: "Studio audio and music composition powering melodies, songs, and instrumental arrangements.",
    status: "active",
    primaryModality: "audio",
    versionLabel: "1.0",
  },
  {
    id: "family-video",
    slug: "nexora-video",
    displayName: "Nexora Video",
    description: "Motion visual and cinematic video generation engine.",
    status: "active",
    primaryModality: "video",
    versionLabel: "1.0",
  },
];

// ============================================================================
// IMMUTABLE NEXORA MODEL VERSIONS
// ============================================================================
export const NEXORA_MODEL_VERSIONS: NexoraModelVersion[] = [
  {
    id: "nexora-chat@1.0.0",
    familySlug: "nexora-chat",
    versionMajor: 1,
    versionMinor: 0,
    versionPatch: 0,
    versionLabel: "1.0",
    status: "published",
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsDocumentInput: true,
      supportsWebSearch: true,
      supportsJsonOutput: true,
    },
    publishedAt: "2026-10-21T00:00:00Z",
  },
  {
    id: "nexora-swift@1.0.0",
    familySlug: "nexora-swift",
    versionMajor: 1,
    versionMinor: 0,
    versionPatch: 0,
    versionLabel: "1.0",
    status: "published",
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: false,
      supportsDocumentInput: true,
      supportsWebSearch: true,
      supportsJsonOutput: true,
    },
    publishedAt: "2026-10-21T00:00:00Z",
  },
  {
    id: "nexora-core@1.0.0",
    familySlug: "nexora-core",
    versionMajor: 1,
    versionMinor: 0,
    versionPatch: 0,
    versionLabel: "1.0",
    status: "published",
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsDocumentInput: true,
      supportsWebSearch: true,
      supportsJsonOutput: true,
    },
    publishedAt: "2026-10-21T00:00:00Z",
  },
  {
    id: "nexora-reason@1.0.0",
    familySlug: "nexora-reason",
    versionMajor: 1,
    versionMinor: 0,
    versionPatch: 0,
    versionLabel: "1.0",
    status: "published",
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsDocumentInput: true,
      supportsWebSearch: true,
      supportsJsonOutput: true,
    },
    publishedAt: "2026-10-21T00:00:00Z",
  },
  {
    id: "nexora-vision@1.0.0",
    familySlug: "nexora-vision",
    versionMajor: 1,
    versionMinor: 0,
    versionPatch: 0,
    versionLabel: "1.0",
    status: "published",
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsDocumentInput: true,
      supportsWebSearch: true,
      supportsJsonOutput: true,
    },
    publishedAt: "2026-10-21T00:00:00Z",
  },
  {
    id: "nexora-image@1.0.0",
    familySlug: "nexora-image",
    versionMajor: 1,
    versionMinor: 0,
    versionPatch: 0,
    versionLabel: "1.0",
    status: "published",
    capabilities: {
      supportsStreaming: false,
      supportsTools: false,
      supportsVision: false,
      supportsDocumentInput: false,
      supportsWebSearch: false,
      supportsJsonOutput: false,
      supportsImageGeneration: true,
    },
    publishedAt: "2026-10-28T00:00:00Z",
  },
  {
    id: "nexora-music@1.0.0",
    familySlug: "nexora-music",
    versionMajor: 1,
    versionMinor: 0,
    versionPatch: 0,
    versionLabel: "1.0",
    status: "published",
    capabilities: {
      supportsStreaming: false,
      supportsTools: false,
      supportsVision: false,
      supportsDocumentInput: false,
      supportsWebSearch: false,
      supportsJsonOutput: false,
      supportsMusicGeneration: true,
      maxDurationSeconds: 120,
    },
    publishedAt: "2026-10-30T00:00:00Z",
  },
  {
    id: "nexora-video@1.0.0",
    familySlug: "nexora-video",
    versionMajor: 1,
    versionMinor: 0,
    versionPatch: 0,
    versionLabel: "1.0",
    status: "published",
    capabilities: {
      supportsStreaming: false,
      supportsTools: false,
      supportsVision: false,
      supportsDocumentInput: false,
      supportsWebSearch: false,
      supportsJsonOutput: false,
      supportsVideoGeneration: true,
      maxDurationSeconds: 10,
    },
    publishedAt: "2026-10-30T00:00:00Z",
  },
];

// ============================================================================
// IMMUTABLE MODEL ROUTES (Prioritized Primary and Fallback targets)
// ============================================================================
export const MODEL_ROUTES: NexoraModelRoute[] = [
  // Nexora Chat 1.0: Primary GPT-4o-mini, Fallback Gemini 1.5 Flash, Fallback Claude 3.5 Haiku
  {
    modelVersionId: "nexora-chat@1.0.0",
    externalModelId: "openai:gpt-4o-mini",
    priority: 1,
    routeRole: "primary",
    enabled: true,
  },
  {
    modelVersionId: "nexora-chat@1.0.0",
    externalModelId: "gemini:gemini-1.5-flash",
    priority: 2,
    routeRole: "fallback",
    enabled: true,
  },
  {
    modelVersionId: "nexora-chat@1.0.0",
    externalModelId: "anthropic:claude-3-5-haiku",
    priority: 3,
    routeRole: "fallback",
    enabled: true,
  },
  // Nexora Image 1.0: Primary Google Imagen 3, Fallback OpenAI DALL-E 3
  {
    modelVersionId: "nexora-image@1.0.0",
    externalModelId: "gemini:imagen-3",
    priority: 1,
    routeRole: "primary",
    enabled: true,
  },
  {
    modelVersionId: "nexora-image@1.0.0",
    externalModelId: "openai:dall-e-3",
    priority: 2,
    routeRole: "fallback",
    enabled: true,
  },

  // Nexora Swift 1.0: Primary Anthropic Haiku, Fallback OpenAI GPT-4o-mini, Fallback Gemini 1.5 Flash
  {
    modelVersionId: "nexora-swift@1.0.0",
    externalModelId: "anthropic:claude-3-5-haiku",
    priority: 1,
    routeRole: "primary",
    enabled: true,
  },
  {
    modelVersionId: "nexora-swift@1.0.0",
    externalModelId: "openai:gpt-4o-mini",
    priority: 2,
    routeRole: "fallback",
    enabled: true,
  },
  {
    modelVersionId: "nexora-swift@1.0.0",
    externalModelId: "gemini:gemini-1.5-flash",
    priority: 3,
    routeRole: "fallback",
    enabled: true,
  },

  // Nexora Core 1.0: Primary Gemini 1.5 Flash, Fallback OpenAI GPT-4o-mini, Fallback Anthropic Haiku
  {
    modelVersionId: "nexora-core@1.0.0",
    externalModelId: "gemini:gemini-1.5-flash",
    priority: 1,
    routeRole: "primary",
    enabled: true,
  },
  {
    modelVersionId: "nexora-core@1.0.0",
    externalModelId: "openai:gpt-4o-mini",
    priority: 2,
    routeRole: "fallback",
    enabled: true,
  },
  {
    modelVersionId: "nexora-core@1.0.0",
    externalModelId: "anthropic:claude-3-5-haiku",
    priority: 3,
    routeRole: "fallback",
    enabled: true,
  },

  // Nexora Reason 1.0: Primary Anthropic Sonnet, Fallback OpenAI GPT-4o, Fallback Gemini 1.5 Pro
  {
    modelVersionId: "nexora-reason@1.0.0",
    externalModelId: "anthropic:claude-3-5-sonnet",
    priority: 1,
    routeRole: "primary",
    enabled: true,
  },
  {
    modelVersionId: "nexora-reason@1.0.0",
    externalModelId: "openai:gpt-4o",
    priority: 2,
    routeRole: "fallback",
    enabled: true,
  },
  {
    modelVersionId: "nexora-reason@1.0.0",
    externalModelId: "gemini:gemini-1.5-pro",
    priority: 3,
    routeRole: "fallback",
    enabled: true,
  },

  // Nexora Vision 1.0: Primary OpenAI GPT-4o, Fallback Anthropic Sonnet, Fallback Gemini 1.5 Pro
  {
    modelVersionId: "nexora-vision@1.0.0",
    externalModelId: "openai:gpt-4o",
    priority: 1,
    routeRole: "primary",
    enabled: true,
  },
  {
    modelVersionId: "nexora-vision@1.0.0",
    externalModelId: "anthropic:claude-3-5-sonnet",
    priority: 2,
    routeRole: "fallback",
    enabled: true,
  },
  {
    modelVersionId: "nexora-vision@1.0.0",
    externalModelId: "gemini:gemini-1.5-pro",
    priority: 3,
    routeRole: "fallback",
    enabled: true,
  },
];

// ============================================================================
// MODEL REGISTRY SERVICE
// ============================================================================
export class ModelRegistry {
  static getExternalModel(id: string): ExternalModel | undefined {
    return EXTERNAL_MODELS.find((m) => m.id === id && m.status === "active");
  }

  static getModelVersion(id: string): NexoraModelVersion | undefined {
    return NEXORA_MODEL_VERSIONS.find((v) => v.id === id && v.status === "published");
  }

  static getRoutesForVersion(modelVersionId: string): NexoraModelRoute[] {
    return MODEL_ROUTES.filter((r) => r.modelVersionId === modelVersionId && r.enabled).sort(
      (a, b) => a.priority - b.priority
    );
  }

  static getEligibleModelsForPlan(planId: "free" | "pro" | "family" | "enterprise") {
    if (planId === "free") {
      // Free users get Chat, Swift, Core, Image, and Music profiles, plus base mini model and synthesizer
      return {
        nexoraModels: NEXORA_MODEL_FAMILIES.filter(
          (f) =>
            f.slug === "nexora-chat" ||
            f.slug === "nexora-swift" ||
            f.slug === "nexora-core" ||
            f.slug === "nexora-image" ||
            f.slug === "nexora-music"
        ),
        externalModels: EXTERNAL_MODELS.filter(
          (m) => m.id === "openai:gpt-4o-mini" || m.id === "nexora:synthesizer"
        ),
      };
    }

    // Pro, Family, and Enterprise have full access
    return {
      nexoraModels: NEXORA_MODEL_FAMILIES,
      externalModels: EXTERNAL_MODELS,
    };
  }
}
