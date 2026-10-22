import { describe, it, expect } from "vitest";
import { ApiKeyService } from "@/lib/developer/api-keys";

describe("Nexora Developer Platform & Scoped API Keys", () => {
  it("should generate cryptographically secure API keys and return raw secret only once", () => {
    const { record, rawSecret } = ApiKeyService.createApiKey({
      name: "Analytics Worker",
      userId: "usr_developer",
      scopes: ["models:read", "chat:write"],
    });

    expect(rawSecret.startsWith("nx_live_")).toBe(true);
    expect(record.keyHash).not.toBe(rawSecret);
    expect(record.keyPrefix).toBe(rawSecret.slice(0, 14) + "...");
    expect(record.scopes).toContain("chat:write");
  });

  it("should authenticate valid API keys with correct scopes", () => {
    const { rawSecret } = ApiKeyService.createApiKey({
      name: "Chat Integration",
      userId: "usr_developer",
      scopes: ["chat:write"],
    });

    const validAuth = ApiKeyService.authenticateKey(rawSecret, "chat:write");
    expect(validAuth.valid).toBe(true);
    expect(validAuth.record?.userId).toBe("usr_developer");

    // Lacking scope should be rejected
    const lackingScopeAuth = ApiKeyService.authenticateKey(rawSecret, "workflows:run");
    expect(lackingScopeAuth.valid).toBe(false);
    expect(lackingScopeAuth.error).toContain("Insufficient key permissions");
  });

  it("should immediately reject revoked API keys", () => {
    const { record, rawSecret } = ApiKeyService.createApiKey({
      name: "Temporary Key",
      userId: "usr_developer",
      scopes: ["models:read"],
    });

    // Revoke key
    ApiKeyService.revokeKey(record.id, "usr_developer");

    const auth = ApiKeyService.authenticateKey(rawSecret, "models:read");
    expect(auth.valid).toBe(false);
    expect(auth.error).toContain("revoked");
  });

  it("should reject expired API keys", () => {
    const { rawSecret, record } = ApiKeyService.createApiKey({
      name: "Expired Key",
      userId: "usr_developer",
      scopes: ["models:read"],
    });

    // Manually set past expiration
    record.expiresAt = new Date(Date.now() - 10000).toISOString();

    const auth = ApiKeyService.authenticateKey(rawSecret, "models:read");
    expect(auth.valid).toBe(false);
    expect(auth.error).toContain("expired");
  });

  it("should record API key usage and compute developer metrics summary", () => {
    const { record } = ApiKeyService.createApiKey({
      name: "Metrics Key",
      userId: "usr_analytics_dev",
    });

    ApiKeyService.recordUsage(record.id, "/api/v1/chat/completions", 200, 250);
    ApiKeyService.recordUsage(record.id, "/api/v1/chat/completions", 200, 350);

    const summary = ApiKeyService.getUsageSummary("usr_analytics_dev");
    expect(summary.totalRequests).toBe(2);
    expect(summary.totalTokens).toBe(600);
    expect(summary.successRate).toBe(100);
  });
});
