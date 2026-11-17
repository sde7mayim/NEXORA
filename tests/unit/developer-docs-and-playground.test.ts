import { describe, it, expect } from "vitest";
import {
  DOC_SECTIONS,
  API_ENDPOINTS,
  ERROR_CODES,
  generateCurlSnippet,
  generateJavaScriptSnippet,
  generateTypeScriptSnippet,
  generatePythonSnippet,
} from "@/components/developer/doc-data";

describe("Developer Documentation & Schema Verification", () => {
  it("should have all 12 required documentation sections", () => {
    const requiredSections = [
      "getting-started",
      "authentication",
      "api-keys",
      "models",
      "chat",
      "images",
      "music",
      "videos",
      "lyrics",
      "usage-limits",
      "errors",
      "versioning",
    ];

    const sectionIds = DOC_SECTIONS.map((s) => s.id);
    for (const req of requiredSections) {
      expect(sectionIds).toContain(req);
    }
  });

  it("should document existing endpoints with valid paths and scopes", () => {
    const chatDoc = API_ENDPOINTS.find((e) => e.id === "chat-completions");
    expect(chatDoc).toBeDefined();
    expect(chatDoc?.path).toBe("/api/v1/chat/completions");
    expect(chatDoc?.scope).toBe("chat:write");
    expect(chatDoc?.method).toBe("POST");

    const imageDoc = API_ENDPOINTS.find((e) => e.id === "image-generations");
    expect(imageDoc).toBeDefined();
    expect(imageDoc?.path).toBe("/api/v1/images/generations");
    expect(imageDoc?.scope).toBe("images:generate");
    expect(imageDoc?.testModeSupported).toBe(true);

    const musicDoc = API_ENDPOINTS.find((e) => e.id === "music-generations");
    expect(musicDoc).toBeDefined();
    expect(musicDoc?.path).toBe("/api/v1/music/generations");
    expect(musicDoc?.scope).toBe("music:generate");

    const videoDoc = API_ENDPOINTS.find((e) => e.id === "video-generations");
    expect(videoDoc).toBeDefined();
    expect(videoDoc?.path).toBe("/api/v1/videos/generations");
    expect(videoDoc?.scope).toBe("videos:generate");

    const lyricsDoc = API_ENDPOINTS.find((e) => e.id === "lyrics-generations");
    expect(lyricsDoc).toBeDefined();
    expect(lyricsDoc?.path).toBe("/api/v1/lyrics/generations");
    expect(lyricsDoc?.scope).toBe("lyrics:generate");

    const modelsDoc = API_ENDPOINTS.find((e) => e.id === "models-list");
    expect(modelsDoc).toBeDefined();
    expect(modelsDoc?.path).toBe("/api/v1/models");
    expect(modelsDoc?.scope).toBe("models:read");
    expect(modelsDoc?.method).toBe("GET");

    const usageDoc = API_ENDPOINTS.find((e) => e.id === "usage-summary");
    expect(usageDoc).toBeDefined();
    expect(usageDoc?.path).toBe("/api/v1/usage");
    expect(usageDoc?.scope).toBe("usage:read");
    expect(usageDoc?.method).toBe("GET");
  });

  it("should contain standard error codes with correct HTTP statuses", () => {
    const unauthErr = ERROR_CODES.find((e) => e.code === "missing_api_key");
    expect(unauthErr?.status).toBe(401);

    const scopeErr = ERROR_CODES.find((e) => e.code === "insufficient_scope");
    expect(scopeErr?.status).toBe(403);

    const rateLimitErr = ERROR_CODES.find((e) => e.code === "rate_limit_exceeded");
    expect(rateLimitErr?.status).toBe(429);

    const validationErr = ERROR_CODES.find((e) => e.code === "validation_error");
    expect(validationErr?.status).toBe(400);

    const notConfiguredErr = ERROR_CODES.find((e) => e.code === "NOT_CONFIGURED");
    expect(notConfiguredErr?.status).toBe(503);
  });
});

describe("Multi-Language Code Example Generators", () => {
  const chatEndpoint = API_ENDPOINTS.find((e) => e.id === "chat-completions")!;
  const modelsEndpoint = API_ENDPOINTS.find((e) => e.id === "models-list")!;

  it("should generate secure cURL snippets without hardcoded credentials", () => {
    const curlPost = generateCurlSnippet(chatEndpoint);
    expect(curlPost).toContain("curl -X POST");
    expect(curlPost).toContain("https://api.nexora.ai/api/v1/chat/completions");
    expect(curlPost).toContain("$NEXORA_API_KEY");
    expect(curlPost).not.toContain("sb_secret_");
    expect(curlPost).not.toContain("sb_publishable_");

    const curlGet = generateCurlSnippet(modelsEndpoint);
    expect(curlGet).toContain("curl -X GET");
    expect(curlGet).toContain("https://api.nexora.ai/api/v1/models");
  });

  it("should generate secure JavaScript fetch snippets using environment variables", () => {
    const jsCode = generateJavaScriptSnippet(chatEndpoint);
    expect(jsCode).toContain("process.env.NEXORA_API_KEY");
    expect(jsCode).toContain("fetch(");
    expect(jsCode).toContain('"Content-Type": "application/json"');
    expect(jsCode).not.toContain("sb_secret_");
  });

  it("should generate typed TypeScript snippets", () => {
    const tsCode = generateTypeScriptSnippet(chatEndpoint);
    expect(tsCode).toContain("interface ApiResponse");
    expect(tsCode).toContain("process.env.NEXORA_API_KEY");
    expect(tsCode).toContain("Promise<ApiResponse>");
    expect(tsCode).not.toContain("sb_secret_");
  });

  it("should generate valid Python requests snippets", () => {
    const pyCode = generatePythonSnippet(chatEndpoint);
    expect(pyCode).toContain("import requests");
    expect(pyCode).toContain('os.environ.get("NEXORA_API_KEY")');
    expect(pyCode).toContain("requests.post(url, json=payload, headers=headers)");
    expect(pyCode).not.toContain("sb_secret_");
  });

  it("should adapt generated code to custom payload parameters", () => {
    const customPayload = {
      model: "nexora-swift",
      messages: [{ role: "user", content: "Custom query" }],
      temperature: 0.2,
    };
    const customCurl = generateCurlSnippet(chatEndpoint, customPayload);
    expect(customCurl).toContain("nexora-swift");
    expect(customCurl).toContain("Custom query");
  });
});
