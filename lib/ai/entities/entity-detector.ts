import { EntityCategory, EntityDetectionResult } from "./entity-types";

interface MessageContext {
  role: string;
  content: string;
}

export class EntityDetector {
  // Common technical, programming, and abstract concepts that MUST NOT trigger entity cards
  private static readonly NON_ENTITY_TERMS = [
    "react",
    "angular",
    "vue",
    "next.js",
    "nextjs",
    "node",
    "nodejs",
    "typescript",
    "javascript",
    "python",
    "java",
    "c++",
    "rust",
    "golang",
    "binary search",
    "bubble sort",
    "quicksort",
    "dfs",
    "bfs",
    "dynamic programming",
    "algorithm",
    "data structure",
    "linked list",
    "hash map",
    "binary tree",
    "cpu",
    "gpu architecture",
    "compiler",
    "operating system",
    "kernel",
    "thread",
    "process",
    "mutex",
    "semaphore",
    "database",
    "sql",
    "nosql",
    "rest api",
    "graphql",
    "microservices",
    "microservice",
    "monolith",
    "monolithic",
    "docker",
    "dockerfile",
    "kubernetes",
    "ci/cd",
    "circuit breaker",
    "useeffect",
    "usestate",
    "hook",
    "function",
    "closure",
    "promise",
    "async await",
    "event loop",
    "http",
    "https",
    "tcp",
    "udp",
    "tcp/ip",
    "dns",
    "ssl",
    "tls",
    "oauth",
    "jwt",
    "v8",
    "garbage collection",
    "indexing",
  ];

  // Laptop keywords & models
  private static readonly LAPTOP_BRANDS_MODELS = [
    "xps",
    "macbook",
    "thinkpad",
    "spectre",
    "zenbook",
    "rog zephyrus",
    "alienware",
    "razer blade",
    "surface laptop",
    "surface pro",
    "legion",
    "envy",
    "pavilion",
    "latitude",
    "vivobook",
    "framework laptop",
    "ideapad",
    "yoga",
    "acer swift",
    "predator",
    "omen",
    "victus",
  ];

  // Smartphone brands & models
  private static readonly SMARTPHONE_BRANDS_MODELS = [
    "iphone",
    "galaxy s",
    "galaxy z",
    "galaxy a",
    "pixel",
    "oneplus",
    "xiaomi",
    "redmi",
    "poco",
    "oppo find",
    "vivo x",
    "nothing phone",
    "motorola edge",
    "sony xperia",
    "asus zenfone",
    "rog phone",
    "realme gt",
    "honor magic",
  ];

  // Audio & wearable gadgets
  private static readonly GADGET_PATTERNS = [
    "wh-1000xm",
    "wf-1000xm",
    "airpods",
    "quietcomfort",
    "bose 700",
    "galaxy buds",
    "pixel buds",
    "sennheiser momentum",
    "apple watch",
    "galaxy watch",
    "garmin",
    "fitbit",
    "pixel watch",
    "sony a7",
    "canon eos",
    "fujifilm x-",
    "nikon z",
    "lg oled",
    "bravia",
    "samsung qled",
  ];

  // Popular tourist destinations & cities
  private static readonly POPULAR_DESTINATIONS = [
    "ooty",
    "paris",
    "tokyo",
    "kyoto",
    "london",
    "new york",
    "rome",
    "manali",
    "goa",
    "shimla",
    "kodaikanal",
    "coorg",
    "munnar",
    "ladakh",
    "bali",
    "dubai",
    "singapore",
    "barcelona",
    "amsterdam",
    "venice",
    "florence",
    "switzerland",
    "santorini",
    "maldives",
    "prague",
    "vienna",
    "bangkok",
    "seoul",
    "sydney",
    "cape town",
    "cairo",
    "grand canyon",
    "machu picchu",
    "taj mahal",
    "petra",
    "yosemite",
    "yellowstone",
    "banff",
  ];

  // High profile public figures & celebrities
  private static readonly KNOWN_CELEBRITIES = [
    "cristiano ronaldo",
    "ronaldo",
    "lionel messi",
    "messi",
    "taylor swift",
    "elon musk",
    "steve jobs",
    "bill gates",
    "virat kohli",
    "sachin tendulkar",
    "lebron james",
    "michael jordan",
    "kobe bryant",
    "neymar",
    "kylian mbappe",
    "roger federer",
    "rafael nadal",
    "novak djokovic",
    "shah rukh khan",
    "leonardo dicaprio",
    "tom cruise",
    "christopher nolan",
    "stephen hawking",
    "albert einstein",
    "marie curie",
    "nikola tesla",
    "jeff bezos",
    "mark zuckerberg",
    "satya nadella",
    "sundar pichai",
    "sam altman",
    "jensen huang",
    "alan turing",
  ];

  /**
   * Main detection method. Evaluates message and resolves context from conversation history.
   */
  static detect(currentQuery: string, history: MessageContext[] = []): EntityDetectionResult {
    const qTrimmed = currentQuery.trim();
    const qLower = qTrimmed.toLowerCase();

    // 0. Immediate disqualification: technical, coding, or programming questions
    if (this.isGenericTechnicalQuery(qLower)) {
      return { isEntityQuery: false };
    }

    // 1. Check for comparison queries (e.g. "Compare iPhone and Samsung flagship phones")
    const comparisonMatch = this.detectComparison(qLower);
    if (comparisonMatch) {
      return comparisonMatch;
    }

    // 2. Check for explicit follow-up reference (e.g. "What about its battery?", "How much does it weigh?")
    const followUpResult = this.detectFollowUp(qLower, history);
    if (followUpResult) {
      return followUpResult;
    }

    // 3. Laptop detection
    const laptop = this.matchLaptop(qLower, qTrimmed);
    if (laptop) return laptop;

    // 4. Smartphone detection
    const phone = this.matchSmartphone(qLower, qTrimmed);
    if (phone) return phone;

    // 5. Electronics & gadgets detection
    const gadget = this.matchGadget(qLower, qTrimmed);
    if (gadget) return gadget;

    // 6. Places & tourist destinations detection
    const place = this.matchPlace(qLower, qTrimmed);
    if (place) return place;

    // 7. Celebrity & public figure detection
    const celebrity = this.matchCelebrity(qLower, qTrimmed);
    if (celebrity) return celebrity;

    // 8. General entity query pattern (e.g. "Tell me about X", "Who is X", "Overview of X")
    const generalEntity = this.matchGeneralEntityPattern(qLower, qTrimmed);
    if (generalEntity) return generalEntity;

    return { isEntityQuery: false };
  }

  /**
   * Identifies purely technical or abstract coding queries that must remain normal chat.
   */
  private static isGenericTechnicalQuery(qLower: string): boolean {
    // If it starts with common programming tasks
    if (
      /^(explain|what is|how to|write|create|debug|fix|implement|optimize|refactor)\s+(a\s+|an\s+|the\s+)?(function|script|algorithm|code|query|bug|test|class|component|hook|regex|dockerfile)/i.test(
        qLower
      )
    ) {
      return true;
    }

    if (/\b(dockerfile|v8|v8 engine|garbage collection|indexing)\b/i.test(qLower)) {
      return true;
    }

    // Check exact non-entity programming keywords
    for (const term of this.NON_ENTITY_TERMS) {
      // Must match whole word
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(qLower)) {
        // Exception: if the query specifically pairs with a laptop/phone name (e.g. "MacBook Pro React dev performance")
        const hasDevice =
          this.LAPTOP_BRANDS_MODELS.some((m) => qLower.includes(m)) ||
          this.SMARTPHONE_BRANDS_MODELS.some((m) => qLower.includes(m));
        if (!hasDevice) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Detects comparisons between two products or entities.
   */
  private static detectComparison(qLower: string): EntityDetectionResult | null {
    // Matches "compare A and B", "difference between A and B", "A vs B", "A versus B"
    const comparePattern =
      /(?:(?:compare|difference between)\s+(.+?)(?:\s+(?:and|with|to)\s+|\s+(?:vs\.?|versus)\s+)(.+)|(.+?)\s+(?:vs\.?|versus)\s+(.+))/i;
    const match = qLower.match(comparePattern);

    if (match) {
      const entity1 = (match[1] || match[3] || "").trim();
      const entity2 = (match[2] || match[4] || "").trim().replace(/[?.!]+$/, "");

      // If either entity or the whole query contains generic technical terms, reject
      if (
        this.isGenericTechnicalQuery(entity1) ||
        this.isGenericTechnicalQuery(entity2) ||
        this.isGenericTechnicalQuery(qLower)
      ) {
        return null;
      }

      // Check if relates to devices, places, celebrities, or gadgets
      let category: EntityCategory = "general_entity";
      const isLaptop =
        this.LAPTOP_BRANDS_MODELS.some((m) => entity1.includes(m) || entity2.includes(m)) ||
        qLower.includes("laptop");
      const isPhone =
        this.SMARTPHONE_BRANDS_MODELS.some((m) => entity1.includes(m) || entity2.includes(m)) ||
        qLower.includes("phone");
      const isCelebrity =
        this.KNOWN_CELEBRITIES.some((c) => entity1.includes(c) || entity2.includes(c));
      const isPlace =
        this.POPULAR_DESTINATIONS.some((p) => entity1.includes(p) || entity2.includes(p));
      const isGadget =
        this.GADGET_PATTERNS.some((g) => entity1.includes(g) || entity2.includes(g));

      if (isLaptop) {
        category = "laptop";
      } else if (isPhone) {
        category = "smartphone";
      } else if (isCelebrity) {
        category = "celebrity";
      } else if (isPlace) {
        category = "place";
      } else if (isGadget) {
        category = "electronics";
      } else {
        // If it does not match known physical/identifiable entities, do not treat as an entity comparison
        return null;
      }

      return {
        isEntityQuery: true,
        entityName: `${this.capitalizeTitle(entity1)} vs ${this.capitalizeTitle(entity2)}`,
        category,
        comparisonEntities: [entity1, entity2],
      };
    }

    return null;
  }

  /**
   * Detects follow-up questions referencing previous entities (e.g. "its battery", "how much does it weigh").
   */
  private static detectFollowUp(qLower: string, history: MessageContext[]): EntityDetectionResult | null {
    // Follow up pronouns and indicators
    const isAnaphoric =
      /\b(its|it|it's|this|that|he|him|his|she|her|there|the phone|the laptop|the device|the place)\b/i.test(
        qLower
      );

    if (!isAnaphoric || history.length === 0) {
      return null;
    }

    // Inspect history from newest to oldest for the last active entity mentioned
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      const detectedInPast = this.detect(msg.content, []);
      if (detectedInPast.isEntityQuery && detectedInPast.entityName) {
        // Resolve aspect (e.g. "battery", "camera", "price", "weight", "weather", "achievements")
        let aspect: string | undefined;
        if (qLower.includes("battery")) aspect = "battery";
        else if (qLower.includes("weight") || qLower.includes("dimension")) aspect = "weight";
        else if (qLower.includes("display") || qLower.includes("screen")) aspect = "display";
        else if (qLower.includes("camera")) aspect = "camera";
        else if (qLower.includes("price") || qLower.includes("cost")) aspect = "price";
        else if (qLower.includes("ram") || qLower.includes("storage")) aspect = "memory";
        else if (qLower.includes("places to visit") || qLower.includes("attractions")) aspect = "attractions";
        else if (qLower.includes("weather") || qLower.includes("best time")) aspect = "visitingInfo";

        return {
          isEntityQuery: true,
          entityName: detectedInPast.entityName,
          category: detectedInPast.category,
          detectedBrand: detectedInPast.detectedBrand,
          isFollowUp: true,
          resolvedFromContext: true,
          specificAspect: aspect,
        };
      }
    }

    return null;
  }

  /**
   * Detects Laptop queries.
   */
  private static matchLaptop(qLower: string, raw: string): EntityDetectionResult | null {
    for (const model of this.LAPTOP_BRANDS_MODELS) {
      if (qLower.includes(model)) {
        // Extract reasonable entity name
        const entityName = this.extractEntityTitle(raw, model, "laptop");
        return {
          isEntityQuery: true,
          entityName,
          category: "laptop",
          detectedBrand: this.extractBrand(qLower),
        };
      }
    }

    // Specific phrase "laptop" with brand
    if (
      /\b(laptop|notebook|ultrabook)\b/i.test(qLower) &&
      /\b(dell|apple|lenovo|hp|asus|acer|msi|razer|samsung|microsoft)\b/i.test(qLower)
    ) {
      return {
        isEntityQuery: true,
        entityName: this.extractTitleAroundKeywords(raw, ["laptop", "notebook"]),
        category: "laptop",
        detectedBrand: this.extractBrand(qLower),
      };
    }

    return null;
  }

  /**
   * Detects Smartphone queries.
   */
  private static matchSmartphone(qLower: string, raw: string): EntityDetectionResult | null {
    for (const model of this.SMARTPHONE_BRANDS_MODELS) {
      if (qLower.includes(model)) {
        const entityName = this.extractEntityTitle(raw, model, "smartphone");
        return {
          isEntityQuery: true,
          entityName,
          category: "smartphone",
          detectedBrand: this.extractBrand(qLower),
        };
      }
    }

    if (
      /\b(phone|smartphone|mobile)\b/i.test(qLower) &&
      /\b(apple|samsung|google|oneplus|xiaomi|oppo|vivo|motorola|sony|nothing)\b/i.test(qLower)
    ) {
      return {
        isEntityQuery: true,
        entityName: this.extractTitleAroundKeywords(raw, ["phone", "smartphone"]),
        category: "smartphone",
        detectedBrand: this.extractBrand(qLower),
      };
    }

    return null;
  }

  /**
   * Detects Electronics & gadgets (Headphones, smartwatches, cameras, TVs).
   */
  private static matchGadget(qLower: string, raw: string): EntityDetectionResult | null {
    for (const pattern of this.GADGET_PATTERNS) {
      if (qLower.includes(pattern)) {
        return {
          isEntityQuery: true,
          entityName: this.extractEntityTitle(raw, pattern, "electronics"),
          category: "electronics",
          detectedBrand: this.extractBrand(qLower),
        };
      }
    }

    if (
      /\b(headphones|earbuds|smartwatch|camera|television|oled tv)\b/i.test(qLower) &&
      /\b(sony|apple|bose|sennheiser|canon|nikon|fujifilm|lg|samsung)\b/i.test(qLower)
    ) {
      return {
        isEntityQuery: true,
        entityName: this.extractTitleAroundKeywords(raw, ["headphones", "smartwatch", "camera", "tv"]),
        category: "electronics",
        detectedBrand: this.extractBrand(qLower),
      };
    }

    return null;
  }

  /**
   * Detects Places, cities, and landmarks.
   */
  private static matchPlace(qLower: string, raw: string): EntityDetectionResult | null {
    // 1. Explicit travel/destination phrases
    const placePhraseMatch =
      qLower.match(/(?:places to visit in|visit|travel to|tourism in|sightseeing in|vacation in|guide to)\s+([a-zA-Z\s]+)/i);

    if (placePhraseMatch && placePhraseMatch[1]) {
      const placeName = placePhraseMatch[1].trim().replace(/[?.!]+$/, "");
      if (placeName.length >= 3 && !this.isGenericTechnicalQuery(placeName)) {
        return {
          isEntityQuery: true,
          entityName: this.capitalizeTitle(placeName),
          category: "place",
        };
      }
    }

    // 2. Exact match on known famous destinations
    for (const dest of this.POPULAR_DESTINATIONS) {
      const regex = new RegExp(`\\b${dest}\\b`, "i");
      if (regex.test(qLower)) {
        return {
          isEntityQuery: true,
          entityName: this.capitalizeTitle(dest),
          category: "place",
        };
      }
    }

    return null;
  }

  /**
   * Detects Celebrities & public figures.
   */
  private static matchCelebrity(qLower: string, raw: string): EntityDetectionResult | null {
    for (const celeb of this.KNOWN_CELEBRITIES) {
      const regex = new RegExp(`\\b${celeb}\\b`, "i");
      if (regex.test(qLower)) {
        return {
          isEntityQuery: true,
          entityName: this.capitalizeTitle(celeb),
          category: "celebrity",
        };
      }
    }

    // Pattern: "Who is [Name]?"
    const whoIsMatch = qLower.match(/^who\s+is\s+([a-zA-Z\s.'-]+)\??$/i);
    if (whoIsMatch && whoIsMatch[1]) {
      const name = whoIsMatch[1].trim();
      if (name.split(/\s+/).length <= 4 && !this.isGenericTechnicalQuery(name)) {
        return {
          isEntityQuery: true,
          entityName: this.capitalizeTitle(name),
          category: "celebrity",
        };
      }
    }

    return null;
  }

  /**
   * Detects general entity patterns ("Tell me about X", "Overview of X").
   */
  private static matchGeneralEntityPattern(qLower: string, raw: string): EntityDetectionResult | null {
    const tellMeMatch = qLower.match(/^(?:tell me about|what is|overview of|info on|details about)\s+([a-zA-Z0-9\s.'-]+)\??$/i);
    if (tellMeMatch && tellMeMatch[1]) {
      const candidate = tellMeMatch[1].trim();
      // Ignore if it's generic programming or short words
      if (candidate.length >= 3 && !this.isGenericTechnicalQuery(candidate)) {
        let category: EntityCategory = "general_entity";
        if (/\b(laptop|notebook)\b/i.test(candidate)) category = "laptop";
        else if (/\b(phone|smartphone)\b/i.test(candidate)) category = "smartphone";
        else if (/\b(city|island|park|temple|museum|beach)\b/i.test(candidate)) category = "place";

        return {
          isEntityQuery: true,
          entityName: this.capitalizeTitle(candidate),
          category,
        };
      }
    }

    return null;
  }

  private static extractBrand(text: string): string | undefined {
    const brands = [
      "dell",
      "apple",
      "lenovo",
      "hp",
      "asus",
      "acer",
      "samsung",
      "google",
      "sony",
      "microsoft",
      "oneplus",
      "xiaomi",
      "oppo",
      "vivo",
      "motorola",
      "bose",
      "sennheiser",
    ];
    for (const b of brands) {
      if (text.includes(b)) return this.capitalizeTitle(b);
    }
    return undefined;
  }

  private static extractEntityTitle(raw: string, keyword: string, category: EntityCategory): string {
    const cleaned = raw
      .replace(/^(tell me about|what is|show me|details on|specs for|specifications of)\s+/i, "")
      .replace(/[?.!]+$/, "")
      .trim();

    if (cleaned.length <= 40 && cleaned.toLowerCase().includes(keyword)) {
      return this.capitalizeTitle(cleaned);
    }

    return this.capitalizeTitle(keyword);
  }

  private static extractTitleAroundKeywords(raw: string, keywords: string[]): string {
    const cleaned = raw
      .replace(/^(tell me about|what is|show me|details on|specs for)\s+/i, "")
      .replace(/[?.!]+$/, "")
      .trim();
    return this.capitalizeTitle(cleaned);
  }

  private static capitalizeTitle(str: string): string {
    return str
      .split(/\s+/)
      .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  }
}
