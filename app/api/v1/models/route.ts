import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, recordRequestUsage } from "@/lib/api-keys/auth-middleware";
import { ModelRegistry, NEXORA_MODEL_FAMILIES } from "@/lib/ai/model-registry";
import { ProviderStatusService } from "@/lib/ai/provider-status";

export async function GET(req: NextRequest) {
  // Validate API key with models:read scope
  const auth = await authenticateApiRequest(req, { requiredScope: "models:read" });
  if (!auth.success) {
    return auth.response;
  }

  const { context } = auth;
  const endpoint = "/api/v1/models";

  // Check actual runtime provider configuration
  const configuredProviders = ProviderStatusService.getConfiguredProviders();
  const hasTextInference = configuredProviders.length > 0;
  const isHfConfigured = Boolean(
    process.env.HF_TOKEN &&
    !process.env.HF_TOKEN.includes("placeholder") &&
    !process.env.HF_TOKEN.includes("your-huggingface-token")
  );
  const isMusicConfigured = Boolean(
    isHfConfigured ||
    (process.env.SUNO_API_KEY && !process.env.SUNO_API_KEY.includes("placeholder")) ||
    (process.env.REPLICATE_API_TOKEN && !process.env.REPLICATE_API_TOKEN.includes("placeholder")) ||
    process.env.ENABLE_BUILTIN_SYNTHESIZER !== "false"
  );
  const isVideoConfigured = Boolean(
    isHfConfigured ||
    (process.env.REPLICATE_API_TOKEN && !process.env.REPLICATE_API_TOKEN.includes("placeholder"))
  );

  // 1. LLM Chat Models from ModelRegistry
  const chatModels = NEXORA_MODEL_FAMILIES.map((family) => {
    const primaryVersion = ModelRegistry.getModelVersion(`${family.slug}@1.0.0`);
    const status = hasTextInference ? "available" : "not_configured";

    return {
      id: family.slug,
      name: family.displayName || family.slug,
      display_name: family.displayName || family.slug,
      object: "model",
      created: 1729500000,
      modality: "text" as const,
      provider: "Nexora Intelligent Router",
      owned_by: "Multi-Provider (Google DeepMind / OpenAI / Anthropic)",
      routed_by: "Nexora Router" as const,
      inference_status: status,
      availability_status: status,
      is_configured: hasTextInference,
      is_sandbox_only: false,
      active_providers: configuredProviders,
      type: "chat",
      permission: [],
      root: family.slug,
      parent: null,
      description: family.description,
      version: primaryVersion?.versionLabel || "1.0",
      capabilities: primaryVersion?.capabilities || {},
      supported_capabilities: primaryVersion?.capabilities || {},
    };
  });

  // 2. Creative Studio & Multimodal Models with honest inference status
  const creativeModels = [
    {
      id: "nexora-lyrics-v1",
      name: "Nexora Musical Lyrics Engine",
      display_name: "Nexora Lyrics v1",
      object: "model",
      created: 1730000000,
      modality: "text" as const,
      provider: "Nexora Creative Studio (powered by configured LLM)",
      owned_by: "Nexora Creative Studio",
      routed_by: "Direct Adapter" as const,
      inference_status: hasTextInference ? "available" : "not_configured",
      availability_status: hasTextInference ? "available" : "not_configured",
      is_configured: hasTextInference,
      is_sandbox_only: false,
      type: "lyrics",
      description:
        "Song lyrics generation engine producing structured musical verses, choruses, and musical tags via configured text provider.",
      capabilities: { text_input: true, structured_lyrics: true, multilingual: true },
      supported_capabilities: { text_input: true, structured_lyrics: true, multilingual: true },
    },
    {
      id: "nexora-image-flux",
      name: "FLUX.1-schnell Diffusion Engine",
      display_name: "FLUX.1-schnell",
      object: "model",
      created: 1730000000,
      modality: "image" as const,
      provider: "Hugging Face ZeroGPU Spaces",
      owned_by: "Black Forest Labs (routed via Hugging Face ZeroGPU)",
      routed_by: "Direct Adapter" as const,
      inference_status: isHfConfigured ? "available" : "not_configured",
      availability_status: isHfConfigured ? "available" : "not_configured",
      is_configured: isHfConfigured,
      is_sandbox_only: false,
      type: "image",
      description:
        "Fast 12B parameter rectified flow diffusion model by Black Forest Labs, running on free Hugging Face ZeroGPU infrastructure.",
      capabilities: { text_to_image: true, aspect_ratios: ["1:1", "16:9", "9:16", "4:3"] },
      supported_capabilities: { text_to_image: true, aspect_ratios: ["1:1", "16:9", "9:16", "4:3"] },
    },
    {
      id: "nexora-music-v1",
      name: "Nexora Music & Audio Synthesis",
      display_name: "Nexora Music v1",
      object: "model",
      created: 1730000000,
      modality: "audio" as const,
      provider: isHfConfigured ? "Hugging Face ZeroGPU (MusicGen)" : "Nexora Studio Synthesizer",
      owned_by: "Meta / Nexora",
      routed_by: "Direct Adapter" as const,
      inference_status: isMusicConfigured ? "available" : "not_configured",
      availability_status: isMusicConfigured ? "available" : "not_configured",
      is_configured: isMusicConfigured,
      is_sandbox_only: false,
      type: "music",
      description: "Generative audio synthesis for original songs and melodic backing tracks via free ZeroGPU or native synthesizer.",
      capabilities: { melody_generation: true, audio_synthesis: true },
      supported_capabilities: { melody_generation: true, audio_synthesis: true },
    },
    {
      id: "nexora-video-v1",
      name: "Nexora Cinematic Video Engine",
      display_name: "Nexora Video v1",
      object: "model",
      created: 1730000000,
      modality: "video" as const,
      provider: isHfConfigured ? "Hugging Face ZeroGPU (ModelScope)" : "External Video Provider",
      owned_by: "ModelScope / Nexora",
      routed_by: "Direct Adapter" as const,
      inference_status: isVideoConfigured ? "available" : "not_configured",
      availability_status: isVideoConfigured ? "available" : "not_configured",
      is_configured: isVideoConfigured,
      is_sandbox_only: false,
      type: "video",
      description: "Text-to-video diffusion clips for creative cinematography running on free ZeroGPU infrastructure.",
      capabilities: { text_to_video: true },
      supported_capabilities: { text_to_video: true },
    },
    {
      id: "nexora-sandbox-simulator",
      name: "Nexora Test Mode Simulator",
      display_name: "Nexora Sandbox Simulator",
      object: "model",
      created: 1730000000,
      modality: "text" as const,
      provider: "Nexora Developer Platform",
      owned_by: "Nexora",
      routed_by: "Direct Adapter" as const,
      inference_status: "sandbox_only" as const,
      availability_status: "sandbox_only" as const,
      is_configured: true,
      is_sandbox_only: true,
      type: "simulator",
      description:
        "Deterministic sandbox simulator for testing nx_test_ keys. Incurs zero costs and performs no live inference.",
      capabilities: { simulation: true, schema_validation: true },
      supported_capabilities: { simulation: true, schema_validation: true },
    },
  ];

  const allModels = [...chatModels, ...creativeModels];
  recordRequestUsage(context, endpoint, 200, 0);

  return NextResponse.json(
    { object: "list", data: allModels },
    {
      status: 200,
      headers: auth.headers,
    }
  );
}
