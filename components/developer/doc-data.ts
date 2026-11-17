/**
 * NEXORA DEVELOPER PLATFORM — DOCUMENTATION & SCHEMA DEFINITIONS
 *
 * Source of truth for API documentation, endpoint definitions,
 * parameter schemas, error codes, and multi-language code generators.
 * Verifiable against actual implementation in /app/api/v1/* routes.
 */

export interface EndpointParam {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string;
  options?: string[];
}

export interface ApiEndpointDoc {
  id: string;
  title: string;
  method: "GET" | "POST" | "DELETE" | "PUT";
  path: string;
  scope: string;
  category: "chat" | "images" | "music" | "videos" | "lyrics" | "models" | "keys" | "usage";
  description: string;
  rateLimit: string;
  parameters: EndpointParam[];
  requestExample: Record<string, any>;
  responseExample: Record<string, any>;
  testModeSupported: boolean;
  testModeBehavior?: string;
}

export interface DocSection {
  id: string;
  title: string;
  category: "guide" | "endpoints" | "reference";
  summary: string;
  iconName: string;
}

export const DOC_SECTIONS: DocSection[] = [
  { id: "getting-started", title: "Getting Started", category: "guide", summary: "Quick start guide, base URLs, and your first API call.", iconName: "Sparkles" },
  { id: "authentication", title: "Authentication", category: "guide", summary: "Bearer tokens, API key headers, and credential safety.", iconName: "Lock" },
  { id: "api-keys", title: "API Keys & Scopes", category: "guide", summary: "Key formats, environments, granular permissions, and rotation.", iconName: "Key" },
  { id: "models", title: "Available Models", category: "endpoints", summary: "Nexora model families, multimodal capabilities, and router failover.", iconName: "Layers" },
  { id: "chat", title: "Chat Completions", category: "endpoints", summary: "OpenAI-compatible text completions with intelligent routing.", iconName: "Terminal" },
  { id: "images", title: "Image Generation", category: "endpoints", summary: "Text-to-image synthesis with aspect ratios, styles, and sandbox testing.", iconName: "Image" },
  { id: "music", title: "Music & Audio", category: "endpoints", summary: "Generative melodies, musical themes, and acoustic tracks.", iconName: "Music" },
  { id: "videos", title: "Video Generation", category: "endpoints", summary: "Cinematic text-to-video generative clips.", iconName: "Video" },
  { id: "lyrics", title: "Lyrics Generation", category: "endpoints", summary: "Structured musical lyrics with verses, chorus, bridge, and vocal guidance.", iconName: "FileText" },
  { id: "usage-limits", title: "Usage & Rate Limits", category: "reference", summary: "Sliding-window quotas, standard headers, and telemetry summaries.", iconName: "Activity" },
  { id: "errors", title: "Error Codes", category: "reference", summary: "Standard HTTP error formats, error types, and troubleshooting guide.", iconName: "AlertCircle" },
  { id: "versioning", title: "API Versioning", category: "reference", summary: "Version guarantees, backward compatibility, and lifecycle policies.", iconName: "Clock" },
];

export const API_ENDPOINTS: ApiEndpointDoc[] = [
  {
    id: "chat-completions",
    title: "Create Chat Completion",
    method: "POST",
    path: "/api/v1/chat/completions",
    scope: "chat:write",
    category: "chat",
    description: "Generates an intelligent conversational completion via Nexora's ModelRouter with automatic provider fallback (Google DeepMind, OpenAI, Anthropic). Returns OpenAI-compatible payload with routing telemetry.",
    rateLimit: "60 requests / minute",
    parameters: [
      { name: "model", type: "string", required: false, defaultValue: "nexora-core", description: "Target model family (e.g. 'nexora-core', 'nexora-chat', 'nexora-swift', 'nexora-reason', 'nexora-vision') or verified provider ID.", options: ["nexora-core", "nexora-chat", "nexora-swift", "nexora-reason", "nexora-vision"] },
      { name: "messages", type: "array[object]", required: true, description: "Array of chat message objects with 'role' ('system', 'user', 'assistant') and 'content' (string)." },
      { name: "temperature", type: "number", required: false, defaultValue: "0.7", description: "Sampling temperature between 0.0 and 2.0. Higher values yield more creative outputs." },
      { name: "max_tokens", type: "integer", required: false, defaultValue: "2048", description: "Maximum number of completion tokens to generate." },
    ],
    requestExample: {
      model: "nexora-core",
      messages: [
        { role: "system", content: "You are an AI developer assistant integrated into Nexora." },
        { role: "user", content: "How do I securely authenticate requests to the Nexora API?" },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    },
    responseExample: {
      id: "chatcmpl-req_1731885000_a1b2c3",
      object: "chat.completion",
      created: 1731885000,
      model: "nexora-core@gemini-1.5-flash",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "To authenticate with Nexora, include your secret API key in the Authorization header as a Bearer token: 'Authorization: Bearer nx_live_...'. Always use environment variables.",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 28,
        completion_tokens: 36,
        total_tokens: 64,
      },
      nexora_routing: {
        provider_used: "gemini",
        fallback_triggered: false,
        correlation_id: "req_1731885000_a1b2c3",
        latency_ms: 382,
      },
    },
    testModeSupported: true,
    testModeBehavior: "Accepts test keys (nx_test_...) and provides low-cost execution with full routing validation.",
  },
  {
    id: "image-generations",
    title: "Generate Image",
    method: "POST",
    path: "/api/v1/images/generations",
    scope: "images:generate",
    category: "images",
    description: "Generates high-resolution images from natural language descriptions with support for multiple aspect ratios and artistic styles. Includes explicit sandbox simulation for test keys.",
    rateLimit: "20 requests / minute",
    parameters: [
      { name: "prompt", type: "string", required: true, description: "Detailed description of the image to generate." },
      { name: "aspect_ratio", type: "string", required: false, defaultValue: "1:1", description: "Target aspect ratio.", options: ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"] },
      { name: "style", type: "string", required: false, defaultValue: "photorealistic", description: "Artistic style preset.", options: ["photorealistic", "realistic", "cinematic", "anime", "digital-art", "fantasy", "neon-cyberpunk", "minimalist", "oil-painting", "3d-render"] },
      { name: "quality", type: "string", required: false, defaultValue: "standard", description: "Output rendering quality.", options: ["standard", "hd"] },
      { name: "provider", type: "string", required: false, defaultValue: "auto", description: "Image generation provider engine.", options: ["auto", "huggingface", "nexora", "gemini", "openai", "replicate"] },
      { name: "seed", type: "integer", required: false, description: "Random seed for reproducible outputs." },
    ],
    requestExample: {
      prompt: "A futuristic solarpunk city terrace with lush vertical gardens at sunrise, cinematic lighting, ultra-detailed 8k",
      aspect_ratio: "16:9",
      style: "cinematic",
      quality: "hd",
      provider: "auto",
    },
    responseExample: {
      object: "image.generation",
      data: [
        {
          url: "https://storage.nexora.ai/generations/images/img_solarpunk_city.png",
          revised_prompt: "A futuristic solarpunk city terrace with lush vertical gardens at sunrise, cinematic lighting...",
        },
      ],
      nexora_execution: {
        provider_used: "flux-schnell",
        model_used: "flux-schnell",
        correlation_id: "req_img_1731885100",
        latency_ms: 1850,
      },
    },
    testModeSupported: true,
    testModeBehavior: "When called with a test key (nx_test_...), returns a zero-cost 'image.sandbox' object verifying parameters without triggering live GPU inference.",
  },
  {
    id: "music-generations",
    title: "Generate Music & Audio",
    method: "POST",
    path: "/api/v1/music/generations",
    scope: "music:generate",
    category: "music",
    description: "Generates original musical themes and acoustic tracks from prompts, genres, and mood directives. Supports instrumentals and custom tempo.",
    rateLimit: "10 requests / minute",
    parameters: [
      { name: "prompt", type: "string", required: true, description: "Musical prompt or theme description." },
      { name: "genre", type: "string", required: false, defaultValue: "Acoustic Melody", description: "Musical genre or instrumentation style." },
      { name: "mood", type: "string", required: false, defaultValue: "Uplifting", description: "Emotional tone (e.g. Uplifting, Melancholic, Energetic, Ambient)." },
      { name: "lyrics", type: "string", required: false, description: "Optional vocal lyrics to accompany the musical generation." },
      { name: "is_instrumental", type: "boolean", required: false, defaultValue: "false", description: "Whether to generate an instrumental track without vocal lines." },
      { name: "tempo_bpm", type: "integer", required: false, defaultValue: "88", description: "Tempo in beats per minute (40 - 220 BPM)." },
      { name: "duration_seconds", type: "integer", required: false, defaultValue: "30", description: "Target track duration in seconds (5 - 180 seconds)." },
      { name: "provider", type: "string", required: false, defaultValue: "auto", description: "Audio synthesis provider.", options: ["auto", "synthesizer", "suno", "udio", "replicate", "elevenlabs"] },
    ],
    requestExample: {
      prompt: "Chill lo-fi study beat with warm electric piano chords and subtle rain sounds",
      genre: "Lo-Fi Hip-Hop",
      mood: "Relaxed",
      is_instrumental: true,
      tempo_bpm: 82,
      duration_seconds: 30,
    },
    responseExample: {
      object: "music.generation",
      data: [
        {
          audio_url: "https://storage.nexora.ai/generations/audio/track_lofi_rain.mp3",
          duration_seconds: 30,
          title: "Chill lo-fi study beat",
        },
      ],
      nexora_execution: {
        provider_used: "synthesizer",
        model_used: "music-v1",
        correlation_id: "req_mus_1731885200",
        latency_ms: 2200,
      },
    },
    testModeSupported: true,
    testModeBehavior: "Test keys return simulated 'music.sandbox' metadata without initiating real synthesis.",
  },
  {
    id: "video-generations",
    title: "Generate Video",
    method: "POST",
    path: "/api/v1/videos/generations",
    scope: "videos:generate",
    category: "videos",
    description: "Generates cinematic generative video clips from text prompts. Test mode sandbox verifies parameters with zero GPU cost.",
    rateLimit: "5 requests / minute",
    parameters: [
      { name: "prompt", type: "string", required: true, description: "Cinematic scene and motion description." },
      { name: "duration_seconds", type: "integer", required: false, defaultValue: "5", description: "Duration in seconds (2 to 60 seconds)." },
      { name: "aspect_ratio", type: "string", required: false, defaultValue: "16:9", description: "Video aspect ratio.", options: ["16:9", "9:16", "1:1", "4:3"] },
      { name: "provider", type: "string", required: false, defaultValue: "auto", description: "Video generation engine provider." },
    ],
    requestExample: {
      prompt: "Drone flyover across neon-lit futuristic neo-Tokyo skyscrapers at midnight, rain reflections",
      duration_seconds: 5,
      aspect_ratio: "16:9",
    },
    responseExample: {
      object: "video.generation",
      data: [
        {
          video_url: "https://storage.nexora.ai/generations/videos/vid_neotokyo.mp4",
          duration_seconds: 5,
        },
      ],
      nexora_execution: {
        provider_used: "video-diffusion",
        model_used: "video-v1",
        correlation_id: "req_vid_1731885300",
        latency_ms: 4100,
      },
    },
    testModeSupported: true,
    testModeBehavior: "Test keys return 'video.sandbox' simulation.",
  },
  {
    id: "lyrics-generations",
    title: "Generate Lyrics",
    method: "POST",
    path: "/api/v1/lyrics/generations",
    scope: "lyrics:generate",
    category: "lyrics",
    description: "Generates structured musical lyrics categorized by song sections (Verse 1, Chorus, Verse 2, Bridge, Outro) with vocal delivery guidance.",
    rateLimit: "30 requests / minute",
    parameters: [
      { name: "prompt", type: "string", required: false, description: "Theme or narrative arc of the song. Either prompt or theme must be provided." },
      { name: "theme", type: "string", required: false, description: "Alternative parameter for song theme." },
      { name: "language", type: "string", required: false, defaultValue: "English", description: "Language for the lyrics." },
      { name: "genre", type: "string", required: false, defaultValue: "Pop / Modern Melody", description: "Target musical genre." },
      { name: "mood", type: "string", required: false, defaultValue: "Inspiring", description: "Emotional mood (Inspiring, Heartfelt, Energetic, Melancholic)." },
      { name: "vocalStyle", type: "string", required: false, defaultValue: "Duet", description: "Vocal arrangement.", options: ["Male", "Female", "Duet"] },
      { name: "songLength", type: "string", required: false, defaultValue: "standard", description: "Lyric structure depth.", options: ["short", "standard", "extended"] },
    ],
    requestExample: {
      prompt: "Overcoming challenges and rising stronger together",
      language: "English",
      genre: "Pop Anthem",
      mood: "Inspiring",
      vocalStyle: "Duet",
      songLength: "standard",
    },
    responseExample: {
      object: "lyrics.generation",
      title: "Rising Stronger",
      genre: "Pop Anthem",
      mood: "Inspiring",
      lyrics: "[Verse 1]\nThrough the shadow of the night...\n\n[Chorus]\nWe rise, unbroken...\n",
      sections: [
        { type: "Verse 1", content: "Through the shadow of the night, we find our spark..." },
        { type: "Chorus", content: "We rise, unbroken, higher than before..." },
      ],
      vocal_guidance: {
        vocalStyle: "Duet",
        language: "English",
      },
      nexora_execution: {
        model_used: "nexora-lyrics-v1",
        correlation_id: "req_lyr_1731885400",
        latency_ms: 820,
      },
    },
    testModeSupported: true,
    testModeBehavior: "Fully supported across live and test environments.",
  },
  {
    id: "models-list",
    title: "List Available Models",
    method: "GET",
    path: "/api/v1/models",
    scope: "models:read",
    category: "models",
    description: "Returns the complete registry of active Nexora model families and multimodal engines, along with real-time provider configuration and inference status.",
    rateLimit: "120 requests / minute",
    parameters: [],
    requestExample: {},
    responseExample: {
      object: "list",
      data: [
        {
          id: "nexora-core",
          name: "Nexora Core",
          display_name: "Nexora Core",
          object: "model",
          modality: "text",
          provider: "Nexora Intelligent Router",
          inference_status: "available",
          capabilities: {
            supportsStreaming: true,
            supportsTools: true,
            supportsVision: true,
            supportsJsonOutput: true,
          },
        },
        {
          id: "nexora-swift",
          name: "Nexora Swift",
          display_name: "Nexora Swift",
          object: "model",
          modality: "text",
          inference_status: "available",
        },
      ],
      telemetry: {
        total_models: 8,
        active_text_providers: ["gemini", "openai"],
        configured_modalities: ["text", "image", "music", "video", "lyrics"],
      },
    },
    testModeSupported: true,
    testModeBehavior: "Read-only inspection.",
  },
  {
    id: "usage-summary",
    title: "Get Usage & Telemetry",
    method: "GET",
    path: "/api/v1/usage",
    scope: "usage:read",
    category: "usage",
    description: "Retrieves aggregate usage metrics and recent request events for the authenticated account or a specific API key.",
    rateLimit: "60 requests / minute",
    parameters: [
      { name: "key_id", type: "string", required: false, description: "Optional API Key ID to filter usage specifically to that key. Must belong to the authenticated owner." },
    ],
    requestExample: {},
    responseExample: {
      object: "usage.summary",
      user_id: "usr_alex",
      environment: "live",
      metrics: {
        total_requests: 142,
        total_units: 320,
        successful_requests: 138,
        error_requests: 4,
        success_rate_percent: 97.2,
      },
      recent_requests: [
        {
          id: "evt_01",
          endpoint: "/api/v1/chat/completions",
          status: 200,
          usageUnits: 64,
          createdAt: "2026-11-17T17:00:00.000Z",
        },
      ],
    },
    testModeSupported: true,
    testModeBehavior: "Inspects telemetry in both live and test environments.",
  },
];

export const ERROR_CODES = [
  { code: "missing_api_key", status: 401, type: "authentication_error", description: "Authorization header was omitted or empty. Provide 'Authorization: Bearer nx_live_...'" },
  { code: "invalid_api_key", status: 401, type: "authentication_error", description: "The provided API key secret does not exist or failed cryptographic hash verification." },
  { code: "key_revoked", status: 401, type: "authentication_error", description: "This API key has been revoked and can no longer be used for authentication." },
  { code: "key_expired", status: 401, type: "authentication_error", description: "The API key expiration timestamp has passed." },
  { code: "insufficient_scope", status: 403, type: "permission_denied", description: "The API key lacks the required scope for this endpoint. Re-issue key with proper scopes." },
  { code: "rate_limit_exceeded", status: 429, type: "rate_limit_exceeded", description: "Sliding-window request threshold exceeded. Inspect Retry-After header and back off." },
  { code: "bad_json", status: 400, type: "invalid_request_error", description: "Request payload could not be parsed as valid JSON." },
  { code: "validation_error", status: 400, type: "invalid_request_error", description: "Request parameters failed schema validation (e.g. missing required field, out of range)." },
  { code: "missing_parameter", status: 400, type: "invalid_request_error", description: "A required parameter was omitted from the request." },
  { code: "NOT_CONFIGURED", status: 503, type: "provider_error", description: "Underlying model provider engine is unconfigured in current environment." },
  { code: "PROVIDER_ERROR", status: 502, type: "provider_error", description: "Upstream provider API returned an unexpected error." },
  { code: "server_error", status: 500, type: "server_error", description: "Internal server execution failure. Inspect returned correlation_id for tracing." },
];

/**
 * Generates sample cURL command for an endpoint and payload
 */
export function generateCurlSnippet(endpoint: ApiEndpointDoc, customPayload?: Record<string, any>): string {
  const baseUrl = "https://api.nexora.ai";
  const url = `${baseUrl}${endpoint.path}`;
  const payload = customPayload || endpoint.requestExample;

  if (endpoint.method === "GET") {
    return `curl -X GET "${url}" \\
  -H "Authorization: Bearer $NEXORA_API_KEY" \\
  -H "Content-Type: application/json"`;
  }

  const jsonStr = JSON.stringify(payload, null, 2)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : `  ${line}`))
    .join("\n");

  return `curl -X POST "${url}" \\
  -H "Authorization: Bearer $NEXORA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${jsonStr}'`;
}

/**
 * Generates modern JavaScript Fetch snippet
 */
export function generateJavaScriptSnippet(endpoint: ApiEndpointDoc, customPayload?: Record<string, any>): string {
  const baseUrl = "https://api.nexora.ai";
  const url = `${baseUrl}${endpoint.path}`;
  const payload = customPayload || endpoint.requestExample;

  if (endpoint.method === "GET") {
    return `// Node.js (v18+) or Browser
const apiKey = process.env.NEXORA_API_KEY;

async function run() {
  const response = await fetch("${url}", {
    method: "GET",
    headers: {
      "Authorization": \`Bearer \${apiKey}\`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(\`Nexora API error (\${response.status}): \${errorData.error?.message || response.statusText}\`);
  }

  const data = await response.json();
  console.log("Response:", data);
}

run().catch(console.error);`;
  }

  return `// Node.js (v18+) or Modern Browser
const apiKey = process.env.NEXORA_API_KEY;

async function run() {
  const response = await fetch("${url}", {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${apiKey}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(${JSON.stringify(payload, null, 2)}),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(\`Nexora API error (\${response.status}): \${errorData.error?.message || response.statusText}\`);
  }

  const data = await response.json();
  console.log("Success:", data);
}

run().catch(console.error);`;
}

/**
 * Generates TypeScript snippet with typed interfaces
 */
export function generateTypeScriptSnippet(endpoint: ApiEndpointDoc, customPayload?: Record<string, any>): string {
  const baseUrl = "https://api.nexora.ai";
  const url = `${baseUrl}${endpoint.path}`;
  const payload = customPayload || endpoint.requestExample;

  return `import fetch from "node-fetch"; // or global fetch in Node 18+

interface ApiResponse<T = any> {
  object: string;
  data?: T;
  choices?: Array<{ message: { content: string; role: string } }>;
  error?: { message: string; type: string; code?: string };
}

const apiKey: string = process.env.NEXORA_API_KEY ?? "";
if (!apiKey) {
  throw new Error("Missing NEXORA_API_KEY environment variable");
}

async function callNexora(): Promise<ApiResponse> {
  const response = await fetch("${url}", {
    method: "${endpoint.method}",
    headers: {
      "Authorization": \`Bearer \${apiKey}\`,
      "Content-Type": "application/json",
    },
    ${endpoint.method === "POST" ? `body: JSON.stringify(${JSON.stringify(payload, null, 2)}),` : ""}
  });

  if (!response.ok) {
    const errorPayload = await response.json() as ApiResponse;
    throw new Error(\`Nexora API error: \${errorPayload.error?.message}\`);
  }

  return response.json() as Promise<ApiResponse>;
}

callNexora()
  .then((res) => console.log("Result:", res))
  .catch((err) => console.error("Request failed:", err));`;
}

/**
 * Generates Python snippet using requests
 */
export function generatePythonSnippet(endpoint: ApiEndpointDoc, customPayload?: Record<string, any>): string {
  const baseUrl = "https://api.nexora.ai";
  const url = `${baseUrl}${endpoint.path}`;
  const payload = customPayload || endpoint.requestExample;

  if (endpoint.method === "GET") {
    return `import os
import requests

api_key = os.environ.get("NEXORA_API_KEY")
if not api_key:
    raise ValueError("NEXORA_API_KEY environment variable not set")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

response = requests.get("${url}", headers=headers)

if response.status_code == 200:
    data = response.json()
    print("Success:", data)
else:
    print(f"Error {response.status_code}:", response.text)
`;
  }

  return `import os
import requests

api_key = os.environ.get("NEXORA_API_KEY")
if not api_key:
    raise ValueError("NEXORA_API_KEY environment variable not set")

url = "${url}"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

payload = ${JSON.stringify(payload, null, 4).replace(/true/g, "True").replace(/false/g, "False").replace(/null/g, "None")}

response = requests.post(url, json=payload, headers=headers)

if response.status_code == 200:
    data = response.json()
    print("Success:", data)
else:
    print(f"Error {response.status_code}:", response.text)
`;
}
