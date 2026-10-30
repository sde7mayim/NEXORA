import { describe, it, expect, beforeEach, vi } from "vitest";
import { EntityDetector } from "@/lib/ai/entities/entity-detector";
import { EntityRetrieverService } from "@/lib/ai/entities/entity-retriever";
import { ConversationStore, ConversationMessage } from "@/lib/chat/conversation-store";
import { EntityCardData } from "@/lib/ai/entities/entity-types";

describe("Intelligent Entity Understanding & Rich Conversational Responses", () => {
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

  describe("1. Category Detection Engine", () => {
    it("should detect laptop entities with correct category", () => {
      const queries = [
        "Tell me about the Dell XPS 14",
        "What are the specs of MacBook Pro 14?",
        "Lenovo ThinkPad X1 Carbon review",
      ];

      for (const query of queries) {
        const result = EntityDetector.detect(query);
        expect(result.isEntityQuery).toBe(true);
        expect(result.category).toBe("laptop");
        expect(result.entityName).toBeDefined();
      }
    });

    it("should detect smartphone entities with correct category", () => {
      const queries = [
        "Tell me about iPhone 15 Pro",
        "Samsung Galaxy S24 Ultra camera review",
        "Google Pixel 8 Pro details",
      ];

      for (const query of queries) {
        const result = EntityDetector.detect(query);
        expect(result.isEntityQuery).toBe(true);
        expect(result.category).toBe("smartphone");
        expect(result.entityName).toBeDefined();
      }
    });

    it("should detect celebrities and public figures", () => {
      const queries = [
        "Who is Cristiano Ronaldo?",
        "Tell me about Taylor Swift",
        "Elon Musk biography and companies",
      ];

      for (const query of queries) {
        const result = EntityDetector.detect(query);
        expect(result.isEntityQuery).toBe(true);
        expect(result.category).toBe("celebrity");
        expect(result.entityName).toBeDefined();
      }
    });

    it("should detect places, hill stations, and tourist destinations", () => {
      const queries = [
        "Tell me about Ooty",
        "Things to do in Paris",
        "What is the best time to visit Kyoto?",
      ];

      for (const query of queries) {
        const result = EntityDetector.detect(query);
        expect(result.isEntityQuery).toBe(true);
        expect(result.category).toBe("place");
        expect(result.entityName).toBeDefined();
      }
    });

    it("should detect electronics, audio gear, and gadgets", () => {
      const queries = [
        "Tell me about Sony WH-1000XM5 headphones",
        "Bose QuietComfort 45 specs",
        "Apple Watch Ultra 2 features",
      ];

      for (const query of queries) {
        const result = EntityDetector.detect(query);
        expect(result.isEntityQuery).toBe(true);
        expect(result.category).toBe("electronics");
        expect(result.entityName).toBeDefined();
      }
    });
  });

  describe("2. Non-Entity Isolation & Negative Testing", () => {
    it("must NOT trigger entity cards for technical and programming questions", () => {
      const technicalQueries = [
        "What is React?",
        "Explain binary search algorithm",
        "How does a CPU work?",
        "How to implement a quicksort algorithm in python",
        "Explain useEffect and useState hooks",
        "Write a Dockerfile for a Next.js application",
        "What is the difference between TCP and UDP?",
        "How does garbage collection work in V8?",
        "Explain microservices vs monolith architecture",
        "How to optimize SQL query with indexing",
      ];

      for (const query of technicalQueries) {
        const result = EntityDetector.detect(query);
        expect(result.isEntityQuery).toBe(false);
      }
    });
  });

  describe("3. Comparison Queries", () => {
    it("should detect side-by-side device comparisons", () => {
      const query = "Compare iPhone 15 Pro and Samsung Galaxy S24 Ultra";
      const result = EntityDetector.detect(query);

      expect(result.isEntityQuery).toBe(true);
      expect(result.comparisonEntities).toBeDefined();
      expect(result.comparisonEntities?.length).toBe(2);
      expect(result.comparisonEntities?.[0].toLowerCase()).toContain("iphone");
      expect(result.comparisonEntities?.[1].toLowerCase()).toContain("samsung");
    });

    it("should detect laptop comparisons", () => {
      const query = "MacBook Pro vs Dell XPS";
      const result = EntityDetector.detect(query);

      expect(result.isEntityQuery).toBe(true);
      expect(result.comparisonEntities).toBeDefined();
      expect(result.comparisonEntities?.length).toBe(2);
    });
  });

  describe("4. Conversational Follow-Up Resolution", () => {
    it("should resolve pronouns to the active entity from conversation history", () => {
      const history = [
        { role: "user", content: "Tell me about Dell XPS 14" },
        { role: "assistant", content: "The Dell XPS 14 is a premium ultrabook..." },
      ];

      const followUpQuery = "What about its battery?";
      const result = EntityDetector.detect(followUpQuery, history);

      expect(result.isEntityQuery).toBe(true);
      expect(result.isFollowUp).toBe(true);
      expect(result.resolvedFromContext).toBe(true);
      expect(result.entityName?.toLowerCase()).toContain("xps 14");
      expect(result.specificAspect).toBe("battery");
    });

    it("should resolve follow-up questions about places", () => {
      const history = [
        { role: "user", content: "Tell me about Ooty" },
        { role: "assistant", content: "Ooty is a hill station in the Nilgiri Hills..." },
      ];

      const followUpQuery = "What are the best places to visit there?";
      const result = EntityDetector.detect(followUpQuery, history);

      expect(result.isEntityQuery).toBe(true);
      expect(result.isFollowUp).toBe(true);
      expect(result.entityName?.toLowerCase()).toContain("ooty");
      expect(result.specificAspect).toBe("attractions");
    });
  });

  describe("5. Curated Entity Retrieval & High-Fidelity Specs", () => {
    it("should retrieve curated specs and authentic images for Dell XPS 14", async () => {
      const detection = EntityDetector.detect("Tell me about Dell XPS 14");
      const card = await EntityRetrieverService.retrieveEntity(detection);

      expect(card).not.toBeNull();
      expect(card?.name).toContain("Dell XPS 14");
      expect(card?.category).toBe("laptop");
      expect(card?.images.length).toBeGreaterThan(0);
      expect(card?.images[0].url).toContain("wikimedia.org");
      expect(card?.quickFacts.some((f) => f.label === "Battery Capacity")).toBe(true);
      expect(card?.specGroups).toBeDefined();
      expect(card?.pros?.length).toBeGreaterThan(0);
      expect(card?.cons?.length).toBeGreaterThan(0);
    });

    it("should retrieve curated specs for iPhone 15 Pro", async () => {
      const detection = EntityDetector.detect("Tell me about iPhone 15 Pro");
      const card = await EntityRetrieverService.retrieveEntity(detection);

      expect(card).not.toBeNull();
      expect(card?.name).toContain("iPhone 15 Pro");
      expect(card?.category).toBe("smartphone");
      expect(card?.quickFacts.some((f) => f.label === "Processor")).toBe(true);
      expect(card?.specGroups?.some((g) => g.groupName.includes("Camera"))).toBe(true);
    });

    it("should retrieve curated biography and achievements for Cristiano Ronaldo", async () => {
      const detection = EntityDetector.detect("Who is Cristiano Ronaldo?");
      const card = await EntityRetrieverService.retrieveEntity(detection);

      expect(card).not.toBeNull();
      expect(card?.name).toContain("Cristiano Ronaldo");
      expect(card?.category).toBe("celebrity");
      expect(card?.celebrityInfo?.profession).toContain("Footballer");
      expect(card?.celebrityInfo?.majorAchievements?.length).toBeGreaterThan(0);
    });

    it("should retrieve curated tourist guide and attractions for Ooty", async () => {
      const detection = EntityDetector.detect("Tell me about Ooty");
      const card = await EntityRetrieverService.retrieveEntity(detection);

      expect(card).not.toBeNull();
      expect(card?.name).toContain("Ooty");
      expect(card?.category).toBe("place");
      expect(card?.attractions?.length).toBeGreaterThan(0);
      expect(card?.visitingInfo?.bestTimeToVisit).toBeDefined();
    });

    it("should retrieve curated specs for Sony WH-1000XM5 headphones", async () => {
      const detection = EntityDetector.detect("Sony WH-1000XM5");
      const card = await EntityRetrieverService.retrieveEntity(detection);

      expect(card).not.toBeNull();
      expect(card?.name).toContain("Sony WH-1000XM5");
      expect(card?.category).toBe("electronics");
      expect(card?.quickFacts.some((f) => f.label === "Battery Life")).toBe(true);
    });
  });

  describe("6. Dynamic Wikipedia Retrieval Fallback", () => {
    it("should fetch entity data from Wikipedia when not in curated base", async () => {
      const mockWikiResponse = {
        query: {
          pages: {
            "12345": {
              pageid: 12345,
              title: "Mount Everest",
              extract: "Mount Everest is Earth's highest mountain above sea level.",
              fullurl: "https://en.wikipedia.org/wiki/Mount_Everest",
              thumbnail: {
                source: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Everest_North_Face_toward_Base_Camp-Edit_1.jpg/800px-Everest.jpg",
                width: 800,
                height: 600,
              },
            },
          },
        },
      };

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockWikiResponse,
      } as Response);

      try {
        const detection = {
          isEntityQuery: true,
          entityName: "Mount Everest",
          category: "place" as const,
        };

        const card = await EntityRetrieverService.retrieveEntity(detection);

        expect(card).not.toBeNull();
        expect(card?.name).toBe("Mount Everest");
        expect(card?.images.length).toBe(1);
        expect(card?.images[0].url).toContain("Everest");
        expect(card?.description).toContain("highest mountain");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should handle graceful fallback when entity has no image", async () => {
      const mockWikiResponse = {
        query: {
          pages: {
            "67890": {
              pageid: 67890,
              title: "Obscure Mountain Peak",
              extract: "A remote geological formation.",
              fullurl: "https://en.wikipedia.org/wiki/Obscure_Mountain_Peak",
            },
          },
        },
      };

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockWikiResponse,
      } as Response);

      try {
        const detection = {
          isEntityQuery: true,
          entityName: "Obscure Mountain Peak",
          category: "place" as const,
        };

        const card = await EntityRetrieverService.retrieveEntity(detection);

        expect(card).not.toBeNull();
        expect(card?.images).toEqual([]);
        expect(card?.name).toBe("Obscure Mountain Peak");
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("7. Conversation Store & Entity Card Persistence", () => {
    it("should persist entity cards in assistant messages and update activeEntities", () => {
      const conv = ConversationStore.createConversation("Tech Discussion", "nexora-core");

      const dummyCard: EntityCardData = {
        id: "ent_laptop_dell_xps_14",
        name: "Dell XPS 14 (9440)",
        category: "laptop",
        images: [],
        quickFacts: [{ label: "Form Factor", value: "Ultrabook" }],
      };

      const assistantMsg: ConversationMessage = {
        id: "msg_ast_1",
        role: "assistant",
        content: "Here are the details for the Dell XPS 14.",
        createdAt: new Date().toISOString(),
        entityCards: [dummyCard],
      };

      ConversationStore.saveMessage(conv.id, assistantMsg);

      const activeEntities = ConversationStore.getActiveEntities(conv.id);
      expect(activeEntities.length).toBe(1);
      expect(activeEntities[0].name).toBe("Dell XPS 14 (9440)");
      expect(activeEntities[0].category).toBe("laptop");

      const storedConv = ConversationStore.getConversation(conv.id);
      expect(storedConv?.messages[0].entityCards).toBeDefined();
      expect(storedConv?.messages[0].entityCards?.[0].id).toBe("ent_laptop_dell_xps_14");
    });
  });
});
