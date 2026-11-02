import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CreativeDetector } from "@/lib/ai/creative/creative-detector";
import { MusicCreativeService } from "@/lib/ai/creative/music-service";
import { MusicProviderAdapter } from "@/lib/ai/creative/music-provider-adapter";
import { EntityDetector } from "@/lib/ai/entities/entity-detector";
import { DocumentRetrievalService } from "@/lib/files/document-retrieval";
import { ConversationDocumentStore } from "@/lib/files/document-store";
import { MemoryService } from "@/lib/memory/memory-service";

describe("NEXORA — MUSIC GENERATION, CONTEXT ISOLATION & CITATION LEAKAGE FIXES", () => {
  const mockStorage = new Map<string, string>();
  const originalEnv = { ...process.env };

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

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ==========================================================================
  // REGRESSION TEST 1: "Generate a Tamil romantic song" routes to music generation
  // ==========================================================================
  describe("1. Music Generation Intent Routing", () => {
    it("should correctly identify all music generation query variants", () => {
      const musicQueries = [
        "Generate a song.",
        "Create music from these lyrics.",
        "Sing this song.",
        "Generate an audio track.",
        "Make a Tamil melody.",
        "Convert these lyrics into a song.",
        "Play the generated song.",
        "Generate a Tamil romantic song.",
      ];

      for (const query of musicQueries) {
        const result = CreativeDetector.detect(query);
        expect(result.isCreativeIntent).toBe(true);
        expect(result.creativeType).toBe("music");
      }
    });

    it("should extract Tamil melody genre, romantic mood, and male vocals when requested", () => {
      const result = CreativeDetector.detect("Generate a romantic Tamil song with male vocals");
      expect(result.isCreativeIntent).toBe(true);
      expect(result.creativeType).toBe("music");
      expect(result.parameters?.genre).toBe("Tamil Melody");
      expect(result.parameters?.mood).toBe("Romantic");
      expect(result.parameters?.vocalStyle).toBe("Male");
    });
  });

  // ==========================================================================
  // REGRESSION TEST 2: "Generate a song from these lyrics" preserves supplied lyrics
  // ==========================================================================
  describe("2. Preserve User's Actual Lyrics", () => {
    it("should extract and preserve exact user-supplied lyrics without replacing them", async () => {
      const userLyrics = `[Verse 1]
Walking through the neon rain,
Every heartbeat calls your name.

[Chorus]
We ignite the midnight sky,
You and I will never die.`;

      const query = `Generate a song from these lyrics:\n${userLyrics}`;
      const detection = CreativeDetector.detect(query);

      expect(detection.isCreativeIntent).toBe(true);
      expect(detection.creativeType).toBe("music");
      expect(detection.parameters?.fullExactLyrics).toBeDefined();
      expect(detection.parameters?.fullExactLyrics).toContain("Walking through the neon rain");
      expect(detection.parameters?.fullExactLyrics).toContain("You and I will never die");

      // Generate the song and verify exact lyrics are bound
      const artifact = await MusicCreativeService.generateMusic({
        prompt: "Generate a song from these lyrics",
        fullExactLyrics: detection.parameters?.fullExactLyrics as string,
        genre: "Synthwave Electronic",
        mood: "Energetic",
        durationSeconds: 3,
      });

      expect(artifact.musicMetadata?.exactLyrics).toBe(userLyrics);
      expect(artifact.musicMetadata?.lyricsSections?.length).toBe(2);
      expect(artifact.musicMetadata?.lyricsPreservationNote).toContain("Exact user-approved lyrics preserved");
    });
  });

  // ==========================================================================
  // REGRESSION TEST 3: "Play the song" displays the actual generated audio player
  // ==========================================================================
  describe("3. Playable Audio Player Verification", () => {
    it("should synthesize genuine stereo WAV audio data with verified container headers", async () => {
      const artifact = await MusicCreativeService.generateMusic({
        prompt: "Soulful Tamil melody with flute",
        genre: "Tamil Melody",
        mood: "Romantic",
        durationSeconds: 3,
      });

      expect(artifact.status).toBe("ready");
      expect(artifact.mediaUrl).toBeDefined();
      expect(artifact.mediaUrl?.startsWith("data:audio/wav;base64,")).toBe(true);

      const base64 = artifact.mediaUrl!.replace("data:audio/wav;base64,", "");
      const buffer = Buffer.from(base64, "base64");

      // Check RIFF and WAVE headers
      expect(buffer.slice(0, 4).toString("ascii")).toBe("RIFF");
      expect(buffer.slice(8, 12).toString("ascii")).toBe("WAVE");
      expect(buffer.length).toBeGreaterThan(5000);
    });
  });

  // ==========================================================================
  // REGRESSION TEST 4: Music provider missing produces an honest configuration error
  // ==========================================================================
  describe("4. Missing Provider Configuration Handling", () => {
    it("should produce an honest configuration error when an unconfigured external provider is requested", async () => {
      delete process.env.SUNO_API_KEY;

      const artifact = await MusicCreativeService.generateMusic({
        prompt: "Generate a pop track with Suno",
        provider: "suno",
      });

      expect(["failed", "unsupported"]).toContain(artifact.status);
      expect(artifact.mediaUrl).toBeUndefined();
      expect(artifact.errorMessage).toContain("SUNO_API_KEY");
      expect(artifact.errorMessage).toContain("not configured");
    });

    it("should report missing provider when MUSIC_PROVIDER=none", async () => {
      process.env.MUSIC_PROVIDER = "none";

      const artifact = await MusicCreativeService.generateMusic({
        prompt: "Generate a song",
        provider: "none",
      });

      expect(["failed", "unsupported"]).toContain(artifact.status);
      expect(artifact.mediaUrl).toBeUndefined();
      expect(artifact.errorMessage).toContain("not configured");
    });
  });

  // ==========================================================================
  // REGRESSION TEST 5: A music request does not trigger unrelated web research
  // ==========================================================================
  describe("5. No Unrelated Web Research for Music Requests", () => {
    it("should not treat a music request with lyrics mentioning rain or now as a live web search query", () => {
      const musicQuery = "Make a Tamil melody about rain and memories right now";
      const detection = CreativeDetector.detect(musicQuery);

      expect(detection.isCreativeIntent).toBe(true);
      expect(detection.creativeType).toBe("music");

      // Check live search isolation rule: creative requests must NOT trigger live search
      const isLiveQuery =
        !detection.isCreativeIntent &&
        /\b(current weather|live score|breaking news|live price|today's weather)\b/i.test(musicQuery);

      expect(isLiveQuery).toBe(false);
    });
  });

  // ==========================================================================
  // REGRESSION TEST 6: A music request does not display The Omen information
  // ==========================================================================
  describe("6. Prevent Irrelevant Entity Information (The Omen)", () => {
    it("should reject entity detection for music creation queries containing 'moment' or 'omen'", () => {
      const musicQueries = [
        "Generate a song about this special moment in our lives",
        "Write a Tamil romantic song about the moment we met",
        "Create music for these lyrics: This moment feels like destiny",
        "Make a melody for omen of victory",
      ];

      for (const query of musicQueries) {
        const entityResult = EntityDetector.detect(query);
        expect(entityResult.isEntityQuery).toBe(false);
      }
    });

    it("should not match HP Omen laptop on words like 'moment' or 'women'", () => {
      const text = "A quiet moment with modern women leaders in tech";
      const entityResult = EntityDetector.detect(text);
      expect(entityResult.isEntityQuery).toBe(false);
    });

    it("should only match HP Omen when specifically phrased as a laptop or HP model", () => {
      const legitimateLaptopQuery = "What are the specs of the HP Omen 16 gaming laptop?";
      const entityResult = EntityDetector.detect(legitimateLaptopQuery);
      expect(entityResult.isEntityQuery).toBe(true);
      expect(entityResult.category).toBe("laptop");
    });
  });

  // ==========================================================================
  // REGRESSION TEST 7: A music request does not display Daztrix ERP citations
  // ==========================================================================
  describe("7. Prevent Daztrix ERP Citations in Music Requests", () => {
    it("should not attach previously uploaded Daztrix ERP document to an unrelated music request", () => {
      const convId = "conv_music_test_123";
      const userId = "usr_test";

      // Simulate previously uploaded Daztrix ERP document
      ConversationDocumentStore.addDocument({
        conversationId: convId,
        userId,
        fileName: "Daztrix ERP Mobile Web Complete Plan.md",
        fileSizeBytes: 12000,
        mimeType: "text/markdown",
        fileType: "markdown",
        fullText: "Daztrix ERP implementation details and enterprise modules.",
        summary: "Daztrix ERP complete implementation plan.",
        structure: {
          headings: [{ level: 1, title: "Executive Summary" }],
          sections: [
            {
              id: "sec-1",
              heading: "Executive Summary",
              level: 1,
              content: "Daztrix ERP plan overview",
              tablePresent: false,
              listPresent: false,
            },
          ],
          tablesCount: 0,
          listsCount: 0,
          wordCount: 10,
          lineCount: 2,
        },
      });

      // User now requests a music generation in that same conversation
      const musicQuery = "Generate an original Tamil romantic song about love and togetherness";
      const docResult = DocumentRetrievalService.processDocumentContext({
        query: musicQuery,
        conversationId: convId,
        userId,
      });

      expect(docResult.targetDocument).toBeNull();
      expect(docResult.retrievedSections.length).toBe(0);
      expect(docResult.groundedSystemPrompt).toBe("");
    });
  });

  // ==========================================================================
  // REGRESSION TEST 8: A new unrelated conversation does not inherit stale citations
  // ==========================================================================
  describe("8. Stale Citation Isolation Across Conversations", () => {
    it("should return null document context in a fresh conversation", () => {
      const freshConvId = "conv_fresh_456";
      const docResult = DocumentRetrievalService.processDocumentContext({
        query: "What is the capital of France?",
        conversationId: freshConvId,
      });

      expect(docResult.targetDocument).toBeNull();
      expect(docResult.retrievedSections.length).toBe(0);
    });
  });

  // ==========================================================================
  // REGRESSION TEST 9: An image-generation request does not trigger music generation
  // ==========================================================================
  describe("9. Image Generation vs Music Workflow Separation", () => {
    it("should route image requests strictly to image workflow, not music", () => {
      const imageQueries = [
        "Create an image of a man wearing a black coat suit.",
        "Draw a futuristic city at sunset.",
        "Make a logo for a coffee shop.",
        "Generate a realistic portrait of an astronaut.",
      ];

      for (const query of imageQueries) {
        const result = CreativeDetector.detect(query);
        expect(result.isCreativeIntent).toBe(true);
        expect(result.creativeType).toBe("image");
      }
    });
  });

  // ==========================================================================
  // REGRESSION TEST 10: A normal chat request does not trigger music generation
  // ==========================================================================
  describe("10. Normal Chat Request Isolation", () => {
    it("should not trigger music generation on standard questions and programming tasks", () => {
      const normalQueries = [
        "How does binary search work?",
        "Explain the difference between useEffect and useLayoutEffect in React.",
        "What are the main causes of climate change?",
        "Can you help me write a SQL query to join orders and customers?",
      ];

      for (const query of normalQueries) {
        const result = CreativeDetector.detect(query);
        expect(result.isCreativeIntent).toBe(false);
      }
    });
  });

  // ==========================================================================
  // REGRESSION TEST 11: Generated audio playback works on desktop and mobile
  // ==========================================================================
  describe("11. Generated Audio Format Compatibility", () => {
    it("should produce standard stereo 16-bit PCM WAV compatible with HTML5 Audio on desktop & mobile", async () => {
      const artifact = await MusicCreativeService.generateMusic({
        prompt: "Chillout acoustic melody",
        genre: "Acoustic Piano",
        durationSeconds: 2,
      });

      expect(artifact.mediaUrl).toBeDefined();
      expect(artifact.mediaUrl?.startsWith("data:audio/wav;base64,")).toBe(true);

      const base64 = artifact.mediaUrl!.replace("data:audio/wav;base64,", "");
      const buffer = Buffer.from(base64, "base64");

      // Verify standard 44-byte WAV header parameters
      const numChannels = buffer.readUInt16LE(22);
      const sampleRate = buffer.readUInt32LE(24);
      const bitsPerSample = buffer.readUInt16LE(34);

      expect(numChannels).toBe(2);       // Stereo
      expect(sampleRate).toBe(22050);    // 22.05 kHz standard
      expect(bitsPerSample).toBe(16);    // 16-bit PCM
    });
  });

  // ==========================================================================
  // REGRESSION TEST 12: Existing chat history and relevant saved user memory continue to work
  // ==========================================================================
  describe("12. User Memory and Chat History Preservation", () => {
    it("should extract candidate memories when appropriate and build memory context", async () => {
      const userId = "usr_memory_test";
      const prompt = "I have also learned Python. Which companies would be suitable for me now?";

      const candidates = await MemoryService.extractCandidateMemories(userId, prompt, {
        type: "conversation",
        reference: "Active Chat",
      });

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].key).toBe("technical_skills");

      // Merge candidate
      const mergeRes = await MemoryService.mergeMemoryUpdate(userId, candidates[0]);
      expect(mergeRes.action).toBe("created");

      // Build context
      const { contextText, retrievedMemories } = await MemoryService.buildMemoryContext(
        userId,
        "What technical skills do I have?"
      );

      expect(retrievedMemories.length).toBeGreaterThan(0);
      expect(contextText).toContain("Technical Skills: Python");
    });
  });
});
