import { NextRequest, NextResponse } from "next/server";
import { KnowledgeService } from "@/lib/knowledge/knowledge-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { collectionId, title, sourceType = "text", sourceUri, rawText, url } = body;

    if (!collectionId || !title) {
      return NextResponse.json({ error: "collectionId and title are required." }, { status: 400 });
    }

    let textContent = rawText || "";

    if (sourceType === "url" && url) {
      textContent = await KnowledgeService.ingestUrlContent(url);
    }

    if (!textContent) {
      return NextResponse.json({ error: "Document content is empty or could not be retrieved." }, { status: 400 });
    }

    const result = KnowledgeService.indexDocument({
      collectionId,
      title,
      sourceType,
      sourceUri: sourceUri || url,
      rawText: textContent,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("id");
    const userId = searchParams.get("userId") || "usr_alex";
    const orgId = searchParams.get("orgId") || "ws-default";

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required." }, { status: 400 });
    }

    KnowledgeService.deleteDocument(documentId, userId, orgId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
