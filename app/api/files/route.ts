import { NextRequest, NextResponse } from "next/server";
import { FileProcessingService } from "@/lib/files/file-validator";
import { PlanTier } from "@/lib/entitlements/types";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const planTier = (formData.get("planTier") as PlanTier) || "free";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1. Plan Size Limits
    const sizeCheck = FileProcessingService.validateFileSize(file.size, planTier);
    if (!sizeCheck.valid) {
      return NextResponse.json({ error: sizeCheck.error }, { status: 413 });
    }

    // 2. Magic Bytes Inspection
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const magicCheck = FileProcessingService.validateMagicBytes(uint8, file.name);

    if (!magicCheck.valid) {
      return NextResponse.json({ error: magicCheck.error }, { status: 400 });
    }

    // 3. Document Text Extraction
    const extractedText = FileProcessingService.extractTextFromBuffer(uint8, file.name);

    return NextResponse.json({
      fileId: `fil_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: magicCheck.detectedMimeType || file.type || "application/octet-stream",
      status: "ready",
      extractedSnippet: extractedText.substring(0, 500),
      totalLength: extractedText.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "File processing error" },
      { status: 500 }
    );
  }
}
