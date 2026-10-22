import { NextRequest, NextResponse } from "next/server";
import { WorkspaceService } from "@/lib/workspaces/workspace-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "usr_alex";
    const workspaces = WorkspaceService.getUserWorkspaces(userId);
    return NextResponse.json({ workspaces });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, userId = "usr_alex", userEmail = "alex@acme.com", userName = "Alex Rivera" } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Missing required fields: name and slug." }, { status: 400 });
    }

    const result = WorkspaceService.createWorkspace({
      name,
      slug,
      creatorUserId: userId,
      creatorEmail: userEmail,
      creatorName: userName,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
