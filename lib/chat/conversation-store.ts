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

const STORAGE_PREFIX = "nexora_conversations_u_";

export class ConversationStore {
  private static inMemoryStores: Map<string, Conversation[]> = new Map();

  private static getStorage(): Storage | null {
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
    return null;
  }

  /**
   * Resolves the active user identity from saved account memory or Supabase session.
   * Defaults to 'guest' if unauthenticated.
   */
  static getActiveUserId(): string {
    if (typeof window !== "undefined") {
      try {
        const savedRaw = localStorage.getItem("nexora_saved_account");
        if (savedRaw) {
          const parsed = JSON.parse(savedRaw);
          if (parsed?.email) {
            return parsed.email.toLowerCase().trim();
          }
        }
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const session = JSON.parse(raw);
              if (session?.user?.email) {
                return session.user.email.toLowerCase().trim();
              }
              if (session?.user?.id) {
                return session.user.id;
              }
            }
          }
        }
      } catch {}
    }
    return "guest";
  }

  /**
   * Computes an isolated storage key unique to each user account.
   */
  static getStorageKey(userId?: string): string {
    const rawUser = userId || this.getActiveUserId();
    const cleanUser = (rawUser || "guest").toLowerCase().trim();
    const sanitized = cleanUser.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${STORAGE_PREFIX}${sanitized}`;
  }

  /**
   * Retrieves all conversations isolated strictly to the specified user or active session.
   */
  static getConversations(userId?: string): Conversation[] {
    const key = this.getStorageKey(userId);
    const storage = this.getStorage();

    if (storage) {
      try {
        let stored = storage.getItem(key);

        // If this is the owner and older unpartitioned storage exists, migrate it
        const cleanUser = (userId || this.getActiveUserId()).toLowerCase().trim();
        if (!stored && (cleanUser === "thzcreterz05@gmail.com" || cleanUser.includes("joshua"))) {
          const legacy = storage.getItem("nexora_conversations_v1");
          if (legacy) {
            storage.setItem(key, legacy);
            stored = legacy;
          }
        }

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
                  "Welcome to Nexora! Your conversations and messages in this account are completely private and isolated.",
                modelUsed: "Nexora Core 1.0",
                createdAt: new Date().toISOString(),
              },
            ],
          };
          storage.setItem(key, JSON.stringify([defaultConv]));
          return [defaultConv];
        }
        return JSON.parse(stored) as Conversation[];
      } catch {
        return [];
      }
    }

    if (!this.inMemoryStores.has(key) || this.inMemoryStores.get(key)!.length === 0) {
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
              "Welcome to Nexora! Your conversations and messages in this account are completely private and isolated.",
            modelUsed: "Nexora Core 1.0",
            createdAt: new Date().toISOString(),
          },
        ],
      };
      this.inMemoryStores.set(key, [defaultConv]);
    }
    return this.inMemoryStores.get(key) || [];
  }

  private static setConversations(list: Conversation[], userId?: string): void {
    const key = this.getStorageKey(userId);
    const storage = this.getStorage();
    if (storage) {
      try {
        storage.setItem(key, JSON.stringify(list));
      } catch {
        // quota exceeded or private window restriction
      }
    }
    this.inMemoryStores.set(key, list);
  }

  /**
   * Retrieves a single conversation by ID for the active user.
   */
  static getConversation(id: string, userId?: string): Conversation | undefined {
    const list = this.getConversations(userId);
    return list.find((c) => c.id === id);
  }

  /**
   * Creates a new conversation isolated to the user account.
   */
  static createConversation(
    title = "New Conversation",
    modelSelected = "nexora-core",
    userId?: string
  ): Conversation {
    const list = this.getConversations(userId);
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
    this.setConversations(updated, userId);
    return newConv;
  }

  /**
   * Renames a conversation within the user's isolated store.
   */
  static renameConversation(id: string, newTitle: string, userId?: string): boolean {
    const list = this.getConversations(userId);
    const conv = list.find((c) => c.id === id);
    if (!conv) return false;

    conv.title = newTitle;
    conv.updatedAt = new Date().toISOString();
    this.setConversations(list, userId);
    return true;
  }

  /**
   * Toggles pinned state for quick access.
   */
  static togglePin(id: string, userId?: string): boolean {
    const list = this.getConversations(userId);
    const conv = list.find((c) => c.id === id);
    if (!conv) return false;

    conv.isPinned = !conv.isPinned;
    conv.updatedAt = new Date().toISOString();
    this.setConversations(list, userId);
    return true;
  }

  /**
   * Deletes a conversation permanently from the user's store.
   */
  static deleteConversation(id: string, userId?: string): boolean {
    const list = this.getConversations(userId);
    const filtered = list.filter((c) => c.id !== id);
    this.setConversations(filtered, userId);
    return true;
  }

  /**
   * Appends or updates a message within a conversation.
   */
  static saveMessage(
    conversationId: string,
    message: ConversationMessage,
    userId?: string
  ): void {
    const list = this.getConversations(userId);
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
    this.setConversations(list, userId);
  }

  /**
   * Clears all conversations for a specific user.
   */
  static clearUserConversations(userId?: string): void {
    const key = this.getStorageKey(userId);
    const storage = this.getStorage();
    if (storage) {
      try {
        storage.removeItem(key);
      } catch {}
    }
    this.inMemoryStores.delete(key);
  }
}
