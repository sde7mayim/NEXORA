import { describe, it, expect } from "vitest";
import { FileProcessingService } from "@/lib/files/file-validator";

describe("File Validation & Security Pipeline", () => {
  it("should enforce plan tier file size bounds", () => {
    // 4 MB file on Free tier (limit: 5 MB) -> valid
    const freeOk = FileProcessingService.validateFileSize(4 * 1024 * 1024, "free");
    expect(freeOk.valid).toBe(true);

    // 6 MB file on Free tier -> invalid
    const freeExceeded = FileProcessingService.validateFileSize(6 * 1024 * 1024, "free");
    expect(freeExceeded.valid).toBe(false);
    expect(freeExceeded.error).toContain("exceeds your Free Starter limit");

    // 20 MB file on Pro tier (limit: 25 MB) -> valid
    const proOk = FileProcessingService.validateFileSize(20 * 1024 * 1024, "pro");
    expect(proOk.valid).toBe(true);
  });

  it("should reject Windows executable (MZ header) even with spoofed .pdf extension", () => {
    // Binary starting with MZ (0x4D, 0x5A)
    const dangerousBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
    const res = FileProcessingService.validateMagicBytes(dangerousBytes, "report.pdf");
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Executable binary detected");
  });

  it("should reject Linux executable (ELF header)", () => {
    // Binary starting with 0x7F 'E' 'L' 'F'
    const elfBytes = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01]);
    const res = FileProcessingService.validateMagicBytes(elfBytes, "data.txt");
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Linux binary detected");
  });

  it("should accept valid PDF header signature (%PDF-)", () => {
    // %PDF- (0x25, 0x50, 0x44, 0x46)
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const res = FileProcessingService.validateMagicBytes(pdfBytes, "document.pdf");
    expect(res.valid).toBe(true);
    expect(res.detectedMimeType).toBe("application/pdf");
  });

  it("should extract UTF-8 text from markdown and plain text files", () => {
    const text = "# Technical Specification\nMulti-model AI architecture.";
    const encoder = new TextEncoder();
    const buffer = encoder.encode(text);

    const extracted = FileProcessingService.extractTextFromBuffer(buffer, "spec.md");
    expect(extracted).toBe(text);
  });
});
