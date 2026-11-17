import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { ApiKeyService } from "@/lib/developer/api-keys";
import {
  createAdminClient,
  checkSupabaseHealth,
  getSupabaseConfig,
  resetSupabaseHealthCache,
  isValidSecretKeyFormat,
  isValidPublishableKeyFormat,
} from "@/lib/supabase/admin";

// Load .env.local for live database integration testing
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    lines.forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^['"](.*)['"]$/, "$1");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
} catch {}

describe("NEXORA SUPABASE API PLATFORM — LIVE DATABASE INTEGRATION AUDIT", () => {
  const originalEnv = { ...process.env };
  const persistenceStatus = ApiKeyService.getPersistenceStatus();
  const isLiveDbAvailable = persistenceStatus.isConfigured;

  beforeEach(() => {
    ApiKeyService.resetForTesting();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("audits whether local or remote Supabase instance is configured", () => {
    console.log("--- SUPABASE CONNECTION AUDIT ---");
    console.log("Storage Mode:", persistenceStatus.storageMode);
    console.log("Is Configured:", persistenceStatus.isConfigured);
    console.log("Is Production:", persistenceStatus.isProduction);
    console.log("Production Blocked:", persistenceStatus.productionBlocked);
    console.log("Message:", persistenceStatus.message);

    if (!isLiveDbAvailable) {
      console.warn(
        "[INTEGRATION AUDIT] Status: BLOCKED. No live local Supabase instance detected in .env.local."
      );
      console.warn(
        "[INTEGRATION AUDIT] Live database integration tests will be skipped as BLOCKED rather than passed as fake/mocked successes."
      );
      expect(persistenceStatus.isConfigured).toBe(false);
      expect(persistenceStatus.storageMode).toBe("in-memory-ephemeral");
    } else {
      console.log("[INTEGRATION AUDIT] Status: CONNECTED. Supabase PostgreSQL active.");
      expect(persistenceStatus.isConfigured).toBe(true);
      expect(persistenceStatus.storageMode).toBe("supabase");
    }
  });

  it("verifies createAdminClient strictly fails when credentials are placeholder only", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "...your-service-role-key";

    expect(() => createAdminClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL is not configured/);
  });

  it("extracts project reference dayswxpdkzzrjpjncqtt accurately without leaking keys", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dayswxpdkzzrjpjncqtt.supabase.co";
    const config = getSupabaseConfig();
    expect(config.projectRef).toBe("dayswxpdkzzrjpjncqtt");
    expect(config.isPlaceholderUrl).toBe(false);
  });

  it("checkSupabaseHealth cleanly returns NOT_CONFIGURED when credentials are placeholder", async () => {
    resetSupabaseHealthCache();
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dayswxpdkzzrjpjncqtt.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "...your-service-role-key-server-only";

    const health = await checkSupabaseHealth({ forceRefresh: true });
    expect(health.statusCode).toBe("NOT_CONFIGURED");
    expect(health.isConfigured).toBe(false);
    expect(health.isOnline).toBe(false);
    expect(health.message).toContain("Supabase credentials not configured in .env.local");
  });

  it("checkSupabaseHealth cleanly returns INVALID_CREDENTIALS when URL is malformed", async () => {
    resetSupabaseHealthCache();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-valid-url";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "valid-format-service-key-12345678";

    const health = await checkSupabaseHealth({ forceRefresh: true });
    expect(health.statusCode).toBe("INVALID_CREDENTIALS");
    expect(health.isConfigured).toBe(false);
  });

  it("ApiKeyService.getPersistenceStatusAsync returns structured status and caches responses", async () => {
    resetSupabaseHealthCache();
    const status1 = await ApiKeyService.getPersistenceStatusAsync({ forceRefresh: true });
    expect(status1.statusCode).toBeDefined();
    expect(typeof status1.message).toBe("string");

    // Second call without forceRefresh returns cached result
    const status2 = await ApiKeyService.getPersistenceStatusAsync();
    expect(status2.statusCode).toBe(status1.statusCode);
  });

  describe("NEW SUPABASE API KEY FORMAT SUPPORT (sb_secret_ & sb_publishable_)", () => {
    it("validates new secret key format (sb_secret_...) and rejects placeholders", () => {
      expect(isValidSecretKeyFormat("sb_secret_mock_test_key_0123456789abcdef")).toBe(true);
      expect(isValidSecretKeyFormat("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.header.signature")).toBe(true);
      expect(isValidSecretKeyFormat("...your-service-role-key-server-only")).toBe(false);
      expect(isValidSecretKeyFormat("placeholder")).toBe(false);
      expect(isValidSecretKeyFormat("")).toBe(false);
      expect(isValidSecretKeyFormat("short_key")).toBe(false);
    });

    it("validates new publishable key format (sb_publishable_...) and rejects placeholders", () => {
      expect(isValidPublishableKeyFormat("sb_publishable_mock_test_key_0123456789abcdef")).toBe(true);
      expect(isValidPublishableKeyFormat("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.header.signature")).toBe(true);
      expect(isValidPublishableKeyFormat("...your-anon-key")).toBe(false);
      expect(isValidPublishableKeyFormat("placeholder")).toBe(false);
      expect(isValidPublishableKeyFormat("")).toBe(false);
    });

    it("prefers SUPABASE_SECRET_KEY over legacy SUPABASE_SERVICE_ROLE_KEY when both exist", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dayswxpdkzzrjpjncqtt.supabase.co";
      process.env.SUPABASE_SECRET_KEY = "sb_secret_new_key_1234567890abcdef";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.legacy.sig";

      const config = getSupabaseConfig();
      expect(config.activeSecretVar).toBe("SUPABASE_SECRET_KEY");
      expect(config.isNewSecretFormat).toBe(true);
      expect(config.keyFormatValid).toBe(true);
    });

    it("prefers NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY over legacy NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dayswxpdkzzrjpjncqtt.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_new_key_1234567890abcdef";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.legacy.sig";

      const config = getSupabaseConfig();
      expect(config.activeClientVar).toBe("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
      expect(config.isNewPublishableFormat).toBe(true);
      expect(config.clientKeyFormatValid).toBe(true);
    });

    it("falls back to legacy variable names when new variable names are absent", () => {
      delete process.env.SUPABASE_SECRET_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.legacy.sig";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.legacy.sig";

      const config = getSupabaseConfig();
      expect(config.activeSecretVar).toBe("SUPABASE_SERVICE_ROLE_KEY");
      expect(config.activeClientVar).toBe("NEXT_PUBLIC_SUPABASE_ANON_KEY");
      expect(config.keyFormatValid).toBe(true);
    });

    it("createAdminClient instantiates client without error using new sb_secret_ key", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dayswxpdkzzrjpjncqtt.supabase.co";
      process.env.SUPABASE_SECRET_KEY = "sb_secret_test_0123456789abcdef012345";
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const client = createAdminClient();
      expect(client).toBeDefined();
      expect(client.from).toBeDefined();
    });
  });

  it("verifies database failure in production does not report successful persistence", async () => {
    (process.env as any).NODE_ENV = "production";

    // In production without configured database, creation must be rejected
    if (!isLiveDbAvailable) {
      expect(() =>
        ApiKeyService.createApiKey({
          name: "Prod Failure Test",
          userId: "usr_prod_test",
        })
      ).toThrow(/Persistent database storage is required in production environment/);

      await expect(
        ApiKeyService.createApiKeyAsync({
          name: "Prod Failure Test Async",
          userId: "usr_prod_test",
        })
      ).rejects.toThrow(/Persistent database storage is required in production environment/);
    }
  });

  // --- LIVE DATABASE INTEGRATION TESTS (RUN ONLY AGAINST LIVE SUPABASE INSTANCE) ---
  // When no local Supabase instance is configured, these are explicitly skipped as BLOCKED

  it.skipIf(!isLiveDbAvailable)(
    "BLOCKED: Key creation persists to live Supabase api_keys table",
    async () => {
      const result = await ApiKeyService.createApiKeyAsync({
        name: "Live Supabase Persistence Test",
        userId: "usr_live_test_1",
        environment: "live",
      });

      expect(result.record.persisted).toBe(true);

      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("id", result.record.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe("Live Supabase Persistence Test");
      expect(data.user_id).toBe("usr_live_test_1");
      expect(data.key_hash).toBe(result.record.keyHash);

      // Cleanup
      await supabase.from("api_keys").delete().eq("id", result.record.id);
    }
  );

  it.skipIf(!isLiveDbAvailable)(
    "BLOCKED: Key survives application restart (clearing in-memory cache)",
    async () => {
      const result = await ApiKeyService.createApiKeyAsync({
        name: "Restart Survival Key",
        userId: "usr_live_test_2",
        environment: "live",
      });

      expect(result.record.persisted).toBe(true);

      // Simulate complete server restart by wiping in-memory maps
      ApiKeyService.resetForTesting();

      // Now authenticate using raw secret against cold memory
      const auth = await ApiKeyService.authenticateKeyAsync(result.rawSecret);
      expect(auth.valid).toBe(true);
      expect(auth.record?.id).toBe(result.record.id);
      expect(auth.record?.persisted).toBe(true);

      // Cleanup
      const supabase = createAdminClient();
      await supabase.from("api_keys").delete().eq("id", result.record.id);
    }
  );

  it.skipIf(!isLiveDbAvailable)(
    "BLOCKED: Revoked keys stop authenticating against live database",
    async () => {
      const result = await ApiKeyService.createApiKeyAsync({
        name: "Revocation Test Key",
        userId: "usr_live_test_3",
      });

      // Revoke via ApiKeyService
      const revoked = await ApiKeyService.revokeKeyAsync(result.record.id, "usr_live_test_3");
      expect(revoked).toBe(true);

      // Clear memory to ensure DB state is queried
      ApiKeyService.resetForTesting();

      // Attempt to authenticate
      const auth = await ApiKeyService.authenticateKeyAsync(result.rawSecret);
      expect(auth.valid).toBe(false);
      expect(auth.error).toContain("revoked");

      // Cleanup
      const supabase = createAdminClient();
      await supabase.from("api_keys").delete().eq("id", result.record.id);
    }
  );

  it.skipIf(!isLiveDbAvailable)(
    "BLOCKED: Expired keys stop authenticating against live database",
    async () => {
      const supabase = createAdminClient();
      const rawSecret = "nx_live_0123456789abcdef0123456789abcdef";
      const keyHash = ApiKeyService.hashSecret(rawSecret);
      const expiredDate = new Date(Date.now() - 10000).toISOString();

      // Insert directly into Supabase with expired timestamp
      const { data, error } = await supabase
        .from("api_keys")
        .insert({
          id: "00000000-0000-0000-0000-000000000001",
          user_id: "usr_live_test_4",
          name: "Expired Key Test",
          key_prefix: "nx_live_0123...",
          key_hash: keyHash,
          environment: "live",
          scopes: ["models:read"],
          rate_limit: 60,
          expires_at: expiredDate,
        })
        .select()
        .single();

      expect(error).toBeNull();

      // Wipe memory
      ApiKeyService.resetForTesting();

      // Authenticate
      const auth = await ApiKeyService.authenticateKeyAsync(rawSecret);
      expect(auth.valid).toBe(false);
      expect(auth.error).toContain("expired");

      // Cleanup
      await supabase.from("api_keys").delete().eq("id", data.id);
    }
  );

  it.skipIf(!isLiveDbAvailable)(
    "BLOCKED: Multi-tenant isolation: User A cannot access User B's keys in live database",
    async () => {
      const keyA = await ApiKeyService.createApiKeyAsync({
        name: "User A Key",
        userId: "usr_tenant_A",
      });

      const keyB = await ApiKeyService.createApiKeyAsync({
        name: "User B Key",
        userId: "usr_tenant_B",
      });

      // User A lists keys
      const userAKeys = await ApiKeyService.getKeysAsync("usr_tenant_A");
      const userAKeyIds = userAKeys.map((k) => k.id);

      expect(userAKeyIds).toContain(keyA.record.id);
      expect(userAKeyIds).not.toContain(keyB.record.id);

      // User A tries to revoke User B's key
      const maliciousRevoke = await ApiKeyService.revokeKeyAsync(keyB.record.id, "usr_tenant_A");
      expect(maliciousRevoke).toBe(false);

      // Cleanup
      const supabase = createAdminClient();
      await supabase.from("api_keys").delete().in("id", [keyA.record.id, keyB.record.id]);
    }
  );

  it.skipIf(!isLiveDbAvailable)(
    "BLOCKED: Usage belongs to the correct user and API key in live database",
    async () => {
      const key = await ApiKeyService.createApiKeyAsync({
        name: "Usage Tracking Key",
        userId: "usr_usage_test",
      });

      await ApiKeyService.recordUsageAsync(key.record.id, "/api/v1/lyrics/generations", 200, 5, {
        userId: "usr_usage_test",
        requestId: "req_test_usage_1",
      });

      // Clear memory to force DB fetch
      ApiKeyService.resetForTesting();

      const summary = await ApiKeyService.getUsageSummaryAsync("usr_usage_test", key.record.id);
      expect(summary.totalRequests).toBeGreaterThanOrEqual(1);
      expect(summary.totalUnits).toBeGreaterThanOrEqual(5);

      // Cleanup
      const supabase = createAdminClient();
      await supabase.from("api_usage").delete().eq("api_key_id", key.record.id);
      await supabase.from("api_keys").delete().eq("id", key.record.id);
    }
  );
});
