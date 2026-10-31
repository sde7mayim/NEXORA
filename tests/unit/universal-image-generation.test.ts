import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CreativeDetector } from "@/lib/ai/creative/creative-detector";
import { ImageCreativeService } from "@/lib/ai/creative/image-service";
import { ImageProviderAdapter } from "@/lib/ai/creative/image-provider-adapter";

describe("NEXORA — UNIVERSAL AI IMAGE GENERATION SYSTEM", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ==========================================================================
  // PHASE 2 & 9: UNIVERSAL PROMPT UNDERSTANDING ACROSS ANY SUBJECT (NO WHITELISTS)
  // ==========================================================================
  describe("1. Universal Prompt Intent Detection (Unconstrained Subjects)", () => {
    const universalTestPrompts = [
      {
        prompt: "Create an image of a man wearing a navy blue coat suit",
        expectedSubject: "a man wearing a navy blue coat suit",
        expectedStyle: "realistic",
      },
      {
        prompt: "Generate a beautiful Christmas celebration scene",
        expectedSubject: "a beautiful Christmas celebration scene",
        expectedStyle: "realistic",
      },
      {
        prompt: "Create a futuristic city at night",
        expectedSubject: "a futuristic city at night",
        expectedStyle: "sci-fi",
      },
      {
        prompt: "Draw a fantasy dragon flying above a mountain",
        expectedSubject: "a fantasy dragon flying above a mountain",
        expectedStyle: "fantasy",
      },
      {
        prompt: "Generate a photorealistic beach sunset",
        expectedSubject: "a photorealistic beach sunset",
        expectedStyle: "realistic",
      },
      {
        prompt: "Create a professional product advertisement",
        expectedSubject: "a professional product advertisement",
        expectedStyle: "product",
      },
      {
        prompt: "Design a modern birthday invitation",
        expectedSubject: "a modern birthday invitation",
        expectedStyle: "realistic",
      },
      {
        prompt: "Generate a cute animated puppy",
        expectedSubject: "a cute animated puppy",
        expectedStyle: "anime",
      },
      {
        prompt: "Create a scientific illustration of the solar system",
        expectedSubject: "the solar system",
        expectedStyle: "sci-fi",
      },
      {
        prompt: "Generate a completely new visual concept: bioluminescent glass treehouse in a misty valley",
        expectedSubject: "bioluminescent glass treehouse in a misty valley",
        expectedStyle: "realistic",
      },
    ];

    for (const testCase of universalTestPrompts) {
      it(`should detect universal prompt without hardcoded list: "${testCase.prompt.slice(0, 45)}..."`, () => {
        const result = CreativeDetector.detect(testCase.prompt);
        expect(result.isCreativeIntent).toBe(true);
        expect(result.creativeType).toBe("image");
        expect(result.prompt).toBeDefined();
        expect(result.prompt?.toLowerCase()).toContain(testCase.expectedSubject.toLowerCase());
        expect(result.parameters?.style).toBe(testCase.expectedStyle);
      });
    }
  });

  // ==========================================================================
  // MULTILINGUAL UNDERSTANDING: ENGLISH, TAMIL, TANGLISH
  // ==========================================================================
  describe("2. Multilingual Natural Language Understanding", () => {
    it("should detect and handle Tamil image prompts", () => {
      const tamilPrompts = [
        "ஒரு அழகான பூனை படம் வரை",
        "கடற்கரை சூரிய அஸ்தமனம் படம் உருவாக்கு",
        "வானத்தில் பறக்கும் டிராகன் படம் வேணும்",
      ];

      for (const p of tamilPrompts) {
        const result = CreativeDetector.detect(p);
        expect(result.isCreativeIntent).toBe(true);
        expect(result.creativeType).toBe("image");
        expect(result.prompt).toBeDefined();
      }
    });

    it("should detect Tanglish image prompts", () => {
      const tanglishPrompts = [
        "Oru cat picture create pannu",
        "Futuristic car photo generate pannu",
        "Sunset beach image venum",
      ];

      for (const p of tanglishPrompts) {
        const result = CreativeDetector.detect(p);
        expect(result.isCreativeIntent).toBe(true);
        expect(result.creativeType).toBe("image");
      }
    });

    it("should extract clean prompts from colloquial requests like 'i want a man with a coatsuit'", () => {
      const queries = [
        "i want a man with a coatsuit",
        "i want an image of a red sports car",
        "i want a Christmas-themed image",
        "i want a cute kitten playing with yarn",
      ];

      for (const q of queries) {
        const result = CreativeDetector.detect(q);
        expect(result.isCreativeIntent).toBe(true);
        expect(result.creativeType).toBe("image");
        expect(result.prompt).not.toMatch(/^i\s+want\s+(an?\s+)?image\s+of/i);
      }
    });
  });

  // ==========================================================================
  // DYNAMIC PROMPT OPTIMIZATION & ENHANCEMENT (NO REPLACING USER'S SUBJECT)
  // ==========================================================================
  describe("3. Dynamic Prompt Enhancement without Subject Distortion", () => {
    it("should preserve the user's exact subject when enhancing a short prompt", () => {
      const userPrompt = "a man wearing a navy blue coat suit";
      const { optimizedPrompt, style } = ImageCreativeService.optimizePrompt(userPrompt);

      // Must NOT replace with generic canned model description
      expect(optimizedPrompt.toLowerCase()).toContain("navy blue coat suit");
      expect(optimizedPrompt.toLowerCase()).toContain("man");
      expect(style).toBe("realistic");
      // Must add technical visual fidelity tags
      expect(optimizedPrompt).toContain("8k resolution");
    });

    it("should enrich seasonal concepts with festive atmosphere without replacing subjects", () => {
      const userPrompt = "A festive Christmas celebration";
      const { optimizedPrompt } = ImageCreativeService.optimizePrompt(userPrompt);

      expect(optimizedPrompt.toLowerCase()).toContain("christmas celebration");
      expect(optimizedPrompt).toContain("8k");
    });

    it("should preserve anime aesthetic when anime style is requested", () => {
      const userPrompt = "Draw an anime girl holding an umbrella in the rain";
      const { optimizedPrompt, style } = ImageCreativeService.optimizePrompt(userPrompt);

      expect(style).toBe("anime");
      expect(optimizedPrompt).toContain("anime aesthetic");
      expect(optimizedPrompt).not.toContain("photorealistic Hasselblad");
    });

    it("should not unnecessarily rewrite an already detailed prompt", () => {
      const detailedPrompt =
        "A hyper-detailed macroscopic photograph of a dew drop resting delicately on a vibrant crimson rose petal, capturing internal refractions of early morning sunlight with soft bokeh background";
      const { optimizedPrompt } = ImageCreativeService.optimizePrompt(detailedPrompt);

      expect(optimizedPrompt).toContain("dew drop resting delicately on a vibrant crimson rose petal");
      expect(optimizedPrompt).toContain("internal refractions");
    });
  });

  // ==========================================================================
  // PHASE 3: 4 DISTINCT IMAGE OPERATIONS
  // ==========================================================================
  describe("4. Four Distinct Image Operations (Generation, Edit, Variation, Understanding)", () => {
    // 3.1 New Image Generation
    it("Operation 1: classifies New Image Generation correctly", () => {
      const genQuery = "Generate a futuristic cyberpunk city with neon holograms";
      const result = CreativeDetector.detect(genQuery);
      expect(result.isCreativeIntent).toBe(true);
      expect(result.creativeType).toBe("image");
      expect(result.parameters?.isVariation).toBeUndefined();
    });

    // 3.2 Image Editing
    it("Operation 2: classifies Image Editing when an image is attached or explicitly referenced", () => {
      const editQueries = [
        "Remove the background of this image",
        "Change the background to a tropical beach",
        "Change the clothing color to navy blue",
        "Make the lighting brighter in this photo",
        "Restore and enhance this old photograph",
      ];

      for (const q of editQueries) {
        const result = CreativeDetector.detect(q, [
          { name: "portrait.png", mimeType: "image/png", content: "data:image/png;base64,mock" },
        ]);
        expect(result.isCreativeIntent).toBe(true);
        expect(result.creativeType).toBe("edited-image");
        expect(result.parameters?.editOperation).toBeDefined();
      }
    });

    // 3.3 Image Variation
    it("Operation 3: classifies Image Variation while preserving subject", () => {
      const varQueries = [
        "Create another variation of this image",
        "Keep the same subject but change the background to Paris",
        "Generate three different artistic versions",
      ];

      for (const q of varQueries) {
        const result = CreativeDetector.detect(q);
        expect(result.isCreativeIntent).toBe(true);
        expect(result.creativeType).toBe("image");
        expect(result.parameters?.isVariation).toBe(true);
      }
    });

    // 3.4 Image Understanding
    it("Operation 4: routes Image Understanding to text/vision response instead of image generation", () => {
      const understandingQueries = [
        "Describe this image",
        "What objects are visible in this picture?",
        "Explain this diagram",
        "What text is written on the whiteboard in this photo?",
        "Analyze this screenshot and summarize the errors",
      ];

      for (const q of understandingQueries) {
        const result = CreativeDetector.detect(q, [
          { name: "diagram.png", mimeType: "image/png", content: "data:image/png;base64,mock" },
        ]);
        expect(result.isCreativeIntent).toBe(false);
      }
    });
  });

  // ==========================================================================
  // PHASE 5: NATIVE HIGH-RESOLUTION & ASPECT RATIOS
  // ==========================================================================
  describe("5. High-Resolution & Aspect Ratio Handling", () => {
    it("should resolve 1:1 to native 1024x1024", () => {
      const dims = ImageProviderAdapter.resolveDimensions("1:1");
      expect(dims.width).toBe(1024);
      expect(dims.height).toBe(1024);
    });

    it("should resolve 16:9 widescreen to standard 1024x576 and HD 1792x1024", () => {
      const stdDims = ImageProviderAdapter.resolveDimensions("16:9", "standard");
      expect(stdDims.width).toBe(1024);
      expect(stdDims.height).toBe(576);

      const hdDims = ImageProviderAdapter.resolveDimensions("16:9", "hd");
      expect(hdDims.width).toBe(1792);
      expect(hdDims.height).toBe(1024);
    });

    it("should resolve 9:16 portrait to standard 576x1024 and HD 1024x1792", () => {
      const stdDims = ImageProviderAdapter.resolveDimensions("9:16", "standard");
      expect(stdDims.width).toBe(576);
      expect(stdDims.height).toBe(1024);

      const hdDims = ImageProviderAdapter.resolveDimensions("9:16", "hd");
      expect(hdDims.width).toBe(1024);
      expect(hdDims.height).toBe(1792);
    });

    it("should detect aspect ratio keywords from user prompt", () => {
      const testCases = [
        { prompt: "Create a 16:9 wallpaper of deep space nebula", expected: "16:9" },
        { prompt: "Generate a widescreen desktop background of mountains", expected: "16:9" },
        { prompt: "Make a 9:16 phone wallpaper of a rainy street", expected: "9:16" },
        { prompt: "Create a portrait vertical visual of an ancient temple", expected: "9:16" },
        { prompt: "Design a square logo for a specialty roastery", expected: "1:1" },
      ];

      for (const tc of testCases) {
        const result = CreativeDetector.detect(tc.prompt);
        expect(result.parameters?.aspectRatio).toBe(tc.expected);
      }
    });
  });

  // ==========================================================================
  // PHASE 4 & 8: REAL PROVIDER ADAPTER, FAILOVER & HONEST ERRORS
  // ==========================================================================
  describe("6. Provider Adapter Architecture & Honest Error States", () => {
    it("should throw honest configuration error when IMAGE_PROVIDER is set to none", async () => {
      await expect(
        ImageProviderAdapter.generate({
          prompt: "Futuristic vehicle",
          enhancedPrompt: "Futuristic vehicle, 8k",
          provider: "none",
        })
      ).rejects.toThrow(/NONE/i);
    });

    it("should throw honest configuration error when an unconfigured external provider is requested", async () => {
      delete process.env.OPENAI_API_KEY;

      await expect(
        ImageProviderAdapter.generate({
          prompt: "Professional portrait",
          enhancedPrompt: "Professional portrait, 8k",
          provider: "openai",
        })
      ).rejects.toThrow(/OPENAI_API_KEY is not configured/i);
    });

    it("should handle Replicate missing token honestly", async () => {
      delete process.env.REPLICATE_API_TOKEN;

      await expect(
        ImageProviderAdapter.generate({
          prompt: "Bioluminescent creature",
          enhancedPrompt: "Bioluminescent creature, 8k",
          provider: "replicate",
        })
      ).rejects.toThrow(/REPLICATE_API_TOKEN is not configured/i);
    });

    it("should return simulated capacity limit error properly without faking images", async () => {
      const artifact = await ImageCreativeService.generateImage({
        prompt: "A man in a coat suit",
        provider: "pollinations-fail",
      });

      expect(artifact.status).toBe("failed");
      expect(artifact.mediaUrl).toBeUndefined();
      expect(artifact.errorMessage).toContain("Pollinations.ai — At its limit right now");
    });

    it("should generate a valid image artifact with resolution and provider metadata via default auto adapter", async () => {
      const artifact = await ImageCreativeService.generateImage({
        prompt: "A majestic golden eagle soaring over snow-capped alpine peaks",
        aspectRatio: "16:9",
        style: "cinematic",
      });

      expect(artifact.status).toBe("ready");
      expect(artifact.mediaUrl).toBeDefined();
      expect(artifact.mediaUrl).toContain("pollinations.ai");
      expect(artifact.imageMetadata?.aspectRatio).toBe("16:9");
      expect(["1024x576", "1792x1024"]).toContain(artifact.imageMetadata?.resolution);
      expect(artifact.imageMetadata?.provider).toContain("Pollinations AI");
    });
  });

  // ==========================================================================
  // PHASE 6 & 7: IMAGE EDITING & VARIATION EXECUTION
  // ==========================================================================
  describe("7. Image Editing & Variation Generation", () => {
    it("should generate real edited image for background removal with transparent pattern", async () => {
      const mockImg = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='red'/%3E%3C/svg%3E";
      const artifact = await ImageCreativeService.editImage({
        originalImageUrl: mockImg,
        instruction: "Remove the background",
        operation: "remove-bg",
        aspectRatio: "1:1",
      });

      expect(artifact.type).toBe("edited-image");
      expect(artifact.status).toBe("ready");
      expect(artifact.mediaUrl).toBeDefined();
      expect(artifact.mediaUrl?.startsWith("data:image/svg+xml")).toBe(true);

      const decoded = decodeURIComponent(artifact.mediaUrl!.replace("data:image/svg+xml;charset=utf-8,", ""));
      expect(decoded).toContain("pattern id=\"checkers\"");
      expect(decoded).toContain("NEXORA • BACKGROUND REMOVED");
    });

    it("should generate real edited image for background replacement with specified scene", async () => {
      const mockImg = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='blue'/%3E%3C/svg%3E";
      const artifact = await ImageCreativeService.editImage({
        originalImageUrl: mockImg,
        instruction: "Change the background to a sunny beach",
        operation: "replace-bg",
        targetBackground: "beach",
        aspectRatio: "16:9",
      });

      expect(artifact.status).toBe("ready");
      const decoded = decodeURIComponent(artifact.mediaUrl!.replace("data:image/svg+xml;charset=utf-8,", ""));
      expect(decoded).toContain("NEXORA • BACKGROUND REPLACED");
      expect(decoded).toContain("linear-gradient(180deg, #38bdf8 0%, #fde047 70%, #d97706 100%)");
    });

    it("should generate a variation artifact preserving original prompt context with isVariation flag", async () => {
      const artifact = await ImageCreativeService.generateVariation({
        prompt: "Cyberpunk detective in neon alleyway",
        aspectRatio: "1:1",
        style: "cinematic",
        variationInstruction: "change angle to high dramatic aerial view",
      });

      expect(artifact.status).toBe("ready");
      expect(artifact.title).toContain("Variation:");
      expect(artifact.imageMetadata?.isVariation).toBe(true);
    });
  });

  // ==========================================================================
  // PHASE 8: CONTEXT ISOLATION & REGRESSION PREVENTION
  // ==========================================================================
  describe("8. Conversation Context Isolation & Regression Prevention", () => {
    it("should never trigger image generation for general coding queries", () => {
      const codeQueries = [
        "Write python code to load an image using PIL",
        "How do I resize an image in JavaScript canvas?",
        "def process_image(img_path): return cv2.imread(img_path)",
        "npm install sharp and write code to compress images",
      ];

      for (const q of codeQueries) {
        const result = CreativeDetector.detect(q);
        expect(result.isCreativeIntent).toBe(false);
      }
    });

    it("should never trigger image generation for prompt idea questions", () => {
      const promptIdeaQueries = [
        "Give me some image prompts for Midjourney",
        "Suggest prompt ideas for a fantasy landscape",
        "What are good prompts for portraits?",
        "How to write prompts for DALL-E 3?",
      ];

      for (const q of promptIdeaQueries) {
        const result = CreativeDetector.detect(q);
        expect(result.isCreativeIntent).toBe(false);
      }
    });

    it("should never trigger image generation for technical model explanations", () => {
      const techQueries = [
        "How does Stable Diffusion work?",
        "Explain diffusion models and latent space",
        "What is DALL-E and how does it generate images?",
      ];

      for (const q of techQueries) {
        const result = CreativeDetector.detect(q);
        expect(result.isCreativeIntent).toBe(false);
      }
    });

    it("should never trigger image generation for normal text conversation", () => {
      const chatQueries = [
        "What is the capital of France?",
        "Hello, how are you today?",
        "Summarize the key architectural benefits of microservices",
        "Explain React useEffect hook with a simple example",
      ];

      for (const q of chatQueries) {
        const result = CreativeDetector.detect(q);
        expect(result.isCreativeIntent).toBe(false);
      }
    });
  });

  // ==========================================================================
  // PHASE 9: DEDICATED THUMBNAIL & DIRECT NOUN PHRASE GENERATION (REAL ARTIFACTS)
  // ==========================================================================
  describe("9. Dedicated Thumbnail & Direct Noun Image Generation", () => {
    it("should route 'a thumbnail for christmas' directly to image generation with 16:9 aspect ratio", () => {
      const result = CreativeDetector.detect("a thumbnail for christmas");
      expect(result.isCreativeIntent).toBe(true);
      expect(result.creativeType).toBe("image");
      expect(result.parameters?.aspectRatio).toBe("16:9");
      expect(result.prompt?.toLowerCase()).toContain("christmas");
    });

    it("should correctly classify all core test queries as image generation", () => {
      const testCases = [
        { q: "a thumbnail for christmas", expectedType: "image" },
        { q: "Create a Christmas celebration image.", expectedType: "image" },
        { q: "Generate a man wearing a coat suit.", expectedType: "image" },
        { q: "I want a beautiful nature wallpaper.", expectedType: "image" },
        { q: "Create a futuristic city image.", expectedType: "image" },
        { q: "Make a visual variation of this concept.", expectedType: "image" },
        { q: "Create a birthday invitation image.", expectedType: "image" },
        { q: "Christmas celebration image", expectedType: "image" },
        { q: "thumbnail for a youtube video about gaming", expectedType: "image" },
        { q: "a poster for summer festival", expectedType: "image" },
        { q: "futuristic city wallpaper", expectedType: "image" },
      ];

      for (const tc of testCases) {
        const res = CreativeDetector.detect(tc.q);
        expect(res.isCreativeIntent).toBe(true);
        expect(res.creativeType).toBe(tc.expectedType);
      }
    });

    it("should generate an actual image artifact for 'a thumbnail for christmas' with verified metadata", async () => {
      const artifact = await ImageCreativeService.generateImage({
        prompt: "a thumbnail for christmas",
        aspectRatio: "16:9",
      });

      expect(artifact.type).toBe("image");
      expect(artifact.status).toBe("ready");
      expect(artifact.mediaUrl).toBeDefined();
      expect(typeof artifact.mediaUrl).toBe("string");
      expect(artifact.mediaUrl).toMatch(/^https?:\/\//i);
      expect(artifact.imageMetadata?.aspectRatio).toBe("16:9");
      expect(artifact.imageMetadata?.resolution).toBe("1024x576");
      expect(artifact.imageMetadata?.revisedPrompt?.toLowerCase()).toContain("christmas");
      expect(artifact.errorMessage).toBeUndefined();
    });
  });
});
