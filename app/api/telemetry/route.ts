import { NextRequest, NextResponse } from "next/server";
import { TelemetryLogger } from "@/lib/telemetry/logger";
import { CircuitBreaker } from "@/lib/ai/circuit-breaker";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

  const metrics = TelemetryLogger.getMetricsSummary();
  const recentEvents = TelemetryLogger.getRecentEvents(limit);
  const circuitStatuses = CircuitBreaker.getAllStatuses();

  return NextResponse.json({
    metrics,
    circuitStatuses,
    events: recentEvents,
  });
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { action, providerKey } = json;

    if (action === "reset_circuit" && providerKey) {
      CircuitBreaker.reset(providerKey);
      return NextResponse.json({ success: true, message: `Circuit for '${providerKey}' reset to CLOSED.` });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
