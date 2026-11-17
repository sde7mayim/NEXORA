import { NextRequest, NextResponse } from "next/server";
import { checkSupabaseHealth, resetSupabaseHealthCache } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    if (forceRefresh) {
      resetSupabaseHealthCache();
    }

    const health = await checkSupabaseHealth({ forceRefresh });

    const isConnected = health.statusCode === "CONNECTED";
    let statusLabel = "disconnected";

    switch (health.statusCode) {
      case "CONNECTED":
        statusLabel = "connected";
        break;
      case "SCHEMA_NOT_READY":
        statusLabel = "schema_pending";
        break;
      case "AUTHENTICATION_FAILURE":
        statusLabel = "auth_failure";
        break;
      case "NOT_CONFIGURED":
        statusLabel = "not_configured";
        break;
      case "INVALID_CREDENTIALS":
        statusLabel = "invalid_credentials";
        break;
      default:
        statusLabel = "disconnected";
    }

    return NextResponse.json(
      {
        connected: isConnected,
        status: statusLabel,
        statusCode: health.statusCode,
        message: health.message,
        details: health.details,
        projectRef: health.projectRef,
        isConfigured: health.isConfigured,
        isOnline: health.isOnline,
        migrationReady: health.migrationReady,
        tables: health.tables || { apiKeys: false, apiUsage: false },
        checkedAt: health.checkedAt,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        connected: false,
        status: "error",
        statusCode: "DATABASE_UNAVAILABLE",
        message: `Health check error: ${err?.message || "Unknown error"}`,
        checkedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
