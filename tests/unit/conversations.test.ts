import { describe, it, expect, beforeEach } from "vitest";
import { ConversationStore } from "@/lib/chat/conversation-store";

describe("Conversation Management & Persistence Store", () => {
  // Mock localStorage for Node test environment
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

  it("should initialize with default welcome conversation if empty", () => {
    const list = ConversationStore.getConversations();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe("conv-default");
    expect(list[0].messages.length).toBe(1);
  });

  it("should create new conversations with unique IDs and timestamps", () => {
    const conv = ConversationStore.createConversation("Project Architectural Plan", "nexora-reason");
    expect(conv.id).toMatch(/^conv_\d+_/);
    expect(conv.title).toBe("Project Architectural Plan");
    expect(conv.modelSelected).toBe("nexora-reason");
    expect(conv.isPinned).toBe(false);

    const list = ConversationStore.getConversations();
    expect(list.length).toBe(2);
    expect(list[0].id).toBe(conv.id);
  });

  it("should rename an existing conversation", () => {
    const conv = ConversationStore.createConversation("Draft Notes", "nexora-core");
    const renamed = ConversationStore.renameConversation(conv.id, "Quarterly Strategy 2026");
    expect(renamed).toBe(true);

    const updated = ConversationStore.getConversation(conv.id);
    expect(updated?.title).toBe("Quarterly Strategy 2026");
  });

  it("should toggle pinned state of a conversation", () => {
    const conv = ConversationStore.createConversation("Unpinned Chat", "nexora-swift");
    expect(conv.isPinned).toBe(false);

    ConversationStore.togglePin(conv.id);
    expect(ConversationStore.getConversation(conv.id)?.isPinned).toBe(true);

    ConversationStore.togglePin(conv.id);
    expect(ConversationStore.getConversation(conv.id)?.isPinned).toBe(false);
  });

  it("should delete a conversation permanently", () => {
    const conv = ConversationStore.createConversation("Temporary Scratch", "nexora-core");
    expect(ConversationStore.getConversation(conv.id)).toBeDefined();

    const deleted = ConversationStore.deleteConversation(conv.id);
    expect(deleted).toBe(true);
    expect(ConversationStore.getConversation(conv.id)).toBeUndefined();
  });

  it("should persist messages and auto-title conversation from first user prompt", () => {
    const conv = ConversationStore.createConversation("New Conversation", "nexora-core");
    
    ConversationStore.saveMessage(conv.id, {
      id: "msg-1",
      role: "user",
      content: "Explain distributed consensus algorithms in Kubernetes",
      createdAt: new Date().toISOString(),
    });

    const updated = ConversationStore.getConversation(conv.id);
    expect(updated?.messages.length).toBe(1);
    expect(updated?.title).toContain("Explain distributed consensus");
  });

  it("should strictly isolate conversations between different user accounts", () => {
    const userA = "joshua@gmail.com";
    const userB = "alice@company.com";

    // User A creates a private conversation
    const convA = ConversationStore.createConversation("Joshua Private Financial Model", "nexora-core", userA);
    ConversationStore.saveMessage(convA.id, {
      id: "msg-user-a-1",
      role: "user",
      content: "Confidential revenue analysis for Q3",
      createdAt: new Date().toISOString(),
    }, userA);

    // Verify User A has their conversation
    const listA = ConversationStore.getConversations(userA);
    expect(listA.some((c) => c.id === convA.id)).toBe(true);

    // User B must NOT see User A's conversation in their list
    const listB = ConversationStore.getConversations(userB);
    expect(listB.some((c) => c.id === convA.id)).toBe(false);
    expect(listB.some((c) => c.title.includes("Joshua Private"))).toBe(false);

    // User B cannot get User A's conversation by ID
    const convBAttempt = ConversationStore.getConversation(convA.id, userB);
    expect(convBAttempt).toBeUndefined();

    // User B creates their own conversation
    const convB = ConversationStore.createConversation("Alice Marketing Plan", "nexora-swift", userB);
    const updatedListB = ConversationStore.getConversations(userB);
    expect(updatedListB.some((c) => c.id === convB.id)).toBe(true);

    // User A must NOT see User B's conversation
    const updatedListA = ConversationStore.getConversations(userA);
    expect(updatedListA.some((c) => c.id === convB.id)).toBe(false);
  });
});
