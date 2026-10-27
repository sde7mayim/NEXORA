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
];

// ============================================================================
// NEXORA BRANDED MODEL FAMILIES
// Transparent routing profiles managed by Nexora
// ============================================================================
export const NEXORA_MODEL_FAMILIES: NexoraModelFamily[] = [
  {
    id: "family-swift",
    slug: "nexora-swift",
    displayName: "Nexora Swift",
    description: "Optimized for ultra-low latency, real-time responses, and high-frequency queries.",
    status: "active",
  },
  {
    id: "family-core",
    slug: "nexora-core",
    displayName: "Nexora Core",
    description: "Balanced, general-purpose intelligence for daily workflows, writing, and summaries.",
    status: "active",
  },
  {
    id: "family-reason",
    slug: "nexora-reason",
    displayName: "Nexora Reason",
    description: "Deep analytical intelligence engineered for multi-step math, logic, and architecture.",
    status: "active",
  },
  {
    id: "family-vision",
    slug: "nexora-vision",
    displayName: "Nexora Vision",
    description: "High-acuity multimodal reasoning across diagrams, documents, and technical imagery.",
    status: "active",
  },
];

// ============================================================================
// IMMUTABLE NEXORA MODEL VERSIONS
// ============================================================================
export const NEXORA_MODEL_VERSIONS: NexoraModelVersion[] = [
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
];

// ============================================================================
// IMMUTABLE MODEL ROUTES (Prioritized Primary and Fallback targets)
// ============================================================================
export const MODEL_ROUTES: NexoraModelRoute[] = [
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

  static getEligibleModelsForPlan(planId: "free" | "pro" | "enterprise") {
    if (planId === "free") {
      // Free users get Swift and Core branded profiles, plus base mini model
      return {
        nexoraModels: NEXORA_MODEL_FAMILIES.filter(
          (f) => f.slug === "nexora-swift" || f.slug === "nexora-core"
        ),
        externalModels: EXTERNAL_MODELS.filter((m) => m.id === "openai:gpt-4o-mini"),
      };
    }

    // Pro and Enterprise have full access
    return {
      nexoraModels: NEXORA_MODEL_FAMILIES,
      externalModels: EXTERNAL_MODELS,
    };
  }
}
