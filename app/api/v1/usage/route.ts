import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-keys/auth-middleware";
import { ApiKeyService } from "@/lib/developer/api-keys";

export async function GET(req: NextRequest) {
  // 1. Authenticate with usage:read scope
  const auth = await authenticateApiRequest(req, { requiredScope: "usage:read" });
  if (!auth.success) {
    return auth.response;
  }

  const { context } = auth;
  const { searchParams } = new URL(req.url);
  const targetKeyId = searchParams.get("key_id") || context.apiKey.id;

  // 2. Multi-tenant isolation: verify targetKeyId belongs to this user
  const userKeys = await ApiKeyService.getKeysAsync(context.userId);
  const userKeyIds = new Set(userKeys.map((k) => k.id));

  if (targetKeyId && !userKeyIds.has(targetKeyId)) {
    return NextResponse.json(
      {
        error: {
          message: "API key not found or does not belong to authenticated user.",
          type: "invalid_request_error",
          code: "key_not_found",
        },
      },
      { status: 404, headers: auth.headers }
    );
  }

  // 3. Compute usage summary for the user / key from persistent store
  const summary = await ApiKeyService.getUsageSummaryAsync(context.userId, targetKeyId);

  return NextResponse.json(
    {
      object: "usage.summary",
      user_id: context.userId,
      api_key_id: targetKeyId,
      environment: context.environment,
      metrics: {
        total_requests: summary.totalRequests,
        total_units: summary.totalUnits,
        successful_requests: summary.successfulRequests,
        error_requests: summary.errorRequests,
        success_rate_percent: summary.successRate,
      },
      recent_requests: summary.recentEvents,
    },
    {
      status: 200,
      headers: auth.headers,
    }
  );
}
