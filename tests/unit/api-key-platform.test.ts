import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiKeyService } from "@/lib/developer/api-keys";
import { authenticateApiRequest } from "@/lib/api-keys/auth-middleware";
import { ProviderStatusService } from "@/lib/ai/provider-status";
import { ModelRouter } from "@/lib/ai/router";
import { POST as lyricsPost } from "@/app/api/v1/lyrics/generations/route";
import { POST as imagesPost } from "@/app/api/v1/images/generations/route";
import { POST as musicPost } from "@/app/api/v1/music/generations/route";
import { POST as videosPost } from "@/app/api/v1/videos/generations/route";
import { GET as modelsGet } from "@/app/api/v1/models/route";
import { GET as usageGet } from "@/app/api/v1/usage/route";
import { POST as keysPost, GET as keysGet } from "@/app/api/v1/keys/route";
import { DELETE as keysDelete } from "@/app/api/v1/keys/[id]/route";
import {
  GET as devKeysGet,
  POST as devKeysPost,
  DELETE as devKeysDelete,
} from "@/app/api/developer/keys/route";

describe("NEXORA NATIVE API KEY PLATFORM & VERIFICATION SUITE", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    ApiKeyService.resetForTesting();
  });

  // 1. Generation & Formats
  describe("1. Key Generation Engine & Secret Isolation", () => {
    it("generates genuine Live keys starting with nx_live_ and high-entropy 64-hex secrets", () => {
      const { record, rawSecret } = ApiKeyService.createApiKey({
        name: "Production Worker",
        userId: "usr_alice",
        environment: "live",
      });

      expect(rawSecret.startsWith("nx_live_")).toBe(true);
      expect(rawSecret.length).toBe(8 + 64); // "nx_live_" (8) + 64 hex chars
      expect(record.environment).toBe("live");
      expect(record.keyPrefix).toBe(rawSecret.slice(0, 14) + "...");
      expect(record.keyHash).not.toBe(rawSecret);
      expect(record.keyHash.length).toBe(64); // SHA-256 hex
    });

    it("generates genuine Test keys starting with nx_test_ for sandbox development", () => {
      const { record, rawSecret } = ApiKeyService.createApiKey({
        name: "Test Sandbox Agent",
        userId: "usr_alice",
        environment: "test",
      });

      expect(rawSecret.startsWith("nx_test_")).toBe(true);
      expect(rawSecret.length).toBe(8 + 64);
      expect(record.environment).toBe("test");
      expect(record.keyPrefix).toBe(rawSecret.slice(0, 14) + "...");
    });

    it("guarantees unique keys across rapid successive creations", () => {
      const keysSet = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const { rawSecret } = ApiKeyService.createApiKey({
          name: `Batch Key ${i}`,
          userId: "usr_alice",
        });
        expect(keysSet.has(rawSecret)).toBe(false);
        keysSet.add(rawSecret);
      }
      expect(keysSet.size).toBe(20);
    });

    it("never returns raw keyHash in public getKeys listing", () => {
      ApiKeyService.createApiKey({
        name: "Public Key",
        userId: "usr_bob",
      });

      const userKeys = ApiKeyService.getKeys("usr_bob");
      expect(userKeys.length).toBe(1);
      expect((userKeys[0] as any).keyHash).toBeUndefined();
      expect(userKeys[0].keyPrefix).toBeDefined();
    });
  });

  // 2. Cryptographic Verification & Error States
  describe("2. Cryptographic Verification, Scopes & Expiration", () => {
    it("successfully verifies valid keys in constant-time", () => {
      const { rawSecret, record } = ApiKeyService.createApiKey({
        name: "Fast Key",
        userId: "usr_charlie",
        scopes: ["lyrics:generate", "images:generate"],
      });

      const result = ApiKeyService.authenticateKey(rawSecret, "lyrics:generate");
      expect(result.valid).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.record?.id).toBe(record.id);
      expect(result.record?.lastUsedAt).toBeDefined();
    });

    it("rejects invalid key formats with HTTP 401", () => {
      const result = ApiKeyService.authenticateKey("invalid_format_key");
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toContain("Invalid API key format");
    });

    it("rejects non-existent keys with HTTP 401", () => {
      const fakeKey = `nx_live_${"a".repeat(64)}`;
      const result = ApiKeyService.authenticateKey(fakeKey);
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toContain("does not exist");
    });

    it("immediately rejects revoked keys with HTTP 401", () => {
      const { rawSecret, record } = ApiKeyService.createApiKey({
        name: "Revocable Key",
        userId: "usr_dave",
      });

      ApiKeyService.revokeKey(record.id, "usr_dave");
      const result = ApiKeyService.authenticateKey(rawSecret);
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toContain("revoked");
    });

    it("rejects expired keys with HTTP 401", () => {
      const { rawSecret, record } = ApiKeyService.createApiKey({
        name: "Expiring Key",
        userId: "usr_dave",
      });

      // Manually set past timestamp
      record.expiresAt = new Date(Date.now() - 5000).toISOString();

      const result = ApiKeyService.authenticateKey(rawSecret);
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toContain("expired");
    });

    it("enforces granular scope restrictions with HTTP 403", () => {
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Lyrics Only Key",
        userId: "usr_eve",
        scopes: ["lyrics:generate"],
      });

      // Allowed scope
      const lyricsAuth = ApiKeyService.authenticateKey(rawSecret, "lyrics:generate");
      expect(lyricsAuth.valid).toBe(true);

      // Forbidden scope
      const imagesAuth = ApiKeyService.authenticateKey(rawSecret, "images:generate");
      expect(imagesAuth.valid).toBe(false);
      expect(imagesAuth.statusCode).toBe(403);
      expect(imagesAuth.error).toContain("Insufficient key permissions");
    });

    it("grants wildcard (*) scope access to all endpoints", () => {
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Admin Key",
        userId: "usr_eve",
        scopes: ["*"],
      });

      expect(ApiKeyService.authenticateKey(rawSecret, "lyrics:generate").valid).toBe(true);
      expect(ApiKeyService.authenticateKey(rawSecret, "images:generate").valid).toBe(true);
      expect(ApiKeyService.authenticateKey(rawSecret, "music:generate").valid).toBe(true);
      expect(ApiKeyService.authenticateKey(rawSecret, "videos:generate").valid).toBe(true);
      expect(ApiKeyService.authenticateKey(rawSecret, "models:read").valid).toBe(true);
    });
  });

  // 3. Sliding-Window Rate Limiting
  describe("3. Sliding-Window Rate Limiter (HTTP 429)", () => {
    it("enforces rate limits and returns 429 when threshold is reached", () => {
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Strict Rate Limited Key",
        userId: "usr_frank",
        rateLimit: 3, // 3 requests per minute
      });

      // 1st request -> OK
      expect(ApiKeyService.authenticateKey(rawSecret).valid).toBe(true);
      // 2nd request -> OK
      expect(ApiKeyService.authenticateKey(rawSecret).valid).toBe(true);
      // 3rd request -> OK
      expect(ApiKeyService.authenticateKey(rawSecret).valid).toBe(true);
      // 4th request -> Exceeded!
      const fourth = ApiKeyService.authenticateKey(rawSecret);
      expect(fourth.valid).toBe(false);
      expect(fourth.statusCode).toBe(429);
      expect(fourth.error).toContain("Rate limit exceeded");
    });
  });

  // 4. User Isolation & Usage Tracking
  describe("4. Multi-Tenant User Isolation & Usage Analytics", () => {
    it("strictly isolates keys between different users", () => {
      ApiKeyService.createApiKey({ name: "User 1 Key", userId: "usr_1" });
      ApiKeyService.createApiKey({ name: "User 2 Key", userId: "usr_2" });

      const u1Keys = ApiKeyService.getKeys("usr_1");
      const u2Keys = ApiKeyService.getKeys("usr_2");

      expect(u1Keys.length).toBe(1);
      expect(u1Keys[0].name).toBe("User 1 Key");
      expect(u2Keys.length).toBe(1);
      expect(u2Keys[0].name).toBe("User 2 Key");
    });

    it("records and aggregates usage events accurately", () => {
      const { record } = ApiKeyService.createApiKey({
        name: "Metrics Key",
        userId: "usr_metrics",
      });

      ApiKeyService.recordUsage(record.id, "/api/v1/lyrics/generations", 200, 1, {
        userId: "usr_metrics",
        provider: "nexora-creative",
        model: "lyrics-v1",
      });
      ApiKeyService.recordUsage(record.id, "/api/v1/images/generations", 200, 1, {
        userId: "usr_metrics",
        provider: "huggingface",
        model: "flux-schnell",
      });
      ApiKeyService.recordUsage(record.id, "/api/v1/images/generations", 503, 0, {
        userId: "usr_metrics",
        provider: "huggingface",
      });

      const summary = ApiKeyService.getUsageSummary("usr_metrics");
      expect(summary.totalRequests).toBe(3);
      expect(summary.totalUnits).toBe(2);
      expect(summary.successfulRequests).toBe(2);
      expect(summary.errorRequests).toBe(1);
      expect(summary.successRate).toBe(67);
      expect(summary.recentEvents.length).toBe(3);
    });
  });

  // 5. Versioned Endpoints Verification
  describe("5. Native API Endpoints Authentication & Execution", () => {
    it("POST /api/v1/lyrics/generations generates structured lyrics with valid key", async () => {
      vi.spyOn(ProviderStatusService, "getConfiguredProviders").mockReturnValue(["gemini"]);
      vi.spyOn(ModelRouter, "generateWithFallback").mockResolvedValue({
        id: "mock_resp_123",
        role: "assistant",
        content: `[Verse 1]\nStanding tall against the morning light\nBuilding dreams into the height\n\n[Chorus]\nRise above the fear and pain\nWe will build our world again\n\n[Outro]\nDreamers never fade`,
        modelAttribution: "Google Gemini",
      } as any);

      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Lyrics Agent",
        userId: "usr_creative",
        scopes: ["lyrics:generate"],
      });

      const req = new NextRequest("http://localhost:3000/api/v1/lyrics/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "Write an original motivational song about building dreams",
          language: "English",
          genre: "Pop Melody",
          vocalStyle: "Duet",
        }),
      });

      const res = await lyricsPost(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.object).toBe("lyrics.generation");
      expect(json.title).toBeDefined();
      expect(json.sections.length).toBeGreaterThan(0);
      expect(json.musical_metadata.tempo_bpm).toBeDefined();
      expect(json.nexora_execution.status).toBe("success");
    });

    it("POST /api/v1/lyrics/generations returns 503 NOT_CONFIGURED when text providers are unconfigured", async () => {
      vi.spyOn(ProviderStatusService, "getConfiguredProviders").mockReturnValue([]);
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Lyrics Client",
        userId: "usr_creative",
        scopes: ["lyrics:generate"],
      });

      const req = new NextRequest("http://localhost:3000/api/v1/lyrics/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: "A motivational song" }),
      });

      const res = await lyricsPost(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error.code).toBe("NOT_CONFIGURED");
    });

    it("POST /api/v1/lyrics/generations with nx_test_ returns honest sandbox response without fake lyrics", async () => {
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Lyrics Sandbox",
        userId: "usr_creative",
        environment: "test",
        scopes: ["lyrics:generate"],
      });

      const req = new NextRequest("http://localhost:3000/api/v1/lyrics/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: "A motivational song" }),
      });

      const res = await lyricsPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.sandbox).toBe(true);
      expect(json.simulated).toBe(true);
      expect(json.billing_units).toBe(0);
      expect(json.artifact_generated).toBe(false);
      expect(json.message).toContain("No AI inference was performed");
      expect(json.lyrics_text).toBeUndefined();
    });

    it("POST /api/v1/lyrics/generations rejects request without proper scope", async () => {
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Image Only Key",
        userId: "usr_creative",
        scopes: ["images:generate"], // lacks lyrics:generate
      });

      const req = new NextRequest("http://localhost:3000/api/v1/lyrics/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: "A song" }),
      });

      const res = await lyricsPost(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe("insufficient_scope");
    });

    it("POST /api/v1/images/generations returns honest NOT_CONFIGURED when HF_TOKEN is unset", async () => {
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Image Client",
        userId: "usr_creative",
        scopes: ["images:generate"],
      });

      const req = new NextRequest("http://localhost:3000/api/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "A photorealistic red sports car driving on a coastal highway at sunset",
          aspect_ratio: "16:9",
          provider: "huggingface",
        }),
      });

      const res = await imagesPost(req);
      // In local dev without HF_TOKEN, must return 503 NOT_CONFIGURED without fabricating fake images
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error.code).toBe("NOT_CONFIGURED");
    });

    it("POST /api/v1/music/generations authenticates and processes request", async () => {
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Music Client",
        userId: "usr_creative",
        scopes: ["music:generate"],
      });

      const req = new NextRequest("http://localhost:3000/api/v1/music/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "Calm evening acoustic guitar theme",
          duration_seconds: 15,
          provider: "synthesizer",
        }),
      });

      const res = await musicPost(req);
      expect([200, 503]).toContain(res.status);
    });

    it("POST /api/v1/videos/generations reports NOT_CONFIGURED without fake video URLs", async () => {
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Video Client",
        userId: "usr_creative",
        scopes: ["videos:generate"],
      });

      const req = new NextRequest("http://localhost:3000/api/v1/videos/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "Cinematic drone shot of misty mountain peaks",
          duration_seconds: 5,
        }),
      });

      const res = await videosPost(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error.code).toBe("NOT_CONFIGURED");
    });

    it("GET /api/v1/models returns unified list of chat and creative models", async () => {
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Registry Reader",
        userId: "usr_developer",
        scopes: ["models:read"],
      });

      const req = new NextRequest("http://localhost:3000/api/v1/models", {
        headers: { Authorization: `Bearer ${rawSecret}` },
      });

      const res = await modelsGet(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.object).toBe("list");
      expect(json.data.length).toBeGreaterThan(0);

      const ids = json.data.map((m: any) => m.id);
      expect(ids).toContain("nexora-core");
      expect(ids).toContain("nexora-lyrics-v1");
      expect(ids).toContain("nexora-image-flux");
      expect(ids).toContain("nexora-music-v1");
      expect(ids).toContain("nexora-video-v1");
    });

    it("GET /api/v1/usage returns usage analytics", async () => {
      const { rawSecret, record } = ApiKeyService.createApiKey({
        name: "Usage Reader",
        userId: "usr_developer",
        scopes: ["usage:read"],
      });

      ApiKeyService.recordUsage(record.id, "/api/v1/lyrics/generations", 200, 1, {
        userId: "usr_developer",
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/usage?key_id=${record.id}`, {
        headers: { Authorization: `Bearer ${rawSecret}` },
      });

      const res = await usageGet(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.object).toBe("usage.summary");
      expect(json.metrics.total_requests).toBe(1);
    });

    it("POST /api/v1/keys creates new key programmatically and DELETE revokes it", async () => {
      const { rawSecret: adminSecret } = ApiKeyService.createApiKey({
        name: "Admin Key",
        userId: "usr_admin",
        scopes: ["*"],
      });

      // 1. Create sub-key via POST /api/v1/keys
      const createReq = new NextRequest("http://localhost:3000/api/v1/keys", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Automation Worker",
          environment: "test",
          scopes: ["models:read", "lyrics:generate"],
          rate_limit: 30,
        }),
      });

      const createRes = await keysPost(createReq);
      expect(createRes.status).toBe(201);

      const createdJson = await createRes.json();
      expect(createdJson.secret.startsWith("nx_test_")).toBe(true);
      expect(createdJson.key.environment).toBe("test");
      expect(createdJson.warning).toBeDefined();

      const newKeyId = createdJson.key.id;

      // 2. Revoke sub-key via DELETE /api/v1/keys/[id]
      const deleteReq = new NextRequest(`http://localhost:3000/api/v1/keys/${newKeyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminSecret}` },
      });

      const deleteRes = await keysDelete(deleteReq, { params: { id: newKeyId } });
      expect(deleteRes.status).toBe(200);
      const deleteJson = await deleteRes.json();
      expect(deleteJson.success).toBe(true);

      // Verify that revoked key is now rejected
      const authRevoked = ApiKeyService.authenticateKey(createdJson.secret);
      expect(authRevoked.valid).toBe(false);
      expect(authRevoked.statusCode).toBe(401);
    });

    it("POST /api/v1/keys NEVER leaks raw keyHash in response payload", async () => {
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Security Check Key",
        userId: "usr_sec",
        scopes: ["keys:manage"],
      });

      const req = new NextRequest("http://localhost:3000/api/v1/keys", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Sub Key" }),
      });

      const res = await keysPost(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.key.keyHash).toBeUndefined();
      expect(json.key.keyPrefix).toBeDefined();
    });

    it("rejects unauthorized keys attempting to access /api/v1/keys without keys:manage scope", async () => {
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Lyrics Only Key",
        userId: "usr_attacker",
        scopes: ["lyrics:generate"], // lacks keys:manage
      });

      const req = new NextRequest("http://localhost:3000/api/v1/keys", {
        headers: { Authorization: `Bearer ${rawSecret}` },
      });

      const res = await keysGet(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe("insufficient_scope");
    });

    it("prevents user B from revoking user A's API key", async () => {
      // User A key
      const { record: keyA } = ApiKeyService.createApiKey({
        name: "Victim Key",
        userId: "usr_alice",
        scopes: ["keys:manage"],
      });

      // User B with keys:manage trying to delete User A's key
      const { rawSecret: userBSecret } = ApiKeyService.createApiKey({
        name: "Attacker Key",
        userId: "usr_bob",
        scopes: ["keys:manage"],
      });

      const deleteReq = new NextRequest(`http://localhost:3000/api/v1/keys/${keyA.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userBSecret}` },
      });

      const res = await keysDelete(deleteReq, { params: { id: keyA.id } });
      expect(res.status).toBe(404);

      // Verify key A was not revoked
      const freshAuth = ApiKeyService.authenticateKey(`nx_live_${"0".repeat(64)}`); // non-existent check
      const keysA = ApiKeyService.getKeys("usr_alice");
      expect(keysA[0].revokedAt).toBeUndefined();
    });

    it("test mode key (nx_test_) generates honest sandbox image response without fabricated URLs", async () => {
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Sandbox Tester",
        userId: "usr_test",
        environment: "test",
        scopes: ["images:generate"],
      });

      const req = new NextRequest("http://localhost:3000/api/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "A futuristic electric hypercar in a neon city",
        }),
      });

      const res = await imagesPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.sandbox).toBe(true);
      expect(json.simulated).toBe(true);
      expect(json.billing_units).toBe(0);
      expect(json.artifact_generated).toBe(false);
      expect(json.message).toContain("No AI inference was performed");
      expect(json.data).toBeUndefined(); // Strictly no fake URLs
      expect(res.headers.get("x-nexora-environment")).toBe("test");
    });

    it("test mode key (nx_test_) generates honest sandbox music response without fabricated audio URLs", async () => {
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Music Sandbox",
        userId: "usr_test",
        environment: "test",
        scopes: ["music:generate"],
      });

      const req = new NextRequest("http://localhost:3000/api/v1/music/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: "A piano melody" }),
      });

      const res = await musicPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.sandbox).toBe(true);
      expect(json.simulated).toBe(true);
      expect(json.billing_units).toBe(0);
      expect(json.artifact_generated).toBe(false);
      expect(json.media_url).toBeUndefined(); // Strictly no fake media URLs
    });

    it("test mode key (nx_test_) generates honest sandbox video response without fabricated video URLs", async () => {
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Video Sandbox",
        userId: "usr_test",
        environment: "test",
        scopes: ["videos:generate"],
      });

      const req = new NextRequest("http://localhost:3000/api/v1/videos/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: "Drone shot over ocean" }),
      });

      const res = await videosPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.sandbox).toBe(true);
      expect(json.simulated).toBe(true);
      expect(json.billing_units).toBe(0);
      expect(json.artifact_generated).toBe(false);
      expect(json.media_url).toBeUndefined(); // Strictly no fake media URLs
    });

    it("rejects API key creation in production environment when persistent storage is unconfigured", () => {
      const prevEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = "production";
      try {
        expect(() => {
          ApiKeyService.createApiKey({
            name: "Prod Key",
            userId: "usr_prod",
          });
        }).toThrow(/Persistent database storage is required in production environment/);
      } finally {
        (process.env as any).NODE_ENV = prevEnv;
      }
    });

    it("POST /api/v1/keys returns 503 PERSISTENCE_REQUIRED in production when Supabase is missing", async () => {
      const prevEnv = process.env.NODE_ENV;
      // First create admin key in dev mode
      (process.env as any).NODE_ENV = "development";
      const { rawSecret: adminSecret } = ApiKeyService.createApiKey({
        name: "Admin Key",
        userId: "usr_admin",
        scopes: ["*"],
      });

      // Switch to production
      (process.env as any).NODE_ENV = "production";
      try {
        const req = new NextRequest("http://localhost:3000/api/v1/keys", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${adminSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: "Sub Key" }),
        });

        const res = await keysPost(req);
        expect(res.status).toBe(503);
        const json = await res.json();
        expect(json.error.code).toBe("PERSISTENCE_REQUIRED");
      } finally {
        (process.env as any).NODE_ENV = prevEnv;
      }
    });

    it("GET /api/v1/models accurately exposes modality, provider, and truthful inference_status", async () => {
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Registry Inspector",
        userId: "usr_developer",
        scopes: ["models:read"],
      });

      const req = new NextRequest("http://localhost:3000/api/v1/models", {
        headers: { Authorization: `Bearer ${rawSecret}` },
      });

      const res = await modelsGet(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      const models = json.data;
      expect(models.length).toBeGreaterThan(0);

      models.forEach((m: any) => {
        expect(m.id).toBeDefined();
        expect(m.name).toBeDefined();
        expect(["text", "image", "audio", "video"]).toContain(m.modality);
        expect(m.provider).toBeDefined();
        expect(["available", "not_configured", "offline", "sandbox_only"]).toContain(m.inference_status);
        expect(typeof m.is_configured).toBe("boolean");
        expect(typeof m.is_sandbox_only).toBe("boolean");
      });

      // External models must not falsely claim owned_by: 'nexora'
      const fluxModel = models.find((m: any) => m.id === "nexora-image-flux");
      expect(fluxModel).toBeDefined();
      expect(fluxModel.owned_by).toContain("Black Forest Labs");
      expect(fluxModel.modality).toBe("image");

      const sandboxModel = models.find((m: any) => m.id === "nexora-sandbox-simulator");
      expect(sandboxModel).toBeDefined();
      expect(sandboxModel.is_sandbox_only).toBe(true);
      expect(sandboxModel.inference_status).toBe("sandbox_only");
    });

    it("returns standard rate limit headers on authenticated requests", async () => {
      const { rawSecret } = ApiKeyService.createApiKey({
        name: "Headers Check Key",
        userId: "usr_hdr",
        scopes: ["models:read"],
      });

      const req = new NextRequest("http://localhost:3000/api/v1/models", {
        headers: { Authorization: `Bearer ${rawSecret}` },
      });

      const res = await modelsGet(req);
      expect(res.headers.get("x-ratelimit-limit")).toBe("60");
      expect(res.headers.get("x-ratelimit-remaining")).toBeDefined();
      expect(res.headers.get("x-ratelimit-reset")).toBeDefined();
    });

    it("reports honest persistence status when Supabase service role key is unconfigured", () => {
      const status = ApiKeyService.getPersistenceStatus();
      expect(status.storageMode).toBe("in-memory-ephemeral");
      expect(status.isConfigured).toBe(false);
      expect(status.message).toContain("ephemeral in-memory mode");
    });
  });

  describe("6. Developer Portal Route Security & Ownership Isolation", () => {
    it("POST /api/developer/keys creates an API key with sanitized record (never leaks keyHash)", async () => {
      const req = new NextRequest("http://localhost:3000/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Portal Test Key",
          environment: "test",
          userId: "usr_portal_test",
        }),
      });

      const res = await devKeysPost(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.record).toBeDefined();
      expect(json.record.keyHash).toBeUndefined();
      expect(json.record.keyPrefix).toBeDefined();
      expect(json.rawSecret.startsWith("nx_test_")).toBe(true);
    });

    it("GET /api/developer/keys returns only the scoped user keys", async () => {
      ApiKeyService.createApiKey({ name: "User A Key", userId: "usr_scoped_a" });
      ApiKeyService.createApiKey({ name: "User B Key", userId: "usr_scoped_b" });

      const req = new NextRequest("http://localhost:3000/api/developer/keys?userId=usr_scoped_a");
      const res = await devKeysGet(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.keys.length).toBe(1);
      expect(json.keys[0].name).toBe("User A Key");
      expect(json.keys[0].userId).toBe("usr_scoped_a");
    });

    it("DELETE /api/developer/keys prevents user B from revoking user A key", async () => {
      const keyA = ApiKeyService.createApiKey({ name: "Victim Key", userId: "usr_owner_a" });

      // User B tries to revoke User A's key
      const req = new NextRequest(
        `http://localhost:3000/api/developer/keys?id=${keyA.record.id}&userId=usr_attacker_b`,
        { method: "DELETE" }
      );
      const res = await devKeysDelete(req);
      expect(res.status).toBe(404);

      // Verify key A is still active
      const auth = ApiKeyService.authenticateKey(keyA.rawSecret);
      expect(auth.valid).toBe(true);
    });

    it("DELETE /api/developer/keys permits owner to revoke their own key", async () => {
      const keyA = ApiKeyService.createApiKey({ name: "Self Revoke Key", userId: "usr_owner_a" });

      const req = new NextRequest(
        `http://localhost:3000/api/developer/keys?id=${keyA.record.id}&userId=usr_owner_a`,
        { method: "DELETE" }
      );
      const res = await devKeysDelete(req);
      expect(res.status).toBe(200);

      // Verify key A is now revoked
      const auth = ApiKeyService.authenticateKey(keyA.rawSecret);
      expect(auth.valid).toBe(false);
      expect(auth.error).toContain("revoked");
    });
  });
});
