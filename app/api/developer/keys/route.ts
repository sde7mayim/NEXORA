import { NextRequest, NextResponse } from "next/server";
import { ApiKeyService, ApiKeyScope, ApiKeyEnvironment } from "@/lib/developer/api-keys";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Resolves the authenticated user ID from the active Supabase session.
 * In production, strictly requires a verified session.
 * In development/test mode, falls back to the requested user ID or default.
 */
async function resolveAuthenticatedUserId(
  req: NextRequest,
  fallbackUserId?: string | null
): Promise<{ userId: string | null; isAuthenticated: boolean }> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      // Return canonical Supabase Auth UUID
      return { userId: user.id, isAuthenticated: true };
    }
  } catch (err) {
    // Supabase auth lookup failed or unconfigured
  }

  // Check if running in production
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    return { userId: null, isAuthenticated: false };
  }

  // Development/Test fallback: Allow explicit user ID or default
  const devUserId = fallbackUserId?.trim() || "usr_alex";
  return { userId: devUserId, isAuthenticated: false };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedUser = searchParams.get("userId");
    const orgId = searchParams.get("orgId") || "ws-default";

    const { userId, isAuthenticated } = await resolveAuthenticatedUserId(req, requestedUser);

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required to view API keys.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const keys = await ApiKeyService.getKeysAsync(userId, orgId);
    const summary = await ApiKeyService.getUsageSummaryAsync(userId);
    const persistence = await ApiKeyService.getPersistenceStatusAsync({
      forceRefresh: searchParams.get("refresh") === "true",
    });
    const rateLimiting = ApiKeyService.getRateLimitingStatus();

    return NextResponse.json({
      keys,
      summary,
      persistence,
      rateLimiting,
      authenticated: isAuthenticated,
      userId,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const {
      name,
      environment = "live",
      scopes,
      rateLimit,
      expiresInDays,
      userId: bodyUserId,
      orgId = "ws-default",
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Key name is required." }, { status: 400 });
    }

    const { userId, isAuthenticated } = await resolveAuthenticatedUserId(req, bodyUserId);

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required to create API keys.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const persistence = ApiKeyService.getPersistenceStatus();
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction && !persistence.isConfigured) {
      return NextResponse.json(
        {
          error:
            "API key creation rejected: Persistent database storage is required in production environment. Supabase credentials are missing or unreachable.",
          code: "PERSISTENCE_REQUIRED",
        },
        { status: 503 }
      );
    }

    // Always use the resolved canonical userId (prevents user impersonation)
    const result = await ApiKeyService.createApiKeyAsync({
      name: name.trim(),
      environment: (environment === "test" ? "test" : "live") as ApiKeyEnvironment,
      scopes: scopes as ApiKeyScope[],
      rateLimit: rateLimit ? Number(rateLimit) : undefined,
      expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
      userId,
      orgId,
    });

    // Sanitized record: Never expose keyHash in API response
    const sanitizedRecord = ApiKeyService.sanitizeRecord(result.record);

    return NextResponse.json(
      {
        record: sanitizedRecord,
        rawSecret: result.rawSecret,
        warning: result.warning,
        persistence: ApiKeyService.getPersistenceStatus(),
        authenticated: isAuthenticated,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get("id");
    const queryUserId = searchParams.get("userId");

    if (!keyId) {
      return NextResponse.json({ error: "keyId is required." }, { status: 400 });
    }

    const { userId } = await resolveAuthenticatedUserId(req, queryUserId);

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required to revoke API keys.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Strictly enforce ownership check: only the owner can revoke their key
    const revoked = await ApiKeyService.revokeKeyAsync(keyId, userId);
    if (!revoked) {
      return NextResponse.json(
        { error: "Key not found or not authorized to revoke." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, revoked });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
