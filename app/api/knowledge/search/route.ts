import { NextRequest, NextResponse } from "next/server";
import { KnowledgeService } from "@/lib/knowledge/knowledge-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      collectionIds,
      query,
      userId = "usr_alex",
      orgId = "ws-default",
      topK = 5,
    } = body;

    if (!collectionIds || !Array.isArray(collectionIds) || collectionIds.length === 0) {
      return NextResponse.json({ error: "collectionIds array is required." }, { status: 400 });
    }

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query string is required." }, { status: 400 });
    }

    const citations = KnowledgeService.search({
      collectionIds,
      query,
      requestingUserId: userId,
      requestingOrgId: orgId,
      topK,
    });

    return NextResponse.json({ query, citations, totalFound: citations.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
