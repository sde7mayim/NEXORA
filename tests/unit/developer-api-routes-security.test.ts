import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST as ChatPOST } from "@/app/api/v1/chat/completions/route";
import { POST as ImagePOST } from "@/app/api/v1/images/generations/route";
import { POST as MusicPOST } from "@/app/api/v1/music/generations/route";
import { POST as VideoPOST } from "@/app/api/v1/videos/generations/route";
import { POST as LyricsPOST } from "@/app/api/v1/lyrics/generations/route";
import { GET as ModelsGET } from "@/app/api/v1/models/route";
import { GET as UsageGET } from "@/app/api/v1/usage/route";
import { ApiKeyService } from "@/lib/developer/api-keys";
import { NextRequest } from "next/server";

describe("Developer API Endpoints Security, Scope & Sandbox Verification", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    ApiKeyService.resetForTesting();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should reject unauthenticated requests with HTTP 401 across endpoints", async () => {
    // 1. Chat without key
    const reqChat = new NextRequest("http://localhost:3000/api/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Hi" }] }),
    });
    const resChat = await ChatPOST(reqChat);
    expect(resChat.status).toBe(401);
    const jsonChat = await resChat.json();
    expect(jsonChat.error.code).toBe("missing_api_key");

    // 2. Images without key
    const reqImg = new NextRequest("http://localhost:3000/api/v1/images/generations", {
      method: "POST",
      body: JSON.stringify({ prompt: "A painting" }),
    });
    const resImg = await ImagePOST(reqImg);
    expect(resImg.status).toBe(401);

    // 3. Models without key
    const reqMod = new NextRequest("http://localhost:3000/api/v1/models", {
      method: "GET",
    });
    const resMod = await ModelsGET(reqMod);
    expect(resMod.status).toBe(401);
  });

  it("should enforce granular scope restrictions and reject with HTTP 403 on missing scope", async () => {
    // Create key with ONLY lyrics:generate scope
    const { rawSecret } = ApiKeyService.createApiKey({
      name: "Lyrics Only Key",
      userId: "usr_developer_scope",
      scopes: ["lyrics:generate"],
      environment: "test",
    });

    // Attempt chat completion (requires chat:write) -> must return 403
    const req = new NextRequest("http://localhost:3000/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rawSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: [{ role: "user", content: "Test" }] }),
    });

    const res = await ChatPOST(req);
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.error.code).toBe("insufficient_scope");
    expect(data.error.message).toContain("chat:write");
  });

  it("should execute image generation in safe sandbox mode with zero cost when using a test key", async () => {
    // Create a key in 'test' environment with images:generate scope
    const { rawSecret } = ApiKeyService.createApiKey({
      name: "Image Test Key",
      userId: "usr_sandbox_tester",
      scopes: ["images:generate"],
      environment: "test",
    });

    const req = new NextRequest("http://localhost:3000/api/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rawSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: "A neon city in rain",
        aspect_ratio: "16:9",
        style: "cinematic",
      }),
    });

    const res = await ImagePOST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    // Must return sandbox object with simulated: true and billing_units: 0
    expect(data.sandbox).toBe(true);
    expect(data.simulated).toBe(true);
    expect(data.billing_units).toBe(0);
    expect(data.object).toBe("image.sandbox");
    expect(data.request_validation.parameters.prompt).toBe("A neon city in rain");
  });

  it("should execute music and video generation in safe sandbox mode with test keys", async () => {
    const { rawSecret } = ApiKeyService.createApiKey({
      name: "Media Test Key",
      userId: "usr_sandbox_tester",
      scopes: ["music:generate", "videos:generate"],
      environment: "test",
    });

    // 1. Music sandbox
    const reqMusic = new NextRequest("http://localhost:3000/api/v1/music/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rawSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: "Acoustic chill song",
        genre: "Acoustic",
      }),
    });

    const resMusic = await MusicPOST(reqMusic);
    expect(resMusic.status).toBe(200);
    const dataMusic = await resMusic.json();
    expect(dataMusic.sandbox).toBe(true);
    expect(dataMusic.object).toBe("music.sandbox");

    // 2. Video sandbox
    const reqVideo = new NextRequest("http://localhost:3000/api/v1/videos/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rawSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: "Drone shot over canyon",
        duration_seconds: 5,
      }),
    });

    const resVideo = await VideoPOST(reqVideo);
    expect(resVideo.status).toBe(200);
    const dataVideo = await resVideo.json();
    expect(dataVideo.sandbox).toBe(true);
    expect(dataVideo.object).toBe("video.sandbox");
  });

  it("should return HTTP 400 on invalid JSON or missing parameters", async () => {
    const { rawSecret } = ApiKeyService.createApiKey({
      name: "Validation Key",
      userId: "usr_val_tester",
      scopes: ["*"],
      environment: "test",
    });

    // Missing messages array on chat completions
    const req = new NextRequest("http://localhost:3000/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rawSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "nexora-core" }), // messages omitted
    });

    const res = await ChatPOST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error.message).toContain("messages array is required");
  });

  it("should serve models list with models:read scope", async () => {
    const { rawSecret } = ApiKeyService.createApiKey({
      name: "Models Read Key",
      userId: "usr_models_reader",
      scopes: ["models:read"],
      environment: "test",
    });

    const req = new NextRequest("http://localhost:3000/api/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${rawSecret}`,
      },
    });

    const res = await ModelsGET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.object).toBe("list");
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);

    // Verify presence of core model families
    const modelIds = data.data.map((m: any) => m.id);
    expect(modelIds).toContain("nexora-core");
    expect(modelIds).toContain("nexora-chat");
  });
});
