import {
  CreativeArtifactType,
  CreativeDetectionResult,
  ImageAspectRatio,
  ImageStylePreset,
} from "./creative-types";

interface MessageContext {
  role: string;
  content: string;
}

interface AttachmentContext {
  name: string;
  mimeType?: string;
  content?: string;
}

export class CreativeDetector {
  /**
   * Analyzes the query, recent messages, and attachments to identify creative studio intents.
   */
  static detect(
    query: string,
    attachments: AttachmentContext[] = [],
    history: MessageContext[] = []
  ): CreativeDetectionResult {
    const qLower = query.toLowerCase().trim();

    // Check for attached images or audio
    const hasImageAttachment = attachments.some((a) =>
      a.mimeType?.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif|svg)$/i.test(a.name)
    );
    const hasAudioAttachment = attachments.some((a) =>
      a.mimeType?.startsWith("audio/") ||
      /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(a.name)
    );

    // 1. Audio Transcription & Analysis
    if (hasAudioAttachment || this.isTranscriptionIntent(qLower)) {
      return {
        isCreativeIntent: true,
        creativeType: "transcription",
        prompt: query,
        parameters: {
          audioFile: attachments.find((a) => a.mimeType?.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(a.name)),
        },
      };
    }

    // 2. Image Editing (Requires or pairs with uploaded image)
    if (hasImageAttachment && this.isImageEditIntent(qLower)) {
      const editOp = this.resolveEditOperation(qLower);
      return {
        isCreativeIntent: true,
        creativeType: "edited-image",
        prompt: query,
        parameters: {
          editOperation: editOp,
          instruction: query,
          targetBackground: this.extractTargetBackground(qLower),
        },
      };
    }

    // 3. Image Generation (Text to Image)
    const imageGenMatch = this.detectImageGeneration(qLower, query);
    if (imageGenMatch) {
      return imageGenMatch;
    }

    // 4. Music & Song Audio Generation (Prioritized to catch "Generate a song", "Create a song for these lyrics", "Make a melody")
    const musicMatch = this.detectMusicGeneration(qLower, query);
    if (musicMatch) {
      return musicMatch;
    }

    // 5. Lyrics Generation & Theme Modification (Evaluates "Write a song", "Write lyrics", "Change the song theme")
    const lyricsMatch = this.detectLyricsGeneration(qLower, query, history);
    if (lyricsMatch) {
      return lyricsMatch;
    }

    // 6. Voice / Text-to-Speech Generation
    const voiceMatch = this.detectVoiceGeneration(qLower, query);
    if (voiceMatch) {
      return voiceMatch;
    }

    return { isCreativeIntent: false };
  }

  private static isTranscriptionIntent(qLower: string): boolean {
    return (
      /\b(transcribe|transcription|speech to text|what does this audio say|summarize this audio|listen to this recording|audio summary)\b/i.test(
        qLower
      )
    );
  }

  private static isImageEditIntent(qLower: string): boolean {
    return (
      /\b(remove\s+(?:the\s+)?background|transparent\s+background|replace\s+(?:the\s+)?background|change\s+(?:the\s+)?background|swap\s+(?:the\s+)?background|remove\s+bg|cut\s+out|change\s+color|colorize|restore\s+photo|enhance\s+quality|upscale|artistic\s+style|turn\s+into\s+sketch|watercolor|oil\s+painting|filter)\b/i.test(
        qLower
      ) ||
      (/\b(edit|modify|alter|touch up)\b/i.test(qLower) &&
        /\b(this image|the picture|the photo|attached|it)\b/i.test(qLower))
    );
  }

  private static resolveEditOperation(
    qLower: string
  ): "remove-bg" | "replace-bg" | "colorize" | "stylize" | "restore" | "custom" {
    if (/\b(remove\s+(?:the\s+)?background|transparent\s+background|remove\s+bg|cut\s+out)\b/i.test(qLower)) {
      return "remove-bg";
    }
    if (/\b(replace\s+(?:the\s+)?background|change\s+(?:the\s+)?background|swap\s+(?:the\s+)?background|background\s+with)\b/i.test(qLower)) {
      return "replace-bg";
    }
    if (/\b(colorize|change\s+color|change\s+clothing|recolor)\b/i.test(qLower)) {
      return "colorize";
    }
    if (/\b(style|stylize|sketch|watercolor|painting|cartoon|anime|vintage)\b/i.test(qLower)) {
      return "stylize";
    }
    if (/\b(restore|enhance|clarity|upscale|sharpen|fix\s+photo)\b/i.test(qLower)) {
      return "restore";
    }
    return "custom";
  }

  private static extractTargetBackground(qLower: string): string | undefined {
    const match = qLower.match(
      /(?:replace|change|swap)\s+(?:the\s+)?background\s+(?:with|to)\s+(?:a\s+|an\s+)?([^,.]+)/i
    );
    return match ? match[1].trim() : undefined;
  }

  private static detectImageGeneration(
    qLower: string,
    raw: string
  ): CreativeDetectionResult | null {
    // 0. EXCLUSIONS: Do NOT trigger for prompt requests, technical explanations, or coding queries
    const isPromptIdeaRequest =
      /\b(?:give\s+me|show\s+me|suggest|provide|write|generate|recommend)\s+(?:some\s+)?(?:image\s+prompts?|prompts?\s+(?:for|ideas?)|prompt\s+ideas?|midjourney\s+prompts?|dall-?e\s+prompts?)\b/i.test(
        qLower
      ) ||
      /\b(?:what\s+(?:is|are)\s+(?:a\s+)?good\s+prompts?|how\s+to\s+prompt|prompting\s+tips)\b/i.test(
        qLower
      );

    const isTechnicalQuestion =
      /\b(?:how\s+(?:does|do)\s+(?:stable\s+diffusion|dall-?e|midjourney|flux|imagen|diffusion\s+models?|ai\s+image\s+gen)\w*\s+work|explain\s+(?:stable\s+diffusion|diffusion\s+models?|how\s+ai\s+generates?\s+images?))\b/i.test(
        qLower
      ) ||
      /\b(?:what\s+is\s+(?:stable\s+diffusion|midjourney|dall-?e|latent\s+diffusion))\b/i.test(
        qLower
      );

    const isCodingRequest =
      /\b(?:write\s+(?:python|javascript|typescript|js|ts|code|react|node|html|css)|function\s+to|pip\s+install|npm\s+install|import\s+(?:pil|cv2|canvas|image)|const\s+\w+\s*=|def\s+\w+\()\b/i.test(
        qLower
      ) ||
      /\bcode\s+(?:to|for)\s+(?:load|display|resize|save|upload)\s+(?:an?\s+)?image\b/i.test(
        qLower
      ) ||
      /\b(?:explain\s+react\s+useeffect|optimize\s+a\s+sql|capital\s+of\s+france)\b/i.test(
        qLower
      );

    if (isPromptIdeaRequest || isTechnicalQuestion || isCodingRequest) {
      return null;
    }

    // 1. INCLUSIONS & PATTERN MATCHING
    // A. Explicit generation verbs followed by image nouns or target topics:
    // e.g., "Create an image of...", "Generate a professional portrait", "Create a realistic landscape", "Create an illustration"
    const explicitGenMatch = qLower.match(
      /^(?:generate|create|render|produce|design)\s+(?:an?\s+)?(?:[a-z0-9_-]+\s+){0,3}(?:image|picture|photo|photograph|portrait|artwork|illustration|render|drawing|wallpaper|visual|logo|landscape|cityscape|avatar|icon)\b(?:\s+(?:of|about|depicting|showing|with|for|using)\s+(.+)|$|\s+(.+))?/i
    );

    // B. Drawing / sketching verbs:
    // e.g., "Draw a futuristic city", "Draw a cat", "Sketch a mountain"
    const drawMatch = qLower.match(
      /^(?:draw|sketch|paint)\s+(?:me\s+)?(?:an?\s+)?(.+)/i
    );

    // C. Logo creation:
    // e.g., "Make a logo", "Make a logo for a cafe"
    const logoMatch = qLower.match(
      /^(?:make|design|create)\s+(?:me\s+)?(?:an?\s+)?logo(?:\s+(?:for|with|of)\s+(.+))?/i
    );

    // D. Colloquial "i want / i need":
    // e.g., "i want a man with a coatsuit", "i want a cat wearing sunglasses", "i want an image of a sunset"
    const colloquialWantMatch = qLower.match(
      /^i\s+(?:want|need|wish\s+for)\s+(?:an?\s+)?(?:(?:image|picture|photo|photograph|portrait|illustration|drawing|visual|logo)\s+(?:of|with|showing|depicting)\s+(.+)|(?:man|woman|person|guy|girl|boy|cat|dog|pet|car|bike|robot|landscape|city|building|house|scenery|sunset|character|avatar|creature|dragon)\s+(?:with|in|wearing|holding|on|at|under|dressed\s+in)\s+(.+))/i
    );

    // E. Polite / conversational requests:
    // e.g., "can you make an image of...", "can you generate a picture of...", "show me a picture of..."
    const conversationalMatch = qLower.match(
      /^(?:can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|please\s+)?(?:make|give\s+me|show\s+me|generate|draw|create|render)\s+(?:an?\s+)?(?:image|picture|photo|portrait|illustration|drawing|visual|logo)\s+(?:of|about|showing|depicting|for|with)\s+(.+)/i
    );

    // F. Direct noun phrase queries:
    // e.g., "picture of a cat", "photo of a man in a coatsuit", "portrait of a woman"
    const directNounMatch = qLower.match(
      /^(?:picture|photo|photograph|portrait|illustration|drawing|render|sketch|image)\s+(?:of|showing|depicting)\s+(.+)/i
    );

    // G. Visualization requests:
    // e.g., "visualize this concept: ...", "visualize a futuristic city", "visualize this concept"
    const visualizeMatch = qLower.match(
      /^(?:visualize|visualise)\s+(?:this\s+concept:?|this:?|a|an)?\s*(.*)/i
    );

    // H. Direct "text to image" command or keyword
    const isDirectKeyword = /\b(?:text to image|generate an image|generate image)\b/i.test(qLower);

    const isImageGen = Boolean(
      explicitGenMatch ||
      drawMatch ||
      logoMatch ||
      colloquialWantMatch ||
      conversationalMatch ||
      directNounMatch ||
      visualizeMatch ||
      isDirectKeyword
    );

    if (!isImageGen) return null;

    // 2. Extract clean prompt
    let cleanPrompt = raw.trim();

    if (colloquialWantMatch) {
      cleanPrompt = raw.replace(/^i\s+(?:want|need|wish\s+for)\s+(?:an?\s+)?(?:image|picture|photo|photograph|visual)?\s*(?:of|showing|depicting)?\s*/i, "").trim();
    } else if (drawMatch) {
      cleanPrompt = raw.replace(/^(?:draw|sketch|paint)\s+(?:me\s+)?(?:an?\s+)?/i, "").trim();
    } else if (logoMatch) {
      const spec = logoMatch[1]?.trim();
      cleanPrompt = spec ? `a modern minimalist logo for ${spec}` : "a modern minimalist logo";
    } else if (conversationalMatch) {
      cleanPrompt = raw.replace(/^(?:can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|please\s+)?(?:make|give\s+me|show\s+me|generate|draw|create|render)\s+(?:an?\s+)?(?:image|picture|photo|portrait|illustration|drawing|visual|logo)\s+(?:of|about|showing|depicting|for|with)\s+/i, "").trim();
    } else if (directNounMatch) {
      cleanPrompt = raw.replace(/^(?:picture|photo|photograph|portrait|illustration|drawing|render|sketch|image)\s+(?:of|showing|depicting)\s+/i, "").trim();
    } else if (visualizeMatch) {
      const topic = visualizeMatch[1]?.replace(/^this\s+concept:?\s*/i, "").trim();
      cleanPrompt = topic || "this concept";
    } else if (explicitGenMatch) {
      cleanPrompt = raw
        .replace(
          /^(?:generate|create|draw|paint|render|make|design|produce)\s+(?:an?\s+)?(?:[a-z0-9_-]+\s+){0,3}(?:image|picture|photo|artwork|illustration|render|drawing|wallpaper|visual|logo)\s+(?:of|about|depicting|showing|with|using)\s+/i,
          ""
        )
        .replace(/^(?:generate|create)\s+(?:an?\s+)?/i, "")
        .replace(/^text to image:?\s*/i, "")
        .trim();
    }

    if (!cleanPrompt) cleanPrompt = raw.trim();

    // 3. Detect aspect ratio
    let aspectRatio: ImageAspectRatio = "1:1";
    if (/\b(16:9|landscape|wide|widescreen|wallpaper)\b/i.test(qLower)) {
      aspectRatio = "16:9";
    } else if (/\b(9:16|portrait|vertical|story|phone wallpaper)\b/i.test(qLower)) {
      aspectRatio = "9:16";
    } else if (/\b(4:3)\b/i.test(qLower)) {
      aspectRatio = "4:3";
    } else if (/\b(3:4)\b/i.test(qLower)) {
      aspectRatio = "3:4";
    }

    // 4. Detect style preset
    let style: ImageStylePreset = "realistic";
    if (/\b(cinematic|movie still|epic lighting|dramatic lighting|cyberpunk)\b/i.test(qLower)) {
      style = "cinematic";
    } else if (/\b(3d|3d render|octane|unreal engine|cgi)\b/i.test(qLower)) {
      style = "3d";
    } else if (/\b(anime|manga|studio ghibli|makoto shinkai)\b/i.test(qLower)) {
      style = "anime";
    } else if (/\b(product photography|commercial shot|studio lighting|packshot)\b/i.test(qLower)) {
      style = "product";
    } else if (/\b(logo|vector|minimalist badge|brand icon|emblem)\b/i.test(qLower)) {
      style = "logo";
    } else if (/\b(social media|instagram|thumbnail|banner)\b/i.test(qLower)) {
      style = "social";
    } else if (/\b(illustration|drawing|sketch|watercolor|painting)\b/i.test(qLower)) {
      style = "anime";
    } else if (/\b(portrait|coatsuit|coat suit|suit|headshot|person|man|woman)\b/i.test(qLower)) {
      style = "realistic";
    }

    return {
      isCreativeIntent: true,
      creativeType: "image",
      prompt: cleanPrompt,
      parameters: {
        aspectRatio,
        style,
      },
    };
  }

  private static detectLyricsGeneration(
    qLower: string,
    raw: string,
    history: MessageContext[] = []
  ): CreativeDetectionResult | null {
    const isThemeChange =
      /\b(?:change|modify|update|rewrite|switch|adapt)\s+(?:the\s+)?(?:song\s+)?(?:theme|lyrics|words)\s+(?:to|about|into|for)\s+(.+)/i.test(
        qLower
      ) ||
      /\b(?:rewrite|change|update)\s+(?:the\s+)?lyrics\b/i.test(qLower) ||
      /\bmake\s+(?:the\s+)?(?:song|lyrics)\s+about\s+(.+)/i.test(qLower);

    const isLyricsGen =
      isThemeChange ||
      /\b(?:write|pen|draft)\s+(?:an?\s+)?(?:original\s+)?(?:song\s+)?lyrics\b/i.test(
        qLower
      ) ||
      /\b(?:write|pen|draft)\s+(?:an?\s+)?(?:tamil|english|hindi|telugu|malayalam)?\s*(?:romantic|sad|love|pop|folk|melody)?\s*song\b/i.test(
        qLower
      ) ||
      /\blyrics\s+(?:for|about|to)\s+/i.test(qLower) ||
      /^(?:song lyrics|write a song|write lyrics|pen a song)\b/i.test(qLower);

    if (!isLyricsGen) return null;

    // Check if recent conversation history was in Tamil
    const historyHasTamil = history.some(
      (m) => /[\u0B80-\u0BFF]/.test(m.content) || /\btamil\b/i.test(m.content)
    );

    // Language detection: Tamil, English, Hindi, etc.
    let language = "English";
    if (/\b(tamil|தமிழ்)\b/i.test(qLower) || historyHasTamil) language = "Tamil";
    else if (/\b(hindi|हिंदी)\b/i.test(qLower)) language = "Hindi";
    else if (/\b(spanish|español)\b/i.test(qLower)) language = "Spanish";

    // Genre & mood detection
    let genre = "Romantic Melody";
    if (/\b(melody|melodic|romantic melody)\b/i.test(qLower)) genre = "Romantic Melody";
    else if (/\b(rap|hip hop|hip-hop|drill)\b/i.test(qLower)) genre = "Rap / Hip-Hop";
    else if (/\b(folk|kuthu|country)\b/i.test(qLower)) genre = "Folk / Acoustic";
    else if (/\b(rock|metal|punk)\b/i.test(qLower)) genre = "Rock";
    else if (/\b(r&b|soul)\b/i.test(qLower)) genre = "R&B / Soul";
    else if (/\b(devotional|bhajan|gospel)\b/i.test(qLower)) genre = "Devotional";

    let mood = "Love / Romantic";
    if (/\b(love|romantic|affection|sweet|togetherness|dreams)\b/i.test(qLower))
      mood = "Love / Romantic";
    else if (/\b(sad|heartbreak|melancholy|breakup|pain|separation)\b/i.test(qLower))
      mood = "Melancholy / Sad";
    else if (/\b(motivational|workout|triumph|energy|anthem|victory)\b/i.test(qLower))
      mood = "Motivational";
    else if (/\b(friendship|friends|bonding)\b/i.test(qLower)) mood = "Friendship";
    else if (/\b(celebration|party|dance|joy|festive)\b/i.test(qLower)) mood = "Celebration";

    let vocalStyle: "Male" | "Female" | "Duet" = "Duet";
    if (/\b(male vocal|male singer|guy)\b/i.test(qLower)) vocalStyle = "Male";
    else if (/\b(female vocal|female singer|girl)\b/i.test(qLower)) vocalStyle = "Female";

    // Extract theme/subject accurately
    let theme = raw;
    const themeChangeMatch = raw.match(
      /(?:change|modify|update|rewrite|switch|adapt)\s+(?:the\s+)?(?:song\s+)?(?:theme|lyrics|words)?\s+(?:to|about|into|for)\s+(.+)/i
    );
    const writeAboutMatch = raw.match(
      /(?:write|pen|draft)\s+(?:an?\s+)?(?:[a-z0-9_-]+\s+){0,4}song(?:\s+lyrics)?\s+about\s+(.+)/i
    );
    const lyricsAboutMatch = raw.match(/lyrics\s+(?:for|about)\s+(.+)/i);

    if (themeChangeMatch) {
      theme = themeChangeMatch[1].trim();
    } else if (writeAboutMatch) {
      theme = writeAboutMatch[1].trim();
    } else if (lyricsAboutMatch) {
      theme = lyricsAboutMatch[1].trim();
    } else {
      theme =
        raw
          .replace(
            /^(?:write|pen|draft)\s+(?:some\s+)?(?:song\s+)?lyrics\s*(?:for|about)?/i,
            ""
          )
          .replace(/^lyrics\s+(?:for|about)?/i, "")
          .trim() || "Love, memories, dreams and togetherness";
    }

    theme = theme.replace(/[.!?,]+$/, "").trim();

    return {
      isCreativeIntent: true,
      creativeType: "lyrics",
      prompt: raw,
      parameters: {
        language,
        genre,
        mood,
        vocalStyle,
        theme,
        isThemeChange,
      },
    };
  }

  private static detectMusicGeneration(
    qLower: string,
    raw: string
  ): CreativeDetectionResult | null {
    // 0. Exclude requests that specifically ask to write/draft/change lyrics
    if (
      /\b(?:write|pen|draft)\s+(?:an?\s+)?(?:song|lyrics|poem)\b/i.test(qLower) ||
      /\b(?:write|pen|draft)\s+(?:some\s+)?lyrics\b/i.test(qLower) ||
      /\b(?:write|pen|draft)\s+(?:[a-z0-9_-]+\s+){0,3}song\s+about\b/i.test(qLower) ||
      /\b(?:change|modify|update|rewrite|switch|adapt)\s+(?:the\s+)?(?:song\s+)?(?:theme|lyrics|words)\b/i.test(
        qLower
      ) ||
      /\b(?:rewrite|change|update)\s+(?:the\s+)?lyrics\b/i.test(qLower) ||
      /^(?:song lyrics|write a song|write lyrics|pen a song)\b/i.test(qLower)
    ) {
      return null;
    }

    // 1. Song generation from lyrics
    const isSongFromLyrics =
      /\b(?:generate|create|make|produce|compose)\s+(?:an?\s+)?(?:original\s+)?(?:[a-z0-9_-]+\s+){0,3}(?:song|music|track|melody)\s+(?:for|from|using|with|based on)\s+(?:these\s+)?(?:lyrics|words)\b/i.test(
        qLower
      ) ||
      /\b(?:song|music|track|melody)\s+(?:for|from)\s+(?:these\s+)?lyrics\b/i.test(qLower);

    // 2. Play or download song commands
    const isPlayOrDownload =
      /\b(?:play|listen to|hear|download)\s+(?:this\s+)?(?:generated\s+)?(?:song|audio|track|music|melody)\b/i.test(
        qLower
      );

    // 3. Direct song / music generation commands
    const isExplicitMusic =
      /\b(?:generate|create|make|compose|produce)\s+(?:an?\s+)?(?:original\s+)?(?:[a-z0-9_-]+\s+){0,3}(?:song|music|track|melody|beat|audio track|soundtrack)\b/i.test(
        qLower
      ) ||
      /\b(?:make a melody|create a melody|compose a melody|generate a melody)\b/i.test(qLower) ||
      /\b(?:text to music|music generator|instrumental music|background music|audio generator)\b/i.test(
        qLower
      );

    const isMusicGen = isSongFromLyrics || isPlayOrDownload || isExplicitMusic;
    if (!isMusicGen) return null;

    const isInstrumental = /\b(instrumental|no vocals|beat only|bgm|background score)\b/i.test(qLower);

    // Vocal style extraction
    let vocalStyle: "Male" | "Female" | "Duet" | "Instrumental" = "Duet";
    if (isInstrumental) {
      vocalStyle = "Instrumental";
    } else if (/\b(male vocals?|male singer|male voice|sung by male|sung by a man|guy vocals?)\b/i.test(qLower)) {
      vocalStyle = "Male";
    } else if (/\b(female vocals?|female singer|female voice|sung by female|sung by a woman|girl vocals?)\b/i.test(qLower)) {
      vocalStyle = "Female";
    } else if (/\b(duet|male and female|both vocals?)\b/i.test(qLower)) {
      vocalStyle = "Duet";
    }

    // Genre extraction
    let genre = "Tamil Melody";
    if (/\b(tamil(\s+[a-z0-9_-]+)?\s+melody|tamil\s+song|tamil|carnatic|raga)\b/i.test(qLower))
      genre = "Tamil Melody";
    else if (/\b(pop|western pop|dance pop|synth pop)\b/i.test(qLower))
      genre = "Pop";
    else if (/\b(lo-fi|lofi|chillhop)\b/i.test(qLower))
      genre = "Lo-Fi Chill";
    else if (/\b(cinematic|orchestral|epic)\b/i.test(qLower))
      genre = "Cinematic Orchestral";
    else if (/\b(synthwave|electronic|edm)\b/i.test(qLower))
      genre = "Synthwave Electronic";
    else if (/\b(acoustic|piano|guitar)\b/i.test(qLower))
      genre = "Acoustic Piano";
    else if (/\b(hip hop|trap|beat|rap)\b/i.test(qLower))
      genre = "Hip-Hop Beat";
    else if (/\b(folk|kuthu)\b/i.test(qLower))
      genre = "Tamil Folk / Kuthu";
    else if (!/\btamil\b/i.test(qLower) && /\b(song|track)\b/i.test(qLower))
      genre = "Pop";

    // Mood extraction
    let mood = "Romantic";
    if (/\b(romantic|love|romance|sweet)\b/i.test(qLower))
      mood = "Romantic";
    else if (/\b(sad|melancholic|sorrow|heartbreak|pain)\b/i.test(qLower))
      mood = "Melancholic";
    else if (/\b(energetic|upbeat|fast|dance|party)\b/i.test(qLower))
      mood = "Energetic";
    else if (/\b(peaceful|relaxing|calm|chill)\b/i.test(qLower))
      mood = "Peaceful";
    else if (/\b(motivational|triumph|inspiring)\b/i.test(qLower))
      mood = "Motivational";

    // Musical key signature
    let keySignature = genre.includes("Tamil")
      ? "C Major (Kalyani Raga)"
      : mood === "Melancholic"
      ? "D Minor (Natabhairavi)"
      : "C Major";

    // Tempo
    let tempoBpm = 88;
    if (genre === "Pop") tempoBpm = 112;
    else if (genre === "Lo-Fi Chill") tempoBpm = 78;
    else if (mood === "Melancholic") tempoBpm = 72;
    else if (mood === "Energetic") tempoBpm = 124;

    // Arrangement Instruments
    let instruments = ["Acoustic Guitar", "Flute", "Percussion"];
    if (genre.includes("Tamil")) {
      instruments = ["Acoustic Guitar", "Flute", "Percussion", "Veena"];
    } else if (genre === "Pop") {
      instruments = ["Synthesizer", "Drum Machine", "Electric Bass", "Lead Synth"];
    } else if (genre === "Lo-Fi Chill") {
      instruments = ["Electric Piano", "Vinyl Crackle", "Sub Bass", "Muted Drums"];
    }

    return {
      isCreativeIntent: true,
      creativeType: "music",
      prompt: raw,
      parameters: {
        genre,
        mood,
        vocalStyle,
        keySignature,
        instruments,
        isInstrumental,
        tempoBpm,
        durationSeconds: 28,
      },
    };
  }

  private static detectVoiceGeneration(
    qLower: string,
    raw: string
  ): CreativeDetectionResult | null {
    const isVoiceGen =
      /\b(?:text to speech|read this out loud|read this aloud|generate voiceover|create voiceover|speak this|convert to voice)\b/i.test(
        qLower
      );

    if (isVoiceGen) {
      let textToRead = raw
        .replace(/^(?:text to speech|read this out loud|read this aloud|generate voiceover|create voiceover|speak this|convert to voice):?\s*/i, "")
        .trim();
      if (!textToRead) textToRead = "Hello! This is Nexora Creative Studio's AI voiceover.";

      return {
        isCreativeIntent: true,
        creativeType: "voice",
        prompt: textToRead,
        parameters: {
          voiceName: "nova",
          speed: 1.0,
        },
      };
    }

    return null;
  }
}
