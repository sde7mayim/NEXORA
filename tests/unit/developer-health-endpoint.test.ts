import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET } from "@/app/api/developer/health/route";
import { NextRequest } from "next/server";
import * as adminModule from "@/lib/supabase/admin";

describe("Developer Platform Health Endpoint (/api/developer/health)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    adminModule.resetSupabaseHealthCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("should return standard health payload without exposing secrets", async () => {
    const req = new NextRequest("http://localhost:3000/api/developer/health");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty("connected");
    expect(typeof data.connected).toBe("boolean");
    expect(data).toHaveProperty("status");
    expect(typeof data.status).toBe("string");
    expect(data).toHaveProperty("statusCode");
    expect(typeof data.statusCode).toBe("string");
    expect(data).toHaveProperty("message");
    expect(typeof data.message).toBe("string");
    expect(data).toHaveProperty("checkedAt");

    // Redaction check: ensure secret key values and sensitive credentials are not in JSON
    const bodyText = JSON.stringify(data);
    expect(bodyText).not.toContain("sb_secret_");
    expect(bodyText).not.toContain("sb_publishable_");
    expect(bodyText).not.toContain("service_role");
    expect(bodyText).not.toMatch(/eyJ[a-zA-Z0-9_-]{20,}/); // JWT token format

    // Cache-Control headers
    const cacheControl = res.headers.get("Cache-Control");
    expect(cacheControl).toContain("no-store");
  });

  it("should handle forceRefresh parameter ?refresh=true", async () => {
    const spyReset = vi.spyOn(adminModule, "resetSupabaseHealthCache");
    const req = new NextRequest("http://localhost:3000/api/developer/health?refresh=true");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(spyReset).toHaveBeenCalled();
  });

  it("should return connected=true and status='connected' when health check returns CONNECTED", async () => {
    vi.spyOn(adminModule, "checkSupabaseHealth").mockResolvedValueOnce({
      statusCode: "CONNECTED",
      isConfigured: true,
      migrationReady: true,
      isOnline: true,
      message: "Live PostgreSQL connected (dayswxpdkzzrjpjncqtt). RLS enforced.",
      projectRef: "dayswxpdkzzrjpjncqtt",
      tables: { apiKeys: true, apiUsage: true },
      checkedAt: new Date().toISOString(),
    });

    const req = new NextRequest("http://localhost:3000/api/developer/health");
    const res = await GET(req);
    const data = await res.json();

    expect(data.connected).toBe(true);
    expect(data.status).toBe("connected");
    expect(data.statusCode).toBe("CONNECTED");
    expect(data.projectRef).toBe("dayswxpdkzzrjpjncqtt");
    expect(data.tables).toEqual({ apiKeys: true, apiUsage: true });
  });

  it("should return connected=false and status='disconnected' when database is unavailable", async () => {
    vi.spyOn(adminModule, "checkSupabaseHealth").mockResolvedValueOnce({
      statusCode: "DATABASE_UNAVAILABLE",
      isConfigured: true,
      migrationReady: false,
      isOnline: false,
      message: "Supabase connection failed: getaddrinfo ENOTFOUND",
      details: "Network connection refused",
      projectRef: "dayswxpdkzzrjpjncqtt",
      tables: { apiKeys: false, apiUsage: false },
      checkedAt: new Date().toISOString(),
    });

    const req = new NextRequest("http://localhost:3000/api/developer/health");
    const res = await GET(req);
    const data = await res.json();

    expect(data.connected).toBe(false);
    expect(data.status).toBe("disconnected");
    expect(data.statusCode).toBe("DATABASE_UNAVAILABLE");
    expect(data.details).toBe("Network connection refused");
  });

  it("should return connected=false and status='auth_failure' when authentication fails", async () => {
    vi.spyOn(adminModule, "checkSupabaseHealth").mockResolvedValueOnce({
      statusCode: "AUTHENTICATION_FAILURE",
      isConfigured: true,
      migrationReady: false,
      isOnline: false,
      message: "Supabase authentication failed: Invalid API key",
      checkedAt: new Date().toISOString(),
    });

    const req = new NextRequest("http://localhost:3000/api/developer/health");
    const res = await GET(req);
    const data = await res.json();

    expect(data.connected).toBe(false);
    expect(data.status).toBe("auth_failure");
    expect(data.statusCode).toBe("AUTHENTICATION_FAILURE");
  });

  it("should catch unexpected exceptions gracefully without crashing", async () => {
    vi.spyOn(adminModule, "checkSupabaseHealth").mockRejectedValueOnce(
      new Error("Unexpected internal crash")
    );

    const req = new NextRequest("http://localhost:3000/api/developer/health");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.connected).toBe(false);
    expect(data.status).toBe("error");
    expect(data.message).toContain("Unexpected internal crash");
  });
});
