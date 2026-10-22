import { NextRequest, NextResponse } from "next/server";
import { KnowledgeService } from "@/lib/knowledge/knowledge-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "usr_alex";
    const orgId = searchParams.get("orgId") || "ws-default";

    const collections = KnowledgeService.getCollections(userId, orgId);
    return NextResponse.json({ collections });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description = "",
      isWorkspaceShared = false,
      userId = "usr_alex",
      orgId = "ws-default",
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Collection name is required." }, { status: 400 });
    }

    const collection = KnowledgeService.createCollection({
      name,
      description,
      isWorkspaceShared,
      userId,
      orgId,
    });

    return NextResponse.json({ collection }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
