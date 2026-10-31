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

    // 0. Image Understanding (Describe/explain image -> routes to text/multimodal vision response)
    if (this.isImageUnderstandingIntent(qLower)) {
      return { isCreativeIntent: false };
    }

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

    // 2. Image Variation (Produces distinct variation of existing visual - prioritized before edit)
    const variationMatch = this.detectImageVariation(qLower, query);
    if (variationMatch) {
      return variationMatch;
    }

    // 3. Image Editing (Requires or pairs with uploaded image or explicit reference to current image)
    if (this.isImageEditIntent(qLower)) {
      const editOp = this.resolveEditOperation(qLower);
      return {
        isCreativeIntent: true,
        creativeType: "edited-image",
        prompt: query,
        parameters: {
          editOperation: editOp,
          instruction: query,
          targetBackground: this.extractTargetBackground(qLower),
          hasAttachment: hasImageAttachment,
        },
      };
    }

    // 4. Image Generation (Universal Text to Image across any subject)
    const imageGenMatch = this.detectImageGeneration(qLower, query);
    if (imageGenMatch) {
      return imageGenMatch;
    }

    // 5. Music & Song Audio Generation (Prioritized to catch "Generate a song", "Create a song for these lyrics", "Make a melody")
    const musicMatch = this.detectMusicGeneration(qLower, query);
    if (musicMatch) {
      return musicMatch;
    }

    // 6. Lyrics Generation & Theme Modification (Evaluates "Write a song", "Write lyrics", "Change the song theme")
    const lyricsMatch = this.detectLyricsGeneration(qLower, query, history);
    if (lyricsMatch) {
      return lyricsMatch;
    }

    // 7. Voice / Text-to-Speech Generation
    const voiceMatch = this.detectVoiceGeneration(qLower, query);
    if (voiceMatch) {
      return voiceMatch;
    }

    return { isCreativeIntent: false };
  }

  private static isImageUnderstandingIntent(qLower: string): boolean {
    return (
      (/\b(?:describe|what\s+is\s+(?:in|on)|what\s+does\s+this\s+show|explain|analyze|break\s+down|read\s+text|what\s+objects?|what\s+do\s+you\s+see|summarize\s+this\s+image|transcribe\s+image|what\s+text|what\s+is\s+written|can\s+you\s+read)\b/i.test(
        qLower
      ) ||
        /^(?:what|who|where|when|why|how|is\s+there|are\s+there|can\s+you\s+(?:see|find|read)|do\s+you\s+see)\b/i.test(
          qLower
        )) &&
      /\b(?:this\s+image|the\s+image|this\s+picture|the\s+picture|this\s+photo|the\s+photo|this\s+diagram|the\s+diagram|this\s+screenshot|attached)\b/i.test(
        qLower
      )
    );
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
      /\b(?:remove\s+(?:the\s+)?background|transparent\s+background|replace\s+(?:the\s+)?background|change\s+(?:the\s+)?background|swap\s+(?:the\s+)?background|remove\s+bg|cut\s+out|change\s+(?:the\s+)?(?:clothing\s+)?colou?r|colorize|recolor|restore\s+(?:and\s+enhance\s+)?(?:this\s+)?(?:old\s+)?(?:photo|photograph|image)|enhance\s+(?:quality|this\s+photo|this\s+image|the\s+photo|this\s+old\s+photograph)|upscale|make\s+(?:the\s+)?lighting\s+brighter|remove\s+(?:the\s+)?(?:unwanted\s+)?object)\b/i.test(
        qLower
      ) ||
      (/\b(?:edit|modify|alter|touch\s*up|enhance|restore)\b/i.test(qLower) &&
        /\b(?:this\s+image|the\s+picture|this\s+picture|the\s+photo|this\s+photo|photograph|attached|current\s+image|background)\b/i.test(qLower))
    );
  }

  private static detectImageVariation(
    qLower: string,
    raw: string
  ): CreativeDetectionResult | null {
    const isVar =
      /\b(?:create|generate|make|show\s+me|give\s+me)\s+(?:(?:another|different|new|three|3|alternate)\s+)+(?:variation|version|artistic\s+version)s?\b/i.test(
        qLower
      ) ||
      /\b(?:variation|another\s+version|different\s+version|alternate\s+version)\s+of\s+(?:this\s+image|the\s+image|it)\b/i.test(
        qLower
      ) ||
      /\bkeep\s+(?:the\s+)?(?:same\s+)?subject\s+but\s+(?:change|swap|modify)\b/i.test(
        qLower
      );

    if (!isVar) return null;

    let instruction: string | undefined;
    const match = raw.match(/(?:but\s+change|but\s+make|with|in)\s+(.+)/i);
    if (match) instruction = match[1].trim();

    return {
      isCreativeIntent: true,
      creativeType: "image",
      prompt: raw.trim(),
      parameters: {
        isVariation: true,
        variationInstruction: instruction,
      },
    };
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
      /\b(?:give\s+me|show\s+me|suggest|provide|write|generate|recommend)\s+(?:an?\s+|some\s+)?(?:image\s+prompts?|prompts?\s+(?:for|ideas?)|prompt\s+(?:for|ideas?)|midjourney\s+prompts?|dall-?e\s+prompts?)\b/i.test(
        qLower
      ) ||
      /\b(?:what\s+(?:is|are)\s+(?:a\s+)?good\s+prompts?|how\s+to\s+prompt|prompting\s+tips)\b/i.test(
        qLower
      );

    const isTechnicalQuestion =
      /\b(?:how\s+(?:does|do|can|is)\s+(?:stable\s+diffusion|dall-?e|midjourney|flux|imagen|diffusion\s+models?|ai\s+image\s+gen\w*|image\s+gen\w*)|explain\s+(?:how\s+)?(?:ai\s+image\s+gen\w*|image\s+gen\w*|diffusion|stable\s+diffusion|midjourney|dall-?e)|explain\s+(?:stable\s+diffusion|diffusion\s+models?|how\s+ai\s+generates?\s+images?))\b/i.test(
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

    const qClean = qLower.replace(/[.!?]+$/, "").trim();

    // 1. INCLUSIONS & PATTERN MATCHING
    // A. Explicit generation verbs followed by image nouns or target topics:
    // e.g., "Create an image of...", "Generate a professional portrait", "Create a realistic landscape", "Create a futuristic city at night", "Design a modern birthday invitation"
    const explicitGenMatch = qLower.match(
      /^(?:generate|create|render|produce|design|make)\s+(?:an?\s+)?(?:[a-z0-9_-]+\s+){0,4}(?:image|picture|photo|photograph|portrait|artwork|illustration|render|drawing|wallpaper|visual|logo|landscape|cityscape|avatar|icon|banner|poster|scene|graphic|invitation|thumbnail)\b(?:\s+(?:of|about|depicting|showing|with|for|using)\s+(.+)|$|\s+(.+))?/i
    );

    // B. Drawing / sketching verbs:
    // e.g., "Draw a futuristic city", "Draw a cat", "Sketch a mountain", "Draw a fantasy dragon flying above a mountain"
    const drawMatch =
      !/\b(?:conclusion|card|breath|straw|line\s+in\s+the\s+sand)\b/i.test(qLower) &&
      qLower.match(/^(?:draw|sketch|paint)\s+(?:me\s+)?(?:an?\s+)?(.+)/i);

    // C. Logo / Branding / Banner creation:
    // e.g., "Make a logo", "Make a logo for a cafe", "Design a modern birthday invitation"
    const logoMatch = qLower.match(
      /^(?:make|design|create)\s+(?:me\s+)?(?:an?\s+)?(?:logo|badge|banner|poster|flyer|invitation|icon)(?:\s+(?:for|with|of)\s+(.+))?/i
    );

    // Universal visual generation pattern (e.g. "Create a futuristic city", "Generate a photorealistic beach sunset", "Create a professional product advertisement", "Generate a cute animated puppy")
    const universalGenMatch = qLower.match(
      /^(?:generate|create|render|produce|design|make)\s+(?:me\s+)?(?:an?\s+)?(.+)/i
    );
    const universalSubject = universalGenMatch ? universalGenMatch[1].trim() : "";
    const isNonImageSubject =
      /\b(?:code|function|script|component|app|website|html|css|javascript|python|sql|database|table|query|password|token|hash|key|summary|essay|email|letter|article|blog|report|document|contract|plan|strategy|test|testcase|song|track|melody|music|beat|lyrics|audio|voice|speech|account|login|signup|user)\b/i.test(
        universalSubject
      );

    // D. Colloquial "i want / i need / i would like / please make":
    // Matches ANY valid subject: "i want a man with a coatsuit", "i want a Christmas-themed image", "i want a beautiful nature wallpaper", "i want a cute puppy", "i want a futuristic city"
    const wantMatchRaw = qClean.match(
      /^i\s+(?:want|need|wish\s+for|would\s+like)\s+(?:an?\s+)?(.+)/i
    );
    const wantSubject = wantMatchRaw ? wantMatchRaw[1].trim() : "";
    const colloquialWantMatch =
      wantMatchRaw &&
      wantSubject.length > 2 &&
      !/^(?:to\s+(?:know|learn|understand|see|read|write|go|eat|play)|a\s+break|help|advice|more\s+information)\b/i.test(wantSubject) &&
      !isNonImageSubject
        ? wantMatchRaw
        : null;

    // E. Polite / conversational requests:
    // e.g., "can you make an image of...", "can you generate a picture of...", "show me a picture of..."
    const conversationalMatch = qLower.match(
      /^(?:can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|please\s+)?(?:make|give\s+me|show\s+me|generate|draw|create|render)\s+(?:an?\s+)?(?:image|picture|photo|portrait|illustration|drawing|visual|logo|wallpaper|thumbnail)\s+(?:of|about|showing|depicting|for|with)\s+(.+)/i
    );

    // F. Direct noun phrase queries starting with a visual noun:
    // e.g., "a thumbnail for christmas", "thumbnail for youtube", "a poster for summer festival", "picture of a cat", "photo of a man in a coatsuit"
    const directNounMatch = qClean.match(
      /^(?:an?\s+)?(?:image|picture|photo|photograph|portrait|illustration|drawing|render|rendering|sketch|artwork|wallpaper|thumbnail|banner|poster|flyer|invitation|cover|graphic|avatar|icon|logo)\s+(?:of|for|about|showing|depicting|with)\s+(.+)/i
    );

    // G. Queries ending with a visual noun type:
    // e.g., "Christmas celebration image", "futuristic city wallpaper", "nature wallpaper", "modern bakery logo"
    const visualNounEndMatch = qClean.match(
      /^(?:an?\s+)?(.+?)\s+(?:image|picture|photo|photograph|portrait|illustration|drawing|render|rendering|sketch|artwork|wallpaper|thumbnail|banner|poster|flyer|invitation|graphic|avatar)$/i
    );
    const endSubject = visualNounEndMatch ? visualNounEndMatch[1].trim() : "";
    const isQuestionAboutVisual =
      /^(?:what|who|where|when|why|how|is|are|can|do|explain|describe|analyze)\b/i.test(qClean) ||
      /\b(?:in\s+(?:this|the)|on\s+(?:this|the)|from\s+(?:this|the)|about\s+(?:this|the))\b/i.test(endSubject);
    const isVisualNounEnd =
      Boolean(visualNounEndMatch) &&
      endSubject.length > 2 &&
      !isNonImageSubject &&
      !isQuestionAboutVisual;

    // H. Visualization requests:
    // e.g., "visualize this concept: ...", "visualize a futuristic city", "visualize this concept"
    const visualizeMatch = qLower.match(
      /^(?:visualize|visualise)\s+(?:this\s+concept:?|this:?|a|an)?\s*(.*)/i
    );

    // I. Tamil language image prompts:
    // e.g., "ஒரு அழகான பூனை படம் வரை", "கடற்கரை சூரிய அஸ்தமனம் படம் உருவாக்கு"
    const isTamilImageGen =
      /(?:படம்|ஓவியம்)\s*(?:வரை|உருவாக்கு|வேணும்|காட்டு)|(?:வரை|உருவாக்கு)\s*(?:ஒரு\s*)?(?:படம்|ஓவியம்)/i.test(
        qLower
      );

    // J. Tanglish language image prompts:
    // e.g., "Oru cat picture create pannu", "photo generate pannu", "picture venum"
    const isTanglishImageGen =
      /\b(?:image|photo|picture)\s+(?:create\s+pannu|generate\s+pannu|venum|vara)\b|\b(?:create|generate)\s+pannu\s+(?:an?\s+)?(?:image|photo|picture)\b/i.test(
        qLower
      );

    const hasVisualTerm =
      /\b(?:image|picture|photo|photograph|portrait|artwork|illustration|render|drawing|wallpaper|visual|logo|landscape|cityscape|scene|avatar|icon|banner|poster|flyer|invitation|graphic|city|sunset|puppy|dragon|cat|dog|character|creature|building|beach|mountains|cyberpunk|anime|3d|photorealistic|cinematic|widescreen|16:9|9:16|concept\s+art|background|advertisement|ad|thumbnail)\b/i.test(
        qLower
      );

    const isUniversalImageCreation =
      Boolean(universalGenMatch) &&
      !isNonImageSubject &&
      (hasVisualTerm || (!/^(?:to\s+|a\s+way\s+to|how\s+to)/i.test(universalSubject) && universalSubject.length > 3));

    // K. Direct "text to image" command or keyword
    const isDirectKeyword = /\b(?:text to image|generate an image|generate image|ai image generation)\b/i.test(qLower);

    const isImageGen = Boolean(
      explicitGenMatch ||
      drawMatch ||
      logoMatch ||
      colloquialWantMatch ||
      conversationalMatch ||
      directNounMatch ||
      isVisualNounEnd ||
      visualizeMatch ||
      isTamilImageGen ||
      isTanglishImageGen ||
      isUniversalImageCreation ||
      isDirectKeyword
    );

    if (!isImageGen) return null;

    // 2. Extract clean prompt
    let cleanPrompt = raw.trim();

    if (directNounMatch) {
      const subject = directNounMatch[1].trim();
      const rawLower = raw.toLowerCase();
      if (rawLower.includes("thumbnail")) {
        cleanPrompt = `${subject} thumbnail`;
      } else if (rawLower.includes("wallpaper")) {
        cleanPrompt = `${subject} wallpaper`;
      } else if (rawLower.includes("poster")) {
        cleanPrompt = `${subject} poster`;
      } else if (rawLower.includes("banner")) {
        cleanPrompt = `${subject} banner`;
      } else if (rawLower.includes("logo")) {
        cleanPrompt = `logo for ${subject}`;
      } else {
        cleanPrompt = subject;
      }
    } else if (isVisualNounEnd && visualNounEndMatch) {
      cleanPrompt = raw.replace(/[.!?]+$/, "").trim();
    } else if (colloquialWantMatch) {
      cleanPrompt = wantSubject
        .replace(/^(?:an?\s+)?(?:(?:[a-z0-9_-]+\s+){0,3}(?:image|picture|photo|photograph|portrait|illustration|drawing|visual|wallpaper|render)\s*(?:of|about|showing|depicting|with|for)\s*)?/i, "")
        .trim();
      if (!cleanPrompt) cleanPrompt = wantSubject;
    } else if (drawMatch) {
      cleanPrompt = raw.replace(/^(?:draw|sketch|paint)\s+(?:me\s+)?/i, "").trim();
    } else if (logoMatch) {
      const spec = logoMatch[1]?.trim();
      cleanPrompt = spec ? `a modern minimalist logo for ${spec}` : raw.trim();
    } else if (conversationalMatch) {
      cleanPrompt = raw.replace(/^(?:can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|please\s+)?(?:make|give\s+me|show\s+me|generate|draw|create|render)\s+(?:an?\s+)?(?:image|picture|photo|portrait|illustration|drawing|visual|logo|wallpaper|thumbnail)\s+(?:of|about|showing|depicting|for|with)\s+/i, "").trim();
    } else if (visualizeMatch) {
      const topic = visualizeMatch[1]?.replace(/^this\s+concept:?\s*/i, "").trim();
      cleanPrompt = topic || "this concept";
    } else if (explicitGenMatch) {
      cleanPrompt = raw
        .replace(
          /^(?:generate|create|render|produce|design|make)\s+(?:an?\s+)?(?:[a-z0-9_-]+\s+){0,4}\b(?:image|picture|photo|photograph|portrait|artwork|illustration|render|drawing|wallpaper|visual|logo|landscape|cityscape|avatar|icon|banner|poster|scene|graphic|invitation|thumbnail)\b\s*(?:of|about|depicting|showing|with|for|using)?\s*/i,
          ""
        )
        .replace(/^(?:generate|create)\s+(?:an?\s+)?/i, "")
        .replace(/^text to image:?\s*/i, "")
        .trim();
    } else if (isUniversalImageCreation) {
      cleanPrompt = raw
        .replace(
          /^(?:generate|create|render|produce|design|make)\s+(?:an?\s+)?\b(?:image|picture|photo|photograph|portrait|artwork|illustration|render|drawing|wallpaper|visual|logo|thumbnail)\b\s*(?:of|about|depicting|showing|with|for|using)?\s*/i,
          ""
        )
        .replace(/^(?:generate|create|render|produce|design|make)\s+(?:an?\s+)?/i, "a ")
        .trim();
    } else if (isTamilImageGen) {
      cleanPrompt = raw.replace(/(?:படம்|ஓவியம்)\s*(?:வரை|உருவாக்கு|வேணும்|காட்டு)|(?:வரை|உருவாக்கு)\s*(?:ஒரு\s*)?(?:படம்|ஓவியம்)/g, "").trim() || raw.trim();
    } else if (isTanglishImageGen) {
      cleanPrompt = raw.replace(/\b(?:create\s+pannu|generate\s+pannu|venum|vara)\b/gi, "").trim() || raw.trim();
    }

    if (!cleanPrompt) cleanPrompt = raw.trim();

    // 3. Detect aspect ratio
    let aspectRatio: ImageAspectRatio = "1:1";
    if (/\b(?:9:16|phone\s+wallpaper|mobile\s+wallpaper|portrait|vertical|story|reel|tiktok)\b/i.test(qLower)) {
      aspectRatio = "9:16";
    } else if (/\b(?:16:9|desktop\s+wallpaper|desktop\s+background|widescreen|landscape|wide|wallpaper|banner|header|thumbnail|youtube\s+thumbnail)\b/i.test(qLower)) {
      aspectRatio = "16:9";
    } else if (/\b4:3\b/i.test(qLower)) {
      aspectRatio = "4:3";
    } else if (/\b3:4\b/i.test(qLower)) {
      aspectRatio = "3:4";
    } else if (/\b(?:1:1|square|square\s+logo|avatar|profile\s+picture|icon)\b/i.test(qLower)) {
      aspectRatio = "1:1";
    }

    // 4. Detect style preset dynamically
    let style: ImageStylePreset = "realistic";
    if (/\b(cinematic|movie\s+still|film\s+still|epic\s+lighting|dramatic\s+lighting)\b/i.test(qLower)) {
      style = "cinematic";
    } else if (/\b(3d|3d\s+render|octane|unreal\s+engine|cgi|blender)\b/i.test(qLower)) {
      style = "3d";
    } else if (/\b(anime|manga|studio\s+ghibli|makoto\s+shinkai|chibi|otaku|animated|cartoon|animation)\b/i.test(qLower)) {
      style = "anime";
    } else if (/\b(oil\s+painting|oil\s+on\s+canvas|impressionism)\b/i.test(qLower)) {
      style = "oil-painting";
    } else if (/\b(watercolor|watercolour|aquarelle)\b/i.test(qLower)) {
      style = "watercolor";
    } else if (/\b(digital\s+art|digital\s+painting|concept\s+art|artstation)\b/i.test(qLower)) {
      style = "digital-art";
    } else if (/\b(sketch|pencil\s+drawing|charcoal|line\s+art)\b/i.test(qLower)) {
      style = "sketch";
    } else if (/\b(vector|flat\s+vector|vector\s+art)\b/i.test(qLower)) {
      style = "vector";
    } else if (/\b(product|product\s+photography|commercial\s+shot|studio\s+lighting|packshot|advertisement|product\s+ad)\b/i.test(qLower)) {
      style = "product";
      style = "product";
    } else if (/\b(logo|minimalist\s+badge|brand\s+icon|emblem)\b/i.test(qLower)) {
      style = "logo";
    } else if (/\b(fantasy|dragon|mythical|magic|enchanted|wizard)\b/i.test(qLower)) {
      style = "fantasy";
    } else if (/\b(sci-fi|science\s+fiction|futuristic|space|spaceship|galaxy|solar\s+system|cyberpunk)\b/i.test(qLower)) {
      style = "sci-fi";
    } else if (/\b(vintage|retro|polaroid|1970s|1980s|sepia|kodachrome)\b/i.test(qLower)) {
      style = "vintage";
    } else if (/\b(minimalist|minimalism|clean\s+design)\b/i.test(qLower)) {
      style = "minimalist";
    } else if (/\b(abstract|surreal|psychedelic)\b/i.test(qLower)) {
      style = "abstract";
    } else if (/\b(social\s+media|instagram|thumbnail)\b/i.test(qLower)) {
      style = "social";
    } else if (/\b(portrait|headshot|person|man|woman|coatsuit|coat\s+suit|suit|photo|photograph|photorealistic|beach|sunset|nature)\b/i.test(qLower)) {
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
      /\b(?:convert|turn|transform|make)\s+(?:these\s+)?(?:lyrics|words)\s+into\s+(?:a\s+)?(?:song|music|track|melody)\b/i.test(
        qLower
      ) ||
      /\b(?:create|make|generate)\s+music\s+from\s+(?:these\s+)?(?:lyrics|words)\b/i.test(
        qLower
      ) ||
      /\b(?:song|music|track|melody)\s+(?:for|from)\s+(?:these\s+)?lyrics\b/i.test(qLower);

    // 2. Play or download song commands
    const isPlayOrDownload =
      /\b(?:play|listen to|hear|download)\s+(?:this|the|my)?\s*(?:generated\s+)?(?:song|audio|track|music|melody)\b/i.test(
        qLower
      );

    // 3. Sing song command
    const isSingSong = /\b(?:sing|perform)\s+(?:this|a|the)\s+(?:song|melody|track|lyrics)\b/i.test(qLower);

    // 4. Direct song / music generation commands
    const isExplicitMusic =
      /\b(?:generate|create|make|compose|produce)\s+(?:an?\s+)?(?:original\s+)?(?:[a-z0-9_-]+\s+){0,3}(?:song|music|track|melody|beat|audio track|soundtrack)\b/i.test(
        qLower
      ) ||
      /\b(?:make|create|compose|generate)\s+(?:a\s+)?(?:[a-z0-9_-]+\s+)?melody\b/i.test(qLower) ||
      /\b(?:text to music|music generator|instrumental music|background music|audio generator|generate an audio track)\b/i.test(
        qLower
      );

    const isMusicGen = isSongFromLyrics || isPlayOrDownload || isSingSong || isExplicitMusic;
    if (!isMusicGen) return null;

    // Extract inline user-supplied lyrics if present
    let fullExactLyrics: string | undefined = undefined;
    const lyricsColonMatch = raw.match(/(?:lyrics|words):\s*([\s\S]+)/i);
    const lyricsFromMatch = raw.match(/(?:from|using|with|for)\s+(?:these\s+)?(?:lyrics|words)\s*[:\n\-]\s*([\s\S]+)/i);
    const quotesMatch = raw.match(/["'“”]([\s\S]{20,})["'“”]/);
    const sectionTagMatch = /\[(?:intro|verse|chorus|pallavi|bridge|outro|pre-chorus)[\w\s]*\]/i.test(raw);

    if (lyricsColonMatch && lyricsColonMatch[1].trim().length > 10) {
      fullExactLyrics = lyricsColonMatch[1].trim();
    } else if (lyricsFromMatch && lyricsFromMatch[1].trim().length > 10) {
      fullExactLyrics = lyricsFromMatch[1].trim();
    } else if (sectionTagMatch) {
      const idx = raw.search(/\[(?:intro|verse|chorus|pallavi|bridge|outro|pre-chorus)[\w\s]*\]/i);
      if (idx !== -1) {
        fullExactLyrics = raw.slice(idx).trim();
      }
    } else if (quotesMatch && quotesMatch[1].trim().length > 15) {
      fullExactLyrics = quotesMatch[1].trim();
    }

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
        fullExactLyrics,
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
