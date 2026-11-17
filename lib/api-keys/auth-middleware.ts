/**
 * NEXORA API AUTHENTICATION MIDDLEWARE
 *
 * Reusable authentication & authorization utility for versioned Nexora API endpoints.
 * Enforces:
 * 1. Bearer token extraction & format validation
 * 2. Constant-time cryptographic hash verification
 * 3. Key revocation & expiration checks
 * 4. Granular scope permissions (e.g. keys:manage, lyrics:generate, etc.)
 * 5. Sliding-window rate limiting with standard RFC headers (returns HTTP 429)
 * 6. Audit & usage logging
 */

import { NextRequest, NextResponse } from "next/server";
import { ApiKeyRecord, ApiKeyScope, ApiKeyService, RateLimitCheckResult } from "@/lib/developer/api-keys";
import crypto from "crypto";

export interface AuthenticatedApiContext {
  apiKey: ApiKeyRecord;
  userId: string;
  environment: "live" | "test";
  scopes: ApiKeyScope[];
  correlationId: string;
  startTime: number;
  rateLimitInfo?: RateLimitCheckResult;
}

export type ApiAuthCheckResult =
  | { success: true; context: AuthenticatedApiContext; headers: Record<string, string> }
  | { success: false; response: NextResponse; statusCode: number; errorMessage: string };

/**
 * Extracts and authenticates Nexora API key from standard headers
 */
export async function authenticateApiRequest(
  req: NextRequest,
  options?: {
    requiredScope?: ApiKeyScope;
  }
): Promise<ApiAuthCheckResult> {
  const correlationId = `req_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const startTime = Date.now();

  // 1. Extract API key from Authorization header or x-api-key
  let rawKey = "";
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.trim()) {
    rawKey = authHeader.replace(/^Bearer\s+/i, "").trim();
  } else {
    const xApiKey = req.headers.get("x-api-key");
    if (xApiKey && xApiKey.trim()) {
      rawKey = xApiKey.trim();
    }
  }

  if (!rawKey) {
    const response = NextResponse.json(
      {
        error: {
          message: "Missing API key. Provide your Nexora API key in the Authorization header: 'Authorization: Bearer nx_live_...'",
          type: "authentication_error",
          code: "missing_api_key",
        },
      },
      {
        status: 401,
        headers: {
          "x-correlation-id": correlationId,
          "www-authenticate": 'Bearer realm="Nexora API"',
        },
      }
    );
    return { success: false, response, statusCode: 401, errorMessage: "Missing API key" };
  }

  // 2. Validate against ApiKeyService (asynchronously checks Supabase on cache miss)
  const authResult = await ApiKeyService.authenticateKeyAsync(rawKey, options?.requiredScope);

  // Standard rate limit headers
  const rateLimitHeaders: Record<string, string> = {
    "x-correlation-id": correlationId,
  };

  if (authResult.rateLimitInfo) {
    rateLimitHeaders["x-ratelimit-limit"] = String(authResult.rateLimitInfo.limit);
    rateLimitHeaders["x-ratelimit-remaining"] = String(authResult.rateLimitInfo.remaining);
    rateLimitHeaders["x-ratelimit-reset"] = String(authResult.rateLimitInfo.reset);
  }

  if (!authResult.valid || !authResult.record) {
    const status = authResult.statusCode || 401;
    let errorCode = "invalid_api_key";
    let errorType = "authentication_error";

    if (status === 403) {
      errorCode = "insufficient_scope";
      errorType = "permission_error";
    } else if (status === 429) {
      errorCode = "rate_limit_exceeded";
      errorType = "rate_limit_error";
      if (authResult.rateLimitInfo?.retryAfterSeconds) {
        rateLimitHeaders["retry-after"] = String(authResult.rateLimitInfo.retryAfterSeconds);
      }
    }

    const response = NextResponse.json(
      {
        error: {
          message: authResult.error || "Authentication failed.",
          type: errorType,
          code: errorCode,
        },
      },
      {
        status,
        headers: rateLimitHeaders,
      }
    );

    return {
      success: false,
      response,
      statusCode: status,
      errorMessage: authResult.error || "Authentication failed",
    };
  }

  return {
    success: true,
    headers: rateLimitHeaders,
    context: {
      apiKey: authResult.record,
      userId: authResult.record.userId,
      environment: authResult.record.environment,
      scopes: authResult.record.scopes,
      correlationId,
      startTime,
      rateLimitInfo: authResult.rateLimitInfo,
    },
  };
}

/**
 * Helper to record usage metrics at the end of an API route handler
 */
export function recordRequestUsage(
  context: AuthenticatedApiContext,
  endpoint: string,
  statusCode: number,
  usageUnits: number,
  meta?: { provider?: string; model?: string }
): void {
  ApiKeyService.recordUsage(context.apiKey.id, endpoint, statusCode, usageUnits, {
    userId: context.userId,
    requestId: context.correlationId,
    provider: meta?.provider,
    model: meta?.model,
  });
}
