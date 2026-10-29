import zlib from "zlib";
import { DocumentFileType, DocumentSection, DocumentStructure } from "./document-types";

export interface ParsedDocumentData {
  fileName: string;
  fileType: DocumentFileType;
  mimeType: string;
  fullText: string;
  summary: string;
  structure: DocumentStructure;
  warning?: string;
}

export class DocumentParser {
  /**
   * Identifies the document type from file name and extension.
   */
  static getFileType(fileName: string): DocumentFileType {
    const ext = fileName.toLowerCase().split(".").pop() || "";
    if (ext === "md" || ext === "markdown") return "markdown";
    if (ext === "txt" || ext === "text" || ext === "rtf" || ext === "log") return "text";
    if (ext === "pdf") return "pdf";
    if (ext === "docx" || ext === "doc") return "docx";
    if (ext === "csv" || ext === "tsv") return "csv";
    if (ext === "json" || ext === "yaml" || ext === "yml") return "json";
    const codeExts = ["ts", "tsx", "js", "jsx", "py", "java", "c", "cpp", "cs", "go", "rs", "sql", "html", "css"];
    if (codeExts.includes(ext)) return "code";
    return "unsupported";
  }

  /**
   * Main entry point to parse a document buffer into structured text and metadata.
   */
  static parse(buffer: Uint8Array, fileName: string): ParsedDocumentData {
    const fileType = this.getFileType(fileName);
    let fullText = "";
    let warning: string | undefined;

    switch (fileType) {
      case "markdown":
      case "text":
      case "csv":
      case "json":
      case "code": {
        const decoder = new TextDecoder("utf-8");
        fullText = decoder.decode(buffer);
        break;
      }

      case "pdf": {
        const extracted = this.extractPdfText(buffer, fileName);
        fullText = extracted.text;
        warning = extracted.warning;
        break;
      }

      case "docx": {
        const extracted = this.extractDocxText(buffer, fileName);
        fullText = extracted.text;
        warning = extracted.warning;
        break;
      }

      default: {
        const decoder = new TextDecoder("utf-8");
        fullText = decoder.decode(buffer);
        break;
      }
    }

    const structure = this.extractStructure(fullText, fileType);
    const summary = this.generateSummary(fullText, structure, fileName);

    return {
      fileName,
      fileType,
      mimeType: this.getMimeType(fileType),
      fullText,
      summary,
      structure,
      warning,
    };
  }

  /**
   * Parses Markdown and plain text into structured sections, detecting headings, tables, and lists.
   */
  static extractStructure(text: string, fileType: DocumentFileType): DocumentStructure {
    const lines = text.split(/\r?\n/);
    const headings: Array<{ level: number; title: string }> = [];
    const sections: DocumentSection[] = [];

    let tablesCount = 0;
    let listsCount = 0;

    if (fileType === "csv" && lines.length > 1) {
      tablesCount = 1;
    }

    let currentSectionTitle = "Document Header / Overview";
    let currentLevel = 1;
    let currentLines: string[] = [];
    let sectionIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        tablesCount++;
      }
      if (trimmed.match(/^[-*+]\s+/) || trimmed.match(/^\d+\.\s+/)) {
        listsCount++;
      }

      // Detect Markdown headings: # Heading, ## Heading, ### Heading
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      // Or plain text numbered headings: "1. Executive Summary", "Section 2: Architecture"
      const textHeadingMatch =
        fileType === "text"
          ? line.match(/^(\d+\.|\bSection\s+\d+:?)\s+([A-Z][A-Za-z0-9\s,&-]+)$/i)
          : null;

      if (headingMatch || textHeadingMatch) {
        if (currentLines.length > 0) {
          const sectionContent = currentLines.join("\n").trim();
          if (sectionContent) {
            sections.push({
              id: `sec_${sectionIndex++}`,
              heading: currentSectionTitle,
              level: currentLevel,
              content: sectionContent,
              tablePresent: sectionContent.includes("|"),
              listPresent: /[-*+]\s+|\d+\.\s+/.test(sectionContent),
            });
          }
          currentLines = [];
        }

        if (headingMatch) {
          currentLevel = headingMatch[1].length;
          currentSectionTitle = headingMatch[2].trim();
        } else if (textHeadingMatch) {
          currentLevel = 2;
          currentSectionTitle = `${textHeadingMatch[1]} ${textHeadingMatch[2]}`.trim();
        }

        headings.push({ level: currentLevel, title: currentSectionTitle });
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      const sectionContent = currentLines.join("\n").trim();
      if (sectionContent) {
        sections.push({
          id: `sec_${sectionIndex++}`,
          heading: currentSectionTitle,
          level: currentLevel,
          content: sectionContent,
          tablePresent: sectionContent.includes("|"),
          listPresent: /[-*+]\s+|\d+\.\s+/.test(sectionContent),
        });
      }
    }

    const words = text.split(/\s+/).filter(Boolean);
    const finalTablesCount = fileType === "csv" && lines.length > 1 ? 1 : Math.round(tablesCount / 3);

    return {
      headings,
      sections,
      tablesCount: finalTablesCount,
      listsCount,
      wordCount: words.length,
      lineCount: lines.length,
    };
  }

  /**
   * Extracts text streams from a PDF binary.
   */
  private static extractPdfText(buffer: Uint8Array, fileName: string): { text: string; warning?: string } {
    // 1. Verify PDF signature (%PDF-)
    if (
      buffer.length < 5 ||
      buffer[0] !== 0x25 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x44 ||
      buffer[3] !== 0x46
    ) {
      return {
        text: "",
        warning: `File '${fileName}' has .pdf extension but lacks standard PDF header signature.`,
      };
    }

    // 2. Scan for text blocks and compressed streams in PDF
    const textPieces: string[] = [];
    const latin1 = Buffer.from(buffer).toString("latin1");

    // Scan for uncompressed text blocks: BT ... ET
    const btRegex = /BT[\s\S]*?ET/g;
    let match: RegExpExecArray | null;

    while ((match = btRegex.exec(latin1)) !== null) {
      const block = match[0];
      // Extract string literals in (...) Tj or TJ
      const tjRegex = /\(([^)]+)\)\s*Tj/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        textPieces.push(tjMatch[1]);
      }

      const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
      let tjArrMatch: RegExpExecArray | null;
      while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
        const inner = tjArrMatch[1];
        const parts = inner.match(/\(([^)]+)\)/g);
        if (parts) {
          textPieces.push(parts.map((p) => p.slice(1, -1)).join(""));
        }
      }
    }

    // Decompress FlateDecode streams if direct BT/ET yielded little
    if (textPieces.length === 0) {
      const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
      let streamMatch: RegExpExecArray | null;

      while ((streamMatch = streamRegex.exec(latin1)) !== null) {
        const rawStream = Buffer.from(streamMatch[1], "latin1");
        try {
          const inflated = zlib.inflateSync(rawStream);
          const inflatedStr = inflated.toString("utf8");
          const streamPieces: string[] = [];

          let sMatch: RegExpExecArray | null;
          const sBtRegex = /BT[\s\S]*?ET/g;
          while ((sMatch = sBtRegex.exec(inflatedStr)) !== null) {
            const block = sMatch[0];
            const tjRegex = /\(([^)]+)\)\s*Tj/g;
            let tjMatch: RegExpExecArray | null;
            while ((tjMatch = tjRegex.exec(block)) !== null) {
              streamPieces.push(tjMatch[1]);
            }
          }

          if (streamPieces.length > 0) {
            textPieces.push(...streamPieces);
          }
        } catch {
          // Stream was not valid deflate, continue
        }
      }
    }

    const cleanText = textPieces.join(" ").trim();
    if (!cleanText || cleanText.length < 20) {
      return {
        text: `[PDF Document: ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)]`,
        warning: `Scanned or image-based PDF detected. No selectable digital text was extractable from '${fileName}'.`,
      };
    }

    return { text: cleanText };
  }

  /**
   * Extracts text from OpenXML Word documents (.docx).
   */
  private static extractDocxText(buffer: Uint8Array, fileName: string): { text: string; warning?: string } {
    // DOCX is a zip archive starting with PK (0x50 0x4B 0x03 0x04)
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      buffer[2] !== 0x03 ||
      buffer[3] !== 0x04
    ) {
      return {
        text: "",
        warning: `File '${fileName}' has .docx extension but is not a valid OpenXML document archive.`,
      };
    }

    const buf = Buffer.from(buffer);
    const latin1 = buf.toString("latin1");

    // Search for word/document.xml compressed stream entry in zip
    const docEntryIdx = latin1.indexOf("word/document.xml");
    if (docEntryIdx !== -1) {
      try {
        // Find local file header or stream payload around the entry
        const streamStart = buf.indexOf(Buffer.from([0x78, 0x9c]), docEntryIdx); // zlib header
        if (streamStart !== -1 && streamStart < docEntryIdx + 200) {
          const slice = buf.subarray(streamStart);
          const decompressed = zlib.inflateSync(slice).toString("utf8");
          const textOnly = decompressed
            .replace(/<w:p[^>]*>/g, "\n")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (textOnly.length > 20) {
            return { text: textOnly };
          }
        }
      } catch {
        // Fallback to raw XML tag extraction if deflate slice shifted
      }
    }

    // Secondary pass: regex extract any XML text tags <w:t>...</w:t>
    const wtRegex = /<w:t[^>]*>([^<]+)<\/w:t>/g;
    const pieces: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = wtRegex.exec(latin1)) !== null) {
      pieces.push(match[1]);
    }

    if (pieces.length > 0) {
      return { text: pieces.join(" ").trim() };
    }

    return {
      text: `[DOCX Document: ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)]`,
      warning: `Document contents could not be extracted from '${fileName}'. Ensure the file is not password-protected.`,
    };
  }

  /**
   * Generates a coherent summary from the beginning sections of a document.
   */
  private static generateSummary(text: string, structure: DocumentStructure, fileName: string): string {
    if (!text || text.trim().length === 0) {
      return `Empty document '${fileName}'.`;
    }

    // If an executive summary or overview section exists, prioritize it
    const overviewSection = structure.sections.find(
      (s) =>
        s.heading.toLowerCase().includes("summary") ||
        s.heading.toLowerCase().includes("overview") ||
        s.heading.toLowerCase().includes("purpose")
    );

    if (overviewSection && overviewSection.content.length > 40) {
      return overviewSection.content.slice(0, 500).trim();
    }

    // Default to the first 400 characters of meaningful content
    const firstLines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && !l.startsWith("---") && !l.startsWith("**"))
      .join(" ");

    return firstLines.slice(0, 450) || `Document '${fileName}' processed with ${structure.sections.length} sections.`;
  }

  private static getMimeType(fileType: DocumentFileType): string {
    switch (fileType) {
      case "markdown":
        return "text/markdown";
      case "text":
        return "text/plain";
      case "pdf":
        return "application/pdf";
      case "docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case "csv":
        return "text/csv";
      case "json":
        return "application/json";
      case "code":
        return "text/plain";
      default:
        return "application/octet-stream";
    }
  }
}

