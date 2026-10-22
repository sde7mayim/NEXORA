import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EvaluationRunner } from "@/lib/evaluations/runner";

const RunEvalSchema = z.object({
  modelId: z.string().min(1),
  useSimulation: z.boolean().default(true),
});

export async function GET() {
  const reports = EvaluationRunner.getPastReports();
  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = RunEvalSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid evaluation request", details: parsed.error.format() }, { status: 400 });
    }

    const { modelId, useSimulation } = parsed.data;
    const report = await EvaluationRunner.runBenchmark(modelId, { useSimulation });

    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
