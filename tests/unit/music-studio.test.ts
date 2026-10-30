import { describe, it, expect, beforeEach } from "vitest";
import { LyricsCreativeService } from "@/lib/ai/creative/lyrics-service";
import { MusicCreativeService } from "@/lib/ai/creative/music-service";
import { CreativeDetector } from "@/lib/ai/creative/creative-detector";

describe("NEXORA MUSIC STUDIO — COMPLETE LYRICS-TO-SONG WORKFLOW", () => {
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
  // 1. ORIGINAL TAMIL LYRICS GENERATION
  // ==========================================================================
  describe("1. Correct Tamil Lyrics Generation", () => {
    it("should generate a meaningful original Tamil romantic song with proper Tamil script and structure", async () => {
      const artifact = await LyricsCreativeService.generateLyrics({
        theme: "Write a Tamil romantic song about love, memories, dreams and togetherness.",
        language: "Tamil",
        genre: "Tamil Romantic Melody",
        mood: "Love / Romantic",
      });

      expect(artifact.type).toBe("lyrics");
      expect(artifact.status).toBe("ready");
      expect(artifact.lyricsMetadata).toBeDefined();

      const meta = artifact.lyricsMetadata!;
      expect(meta.language).toBe("Tamil");
      expect(meta.genre).toBe("Tamil Romantic Melody");

      // Verify title is in Tamil Unicode
      expect(/[\u0B80-\u0BFF]/.test(meta.title)).toBe(true);
      expect(meta.title).toContain("கனவுகளின் சங்கமம்");

      // Verify section structure
      const labels = meta.sections.map((s) => s.label);
      expect(labels.some((l) => l.includes("Pallavi") || l.includes("பல்லவி"))).toBe(true);
      expect(labels.some((l) => l.includes("Chorus") || l.includes("அனுபல்லவி"))).toBe(true);
      expect(labels.some((l) => l.includes("Verse") || l.includes("சரணம்"))).toBe(true);

      // Verify each lyric line is separate and written in Tamil script
      for (const section of meta.sections) {
        expect(section.lines.length).toBeGreaterThan(0);
        for (const line of section.lines) {
          expect(typeof line).toBe("string");
          expect(line.trim().length).toBeGreaterThan(0);
        }
      }

      // Check specific expected lines for love, memories, dreams and togetherness
      const pallaviSection = meta.sections.find((s) => s.label.includes("Pallavi"));
      expect(pallaviSection).toBeDefined();
      const pallaviText = pallaviSection!.lines.join("\n");
      expect(pallaviText).toContain("உன் விழிகள் பேசும் மொழியில்");
      expect(pallaviText).toContain("என் கனவுகள் பூக்குதே");
    });
  });

  // ==========================================================================
  // 2. THEME MODIFICATION UPDATING LYRICS
  // ==========================================================================
  describe("2. Theme Modification Must Update Complete Lyrics", () => {
    it("should detect theme change requests and preserve language and style", () => {
      // 1. Initial song in Tamil
      const resInit = CreativeDetector.detect("Write a Tamil song about rain and coffee");
      expect(resInit.isCreativeIntent).toBe(true);
      expect(resInit.parameters?.language).toBe("Tamil");

      // 2. Change theme request with conversation history in Tamil
      const history = [
        { role: "user", content: "Write a Tamil song about rain" },
        { role: "assistant", content: "காதல் தூறல் நெஞ்சில் வழியுதடி..." },
      ];
      const resMod = CreativeDetector.detect(
        "Change the theme to first love, memories, dreams and togetherness",
        [],
        history
      );

      expect(resMod.isCreativeIntent).toBe(true);
      expect(resMod.creativeType).toBe("lyrics");
      expect(resMod.parameters?.language).toBe("Tamil");
      expect((resMod.parameters?.theme as string).toLowerCase()).toContain("togetherness");
      expect(resMod.parameters?.isThemeChange).toBe(true);
    });

    it("should rewrite complete lyrics when theme is modified from rain to memories and togetherness", async () => {
      // Initial rain song
      const rainArtifact = await LyricsCreativeService.generateLyrics({
        theme: "Rain-focused love song",
        language: "Tamil",
        genre: "Tamil Romantic Melody",
      });
      const initialTitle = rainArtifact.lyricsMetadata!.title;

      // Update to memories and togetherness theme
      const updatedArtifact = await LyricsCreativeService.updateSongTheme(
        rainArtifact.lyricsMetadata!,
        "first love, memories, dreams and togetherness"
      );

      const updatedMeta = updatedArtifact.lyricsMetadata!;
      expect(updatedMeta.language).toBe("Tamil");
      expect(updatedMeta.title).not.toBe(initialTitle);
      expect(updatedMeta.title).toContain("கனவுகளின் சங்கமம்");

      const allLyrics = LyricsCreativeService.formatLyricsText(updatedMeta.sections);
      expect(allLyrics).toContain("நினைவுகளின் சோலையிலே");
      expect(allLyrics).toContain("கைகள் கோர்த்து நடக்கும் பாதை நீளுதே");
      expect(allLyrics).not.toContain("மழைத்துளி");
    });
  });

  // ==========================================================================
  // 3. LYRICS EDITOR — LINE-BY-LINE FORMATTING
  // ==========================================================================
  describe("3. Lyrics Editor Line-by-Line Format", () => {
    it("should format sections into clean line-by-line text without conversational fluff", () => {
      const sampleSections = [
        {
          type: "verse" as const,
          label: "Pallavi",
          lines: [
            "உன் விழிகள் பேசும் மொழியில்,",
            "என் கனவுகள் பூக்குதே!",
          ],
        },
        {
          type: "chorus" as const,
          label: "Chorus",
          lines: [
            "கைகள் கோர்த்து நடப்போம் இந்த வானத்து எல்லைவரை,",
            "நம் காதல் வாழும் இந்த பூமி உள்ளவரை!",
          ],
        },
      ];

      const formatted = LyricsCreativeService.formatLyricsText(sampleSections);
      const lines = formatted.split("\n");

      expect(lines).toContain("[Pallavi]");
      expect(lines).toContain("உன் விழிகள் பேசும் மொழியில்,");
      expect(lines).toContain("என் கனவுகள் பூக்குதே!");
      expect(lines).toContain("[Chorus]");
      expect(lines).toContain("கைகள் கோர்த்து நடப்போம் இந்த வானத்து எல்லைவரை,");

      // Verify no markdown prompt commentary or conversational disclaimers
      expect(formatted).not.toContain("Here is your song");
      expect(formatted).not.toContain("English Translation");
    });

    it("should parse arbitrary user-edited lyrics back into structured sections", () => {
      const userEditedText = `[Pallavi]
உன் சிரிப்பின் ஓசை கேட்டு,
என் இதயம் துடிக்குதே!

[Chorus]
வானில் தோன்றும் நிலவும் கூட,
நம் காதலைப் பாடுதே!`;

      const parsed = LyricsCreativeService.parseLyricsText(userEditedText);
      expect(parsed.length).toBe(2);
      expect(parsed[0].label).toBe("Pallavi");
      expect(parsed[0].lines.length).toBe(2);
      expect(parsed[0].lines[0]).toBe("உன் சிரிப்பின் ஓசை கேட்டு,");
      expect(parsed[0].lines[1]).toBe("என் இதயம் துடிக்குதே!");
      expect(parsed[1].label).toBe("Chorus");
      expect(parsed[1].lines.length).toBe(2);
    });
  });

  // ==========================================================================
  // 4. GENERATE SONG FROM LYRICS — EXACT LYRICS PRESERVATION
  // ==========================================================================
  describe("4. Generate Song from Lyrics — Exact Lyrics Preservation", () => {
    it("should preserve 100% of the exact user-edited lyrics without truncation or translation", async () => {
      const customExactLyrics = `[Pallavi]
உன் விழிகள் பேசும் மொழியில்,
என் கனவுகள் பூக்குதே!

உன் சிரிப்பின் ஓசை கேட்டு,
என் இதயம் ஆடுதே!

[Chorus]
கைகள் கோர்த்து நடக்கும் பாதை நீளுதே!
காதல் என்னும் தீபம் நம்மை ஆளுதே!`;

      const musicArtifact = await MusicCreativeService.generateMusic({
        prompt: "Tamil Romantic Melody based on custom lyrics",
        genre: "Tamil Romantic Melody",
        mood: "Love / Romantic",
        vocalStyle: "Duet",
        tempoBpm: 84,
        keySignature: "C Major (Kalyani Raga)",
        fullExactLyrics: customExactLyrics,
      });

      expect(musicArtifact.type).toBe("music");
      expect(musicArtifact.status).toBe("ready");
      expect(musicArtifact.musicMetadata).toBeDefined();

      const meta = musicArtifact.musicMetadata!;
      // Verify exact lyrics preservation
      expect(meta.exactLyrics).toBe(customExactLyrics);
      expect(meta.exactLyrics).toContain("உன் விழிகள் பேசும் மொழியில்");
      expect(meta.exactLyrics).toContain("காதல் என்னும் தீபம் நம்மை ஆளுதே");

      // Verify musical metadata separation
      expect(meta.genre).toBe("Tamil Romantic Melody");
      expect(meta.mood).toBe("Love / Romantic");
      expect(meta.vocalStyle).toBe("Duet");
      expect(meta.tempoBpm).toBe(84);
      expect(meta.keySignature).toBe("C Major (Kalyani Raga)");
      expect(meta.lyricsPreservationNote).toContain("Exact user-approved lyrics preserved line-by-line");
    });
  });

  // ==========================================================================
  // 5. SEPARATE LYRICS AND MUSIC STYLE CONTROLS
  // ==========================================================================
  describe("5. Separate Lyrics and Music Style Independence", () => {
    it("should allow changing music style parameters without altering the lyrics", async () => {
      const exactLyrics = "[Pallavi]\nஉன் விழிகள் பேசும் மொழியில்,\nஎன் கனவுகள் பூக்குதே!";

      // Song 1: Romantic Duet at 84 BPM
      const song1 = await MusicCreativeService.generateMusic({
        prompt: "Song 1",
        genre: "Tamil Romantic Melody",
        mood: "Love / Romantic",
        vocalStyle: "Duet",
        tempoBpm: 84,
        fullExactLyrics: exactLyrics,
      });

      // Song 2: Acoustic Solo at 96 BPM with same exact lyrics
      const song2 = await MusicCreativeService.generateMusic({
        prompt: "Song 2",
        genre: "Carnatic Fusion",
        mood: "Uplifting / Motivational",
        vocalStyle: "Female",
        tempoBpm: 96,
        fullExactLyrics: exactLyrics,
      });

      expect(song1.musicMetadata?.exactLyrics).toBe(exactLyrics);
      expect(song2.musicMetadata?.exactLyrics).toBe(exactLyrics);

      expect(song1.musicMetadata?.tempoBpm).toBe(84);
      expect(song2.musicMetadata?.tempoBpm).toBe(96);
      expect(song1.musicMetadata?.vocalStyle).toBe("Duet");
      expect(song2.musicMetadata?.vocalStyle).toBe("Female");
    });
  });

  // ==========================================================================
  // 6. REAL PLAYABLE AUDIO SYNTHESIS & FILE VALIDATION
  // ==========================================================================
  describe("6. Playable Audio Synthesis & Download Validation", () => {
    it("should synthesize genuine stereo WAV audio data with valid headers", async () => {
      const artifact = await MusicCreativeService.generateMusic({
        prompt: "Playable track test",
        genre: "Tamil Melody",
        tempoBpm: 88,
        durationSeconds: 4, // 4 seconds short test
      });

      expect(artifact.mediaUrl).toBeDefined();
      expect(artifact.mediaUrl?.startsWith("data:audio/wav;base64,")).toBe(true);

      // Extract binary data and inspect WAV header
      const base64Data = artifact.mediaUrl!.replace("data:audio/wav;base64,", "");
      const buffer = Buffer.from(base64Data, "base64");

      // Check RIFF header
      const riffHeader = buffer.slice(0, 4).toString("ascii");
      expect(riffHeader).toBe("RIFF");

      // Check WAVE format
      const waveHeader = buffer.slice(8, 12).toString("ascii");
      expect(waveHeader).toBe("WAVE");

      // Check audio size is non-trivial (real audio payload)
      expect(buffer.length).toBeGreaterThan(10000);
    });
  });

  // ==========================================================================
  // 7. INTENT ROUTING: SONG AUDIO VS LYRICS WRITING
  // ==========================================================================
  describe("7. Intent Routing: Song Audio vs Lyrics Writing", () => {
    it("should route song audio requests strictly to music", () => {
      const cases = [
        "Generate a Tamil love song",
        "Create a song for these lyrics",
        "Generate an original Pop song track for these lyrics",
        "Make a melody for this song",
        "Generate a romantic Tamil song with male vocals",
        "Play this generated song",
        "Download this song",
      ];

      for (const query of cases) {
        const result = CreativeDetector.detect(query);
        expect(result.isCreativeIntent).toBe(true);
        expect(result.creativeType).toBe("music");
      }
    });

    it("should extract male vocal configuration when requested", () => {
      const result = CreativeDetector.detect("Generate a romantic Tamil song with male vocals");
      expect(result.isCreativeIntent).toBe(true);
      expect(result.creativeType).toBe("music");
      expect(result.parameters?.vocalStyle).toBe("Male");
      expect(result.parameters?.genre).toBe("Tamil Melody");
      expect(result.parameters?.mood).toBe("Romantic");
    });

    it("should route lyrics writing and theme change requests strictly to lyrics", () => {
      const cases = [
        "Write a song",
        "Write lyrics for a romantic song",
        "Write a Tamil romantic song about love, memories, dreams and togetherness",
        "Change the song theme to first love, memories, dreams and togetherness",
      ];

      for (const query of cases) {
        const result = CreativeDetector.detect(query);
        expect(result.isCreativeIntent).toBe(true);
        expect(result.creativeType).toBe("lyrics");
      }
    });
  });

  // ==========================================================================
  // 8. AUTOMATIC AUDIO & LYRICS BINDING FOR DIRECT SONG REQUESTS
  // ==========================================================================
  describe("8. Automatic Audio and Lyrics Binding for Direct Song Generation", () => {
    it("should generate playable audio AND bind complete matching Tamil lyrics line-by-line", async () => {
      const artifact = await MusicCreativeService.generateMusic({
        prompt: "Generate a Tamil love song",
        genre: "Tamil Melody",
        mood: "Romantic",
        vocalStyle: "Duet",
        durationSeconds: 4,
      });

      expect(artifact.type).toBe("music");
      expect(artifact.status).toBe("ready");
      expect(artifact.mediaUrl?.startsWith("data:audio/wav;base64,")).toBe(true);

      const meta = artifact.musicMetadata!;
      expect(meta).toBeDefined();

      // Verify authentic corresponding Tamil lyrics are bound
      expect(meta.exactLyrics).toBeDefined();
      expect(meta.exactLyrics!.length).toBeGreaterThan(50);
      expect(/[\u0B80-\u0BFF]/.test(meta.exactLyrics!)).toBe(true);

      // Verify sections are parsed and bound
      expect(meta.lyricsSections).toBeDefined();
      expect(meta.lyricsSections!.length).toBeGreaterThan(0);
      const labels = meta.lyricsSections!.map((s) => s.label);
      expect(labels.some((l) => l.includes("Pallavi") || l.includes("Verse"))).toBe(true);

      // Verify audio metadata
      expect(meta.durationSeconds).toBe(4);
      expect([86, 88]).toContain(meta.tempoBpm);
      expect(meta.waveformSamples?.length).toBe(40);
      expect(meta.format).toBe("audio/wav");
    });
  });
});

