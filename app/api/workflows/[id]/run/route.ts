import { NextRequest, NextResponse } from "next/server";
import { WorkflowEngine } from "@/lib/workflows/workflow-engine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id;
    const body = await req.json().catch(() => ({}));
    const { input = {}, userId = "usr_alex", orgId = "ws-default", userPlan = "enterprise" } = body;

    const runState = await WorkflowEngine.executeWorkflow({
      workflowId,
      initialInput: input,
      userId,
      orgId,
      userPlan,
    });

    return NextResponse.json({ run: runState });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
