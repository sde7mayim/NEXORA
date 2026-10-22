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
});
