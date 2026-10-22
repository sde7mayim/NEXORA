export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  modelUsed?: string;
  createdAt: string;
  citations?: Array<{ title: string; url: string; snippet: string }>;
  attachments?: Array<{ name: string; size: number }>;
}

export interface Conversation {
  id: string;
  title: string;
  modelSelected: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
}

const STORAGE_KEY = "nexora_conversations_v1";

let inMemoryStore: Conversation[] = [];

export class ConversationStore {
  private static getStorage(): Storage | null {
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
    return null;
  }

  /**
   * Retrieves all conversations from storage or fallback.
   */
  static getConversations(): Conversation[] {
    const storage = this.getStorage();
    if (storage) {
      try {
        const stored = storage.getItem(STORAGE_KEY);
        if (!stored) {
          const defaultConv: Conversation = {
            id: "conv-default",
            title: "Getting Started with Nexora",
            modelSelected: "nexora-core",
            isPinned: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [
              {
                id: "msg-init",
                role: "assistant",
                content:
                  "Welcome to Nexora! You can test multi-model routing across OpenAI and Anthropic, attach PDFs or documents, or enable live Web Research.",
                modelUsed: "Nexora Core 1.0",
                createdAt: new Date().toISOString(),
              },
            ],
          };
          storage.setItem(STORAGE_KEY, JSON.stringify([defaultConv]));
          return [defaultConv];
        }
        return JSON.parse(stored) as Conversation[];
      } catch {
        return [];
      }
    }

    if (inMemoryStore.length === 0) {
      inMemoryStore = [
        {
          id: "conv-default",
          title: "Getting Started with Nexora",
          modelSelected: "nexora-core",
          isPinned: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        },
      ];
    }
    return inMemoryStore;
  }

  private static setConversations(list: Conversation[]): void {
    const storage = this.getStorage();
    if (storage) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {
        // storage quota exceeded or disabled
      }
    }
    inMemoryStore = list;
  }

  /**
   * Retrieves a single conversation by ID.
   */
  static getConversation(id: string): Conversation | undefined {
    const list = this.getConversations();
    return list.find((c) => c.id === id);
  }

  /**
   * Creates a new conversation.
   */
  static createConversation(title = "New Conversation", modelSelected = "nexora-core"): Conversation {
    const list = this.getConversations();
    const newConv: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      modelSelected,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    const updated = [newConv, ...list];
    this.setConversations(updated);
    return newConv;
  }

  /**
   * Renames a conversation.
   */
  static renameConversation(id: string, newTitle: string): boolean {
    const list = this.getConversations();
    const conv = list.find((c) => c.id === id);
    if (!conv) return false;

    conv.title = newTitle;
    conv.updatedAt = new Date().toISOString();
    this.setConversations(list);
    return true;
  }

  /**
   * Toggles pinned state for quick access.
   */
  static togglePin(id: string): boolean {
    const list = this.getConversations();
    const conv = list.find((c) => c.id === id);
    if (!conv) return false;

    conv.isPinned = !conv.isPinned;
    conv.updatedAt = new Date().toISOString();
    this.setConversations(list);
    return true;
  }

  /**
   * Deletes a conversation permanently.
   */
  static deleteConversation(id: string): boolean {
    const list = this.getConversations();
    const filtered = list.filter((c) => c.id !== id);
    this.setConversations(filtered);
    return true;
  }

  /**
   * Appends or updates a message within a conversation.
   */
  static saveMessage(conversationId: string, message: ConversationMessage): void {
    const list = this.getConversations();
    const conv = list.find((c) => c.id === conversationId);
    if (!conv) return;

    const existingIndex = conv.messages.findIndex((m) => m.id === message.id);
    if (existingIndex >= 0) {
      conv.messages[existingIndex] = message;
    } else {
      conv.messages.push(message);
    }

    if (conv.title === "New Conversation" && message.role === "user") {
      conv.title = message.content.slice(0, 32) + (message.content.length > 32 ? "..." : "");
    }

    conv.updatedAt = new Date().toISOString();
    this.setConversations(list);
  }
}
