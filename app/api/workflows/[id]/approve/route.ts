import { NextRequest, NextResponse } from "next/server";
import { WorkflowEngine } from "@/lib/workflows/workflow-engine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const runId = params.id;
    const body = await req.json();
    const { stepId, approverRole = "admin" } = body;

    if (!stepId) {
      return NextResponse.json({ error: "stepId is required." }, { status: 400 });
    }

    const updatedRun = await WorkflowEngine.approveStep(runId, stepId, approverRole);
    return NextResponse.json({ run: updatedRun });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
