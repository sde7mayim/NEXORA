import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiRequest } from "@/lib/api-keys/auth-middleware";
import { ApiKeyService, ApiKeyScope, ApiKeyEnvironment } from "@/lib/developer/api-keys";

const CreateKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  environment: z.enum(["live", "test"]).optional().default("live"),
  scopes: z.array(z.string()).optional(),
  rate_limit: z.number().int().min(5).max(1000).optional(),
  expires_in_days: z.number().int().min(1).max(365).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req, { requiredScope: "keys:manage" });
  if (!auth.success) {
    return auth.response;
  }

  // Strictly enforce user isolation: return ONLY the authenticated user's keys from persistent store
  const keys = await ApiKeyService.getKeysAsync(auth.context.userId);
  return NextResponse.json(
    { object: "list", data: keys },
    { headers: auth.headers }
  );
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req, { requiredScope: "keys:manage" });
  if (!auth.success) {
    return auth.response;
  }

  try {
    let rawBody: any;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: { message: "Invalid JSON request body.", type: "invalid_request_error" } },
        { status: 400, headers: auth.headers }
      );
    }

    const parseResult = CreateKeySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            message: parseResult.error.errors.map((e) => e.message).join(", "),
            type: "invalid_request_error",
          },
        },
        { status: 400, headers: auth.headers }
      );
    }

    const { name, environment, scopes, rate_limit, expires_in_days } = parseResult.data;

    const persistence = ApiKeyService.getPersistenceStatus();
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction && !persistence.isConfigured) {
      return NextResponse.json(
        {
          error: {
            message:
              "API key creation rejected: Persistent database storage is required in production environment. Supabase credentials (SUPABASE_SERVICE_ROLE_KEY) are not configured or unreachable.",
            type: "configuration_error",
            code: "PERSISTENCE_REQUIRED",
          },
        },
        { status: 503, headers: auth.headers }
      );
    }

    const result = await ApiKeyService.createApiKeyAsync({
      name,
      userId: auth.context.userId,
      environment: environment as ApiKeyEnvironment,
      scopes: scopes as ApiKeyScope[],
      rateLimit: rate_limit,
      expiresInDays: expires_in_days,
    });

    // Sanitized record: NEVER expose keyHash over the wire
    const sanitizedKey = ApiKeyService.sanitizeRecord(result.record);

    return NextResponse.json(
      {
        object: "api_key",
        key: sanitizedKey,
        secret: result.rawSecret,
        persisted: result.record.persisted ?? false,
        warning: result.warning || "Make sure to copy your API key now. You will not be able to see it again.",
      },
      { status: 201, headers: auth.headers }
    );
  } catch (err) {
    return NextResponse.json(
      { error: { message: (err as Error).message, type: "api_error" } },
      { status: 400, headers: auth.headers }
    );
  }
}
