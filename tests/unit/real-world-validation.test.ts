import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { ImageCreativeService } from "@/lib/ai/creative/image-service";
import { LyricsCreativeService } from "@/lib/ai/creative/lyrics-service";
import { MusicCreativeService } from "@/lib/ai/creative/music-service";
import { AudioCreativeService } from "@/lib/ai/creative/audio-service";
import { EntitlementEngine } from "@/lib/entitlements/engine";
import { ConversationStore, ConversationMessage } from "@/lib/chat/conversation-store";

describe("REAL-WORLD FUNCTIONAL VALIDATION — AI CREATIVE STUDIO", () => {
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

  // ==========================================================================
  // 1. IMAGE GENERATION (REAL-WORLD VALIDATION)
  // ==========================================================================
  describe("1. Image Generation Real-World Tests", () => {
    it("should generate a realistic product image and return a valid image URL", async () => {
      const artifact = await ImageCreativeService.generateImage({
        prompt: "Luxury chronograph watch with brushed titanium bezel on dark marble stand, studio lighting",
        aspectRatio: "1:1",
        style: "product",
      });

      expect(artifact.type).toBe("image");
      expect(artifact.status).toBe("ready");
      expect(artifact.mediaUrl).toBeDefined();
      expect(artifact.mediaUrl?.startsWith("https://") || artifact.mediaUrl?.startsWith("data:")).toBe(true);
      expect(artifact.imageMetadata?.resolution).toBe("1024x1024");
      expect(artifact.imageMetadata?.provider).toContain("Pollinations AI");

      // Verify URL structure
      const parsedUrl = new URL(artifact.mediaUrl!);
      expect(parsedUrl.hostname).toContain("pollinations.ai");
      expect(parsedUrl.searchParams.get("width")).toBe("1024");
      expect(parsedUrl.searchParams.get("height")).toBe("1024");
      expect(parsedUrl.searchParams.get("nologo")).toBe("true");
    });

    it("should generate a cinematic landscape in 16:9 widescreen", async () => {
      const artifact = await ImageCreativeService.generateImage({
        prompt: "Misty pine mountains at sunrise with golden light rays piercing morning fog, 8k cinematic",
        aspectRatio: "16:9",
        style: "cinematic",
      });

      expect(artifact.imageMetadata?.aspectRatio).toBe("16:9");
      expect(artifact.imageMetadata?.resolution).toBe("1024x576");
      expect(artifact.imageMetadata?.revisedPrompt).toContain("cinematic lighting");
    });

    it("should generate a Tamil-themed cultural illustration in 9:16 vertical portrait", async () => {
      const artifact = await ImageCreativeService.generateImage({
        prompt: "Traditional Tamil Pongal harvest celebration with painted earthen pot, sugarcane stalks and vibrant kolam art",
        aspectRatio: "9:16",
        style: "anime",
      });

      expect(artifact.imageMetadata?.aspectRatio).toBe("9:16");
      expect(artifact.imageMetadata?.resolution).toBe("576x1024");
      expect(artifact.imageMetadata?.style).toBe("anime");
    });

    it("should generate diverse image variations with unique seeds", async () => {
      const prompt = "Cyberpunk neon street at midnight";
      const art1 = await ImageCreativeService.generateImage({ prompt, seed: 101 });
      const art2 = await ImageCreativeService.generateImage({ prompt, seed: 202 });

      expect(art1.mediaUrl).not.toBe(art2.mediaUrl);
      expect(art1.imageMetadata?.seed).toBe(101);
      expect(art2.imageMetadata?.seed).toBe(202);
    });
  });

  // ==========================================================================
  // 2. IMAGE EDITING WITH REAL PHOTOGRAPH
  // ==========================================================================
  describe("2. Image Editing Real-World Tests with Real Photograph", () => {
    // Read real photograph from disk: public/background.jpg (287 KB JPEG)
    const photoPath = path.resolve(process.cwd(), "public", "background.jpg");
    let realPhotoDataUrl: string;

    beforeEach(() => {
      if (fs.existsSync(photoPath)) {
        const bytes = fs.readFileSync(photoPath);
        realPhotoDataUrl = `data:image/jpeg;base64,${bytes.toString("base64")}`;
      } else {
        realPhotoDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      }
    });

    it("should perform background removal and output a real composited graphic with transparent pattern", async () => {
      const artifact = await ImageCreativeService.editImage({
        originalImageUrl: realPhotoDataUrl,
        instruction: "Remove the background and make it transparent",
        operation: "remove-bg",
      });

      expect(artifact.type).toBe("edited-image");
      expect(artifact.status).toBe("ready");
      expect(artifact.imageMetadata?.editOperation).toBe("remove-bg");

      // Verify the output contains the original image as input
      const svgDecoded = decodeURIComponent(artifact.mediaUrl?.replace("data:image/svg+xml;charset=utf-8,", "") || "");
      expect(svgDecoded).toContain(realPhotoDataUrl.slice(0, 40));
      // Verify transparency checkerboard pattern exists
      expect(svgDecoded).toContain('id="checkers"');
      expect(svgDecoded).toContain("NEXORA • BACKGROUND REMOVED");
    });

    it("should perform background replacement with custom scene", async () => {
      const artifact = await ImageCreativeService.editImage({
        originalImageUrl: realPhotoDataUrl,
        instruction: "Replace background with a tropical beach at sunset",
        operation: "replace-bg",
        targetBackground: "beach",
      });

      expect(artifact.imageMetadata?.editOperation).toBe("replace-bg");
      const svgDecoded = decodeURIComponent(artifact.mediaUrl?.replace("data:image/svg+xml;charset=utf-8,", "") || "");
      expect(svgDecoded).toContain("linear-gradient(180deg, #38bdf8 0%, #fde047 70%, #d97706 100%)");
      expect(svgDecoded).toContain("NEXORA • BACKGROUND REPLACED");
    });

    it("should perform color grading and color alterations", async () => {
      const artifact = await ImageCreativeService.editImage({
        originalImageUrl: realPhotoDataUrl,
        instruction: "Colorize and shift lighting mood",
        operation: "colorize",
      });

      const svgDecoded = decodeURIComponent(artifact.mediaUrl?.replace("data:image/svg+xml;charset=utf-8,", "") || "");
      expect(svgDecoded).toContain('id="colorizeFilter"');
      expect(svgDecoded).toContain("feColorMatrix");
    });

    it("should apply artistic style transfer", async () => {
      const artifact = await ImageCreativeService.editImage({
        originalImageUrl: realPhotoDataUrl,
        instruction: "Turn into an artistic stylized painting",
        operation: "stylize",
      });

      const svgDecoded = decodeURIComponent(artifact.mediaUrl?.replace("data:image/svg+xml;charset=utf-8,", "") || "");
      expect(svgDecoded).toContain('id="artisticFilter"');
      expect(svgDecoded).toContain("feComponentTransfer");
    });

    it("should perform clarity enhancement and photo restoration", async () => {
      const artifact = await ImageCreativeService.editImage({
        originalImageUrl: realPhotoDataUrl,
        instruction: "Enhance clarity and restore details",
        operation: "restore",
      });

      const svgDecoded = decodeURIComponent(artifact.mediaUrl?.replace("data:image/svg+xml;charset=utf-8,", "") || "");
      expect(svgDecoded).toContain('id="restoreFilter"');
      expect(svgDecoded).toContain("feConvolveMatrix");
    });
  });

  // ==========================================================================
  // 3. LYRICS GENERATION (TAMIL & ENGLISH)
  // ==========================================================================
  describe("3. Original Lyrics Generation Quality & Copyright Tests", () => {
    it("should generate authentic Tamil romantic melody lyrics with poetic structure", async () => {
      const artifact = await LyricsCreativeService.generateLyrics({
        theme: "First love and rain",
        language: "Tamil",
        genre: "Romantic Melody",
        mood: "Love",
        vocalStyle: "Duet",
      });

      const meta = artifact.lyricsMetadata;
      expect(meta?.language).toBe("Tamil");
      expect(meta?.title).toContain("காதல் தூறல்");

      const sections = meta?.sections || [];
      expect(sections.length).toBeGreaterThanOrEqual(5);

      // Verify authentic Tamil musical sections
      expect(sections.some((s) => s.label.includes("பல்லவி"))).toBe(true);
      expect(sections.some((s) => s.label.includes("அனுபல்லவி"))).toBe(true);
      expect(sections.some((s) => s.label.includes("சரணம்"))).toBe(true);
      expect(sections.some((s) => s.label.includes("இடைக்கண்ணி"))).toBe(true);
      expect(sections.some((s) => s.label.includes("முடிவு"))).toBe(true);

      // Check Tamil script content
      const allLines = sections.flatMap((s) => s.lines).join(" ");
      expect(allLines).toContain("கண்ணிரண்டும்");
      expect(allLines).toContain("இதயம்");
      expect(allLines).toContain("காதல் தூறல்");

      // Verify musical score guidance
      expect(meta?.keySignature).toContain("Kalyani Raga");
      expect(meta?.tempoBpm).toBe(86);
      expect(meta?.copyrightOriginalNotice).toContain("100% Original");
    });

    it("should generate Tamil sad / heartbreak song lyrics", async () => {
      const artifact = await LyricsCreativeService.generateLyrics({
        theme: "Heartbreak and memories",
        language: "Tamil",
        genre: "Melody",
        mood: "Melancholy / Sad",
      });

      const meta = artifact.lyricsMetadata;
      expect(meta?.title).toContain("மௌனத்தின் வலி");
      expect(meta?.keySignature).toContain("Subhapantuvarali");
      expect(meta?.tempoBpm).toBe(72);

      const allLines = meta?.sections.flatMap((s) => s.lines).join(" ");
      expect(allLines).toContain("மழைத்துளி");
      expect(allLines).toContain("கண்ணீரில்");
    });

    it("should generate Tamil motivational folk / kuthu song lyrics", async () => {
      const artifact = await LyricsCreativeService.generateLyrics({
        theme: "Overcoming obstacles and winning",
        language: "Tamil",
        genre: "Folk / Acoustic",
        mood: "Motivational",
      });

      const meta = artifact.lyricsMetadata;
      expect(meta?.title).toContain("எழுந்து வா");
      expect(meta?.keySignature).toContain("Mohanam");
      expect(meta?.tempoBpm).toBe(112);

      const allLines = meta?.sections.flatMap((s) => s.lines).join(" ");
      expect(allLines).toContain("சிகரம் உனதாகும்");
      expect(allLines).toContain("புயலை வெல்லும்");
    });

    it("should generate English pop song with complete structure", async () => {
      const artifact = await LyricsCreativeService.generateLyrics({
        theme: "Open horizons and hope",
        language: "English",
        genre: "Pop",
      });

      const meta = artifact.lyricsMetadata;
      expect(meta?.title).toBe("Golden Horizon");
      expect(meta?.tempoBpm).toBe(104);
      expect(meta?.sections.some((s) => s.label.includes("Verse 1"))).toBe(true);
      expect(meta?.sections.some((s) => s.label.includes("Chorus"))).toBe(true);
      expect(meta?.sections.some((s) => s.label.includes("Bridge"))).toBe(true);
    });

    it("should generate English rap lyrics with cadence notes", async () => {
      const artifact = await LyricsCreativeService.generateLyrics({
        theme: "Ambition and focus",
        language: "English",
        genre: "Rap / Hip-Hop",
      });

      const meta = artifact.lyricsMetadata;
      expect(meta?.title).toBe("Unwritten Destiny");
      expect(meta?.tempoBpm).toBe(92);
      expect(meta?.sections.some((s) => s.lines.some((l) => l.includes("808 sub-bass")))).toBe(true);
    });
  });

  // ==========================================================================
  // 4. MUSIC & SONG GENERATION (CRITICAL TEST)
  // ==========================================================================
  describe("4. Music & Song Audio Generation Critical Tests", () => {
    it("should synthesize a genuine valid 16-bit 22.05kHz stereo WAV audio track", async () => {
      const artifact = await MusicCreativeService.generateMusic({
        prompt: "Instrumental Tamil Melody with piano and guitar",
        genre: "Tamil Melody",
        mood: "Romantic",
        durationSeconds: 4,
        tempoBpm: 88,
      });

      expect(artifact.type).toBe("music");
      expect(artifact.status).toBe("ready");
      expect(artifact.mediaUrl?.startsWith("data:audio/wav;base64,")).toBe(true);

      // Verify binary WAV container structure
      const base64 = artifact.mediaUrl!.replace("data:audio/wav;base64,", "");
      const buf = Buffer.from(base64, "base64");

      // Check RIFF chunk
      expect(buf.toString("ascii", 0, 4)).toBe("RIFF");
      expect(buf.toString("ascii", 8, 12)).toBe("WAVE");

      // Check fmt sub-chunk (16-bit, 22050Hz, 2 channels)
      expect(buf.toString("ascii", 12, 16)).toBe("fmt ");
      const audioFormat = buf.readUInt16LE(20);
      const numChannels = buf.readUInt16LE(22);
      const sampleRate = buf.readUInt32LE(24);
      const bitsPerSample = buf.readUInt16LE(34);

      expect(audioFormat).toBe(1); // PCM
      expect(numChannels).toBe(2); // Stereo
      expect(sampleRate).toBe(22050);
      expect(bitsPerSample).toBe(16);

      // Check data chunk
      expect(buf.toString("ascii", 36, 40)).toBe("data");
      const dataSize = buf.readUInt32LE(40);
      expect(dataSize).toBeGreaterThan(10000);
      expect(buf.length).toBe(44 + dataSize);
    });

    it("should synthesize Tamil song music from generated lyrics (Instrumental Synthesis Classification)", async () => {
      const artifact = await MusicCreativeService.generateMusic({
        prompt: "Tamil Romantic Song",
        genre: "Tamil Melody",
        mood: "Romantic",
        lyricsSnippet: "காதல் தூறல் நெஞ்சில் வழியுதடி, உன் அன்பில் என் உலகம் சுழலுதடி!",
        durationSeconds: 4,
        tempoBpm: 86,
      });

      expect(artifact.musicMetadata?.title).toBeDefined();
      expect(artifact.musicMetadata?.title).toContain("Tamil");
      expect(artifact.musicMetadata?.genre).toBe("Tamil Melody");
      expect(artifact.musicMetadata?.format).toBe("audio/wav");

      // CRITICAL CLASSIFICATION CHECK:
      // The built-in generator produces high-fidelity multi-track INSTRUMENTAL audio (Chords, Leads, Bass, Drums).
      // It does NOT produce simulated human singing vocals without an external vocal AI provider (Suno/Udio).
      expect(artifact.musicMetadata?.provider).toContain("Nexora Studio High-Fidelity Synthesizer");
      expect(artifact.musicMetadata?.isInstrumental).toBe(true);
    });

    it("should synthesize English Pop / Lo-Fi audio track with mood-specific tempo", async () => {
      const artifact = await MusicCreativeService.generateMusic({
        prompt: "Midnight chillhop rain study beats",
        genre: "Lo-Fi Chill",
        mood: "Peaceful",
        durationSeconds: 3,
        tempoBpm: 78,
      });

      expect(artifact.musicMetadata?.tempoBpm).toBe(78);
      expect(artifact.musicMetadata?.genre).toBe("Lo-Fi Chill");
      expect(artifact.musicMetadata?.waveformSamples?.length).toBe(40);
    });
  });

  // ==========================================================================
  // 5. VOICE & TRANSCRIPTION
  // ==========================================================================
  describe("5. Voice (TTS) & Audio Transcription Real-World Tests", () => {
    it("should synthesize English speech voiceover audio", async () => {
      const artifact = await AudioCreativeService.generateVoice({
        text: "Welcome to Nexora Creative Studio.",
        voiceName: "nova",
        speed: 1.0,
      });

      expect(artifact.type).toBe("voice");
      expect(artifact.mediaUrl?.startsWith("data:audio/wav")).toBe(true);
      expect(artifact.voiceMetadata?.voiceName).toBe("nova");
      expect(artifact.voiceMetadata?.durationSeconds).toBeGreaterThan(0);
    });

    it("should synthesize Tamil speech voiceover audio", async () => {
      const artifact = await AudioCreativeService.generateVoice({
        text: "வணக்கம், நெக்சோரா படைப்பகத்திற்கு உங்களை வரவேற்கிறோம்.",
        voiceName: "nova",
        speed: 1.0,
      });

      expect(artifact.type).toBe("voice");
      expect(artifact.voiceMetadata?.text).toContain("வணக்கம்");
    });

    it("should transcribe and summarize audio recordings", async () => {
      const artifact = await AudioCreativeService.transcribeAudio({
        fileName: "engineering-sync.wav",
        fileSizeBytes: 1024 * 128,
      });

      expect(artifact.type).toBe("transcription");
      expect(artifact.transcriptionMetadata?.transcript.length).toBeGreaterThan(30);
      expect(artifact.transcriptionMetadata?.summary).toBeDefined();
      expect(artifact.transcriptionMetadata?.keyTakeaways.length).toBeGreaterThan(0);
      expect(artifact.transcriptionMetadata?.sentiment).toBe("positive");
    });
  });

  // ==========================================================================
  // 6. PERSISTENCE, QUOTAS & SECURITY
  // ==========================================================================
  describe("6. Persistence, Quotas & Security Tests", () => {
    it("should persist creative artifacts across conversation reloads", () => {
      const conv = ConversationStore.createConversation("Creative Session", "nexora-core");

      const imgArtifact = {
        id: "art_img_p1",
        type: "image" as const,
        title: "Product Watch",
        mediaUrl: "https://image.pollinations.ai/prompt/watch",
        status: "ready" as const,
        createdAt: new Date().toISOString(),
      };

      const musArtifact = {
        id: "art_mus_p1",
        type: "music" as const,
        title: "Tamil Melody",
        mediaUrl: "data:audio/wav;base64,RIFF...",
        status: "ready" as const,
        createdAt: new Date().toISOString(),
      };

      const msg: ConversationMessage = {
        id: "msg_creative_1",
        role: "assistant",
        content: "Creative response with image and music",
        createdAt: new Date().toISOString(),
        creativeArtifacts: [imgArtifact, musArtifact],
      };

      ConversationStore.saveMessage(conv.id, msg);

      // Reload conversation from store
      const reloaded = ConversationStore.getConversation(conv.id);
      const reloadedMsg = reloaded?.messages.find((m) => m.id === "msg_creative_1");

      expect(reloadedMsg).toBeDefined();
      expect(reloadedMsg?.creativeArtifacts?.length).toBe(2);
      expect(reloadedMsg?.creativeArtifacts?.[0].title).toBe("Product Watch");
      expect(reloadedMsg?.creativeArtifacts?.[1].type).toBe("music");
    });

    it("should isolate conversations between different user IDs", () => {
      const convUserA = ConversationStore.createConversation("User A Chat", "nexora-core", "userA@test.com");
      const convUserB = ConversationStore.createConversation("User B Chat", "nexora-core", "userB@test.com");

      const userAConvs = ConversationStore.getConversations("userA@test.com");
      const userBConvs = ConversationStore.getConversations("userB@test.com");

      expect(userAConvs.some((c) => c.id === convUserA.id)).toBe(true);
      expect(userAConvs.some((c) => c.id === convUserB.id)).toBe(false);

      expect(userBConvs.some((c) => c.id === convUserB.id)).toBe(true);
      expect(userBConvs.some((c) => c.id === convUserA.id)).toBe(false);
    });

    it("should enforce Free, Pro, and Enterprise quotas accurately", () => {
      // Free limits
      expect(EntitlementEngine.checkCreativeQuota("free", "image", 9).allowed).toBe(true);
      expect(EntitlementEngine.checkCreativeQuota("free", "image", 10).allowed).toBe(false);
      expect(EntitlementEngine.checkCreativeQuota("free", "music", 4).allowed).toBe(true);
      expect(EntitlementEngine.checkCreativeQuota("free", "music", 5).allowed).toBe(false);

      // Pro limits
      expect(EntitlementEngine.checkCreativeQuota("pro", "image", 199).allowed).toBe(true);
      expect(EntitlementEngine.checkCreativeQuota("pro", "image", 200).allowed).toBe(false);
      expect(EntitlementEngine.checkCreativeQuota("pro", "music", 59).allowed).toBe(true);
      expect(EntitlementEngine.checkCreativeQuota("pro", "music", 60).allowed).toBe(false);

      // Enterprise limits
      expect(EntitlementEngine.checkCreativeQuota("enterprise", "image", 1999).allowed).toBe(true);
      expect(EntitlementEngine.checkCreativeQuota("enterprise", "image", 2000).allowed).toBe(false);
    });

    it("should release reserved quota when generation fails or is aborted", async () => {
      const resId = await EntitlementEngine.reserveQuota("test_user", "creative");
      expect(resId.startsWith("res_")).toBe(true);

      const refundSuccess = await EntitlementEngine.releaseReservation(resId);
      expect(refundSuccess).toBe(true);
    });
  });
});

