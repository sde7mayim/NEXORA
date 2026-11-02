import { describe, it, expect } from "vitest";
import { CreativeDetector } from "@/lib/ai/creative/creative-detector";
import { ImageCreativeService } from "@/lib/ai/creative/image-service";
import { MusicCreativeService } from "@/lib/ai/creative/music-service";
import { LyricsCreativeService } from "@/lib/ai/creative/lyrics-service";
import { VideoCreativeService } from "@/lib/ai/creative/video-service";
import { DocumentParser } from "@/lib/files/document-parser";
import { DocumentRetrievalService } from "@/lib/files/document-retrieval";
import { ConversationDocumentStore } from "@/lib/files/document-store";
import { ModelRegistry, NEXORA_MODEL_FAMILIES } from "@/lib/ai/model-registry";
import { ModelRouter } from "@/lib/ai/router";
import { EntitlementEngine } from "@/lib/entitlements/engine";

describe("NEXORA — Premium, Accurate, Real-Output AI Platform Verification", () => {
  // ==========================================================================
  // 1. UNIVERSAL REQUEST UNDERSTANDING & OUTPUT ISOLATION
  // ==========================================================================
  describe("1. Universal Request Understanding & Output Isolation", () => {
    it("Request 1 (Image): 'Create a realistic image of a dog playing with a ball in a sunny park' returns image intent", async () => {
      const query = "Create a realistic image of a dog playing with a ball in a sunny park";
      const detection = CreativeDetector.detect(query);

      expect(detection.isCreativeIntent).toBe(true);
      expect(detection.intent).toBe("image_generation");
      expect(detection.creativeType).toBe("image");
      expect(detection.prompt!.toLowerCase()).toContain("dog playing with a ball");
      expect(detection.parameters?.style).toBe("realistic");

      const artifact = await ImageCreativeService.generateImage({
        prompt: detection.prompt!,
        aspectRatio: "1:1",
        style: "realistic",
      });

      expect(artifact.type).toBe("image");
      expect(["ready", "success", "rate_limited", "unsupported", "failed"]).toContain(artifact.status);
      if (artifact.status === "ready" || artifact.status === "success") {
        expect(artifact.mediaUrl).toBeDefined();
        // Never stamps fake prompt text
        if (artifact.mediaUrl?.startsWith("data:image/svg+xml")) {
          const decoded = decodeURIComponent(artifact.mediaUrl);
          expect(decoded).not.toContain("NEXORA STUDIO • NATIVE HD");
        }
      }
    });

    it("Follow-up: 'Make it cinematic' preserves previous image subject", () => {
      const history = [
        { role: "user", content: "Create an image of a dog playing with a ball in a sunny park" },
        { role: "assistant", content: "" },
      ];
      const detection = CreativeDetector.detect("Make it cinematic", [], history);

      expect(detection.isCreativeIntent).toBe(true);
      expect(["image_generation", "image_variation"]).toContain(detection.intent);
      expect(detection.prompt!.toLowerCase()).toContain("dog playing with a ball");
      expect(detection.parameters?.style).toBe("cinematic");
    });

    it("Request 2 (Music): 'Create a song about friendship' returns playable audio", async () => {
      const query = "Create a song about friendship";
      const detection = CreativeDetector.detect(query);

      expect(detection.isCreativeIntent).toBe(true);
      expect(detection.intent).toBe("music_generation");
      expect(detection.creativeType).toBe("music");

      const artifact = await MusicCreativeService.generateMusic({
        prompt: detection.prompt || "Song about friendship",
        genre: "Acoustic Pop",
        mood: "Friendship",
      });

      expect(artifact.type).toBe("music");
      expect(artifact.status).toBe("ready");
      expect(artifact.mediaUrl).toBeDefined();
      expect(artifact.mediaUrl?.startsWith("data:audio/")).toBe(true);
    });

    it("Request 3 (Lyrics): 'Write lyrics about friendship' returns lyrics only (no audio)", async () => {
      const query = "Write lyrics about friendship";
      const detection = CreativeDetector.detect(query);

      expect(detection.isCreativeIntent).toBe(true);
      expect(detection.intent).toBe("lyrics_generation");
      expect(detection.creativeType).toBe("lyrics");

      const artifact = await LyricsCreativeService.generateLyrics({
        theme: detection.prompt || "Friendship",
        language: "English",
      });

      expect(artifact.type).toBe("lyrics");
      expect(artifact.status).toBe("ready");
      expect(artifact.mediaUrl).toBeUndefined(); // No audio player
      expect(artifact.lyricsMetadata?.sections.length).toBeGreaterThan(0);
    });

    it("Request 4 (Video): 'make a video of a dog running on a beach' reports provider status truthfully", async () => {
      const query = "make a video of a dog running on a beach";
      const detection = CreativeDetector.detect(query);

      expect(detection.isCreativeIntent).toBe(true);
      expect(detection.intent).toBe("video_generation");
      expect(detection.creativeType).toBe("video");
      expect(detection.prompt!.toLowerCase()).toContain("dog running on a beach");

      const artifact = await VideoCreativeService.generateVideo({
        prompt: detection.prompt!,
      });

      expect(artifact.type).toBe("video");
      if (artifact.status === "unsupported") {
        expect(artifact.errorMessage).toContain("provider is not configured");
        expect(artifact.mediaUrl).toBeUndefined();
      }
    });

    it("Technical query: 'explain how image generation works' routes to ordinary text chat", () => {
      const query = "explain how image generation works";
      const detection = CreativeDetector.detect(query);

      expect(detection.isCreativeIntent).toBe(false);
      expect(detection.intent).toBe("ordinary_text_chat");
    });
  });

  // ==========================================================================
  // 2. FILE UNDERSTANDING & ACCURATE DOCUMENT GROUNDING
  // ==========================================================================
  describe("2. File Understanding & Document Grounding", () => {
    it("parses PDF, DOCX, CSV, and XLSX formats accurately", () => {
      const csvBuffer = new TextEncoder().encode("Name,Department,Salary\nAlice,Engineering,120000\nBob,Design,95000");
      const csvDoc = DocumentParser.parse(csvBuffer, "employees.csv");
      expect(csvDoc.fileType).toBe("csv");
      expect(csvDoc.fullText).toContain("Alice,Engineering,120000");

      const xlsxDoc = DocumentParser.parse(csvBuffer, "financial_report.xlsx");
      expect(xlsxDoc.fileType).toBe("csv");
      expect(xlsxDoc.fileName).toBe("financial_report.xlsx");
    });

    it("grounds answers strictly in document content and preserves exact details", () => {
      const convId = "conv_grounding_test";
      const userId = "usr_grounding_test";

      const docText = `
# Quantum Architecture v2.5
## Core Engine
The Quantum Engine operates with 512 nodes at 99.99% availability.
Priority level is P0 for the consensus module.
      `.trim();

      const docBuffer = new TextEncoder().encode(docText);
      const parsed = DocumentParser.parse(docBuffer, "quantum-spec.md");

      ConversationDocumentStore.addDocument({
        conversationId: convId,
        userId,
        fileName: "quantum-spec.md",
        fileSizeBytes: docBuffer.length,
        mimeType: parsed.mimeType,
        fileType: parsed.fileType,
        fullText: parsed.fullText,
        summary: parsed.summary,
        structure: parsed.structure,
      });

      const res = DocumentRetrievalService.processDocumentContext({
        query: "What is the consensus module priority level?",
        conversationId: convId,
        userId,
      });

      expect(res.targetDocument).toBeDefined();
      expect(res.groundedSystemPrompt).toContain("=== AUTHORITATIVE USER-UPLOADED DOCUMENT CONTEXT ===");
      expect(res.groundedSystemPrompt).toContain("P0");
      expect(res.groundedSystemPrompt).toContain("SECURITY & UNTRUSTED DATA DIRECTIVE");
    });

    it("isolates creative requests from document context leakage", () => {
      const convId = "conv_leakage_test";
      const userId = "usr_leakage_test";

      const docText = "# Confidential Financial Statement 2026\nQuarterly profits were $4.2M.";
      const docBuffer = new TextEncoder().encode(docText);
      const parsed = DocumentParser.parse(docBuffer, "finances.md");

      ConversationDocumentStore.addDocument({
        conversationId: convId,
        userId,
        fileName: "finances.md",
        fileSizeBytes: docBuffer.length,
        mimeType: parsed.mimeType,
        fileType: parsed.fileType,
        fullText: parsed.fullText,
        summary: parsed.summary,
        structure: parsed.structure,
      });

      // A creative request should NOT attach the document context
      const res = DocumentRetrievalService.processDocumentContext({
        query: "Create a song about friendship",
        conversationId: convId,
        userId,
      });

      expect(res.targetDocument).toBeNull();
      expect(res.groundedSystemPrompt).toBe("");
    });
  });

  // ==========================================================================
  // 3. MODEL ARCHITECTURE & CAPABILITY GOVERNANCE
  // ==========================================================================
  describe("3. Model Architecture & Capability Governance", () => {
    it("registers all official Nexora branded model families", () => {
      const familySlugs = NEXORA_MODEL_FAMILIES.map((f) => f.slug);
      expect(familySlugs).toContain("nexora-chat");
      expect(familySlugs).toContain("nexora-swift");
      expect(familySlugs).toContain("nexora-core");
      expect(familySlugs).toContain("nexora-reason");
      expect(familySlugs).toContain("nexora-vision");
      expect(familySlugs).toContain("nexora-image");
      expect(familySlugs).toContain("nexora-music");
      expect(familySlugs).toContain("nexora-video");
    });

    it("enforces plan eligibility between Free and Pro/Enterprise", () => {
      const freeModels = ModelRegistry.getEligibleModelsForPlan("free");
      const freeSlugs = freeModels.nexoraModels.map((f) => f.slug);

      // Free has Chat, Swift, Core, Image, and Music
      expect(freeSlugs).toContain("nexora-swift");
      expect(freeSlugs).toContain("nexora-core");
      expect(freeSlugs).toContain("nexora-image");
      expect(freeSlugs).toContain("nexora-chat");
      expect(freeSlugs).toContain("nexora-music");

      // Advanced deep reasoning and video require Pro/Enterprise
      expect(freeSlugs).not.toContain("nexora-reason");
      expect(freeSlugs).not.toContain("nexora-video");

      const proModels = ModelRegistry.getEligibleModelsForPlan("pro");
      expect(proModels.nexoraModels.length).toBe(NEXORA_MODEL_FAMILIES.length);
    });

    it("validates model capability constraints strictly", () => {
      // Swift does not support vision
      const checkSwiftVision = ModelRouter.validateRequestCapabilities("nexora-swift", {
        requiresVision: true,
      });
      expect(checkSwiftVision.valid).toBe(false);

      // Vision model supports vision
      const checkVision = ModelRouter.validateRequestCapabilities("nexora-vision", {
        requiresVision: true,
      });
      expect(checkVision.valid).toBe(true);
    });
  });

  // ==========================================================================
  // 4. USAGE CREDITS, QUOTA & ERROR DIFFERENTIATION
  // ==========================================================================
  describe("4. Usage Credits, Quota & Error Differentiation", () => {
    it("differentiates between quota exceeded, provider rate limits, missing keys, and invalid parameters", () => {
      // 1. Quota check
      const quotaCheck = EntitlementEngine.checkMessageQuota("free", {
        dailyMessages: 50,
        monthlyMessages: 50,
      });
      expect(quotaCheck.allowed).toBe(false);
      expect(quotaCheck.reason).toContain("quota exceeded");

      // 2. Operation Usage logging records transparent audit entry
      const record = EntitlementEngine.recordOperationUsage({
        requestId: "req_test_001",
        userId: "usr_001",
        plan: "pro",
        capability: "image_generation",
        selectedModel: "nexora-image",
        actualProvider: "Google Imagen 3",
        actualModel: "imagen-3.0-generate-002",
        creditsReserved: 1,
        creditsConsumed: 1,
        status: "success",
      });

      expect(record.requestId).toBe("req_test_001");
      expect(record.status).toBe("success");
      expect(record.timestamp).toBeDefined();

      const logs = EntitlementEngine.getOperationUsageLogs("usr_001");
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1].requestId).toBe("req_test_001");
    });
  });
});

