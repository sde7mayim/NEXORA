import { NextRequest, NextResponse } from "next/server";
import { AuditLogger } from "@/lib/audit/logger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || "ws-default";
    const action = searchParams.get("action") || undefined;
    const actorEmail = searchParams.get("actor") || undefined;
    const format = searchParams.get("format") || "json";

    if (format === "csv") {
      const csv = AuditLogger.exportCsv(orgId);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="audit_log_${orgId}.csv"`,
        },
      });
    }

    const records = AuditLogger.search({ orgId, action, actorEmail, limit: 100 });
    return NextResponse.json({ records, total: records.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
