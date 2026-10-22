import { NextRequest, NextResponse } from "next/server";
import { WorkflowEngine } from "@/lib/workflows/workflow-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "usr_alex";
    const orgId = searchParams.get("orgId") || "ws-default";

    const workflows = WorkflowEngine.getWorkflows(userId, orgId);
    return NextResponse.json({ workflows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, steps, toolAllowlist, userId = "usr_alex", orgId = "ws-default" } = body;

    if (!name || !steps) {
      return NextResponse.json({ error: "Missing required fields: name and steps." }, { status: 400 });
    }

    const workflow = WorkflowEngine.saveWorkflow({
      name,
      description: description || "",
      steps,
      toolAllowlist,
      userId,
      orgId,
    });

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
