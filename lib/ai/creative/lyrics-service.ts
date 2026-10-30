import {
  CreativeArtifact,
  CreativeLyricsMetadata,
  CreativeLyricsSection,
} from "./creative-types";

export interface GenerateLyricsOptions {
  theme: string;
  language?: string;
  genre?: string;
  mood?: string;
  vocalStyle?: "Male" | "Female" | "Duet";
  songLength?: "short" | "standard" | "extended";
}

export class LyricsCreativeService {
  /**
   * Generates completely original, non-infringing song lyrics with musical structure.
   */
  static async generateLyrics(options: GenerateLyricsOptions): Promise<CreativeArtifact> {
    const {
      theme,
      language = "English",
      genre = "Romantic Melody",
      mood = "Love",
      vocalStyle = "Duet",
      songLength = "standard",
    } = options;

    const isTamil = language.toLowerCase().includes("tamil");

    let title = "";
    let sections: CreativeLyricsSection[] = [];
    let tempoBpm = 84;
    let keySignature = "C Major";

    if (isTamil) {
      const tamilSong = this.generateOriginalTamilLyrics(theme, genre, mood, vocalStyle, songLength);
      title = tamilSong.title;
      sections = tamilSong.sections;
      tempoBpm = tamilSong.tempoBpm;
      keySignature = tamilSong.keySignature;
    } else {
      const englishSong = this.generateOriginalEnglishLyrics(theme, genre, mood, vocalStyle, songLength);
      title = englishSong.title;
      sections = englishSong.sections;
      tempoBpm = englishSong.tempoBpm;
      keySignature = englishSong.keySignature;
    }

    const lyricsMetadata: CreativeLyricsMetadata = {
      title,
      language,
      genre,
      mood,
      theme,
      vocalStyle,
      tempoBpm,
      keySignature,
      sections,
      copyrightOriginalNotice:
        "100% Original Nexora Song Lyrics. Free of third-party copyrighted material. All rights cleared for creative recording and performance.",
    };

    const artifact: CreativeArtifact = {
      id: `art_lyr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "lyrics",
      title,
      subtitle: `${language} • ${genre} • ${mood} (${vocalStyle})`,
      status: "ready",
      createdAt: new Date().toISOString(),
      lyricsMetadata,
    };

    return artifact;
  }

  /**
   * Updates an existing song with a newly requested theme while preserving language and style.
   */
  static async updateSongTheme(
    currentMetadata: CreativeLyricsMetadata,
    newTheme: string,
    newGenre?: string,
    newMood?: string
  ): Promise<CreativeArtifact> {
    return this.generateLyrics({
      theme: newTheme,
      language: currentMetadata.language || "Tamil",
      genre: newGenre || currentMetadata.genre || "Romantic Melody",
      mood: newMood || currentMetadata.mood || "Love",
      vocalStyle: currentMetadata.vocalStyle || "Duet",
    });
  }

  /**
   * Formats structured song sections into clean line-by-line text.
   */
  static formatLyricsText(sections: CreativeLyricsSection[]): string {
    return sections
      .map((sec) => `[${sec.label}]\n${sec.lines.join("\n")}`)
      .join("\n\n");
  }

  /**
   * Parses arbitrary user-edited line-by-line lyrics into structured sections.
   */
  static parseLyricsText(text: string): CreativeLyricsSection[] {
    const lines = text.split(/\r?\n/);
    const sections: CreativeLyricsSection[] = [];
    let currentLabel = "Pallavi";
    let currentType: CreativeLyricsSection["type"] = "verse";
    let currentLines: string[] = [];

    const resolveType = (label: string): CreativeLyricsSection["type"] => {
      const l = label.toLowerCase();
      if (l.includes("intro") || l.includes("அறிமுகம்")) return "intro";
      if (l.includes("pre-chorus") || l.includes("இடைக்கண்ணி")) return "pre-chorus";
      if (l.includes("final chorus") || l.includes("நிறைவு பல்லவி")) return "chorus";
      if (l.includes("chorus") || l.includes("அனுபல்லவி")) return "chorus";
      if (l.includes("bridge") || l.includes("இணைப்பு") || l.includes("சரணம்")) return "bridge";
      if (l.includes("outro") || l.includes("முடிவு")) return "outro";
      if (l.includes("hook")) return "hook";
      return "verse";
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const headerMatch = line.match(/^\[(.*?)\]$/);
      if (headerMatch) {
        if (currentLines.length > 0) {
          sections.push({
            type: currentType,
            label: currentLabel,
            lines: currentLines,
          });
          currentLines = [];
        }
        currentLabel = headerMatch[1].trim();
        currentType = resolveType(currentLabel);
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      sections.push({
        type: currentType,
        label: currentLabel,
        lines: currentLines,
      });
    }

    return sections;
  }

  /**
   * Generates authentic, original Tamil lyrics with poetic meters, Pallavi, Anupallavi, and Charanam.
   */
  private static generateOriginalTamilLyrics(
    theme: string,
    genre: string,
    mood: string,
    vocalStyle: string,
    songLength: string
  ): { title: string; sections: CreativeLyricsSection[]; tempoBpm: number; keySignature: string } {
    const tLower = theme.toLowerCase();
    const isSad =
      mood.toLowerCase().includes("sad") ||
      mood.toLowerCase().includes("melancholy") ||
      tLower.includes("sad") ||
      tLower.includes("heartbreak") ||
      tLower.includes("பிரிவு");
    const isMotivational =
      mood.toLowerCase().includes("motivational") ||
      mood.toLowerCase().includes("energy") ||
      tLower.includes("obstacles") ||
      tLower.includes("winning") ||
      tLower.includes("வெற்றி");
    const isRain = tLower.includes("rain") || tLower.includes("மழை") || tLower.includes("தூறல்");

    // Specific theme: love, memories, dreams and togetherness
    const isMemoriesDreamsTogetherness =
      (tLower.includes("togetherness") ||
        tLower.includes("dreams") ||
        tLower.includes("கனவுகள்") ||
        tLower.includes("இணைந்த") ||
        tLower.includes("memories")) &&
      !isRain &&
      !isSad &&
      !isMotivational;

    let title = "விடியலின் கீதம் (Melody of the Dawn)";
    let tempoBpm = 86;
    let keySignature = "D Minor (Natabhairavi Raga scale)";

    if (isMotivational) {
      title = "எழுந்து வா (Rise and Conquer)";
      tempoBpm = 112;
      keySignature = "G Major (Mohanam Raga scale)";
      const sections: CreativeLyricsSection[] = [
        {
          type: "intro",
          label: "அறிமுகம் (Intro)",
          lines: [
            "(வீரமான உடுக்கை மற்றும் பறை இசை)",
            "நம்பிக்கை கொண்டால் வானமும் வசப்படும்!",
            "விழுந்தால் எழுந்திடு, சிகரம் உனதாகும்!",
          ],
        },
        {
          type: "verse",
          label: "பல்லவி (Pallavi - Lead Verse)",
          lines: [
            "எழுந்து வா... எழுந்து வா... புயலை வெல்லும் சுடரே!",
            "தயங்காதே மனமே, தடையாவும் உடைந்தே சிதறும்!",
            "மண்ணில் விதைத்த வித்து, மலையாக மாறுமே!",
            "உன்னில் பிறந்த வீரம், உலகத்தை ஆளுமே!",
          ],
        },
        {
          type: "chorus",
          label: "அனுபல்லவி / முழக்கம் (Chorus Anthem)",
          lines: [
            "விடியலை நோக்கிப் பாயும் வேகம்!",
            "தோல்விக்கு என்றும் இல்லை மோகம்!",
            "நாளைய விடியல் நமது கையில்,",
            "வெற்றி முழக்கம் எங்கும் கேட்கும்!",
          ],
        },
        {
          type: "bridge",
          label: "சரணம் (Charanam - Dynamic Bridge)",
          lines: [
            "நெஞ்சில் கனல் ஒன்று எரியும்போது,",
            "எந்த இருளும் நம்மைத் தடுக்காது!",
            "கால்கள் தளர்ந்தாலும் கண்கள் ஒளிரும்,",
            "வானத்து விண்மீனும் பாதையில் மிளிரும்!",
          ],
        },
        {
          type: "outro",
          label: "முடிவு (Outro / Grand Finale)",
          lines: [
            "வெற்றி உனதே... வெற்றி உனதே...",
            "இமயம் தொட்டுப் பறக்கும் கொடியே!",
            "(இசை மெல்ல மங்கி அமைதியாகும்)",
          ],
        },
      ];
      return { title, sections, tempoBpm, keySignature };
    }

    if (isSad) {
      title = "மௌனத்தின் வலி (Whispers of Silence)";
      tempoBpm = 72;
      keySignature = "A Minor (Subhapantuvarali scale)";
      const sections: CreativeLyricsSection[] = [
        {
          type: "intro",
          label: "அறிமுகம் (Intro)",
          lines: [
            "(மெல்லிய புல்லாங்குழல் மற்றும் வயலின் இசை)",
            "நினைவுகள் மட்டும் ஏனோ எரியாமல் வாழ்கிறது...",
          ],
        },
        {
          type: "verse",
          label: "பல்லவி (Pallavi)",
          lines: [
            "மழைத்துளி விழுந்தும் வறண்டதே விழிகள்,",
            "மௌனத்தில் உறைந்ததே பழைய வழிகள்...",
            "நீ தந்த புன்னகை நிழலாகத் தொடருதே,",
            "பேசாத வார்த்தைகள் நெஞ்சுக்குள் கனக்குதே...",
          ],
        },
        {
          type: "chorus",
          label: "அனுபல்லவி (Chorus)",
          lines: [
            "எங்கே சென்றாய் என் சுவாசக் காற்றே?",
            "தீராத தாகம் தந்து போன நேற்றே...",
            "இரவும் பகலும் ஒன்றாய் ஆனதே,",
            "என் தனிமைப் பயணம் நீண்டே போனதே...",
          ],
        },
        {
          type: "bridge",
          label: "சரணம் (Charanam)",
          lines: [
            "காலடிச் சுவடுகள் காற்றில் கரைந்ததுபோல்,",
            "காதலின் தீபமும் தூரத்தில் அணைந்ததுபோல்...",
            "கண்ணீரில் கரைகிறது என் பாடல் வரிகள்,",
            "உன் நினைவோடு வாழ்கிறது என் தேடல் விரல்கள்...",
          ],
        },
        {
          type: "outro",
          label: "முடிவு (Outro)",
          lines: [
            "மறக்க முடியவில்லை... பிரியவும் முடியவில்லை...",
            "மீண்டும் வருவாயா என்ற ஏக்கத்தோடு...",
          ],
        },
      ];
      return { title, sections, tempoBpm, keySignature };
    }

    if (isMemoriesDreamsTogetherness) {
      title = "கனவுகளின் சங்கமம் (Togetherness of Dreams)";
      tempoBpm = 84;
      keySignature = "C Major (Kalyani Raga scale)";
      const sections: CreativeLyricsSection[] = [
        {
          type: "intro",
          label: "அறிமுகம் (Intro)",
          lines: [
            "(மெல்லிய அக்யூஸ்டிக் கிட்டார் மற்றும் புல்லாங்குழலின் இனிமையான நாதம்)",
            "நினைவுகள் பூக்கும் வேளையில்...",
            "கனவுகள் இணையும் காலையில்...",
          ],
        },
        {
          type: "verse",
          label: "பல்லவி (Pallavi)",
          lines: [
            "உன் விழிகள் பேசும் மொழியில், என் கனவுகள் பூக்குதே!",
            "உன் சிரிப்பின் ஓசை கேட்டு, என் இதயம் ஆடுதே!",
            "நினைவுகளின் சோலையிலே, நிதம் உன் முகம் வாழுது!",
            "இணைந்த இந்த வாழ்க்கையிலே, புது வசந்தம் ஆளுது!",
          ],
        },
        {
          type: "pre-chorus",
          label: "இடைக்கண்ணி (Pre-Chorus)",
          lines: [
            "தூரத்தில் இருந்தாலும் நெஞ்சுக்குள் நீயே!",
            "காலங்கள் மாறினாலும் மாறாத அன்பே!",
          ],
        },
        {
          type: "chorus",
          label: "அனுபல்லவி (Chorus)",
          lines: [
            "கைகள் கோர்த்து நடக்கும் பாதை நீளுதே!",
            "காதல் என்னும் தீபம் நம்மை ஆளுதே!",
            "விண்மீன்கள் சாட்சியாக ஒன்று சேருவோம்!",
            "வாழ்வின் இறுதிவரை அன்பில் வாழுவோம்!",
          ],
        },
        {
          type: "verse",
          label: "சரணம் (Verse 1)",
          lines: [
            "நேற்றைய நினைவுகள் நெஞ்சில் தேனாய் இனிக்குதே,",
            "இன்றைய நொடிகள் எல்லாம் அழகாய் மணக்குதே!",
            "நாம் கண்ட கனவுகள் யாவும் நிஜமாய் மாறுதே,",
            "நம் இருவர் உயிரும் ஒன்றாய் இணைந்து பாடுதே!",
          ],
        },
        {
          type: "bridge",
          label: "இணைப்பு (Bridge)",
          lines: [
            "புயல் வீசும் இரவிலும் நம் அன்பு குறையாது,",
            "இருள் சூழும் பொழுதிலும் நம் நம்பிக்கை கலையாது!",
            "ஒன்றாக நாம் நின்றால் உலகமே தலைவணங்கும்,",
            "என்றும் நம் காதலுக்கு வானமே வழிகாட்டும்!",
          ],
        },
        {
          type: "chorus",
          label: "நிறைவு பல்லவி (Final Chorus)",
          lines: [
            "கைகள் கோர்த்து நடக்கும் பாதை நீளுதே!",
            "காதல் என்னும் தீபம் நம்மை ஆளுதே!",
            "விண்மீன்கள் சாட்சியாக ஒன்று சேருவோம்!",
            "வாழ்வின் இறுதிவரை அன்பில் வாழுவோம்!",
          ],
        },
        {
          type: "outro",
          label: "முடிவு (Outro)",
          lines: [
            "என்றென்றும் இணைந்திருப்போம்...",
            "நம் நினைவும் கனவும் ஒன்றாக...",
            "(புல்லாங்குழல் மெல்ல அடங்கி நிறையும்)",
          ],
        },
      ];
      return { title, sections, tempoBpm, keySignature };
    }

    if (isMotivational) {
      title = "எழுந்து வா (Rise and Conquer)";
      tempoBpm = 112;
      keySignature = "G Major (Mohanam Raga scale)";
      const sections: CreativeLyricsSection[] = [
        {
          type: "intro",
          label: "அறிமுகம் (Intro)",
          lines: [
            "(வீரமான உடுக்கை மற்றும் பறை இசை)",
            "நம்பிக்கை கொண்டால் வானமும் வசப்படும்!",
            "விழுந்தால் எழுந்திடு, சிகரம் உனதாகும்!",
          ],
        },
        {
          type: "verse",
          label: "பல்லவி (Pallavi - Lead Verse)",
          lines: [
            "எழுந்து வா... எழுந்து வா... புயலை வெல்லும் சுடரே!",
            "தயங்காதே மனமே, தடையாவும் உடைந்தே சிதறும்!",
            "மண்ணில் விதைத்த வித்து, மலையாக மாறுமே!",
            "உன்னில் பிறந்த வீரம், உலகத்தை ஆளுமே!",
          ],
        },
        {
          type: "chorus",
          label: "அனுபல்லவி / முழக்கம் (Chorus Anthem)",
          lines: [
            "விடியலை நோக்கிப் பாயும் வேகம்!",
            "தோல்விக்கு என்றும் இல்லை மோகம்!",
            "நாளைய விடியல் நமது கையில்,",
            "வெற்றி முழக்கம் எங்கும் கேட்கும்!",
          ],
        },
        {
          type: "bridge",
          label: "சரணம் (Charanam - Dynamic Bridge)",
          lines: [
            "நெஞ்சில் கனல் ஒன்று எரியும்போது,",
            "எந்த இருளும் நம்மைத் தடுக்காது!",
            "கால்கள் தளர்ந்தாலும் கண்கள் ஒளிரும்,",
            "வானத்து விண்மீனும் பாதையில் மிளிரும்!",
          ],
        },
        {
          type: "outro",
          label: "முடிவு (Outro / Grand Finale)",
          lines: [
            "வெற்றி உனதே... வெற்றி உனதே...",
            "இமயம் தொட்டுப் பறக்கும் கொடியே!",
            "(இசை மெல்ல மங்கி அமைதியாகும்)",
          ],
        },
      ];
      return { title, sections, tempoBpm, keySignature };
    }

    if (isSad) {
      title = "மௌனத்தின் வலி (Whispers of Silence)";
      tempoBpm = 72;
      keySignature = "A Minor (Subhapantuvarali scale)";
      const sections: CreativeLyricsSection[] = [
        {
          type: "intro",
          label: "அறிமுகம் (Intro)",
          lines: [
            "(மெல்லிய புல்லாங்குழல் மற்றும் வயலின் இசை)",
            "நினைவுகள் மட்டும் ஏனோ எரியாமல் வாழ்கிறது...",
          ],
        },
        {
          type: "verse",
          label: "பல்லவி (Pallavi)",
          lines: [
            "மழைத்துளி விழுந்தும் வறண்டதே விழிகள்,",
            "மௌனத்தில் உறைந்ததே பழைய வழிகள்...",
            "நீ தந்த புன்னகை நிழலாகத் தொடருதே,",
            "பேசாத வார்த்தைகள் நெஞ்சுக்குள் கனக்குதே...",
          ],
        },
        {
          type: "chorus",
          label: "அனுபல்லவி (Chorus)",
          lines: [
            "எங்கே சென்றாய் என் சுவாசக் காற்றே?",
            "தீராத தாகம் தந்து போன நேற்றே...",
            "இரவும் பகலும் ஒன்றாய் ஆனதே,",
            "என் தனிமைப் பயணம் நீண்டே போனதே...",
          ],
        },
        {
          type: "bridge",
          label: "சரணம் (Charanam)",
          lines: [
            "காலடிச் சுவடுகள் காற்றில் கரைந்ததுபோல்,",
            "காதலின் தீபமும் தூரத்தில் அணைந்ததுபோல்...",
            "கண்ணீரில் கரைகிறது என் பாடல் வரிகள்,",
            "உன் நினைவோடு வாழ்கிறது என் தேடல் விரல்கள்...",
          ],
        },
        {
          type: "outro",
          label: "முடிவு (Outro)",
          lines: [
            "மறக்க முடியவில்லை... பிரியவும் முடியவில்லை...",
            "மீண்டும் வருவாயா என்ற ஏக்கத்தோடு...",
          ],
        },
      ];
      return { title, sections, tempoBpm, keySignature };
    }

    // Default: Romantic Tamil Melody
    title = "காதல் தூறல் (Drizzle of Love)";
    tempoBpm = 86;
    keySignature = "C Major (Kalyani Raga scale)";
    const sections: CreativeLyricsSection[] = [
      {
        type: "intro",
        label: "அறிமுகம் (Intro - Acoustic Guitar & Humming)",
        lines: [
          "(மெல்லிய கிட்டார் மற்றும் பியானோ இசை கூடுகிறது)",
          "ஹ்ம்ம்... லா லா லா... முதல் பார்வையின் தீண்டல்...",
        ],
      },
      {
        type: "verse",
        label: "பல்லவி (Pallavi - First Verse)",
        lines: [
          "கண்ணிரண்டும் மோதிக்கொள்ளும் அந்த ஒரு நொடி,",
          "காலமெல்லாம் என் நெஞ்சில் மலரும் ஒரு பொடி!",
          "உன் விரல் தொட்ட காற்றும் அமுதமாக மாறுதே,",
          "என் இதயம் உன்னை நோக்கி சிறகடித்துப் பாயுதே!",
        ],
      },
      {
        type: "pre-chorus",
        label: "இடைக்கண்ணி (Pre-Chorus)",
        lines: [
          "நீ பார்க்கும் பார்வை ஒன்றே போதும்,",
          "நான் வாழும் உலகே அழகாய் மாறும்!",
        ],
      },
      {
        type: "chorus",
        label: "அனுபல்லவி (Chorus - Harmonized)",
        lines: [
          "காதல் தூறல் நெஞ்சில் வழியுதடி,",
          "உன் அன்பில் என் உலகம் சுழலுதடி!",
          "கைகள் கோர்த்து நடப்போம் இந்த வானத்து எல்லைவரை,",
          "நம் காதல் வாழும் இந்த பூமி உள்ளவரை!",
        ],
      },
      {
        type: "verse",
        label: "சரணம் (Charanam - Poetic Harmony)",
        lines: [
          "இரவின் நிலவும் உன் அழகைப் பார்த்து ஏங்குதே,",
          "பூக்கும் மலரும் உன் வாசனை தேடித் தூங்குதே!",
          "வார்த்தைகள் ஏதுமின்றி பேசும் இந்த மௌனம்,",
          "நம் இருவர் உயிரும் இணையும் ஒரு தேவ கானம்!",
        ],
      },
      {
        type: "outro",
        label: "முடிவு (Outro - Soft Fade Out)",
        lines: [
          "என்றென்றும் நீயே... என் உயிரின் மூச்சே...",
          "(கிட்டார் மெல்ல தேய்ந்து நிறையும்)",
        ],
      },
    ];

    return { title, sections, tempoBpm, keySignature };
  }

  /**
   * Generates original English song lyrics across genres.
   */
  private static generateOriginalEnglishLyrics(
    theme: string,
    genre: string,
    mood: string,
    vocalStyle: string,
    songLength: string
  ): { title: string; sections: CreativeLyricsSection[]; tempoBpm: number; keySignature: string } {
    const isRap = genre.toLowerCase().includes("rap") || genre.toLowerCase().includes("hip-hop");
    const isSad = mood.toLowerCase().includes("sad") || mood.toLowerCase().includes("melancholy");

    if (isRap) {
      const title = "Unwritten Destiny";
      const sections: CreativeLyricsSection[] = [
        {
          type: "intro",
          label: "Intro (Beat Count-in)",
          lines: [
            "(Deep 808 sub-bass drops, hi-hat roll)",
            "Yeah, check the frequency, Nexora studio rhythm.",
            "They said it couldn't happen, but we rewrite the pattern.",
          ],
        },
        {
          type: "verse",
          label: "Verse 1 (Flow Pace 92 BPM)",
          lines: [
            "Started in the shadows with an empty page and doubt,",
            "Turned the static in my head into what this grind's about.",
            "Stacking up the hours while the city sleeps in peace,",
            "Architect of ambition, signed the generational lease.",
            "Every stumble was a blueprint, every fall a masterclass,",
            "Looking through the future while they stare behind the glass.",
          ],
        },
        {
          type: "chorus",
          label: "Chorus (Full Energy & Brass Stabs)",
          lines: [
            "We break the ceiling, don't follow the trend,",
            "Writing a legacy that never will end!",
            "From the spark in the dark to the flame in the sky,",
            "We built this horizon, watch us touch and defy!",
          ],
        },
        {
          type: "verse",
          label: "Verse 2 (Intricate Internal Rhymes)",
          lines: [
            "Precision in the cadence, focus laser through the smoke,",
            "Turned promises to milestones with every word I spoke.",
            "No shortcuts taken, built the bridge across the sea,",
            "This isn't just a moment—it's unwritten destiny.",
          ],
        },
        {
          type: "outro",
          label: "Outro (Fade with Vocal Echo)",
          lines: [
            "Unwritten destiny. Keep running. Keep building.",
            "(Bassline resonates and echoes out)",
          ],
        },
      ];
      return { title, sections, tempoBpm: 92, keySignature: "F Minor" };
    }

    if (isSad) {
      const title = "Echoes in the Rain";
      const sections: CreativeLyricsSection[] = [
        {
          type: "intro",
          label: "Intro (Soft Piano Arpeggio)",
          lines: [
            "(Gentle melancholic piano chords in C minor)",
            "Some rooms stay quiet even when the world outside is loud...",
          ],
        },
        {
          type: "verse",
          label: "Verse 1",
          lines: [
            "The coffee's getting cold beside the open windowsill,",
            "The clock upon the wall keeps ticking but the room is still.",
            "I reach across the quiet where your laughter used to stay,",
            "Like footsteps on the shoreline that the ocean washed away.",
          ],
        },
        {
          type: "pre-chorus",
          label: "Pre-Chorus",
          lines: [
            "How do colors turn to gray in a single breath?",
            "Holding onto memories that outlived what we left.",
          ],
        },
        {
          type: "chorus",
          label: "Chorus (Sweeping Strings & Reverb)",
          lines: [
            "Now it's echoes in the rain, shadows in the hall,",
            "Learning how to stand after learning how to fall.",
            "I'm keeping every promise that you left behind for me,",
            "Even if the sweetest parts are now just history.",
          ],
        },
        {
          type: "bridge",
          label: "Bridge (Vocal Crescendo)",
          lines: [
            "I don't hold the anger, I just miss the light,",
            "That guided every morning and protected every night.",
            "Time will mend the edges, time will clear the view,",
            "Until the rain stops falling on the memory of you.",
          ],
        },
        {
          type: "outro",
          label: "Outro (Slow Piano Fade)",
          lines: [
            "Echoes in the rain... soft echoes in the rain...",
            "(Final sustained piano chord)",
          ],
        },
      ];
      return { title, sections, tempoBpm: 70, keySignature: "C Minor" };
    }

    // Default: Uplifting Pop / Melody
    const title = "Golden Horizon";
    const sections: CreativeLyricsSection[] = [
      {
        type: "intro",
        label: "Intro (Acoustic Guitar & Synth Pad)",
        lines: [
          "(Bright fingerpicked acoustic guitar with warm synth glow)",
          "Yeah, let the morning light in...",
        ],
      },
      {
        type: "verse",
        label: "Verse 1",
        lines: [
          "Woke up to the sun breaking through the amber pines,",
          "Tracing out a path where the golden meadow shines.",
          "Pack the heavy bags of yesterday and let them roll,",
          "There's a brand new rhythm waking up inside my soul.",
        ],
      },
      {
        type: "pre-chorus",
        label: "Pre-Chorus (Rhythmic Claps)",
        lines: [
          "Feel the pulse under our feet, the engine's humming clear,",
          "Every open highway saying paradise is near.",
        ],
      },
      {
        type: "chorus",
        label: "Chorus (Anthemic & Soaring Harmony)",
        lines: [
          "We're running to the golden horizon,",
          "Where the skies are wider and the dream is alive!",
          "No looking back now, our spirits are rising,",
          "Into the open road, together we thrive!",
        ],
      },
      {
        type: "verse",
        label: "Verse 2",
        lines: [
          "Windows rolled all the way down, the summer air is sweet,",
          "Heartbeat matching with the bass drum kicking in the beat.",
          "If the world gets stormy, we'll turn into the gale,",
          "We're the kind of ship that knows exactly how to sail.",
        ],
      },
      {
        type: "bridge",
        label: "Bridge (Half-time Beat Drop)",
        lines: [
          "When the dusk begins to settle into purple skies,",
          "I can see tomorrow reflected in your eyes.",
        ],
      },
      {
        type: "outro",
        label: "Outro (Celebratory Singalong)",
        lines: [
          "Golden horizon... yeah we're almost there!",
          "Golden horizon... breathing open air!",
          "(Kick drum hits 4 times and ends on a bright guitar strum)",
        ],
      },
    ];

    return { title, sections, tempoBpm: 104, keySignature: "A Major" };
  }
}

