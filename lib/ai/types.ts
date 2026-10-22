export type ProviderKey = "openai" | "anthropic";

export type Modality = "text" | "image" | "document" | "audio";

export interface ModelCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsDocumentInput: boolean;
  supportsWebSearch: boolean;
  supportsJsonOutput: boolean;
}

export interface ExternalModel {
  id: string;
  providerKey: ProviderKey;
  providerModelId: string;
  displayName: string;
  description: string;
  identifierKind: "immutable_snapshot" | "mutable_alias";
  capabilities: ModelCapabilities;
  contextWindow: number;
  maxOutputTokens: number;
  inputPricePerMillionUSD?: number;
  outputPricePerMillionUSD?: number;
  status: "active" | "deprecated" | "disabled" | "draft";
  verifiedAt: string;
}

export interface NexoraModelFamily {
  id: string;
  slug: "nexora-swift" | "nexora-core" | "nexora-reason" | "nexora-vision";
  displayName: string;
  description: string;
  status: "active" | "disabled";
}

export interface NexoraModelVersion {
  id: string; // e.g. "nexora-core@1.0.0"
  familySlug: string;
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
  versionLabel: string;
  status: "published" | "deprecated" | "disabled";
  capabilities: ModelCapabilities;
  publishedAt: string;
}

export interface NexoraModelRoute {
  modelVersionId: string;
  externalModelId: string;
  priority: number;
  routeRole: "primary" | "fallback";
  enabled: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  modelUsed?: string;
  attachments?: Array<{
    fileId: string;
    fileName: string;
    mimeType: string;
  }>;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

export interface ChatCompletionRequest {
  modelSelectionId: string; // Either a Nexora profile ID (e.g., 'nexora-core') or an external model ID
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  includeWebSearch?: boolean;
  fileContexts?: string[];
  userId: string;
  orgId?: string;
  userPlanId: "free" | "pro" | "enterprise";
}

export interface ChatChunk {
  id: string;
  textDelta: string;
  isComplete: boolean;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatCompletionResponse {
  id: string;
  content: string;
  modelUsed: string;
  providerKey: ProviderKey;
  promptTokens: number;
  completionTokens: number;
  finishReason: string;
}

export interface AIProviderAdapter {
  providerKey: ProviderKey;
  generateCompletion(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<ChatCompletionResponse>;
  streamCompletion(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): AsyncIterable<ChatChunk>;
}
