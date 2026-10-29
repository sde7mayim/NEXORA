import { NextRequest, NextResponse } from "next/server";
import { FileProcessingService } from "@/lib/files/file-validator";
import { DocumentParser } from "@/lib/files/document-parser";
import { ConversationDocumentStore } from "@/lib/files/document-store";
import { PlanTier } from "@/lib/entitlements/types";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const planTier = (formData.get("planTier") as PlanTier) || "free";
    const conversationId = (formData.get("conversationId") as string) || "conv-default";
    const userId = (formData.get("userId") as string) || "guest";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1. Plan Size Limits
    const sizeCheck = FileProcessingService.validateFileSize(file.size, planTier);
    if (!sizeCheck.valid) {
      return NextResponse.json({ error: sizeCheck.error }, { status: 413 });
    }

    // 2. Binary Signature & Security Inspection
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const magicCheck = FileProcessingService.validateMagicBytes(uint8, file.name);

    if (!magicCheck.valid) {
      return NextResponse.json({ error: magicCheck.error }, { status: 400 });
    }

    // 3. Document Parsing & Structure Extraction
    const parsed = DocumentParser.parse(uint8, file.name);

    // 4. Store in Conversation Document Store for Active Retrieval
    const doc = ConversationDocumentStore.addDocument({
      conversationId,
      userId,
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: magicCheck.detectedMimeType || parsed.mimeType || file.type || "application/octet-stream",
      fileType: parsed.fileType,
      fullText: parsed.fullText,
      summary: parsed.summary,
      structure: parsed.structure,
    });

    return NextResponse.json({
      fileId: doc.id,
      fileName: doc.fileName,
      fileSizeBytes: doc.fileSizeBytes,
      mimeType: doc.mimeType,
      fileType: doc.fileType,
      status: "ready",
      summary: doc.summary,
      extractedSnippet: doc.fullText.substring(0, 500),
      totalLength: doc.fullText.length,
      fullText: doc.fullText,
      structure: {
        headings: doc.structure.headings,
        sectionsCount: doc.structure.sections.length,
        wordCount: doc.structure.wordCount,
        lineCount: doc.structure.lineCount,
        tablesCount: doc.structure.tablesCount,
        listsCount: doc.structure.listsCount,
      },
      version: doc.version,
      warning: parsed.warning,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "File processing error" },
      { status: 500 }
    );
  }
}
