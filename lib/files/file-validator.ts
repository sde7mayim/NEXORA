import { PLAN_CONFIGS, PlanTier } from "../entitlements/types";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedMimeType?: string;
}

export class FileProcessingService {
  private static ALLOWED_EXTENSIONS = [
    ".pdf", ".docx", ".doc", ".txt", ".md", ".csv", ".xlsx", ".xls",
    ".json", ".xml", ".yaml", ".yml",
    ".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".c", ".cpp", ".cs", ".go", ".rs", ".sql", ".html", ".css",
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg",
    ".mp3", ".wav", ".m4a", ".ogg",
    ".mp4", ".webm",
    ".zip", ".tar", ".gz"
  ];

  /**
   * Validates file size against user plan entitlements.
   */
  static validateFileSize(sizeBytes: number, planTier: PlanTier): { valid: boolean; error?: string } {
    const plan = PLAN_CONFIGS[planTier];
    const maxBytes = plan.maxFileSizeMB * 1024 * 1024;

    if (sizeBytes > maxBytes) {
      return {
        valid: false,
        error: `File size (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds your ${plan.displayName} limit of ${plan.maxFileSizeMB} MB.`,
      };
    }

    return { valid: true };
  }

  /**
   * Inspects magic bytes to detect malicious executables and verify document integrity.
   */
  static validateMagicBytes(buffer: Uint8Array, fileName: string): FileValidationResult {
    const lowerName = fileName.toLowerCase();
    const hasAllowedExt = this.ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

    if (!hasAllowedExt) {
      return {
        valid: false,
        error: `File extension not supported. Allowed formats: PDF, DOCX, CSV, spreadsheets, code, JSON, media, and archives.`,
      };
    }

    // Check for dangerous executable signatures (MZ for Windows PE / EXE / DLL)
    if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
      return {
        valid: false,
        error: "Executable binary detected. Executable files are prohibited for security.",
      };
    }

    // Check for ELF executable header (0x7F 'E' 'L' 'F')
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x7f &&
      buffer[1] === 0x45 &&
      buffer[2] === 0x4c &&
      buffer[3] === 0x46
    ) {
      return {
        valid: false,
        error: "Linux binary detected. Executables are prohibited for security.",
      };
    }

    // Verify PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46)
    if (lowerName.endsWith(".pdf")) {
      if (
        buffer.length >= 4 &&
        buffer[0] === 0x25 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x44 &&
        buffer[3] === 0x46
      ) {
        return { valid: true, detectedMimeType: "application/pdf" };
      }
      return {
        valid: false,
        error: "File has a .pdf extension but lacks a valid PDF header signature.",
      };
    }

    // Verify DOCX (ZIP archive: PK 0x03 0x04)
    if (lowerName.endsWith(".docx")) {
      if (
        buffer.length >= 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04
      ) {
        return {
          valid: true,
          detectedMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };
      }
      return {
        valid: false,
        error: "File has a .docx extension but lacks a valid OpenXML archive signature.",
      };
    }

    // Plaintext, Markdown, CSV
    if (
      lowerName.endsWith(".txt") ||
      lowerName.endsWith(".md") ||
      lowerName.endsWith(".csv")
    ) {
      return { valid: true, detectedMimeType: "text/plain" };
    }

    return { valid: true };
  }

  /**
   * Extracts text safely from raw text, Markdown, or CSV.
   */
  static extractTextFromBuffer(buffer: Uint8Array, fileName: string): string {
    const lowerName = fileName.toLowerCase();

    if (
      lowerName.endsWith(".txt") ||
      lowerName.endsWith(".md") ||
      lowerName.endsWith(".csv")
    ) {
      const decoder = new TextDecoder("utf-8");
      return decoder.decode(buffer);
    }

    if (lowerName.endsWith(".pdf")) {
      // In production pipeline, pdftotext or unpdf is called.
      // Returns structured representation for prompt injection.
      return `[Extracted Document Content from ${fileName}]`;
    }

    return `[Content extracted from ${fileName}]`;
  }
}
