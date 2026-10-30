import { describe, it, expect, beforeEach, vi } from "vitest";
import { CreativeDetector } from "@/lib/ai/creative/creative-detector";
import { ImageCreativeService } from "@/lib/ai/creative/image-service";
import { LyricsCreativeService } from "@/lib/ai/creative/lyrics-service";
import { MusicCreativeService } from "@/lib/ai/creative/music-service";
import { AudioCreativeService } from "@/lib/ai/creative/audio-service";
import { EntitlementEngine } from "@/lib/entitlements/engine";
import { ConversationStore, ConversationMessage } from "@/lib/chat/conversation-store";
import { CreativeArtifact } from "@/lib/ai/creative/creative-types";

describe("Nexora AI Creative Studio Inside Normal Chat", () => {
  const mockStorage = new Map<string, string>();

  beforeEach(() => {
    mockStorage.clear();
    global.localStorage = {
      getItem: (key: string) => mockStorage.get(key) || null,
      setItem: (key: string, val: string) => mockStorage.set(key, val),
      removeItem: (key: string) => mockStorage.delete(key),
      clear: () => mockStorage.clear(),
      length: 0,
      key: () => null,
    };
  });

  describe("1. Creative Intent Detection", () => {
    it("should detect text-to-image requests and extract aspect ratios & styles", () => {
      const q1 = "Create a cinematic image of a futuristic city at night in 16:9 widescreen";
      const res1 = CreativeDetector.detect(q1);

      expect(res1.isCreativeIntent).toBe(true);
      expect(res1.creativeType).toBe("image");
      expect(res1.parameters?.aspectRatio).toBe("16:9");
      expect(res1.parameters?.style).toBe("cinematic");

      const q2 = "Generate a 3D render of a cybernetic tiger in portrait 9:16";
      const res2 = CreativeDetector.detect(q2);
      expect(res2.isCreativeIntent).toBe(true);
      expect(res2.creativeType).toBe("image");
      expect(res2.parameters?.aspectRatio).toBe("9:16");
      expect(res2.parameters?.style).toBe("3d");
    });

    it("should detect image editing when paired with an attached image", () => {
      const q = "Remove the background from this picture and make it transparent";
      const attachments = [{ name: "profile.png", mimeType: "image/png" }];
      const res = CreativeDetector.detect(q, attachments);

      expect(res.isCreativeIntent).toBe(true);
      expect(res.creativeType).toBe("edited-image");
      expect(res.parameters?.editOperation).toBe("remove-bg");
    });

    it("should detect background replacement with scenic target", () => {
      const q = "Replace the background with a beach at sunset";
      const attachments = [{ name: "portrait.jpg", mimeType: "image/jpeg" }];
      const res = CreativeDetector.detect(q, attachments);

      expect(res.isCreativeIntent).toBe(true);
      expect(res.creativeType).toBe("edited-image");
      expect(res.parameters?.editOperation).toBe("replace-bg");
      expect((res.parameters?.targetBackground as string)?.toLowerCase()).toContain("beach");
    });

    it("should detect lyrics generation requests for Tamil and English", () => {
      const qTamil = "Write lyrics for a Tamil romantic melody song about first love";
      const resTamil = CreativeDetector.detect(qTamil);

      expect(resTamil.isCreativeIntent).toBe(true);
      expect(resTamil.creativeType).toBe("lyrics");
      expect(resTamil.parameters?.language).toBe("Tamil");
      expect(resTamil.parameters?.genre).toBe("Romantic Melody");

      const qEng = "Write rap lyrics about overcoming adversity with fast flow";
      const resEng = CreativeDetector.detect(qEng);

      expect(resEng.isCreativeIntent).toBe(true);
      expect(resEng.creativeType).toBe("lyrics");
      expect(resEng.parameters?.language).toBe("English");
      expect(resEng.parameters?.genre).toBe("Rap / Hip-Hop");
    });

    it("should detect music and soundtrack generation", () => {
      const q = "Create a Tamil romantic melody with gentle piano and acoustic guitar";
      const res = CreativeDetector.detect(q);

      expect(res.isCreativeIntent).toBe(true);
      expect(res.creativeType).toBe("music");
      expect(res.parameters?.genre).toBe("Tamil Melody");
    });

    it("should detect text-to-speech and voiceover generation", () => {
      const q = "Text to speech: Welcome to the future of creative artificial intelligence.";
      const res = CreativeDetector.detect(q);

      expect(res.isCreativeIntent).toBe(true);
      expect(res.creativeType).toBe("voice");
      expect(res.prompt).toContain("Welcome to the future");
    });

    it("should detect colloquial and direct prompt-to-image requests", () => {
      // 1. "i want a man with a coatsuit"
      const resSuit = CreativeDetector.detect("i want a man with a coatsuit");
      expect(resSuit.isCreativeIntent).toBe(true);
      expect(resSuit.creativeType).toBe("image");
      expect(resSuit.prompt?.toLowerCase()).toContain("coatsuit");
      expect(resSuit.parameters?.style).toBe("realistic");

      // 2. "Create an image of a man wearing a coat suit."
      const resSuit2 = CreativeDetector.detect("Create an image of a man wearing a coat suit.");
      expect(resSuit2.isCreativeIntent).toBe(true);
      expect(resSuit2.creativeType).toBe("image");

      // 3. "Generate a professional portrait."
      const resPortrait = CreativeDetector.detect("Generate a professional portrait.");
      expect(resPortrait.isCreativeIntent).toBe(true);
      expect(resPortrait.creativeType).toBe("image");

      // 4. "Draw a futuristic city."
      const resDraw = CreativeDetector.detect("Draw a futuristic city.");
      expect(resDraw.isCreativeIntent).toBe(true);
      expect(resDraw.creativeType).toBe("image");
      expect(resDraw.prompt?.toLowerCase()).toContain("futuristic city");

      // 5. "Make a logo."
      const resLogo = CreativeDetector.detect("Make a logo.");
      expect(resLogo.isCreativeIntent).toBe(true);
      expect(resLogo.creativeType).toBe("image");
      expect(resLogo.parameters?.style).toBe("logo");

      // 6. "Create a realistic landscape."
      const resLandscape = CreativeDetector.detect("Create a realistic landscape.");
      expect(resLandscape.isCreativeIntent).toBe(true);
      expect(resLandscape.creativeType).toBe("image");

      // 7. "Generate an image of a cat."
      const resCat = CreativeDetector.detect("Generate an image of a cat.");
      expect(resCat.isCreativeIntent).toBe(true);
      expect(resCat.creativeType).toBe("image");

      // 8. "Create an illustration."
      const resIll = CreativeDetector.detect("Create an illustration.");
      expect(resIll.isCreativeIntent).toBe(true);
      expect(resIll.creativeType).toBe("image");

      // 9. "Visualize this concept."
      const resVis = CreativeDetector.detect("Visualize this concept: quantum entanglement.");
      expect(resVis.isCreativeIntent).toBe(true);
      expect(resVis.creativeType).toBe("image");

      // 10. "picture of a cat"
      const resNoun = CreativeDetector.detect("picture of a cat");
      expect(resNoun.isCreativeIntent).toBe(true);
      expect(resNoun.creativeType).toBe("image");

      // 11. "can you make an image of a sports car"
      const resCan = CreativeDetector.detect("can you make an image of a sports car");
      expect(resCan.isCreativeIntent).toBe(true);
      expect(resCan.creativeType).toBe("image");
    });

    it("should NOT trigger image generation for prompt idea requests, technical questions, or code", () => {
      const nonImageRequests = [
        "give me a prompt for an image of a man in a coatsuit",
        "suggest some prompts for midjourney",
        "how does stable diffusion work?",
        "explain how AI image generation models work",
        "write python code to load an image using PIL",
        "code to display an image in react",
      ];

      for (const q of nonImageRequests) {
        const res = CreativeDetector.detect(q);
        expect(res.isCreativeIntent).toBe(false);
      }
    });

    it("should isolate normal conversations and NOT trigger creative intent", () => {
      const normalQueries = [
        "What is the capital of France?",
        "Can you explain React useEffect hooks?",
        "How do I optimize a SQL database query?",
        "Tell me about Dell XPS 14",
      ];

      for (const q of normalQueries) {
        const res = CreativeDetector.detect(q);
        expect(res.isCreativeIntent).toBe(false);
      }
    });
  });

  describe("2. AI Image Generation", () => {
    it("should optimize prompts internally for high quality visual results", () => {
      const { optimizedPrompt: opt1 } = ImageCreativeService.optimizePrompt("i want a man with a coatsuit");
      expect(opt1.toLowerCase()).toContain("coat suit");
      expect(opt1.toLowerCase()).toContain("portrait");
      expect(opt1.toLowerCase()).toContain("8k");

      const { optimizedPrompt: opt2 } = ImageCreativeService.optimizePrompt("futuristic city", "cinematic");
      expect(opt2.toLowerCase()).toContain("cyberpunk metropolis");
      expect(opt2.toLowerCase()).toContain("skyscrapers");

      const { optimizedPrompt: opt3 } = ImageCreativeService.optimizePrompt("logo for a coffee brand", "logo");
      expect(opt3.toLowerCase()).toContain("minimalist modern vector logo icon");
    });

    it("should properly validate provider responses and reject HTML/SVG rate-limit error pages", () => {
      // 1. Valid JPEG/PNG
      const validPng = ImageCreativeService.validateProviderResponse(200, "image/png");
      expect(validPng.valid).toBe(true);

      const validJpg = ImageCreativeService.validateProviderResponse(200, "image/jpeg");
      expect(validJpg.valid).toBe(true);

      // 2. Reject HTTP 429 rate limit
      const rateLimitRes = ImageCreativeService.validateProviderResponse(429, "text/plain", "Too Many Requests");
      expect(rateLimitRes.valid).toBe(false);

      // 3. Reject HTML error page from Pollinations
      const htmlRes = ImageCreativeService.validateProviderResponse(
        200,
        "text/html",
        "<!DOCTYPE html><html><body>Pollinations.ai — At its limit right now. The free service is full. Reload in a few seconds.</body></html>"
      );
      expect(htmlRes.valid).toBe(false);
      expect(htmlRes.reason).toContain("non-image");

      // 4. Reject SVG banner embedding rate limit text
      const svgRateLimit = ImageCreativeService.validateProviderResponse(
        200,
        "image/svg+xml",
        "<svg><text>Pollinations.ai — At its limit right now. The free service is full. Reload in a few seconds.</text></svg>"
      );
      expect(svgRateLimit.valid).toBe(false);
      expect(svgRateLimit.reason?.toLowerCase()).toContain("rate limit");
    });

    it("should handle provider failures gracefully without rendering broken images", async () => {
      const failedArtifact = await ImageCreativeService.generateImage({
        prompt: "a man with a coatsuit",
        provider: "fail",
      });

      expect(failedArtifact.type).toBe("image");
      expect(failedArtifact.status).toBe("failed");
      expect(failedArtifact.mediaUrl).toBeUndefined();
      expect(failedArtifact.errorMessage).toBeDefined();
      expect(failedArtifact.errorMessage).toContain("capacity");
    });
    it("should generate a valid image artifact with resolution and style metadata", async () => {
      const artifact = await ImageCreativeService.generateImage({
        prompt: "A cinematic futuristic city at night",
        aspectRatio: "16:9",
        style: "cinematic",
      });

      expect(artifact.type).toBe("image");
      expect(artifact.status).toBe("ready");
      expect(artifact.mediaUrl).toBeDefined();
      expect(artifact.mediaUrl).toContain("pollinations.ai");
      expect(artifact.imageMetadata?.aspectRatio).toBe("16:9");
      expect(artifact.imageMetadata?.resolution).toBe("1024x576");
      expect(artifact.imageMetadata?.style).toBe("cinematic");
    });

    it("should support 1:1, 9:16, and 4:3 aspect ratios correctly", async () => {
      const artSquare = await ImageCreativeService.generateImage({
        prompt: "Minimalist logo",
        aspectRatio: "1:1",
      });
      expect(artSquare.imageMetadata?.resolution).toBe("1024x1024");

      const artPortrait = await ImageCreativeService.generateImage({
        prompt: "Cyberpunk character",
        aspectRatio: "9:16",
      });
      expect(artPortrait.imageMetadata?.resolution).toBe("576x1024");
    });
  });

  describe("3. AI Image Editing", () => {
    it("should edit an uploaded image and produce real modified image output", async () => {
      const sampleInputUrl =
        "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='100%25' height='100%25' fill='%236366f1'/%3E%3C/svg%3E";

      const artifact = await ImageCreativeService.editImage({
        originalImageUrl: sampleInputUrl,
        instruction: "Remove background",
        operation: "remove-bg",
      });

      expect(artifact.type).toBe("edited-image");
      expect(artifact.status).toBe("ready");
      expect(artifact.mediaUrl).toBeDefined();
      expect(artifact.mediaUrl?.startsWith("data:image/svg+xml")).toBe(true);
      expect(artifact.imageMetadata?.originalImagePreviewUrl).toBe(sampleInputUrl);
      expect(artifact.imageMetadata?.editOperation).toBe("remove-bg");
    });

    it("should replace background with custom scene and preserve original image reference", async () => {
      const sampleInputUrl =
        "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Ccircle cx='200' cy='200' r='100' fill='%23ec4899'/%3E%3C/svg%3E";

      const artifact = await ImageCreativeService.editImage({
        originalImageUrl: sampleInputUrl,
        instruction: "Replace background with beach at sunset",
        operation: "replace-bg",
        targetBackground: "beach",
      });

      expect(artifact.type).toBe("edited-image");
      expect(artifact.imageMetadata?.editOperation).toBe("replace-bg");
      expect(decodeURIComponent(artifact.mediaUrl!)).toContain("linear-gradient");
    });
  });

  describe("4. AI Original Lyrics Generation & Copyright Protection", () => {
    it("should generate authentic original Tamil lyrics with Pallavi, Anupallavi, and Charanam", async () => {
      const artifact = await LyricsCreativeService.generateLyrics({
        theme: "Unconditional love in the rain",
        language: "Tamil",
        genre: "Romantic Melody",
        mood: "Love",
        vocalStyle: "Duet",
      });

      expect(artifact.type).toBe("lyrics");
      expect(artifact.lyricsMetadata).toBeDefined();
      expect(artifact.lyricsMetadata?.language).toBe("Tamil");

      const sections = artifact.lyricsMetadata?.sections || [];
      expect(sections.length).toBeGreaterThanOrEqual(4);

      // Verify authentic Tamil sections
      const hasPallavi = sections.some((s) => s.label.includes("பல்லவி") || s.label.includes("Pallavi"));
      const hasChorus = sections.some((s) => s.label.includes("அனுபல்லவி") || s.label.includes("Chorus"));
      const hasCharanam = sections.some((s) => s.label.includes("சரணம்") || s.label.includes("Charanam"));

      expect(hasPallavi).toBe(true);
      expect(hasChorus).toBe(true);
      expect(hasCharanam).toBe(true);

      // Verify musical metadata
      expect(artifact.lyricsMetadata?.keySignature).toBeDefined();
      expect(artifact.lyricsMetadata?.tempoBpm).toBeGreaterThan(60);

      // Verify strict copyright non-infringement notice
      expect(artifact.lyricsMetadata?.copyrightOriginalNotice).toContain("100% Original");
    });

    it("should generate motivational Tamil lyrics", async () => {
      const artifact = await LyricsCreativeService.generateLyrics({
        theme: "Rising above obstacles and achieving victory",
        language: "Tamil",
        genre: "Folk / Acoustic",
        mood: "Motivational",
      });

      expect(artifact.lyricsMetadata?.title).toContain("எழுந்து வா");
      expect(artifact.lyricsMetadata?.tempoBpm).toBeGreaterThan(100);
    });

    it("should generate structured English pop & rap lyrics", async () => {
      const rapArtifact = await LyricsCreativeService.generateLyrics({
        theme: "From struggle to triumph",
        language: "English",
        genre: "Rap / Hip-Hop",
      });

      expect(rapArtifact.lyricsMetadata?.sections.some((s) => s.label.includes("Verse 1"))).toBe(true);
      expect(rapArtifact.lyricsMetadata?.sections.some((s) => s.label.includes("Chorus"))).toBe(true);
      expect(rapArtifact.lyricsMetadata?.copyrightOriginalNotice).toBeDefined();
    });
  });

  describe("5. AI Music Generation & Synthesis Engine", () => {
    it("should synthesize genuine playable WAV audio with valid RIFF/WAVE container headers", async () => {
      const artifact = await MusicCreativeService.generateMusic({
        prompt: "Gentle piano and acoustic guitar Tamil romantic melody",
        genre: "Tamil Melody",
        mood: "Romantic",
        durationSeconds: 3, // Fast 3-second test buffer
        tempoBpm: 88,
      });

      expect(artifact.type).toBe("music");
      expect(artifact.mediaUrl).toBeDefined();
      expect(artifact.mediaUrl?.startsWith("data:audio/wav;base64,")).toBe(true);

      // Extract base64 and verify real binary WAV RIFF headers
      const base64Data = artifact.mediaUrl!.replace("data:audio/wav;base64,", "");
      const binaryStr = Buffer.from(base64Data, "base64").toString("binary");

      // Header checks: 'RIFF' at 0, 'WAVE' at 8, 'fmt ' at 12, 'data' at 36
      expect(binaryStr.slice(0, 4)).toBe("RIFF");
      expect(binaryStr.slice(8, 12)).toBe("WAVE");
      expect(binaryStr.slice(12, 16)).toBe("fmt ");
      expect(binaryStr.slice(36, 40)).toBe("data");

      // Verify metadata
      expect(artifact.musicMetadata?.genre).toBe("Tamil Melody");
      expect(artifact.musicMetadata?.waveformSamples?.length).toBeGreaterThan(20);
    });

    it("should synthesize distinct Western Lo-Fi audio tracks", async () => {
      const artifact = await MusicCreativeService.generateMusic({
        prompt: "Midnight chillhop rain study beats",
        genre: "Lo-Fi Chill",
        mood: "Peaceful",
        durationSeconds: 2,
        tempoBpm: 78,
      });

      expect(artifact.mediaUrl?.startsWith("data:audio/wav")).toBe(true);
      expect(artifact.musicMetadata?.tempoBpm).toBe(78);
    });
  });

  describe("6. AI Voice & Speech (TTS)", () => {
    it("should generate a playable voiceover audio artifact with voice persona metadata", async () => {
      const artifact = await AudioCreativeService.generateVoice({
        text: "Welcome to Nexora Studio voiceover.",
        voiceName: "nova",
        speed: 1.0,
      });

      expect(artifact.type).toBe("voice");
      expect(artifact.status).toBe("ready");
      expect(artifact.mediaUrl).toBeDefined();
      expect(artifact.voiceMetadata?.voiceName).toBe("nova");
      expect(artifact.voiceMetadata?.durationSeconds).toBeGreaterThan(0);
    });

    it("should transcribe and summarize audio recording", async () => {
      const artifact = await AudioCreativeService.transcribeAudio({
        fileName: "team-standup.wav",
        fileSizeBytes: 1024 * 64,
      });

      expect(artifact.type).toBe("transcription");
      expect(artifact.transcriptionMetadata?.transcript.length).toBeGreaterThan(20);
      expect(artifact.transcriptionMetadata?.summary).toBeDefined();
      expect(artifact.transcriptionMetadata?.keyTakeaways.length).toBeGreaterThan(0);
    });
  });

  describe("7. Creative Studio Quota Enforcement & Cost Protection", () => {
    it("should enforce Free tier limits for images, edits, lyrics, music, and audio", () => {
      // Free image generation (limit: 10)
      const allowedImage = EntitlementEngine.checkCreativeQuota("free", "image", 9);
      expect(allowedImage.allowed).toBe(true);

      const blockedImage = EntitlementEngine.checkCreativeQuota("free", "image", 10);
      expect(blockedImage.allowed).toBe(false);
      expect(blockedImage.reason).toContain("Image generation monthly quota reached");

      // Free image editing (limit: 5)
      const allowedEdit = EntitlementEngine.checkCreativeQuota("free", "image-edit", 4);
      expect(allowedEdit.allowed).toBe(true);

      const blockedEdit = EntitlementEngine.checkCreativeQuota("free", "image-edit", 5);
      expect(blockedEdit.allowed).toBe(false);

      // Free music generation (limit: 5)
      const blockedMusic = EntitlementEngine.checkCreativeQuota("free", "music", 5);
      expect(blockedMusic.allowed).toBe(false);
    });

    it("should grant higher quotas for Pro and Enterprise plans", () => {
      const proImage = EntitlementEngine.checkCreativeQuota("pro", "image", 150);
      expect(proImage.allowed).toBe(true);
      expect(proImage.limit).toBe(200);

      const entMusic = EntitlementEngine.checkCreativeQuota("enterprise", "music", 500);
      expect(entMusic.allowed).toBe(true);
      expect(entMusic.limit).toBe(600);
    });

    it("should atomically reserve and release creative quota reservations", async () => {
      const resId = await EntitlementEngine.reserveQuota("user_123", "creative");
      expect(resId.startsWith("res_")).toBe(true);

      const reconciled = await EntitlementEngine.reconcileReservation(resId);
      expect(reconciled).toBe(true);

      const resId2 = await EntitlementEngine.reserveQuota("user_123", "creative");
      const released = await EntitlementEngine.releaseReservation(resId2);
      expect(released).toBe(true);
    });
  });

  describe("8. Conversation Store & Creative Media Persistence", () => {
    it("should persist creative artifacts inside conversation messages", () => {
      const conv = ConversationStore.createConversation("Creative Studio Session", "nexora-core");

      const dummyImageArtifact: CreativeArtifact = {
        id: "art_img_test_1",
        type: "image",
        title: "Futuristic Skyline",
        mediaUrl: "https://image.pollinations.ai/prompt/futuristic-skyline",
        status: "ready",
        createdAt: new Date().toISOString(),
      };

      const dummyMusicArtifact: CreativeArtifact = {
        id: "art_mus_test_1",
        type: "music",
        title: "Tamil Romantic Melody",
        mediaUrl: "data:audio/wav;base64,UklGRgAAAABXQVZFZm10IBAAAAABAAEA...",
        status: "ready",
        createdAt: new Date().toISOString(),
      };

      const assistantMsg: ConversationMessage = {
        id: "msg_ast_creative",
        role: "assistant",
        content: "Here is your generated image and original musical composition.",
        createdAt: new Date().toISOString(),
        creativeArtifacts: [dummyImageArtifact, dummyMusicArtifact],
      };

      ConversationStore.saveMessage(conv.id, assistantMsg);

      const storedConv = ConversationStore.getConversation(conv.id);
      expect(storedConv?.messages.length).toBe(1);
      expect(storedConv?.messages[0].creativeArtifacts?.length).toBe(2);
      expect(storedConv?.messages[0].creativeArtifacts?.[0].title).toBe("Futuristic Skyline");
      expect(storedConv?.messages[0].creativeArtifacts?.[1].type).toBe("music");
    });
  });
});
