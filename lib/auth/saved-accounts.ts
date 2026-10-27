/**
 * Saved Account & Last-Login Memory Utility
 * Manages persisted user identity hints across sessions for instant 1-click re-entry.
 * Supports browser localStorage with resilient in-memory SSR fallback.
 */

export interface SavedAccount {
  email: string;
  name?: string;
  avatarInitial: string;
  lastLoginAt: string;
  provider?: "email" | "google" | "apple" | "phone";
}

const STORAGE_KEY = "nexora_saved_account";
const HISTORY_KEY = "nexora_saved_accounts_history";

export class SavedAccountManager {
  private static memoryStore: SavedAccount | null = null;
  private static memoryHistory: SavedAccount[] = [];

  static getRememberedAccount(): SavedAccount | null {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return this.memoryStore;
  }

  static saveAccount(params: {
    email: string;
    name?: string;
    provider?: "email" | "google" | "apple" | "phone";
  }): SavedAccount {
    const email = params.email.toLowerCase().trim();
    const name = params.name || email.split("@")[0];
    const initial = name ? name[0].toUpperCase() : "U";

    const account: SavedAccount = {
      email,
      name,
      avatarInitial: initial,
      lastLoginAt: new Date().toISOString(),
      provider: params.provider || "email",
    };

    this.memoryStore = account;
    this.memoryHistory = [account, ...this.memoryHistory.filter((a) => a.email !== email)].slice(0, 3);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
        localStorage.setItem(HISTORY_KEY, JSON.stringify(this.memoryHistory));
        document.cookie = `nexora_remembered_account=${encodeURIComponent(email)}; path=/; max-age=2592000; SameSite=Lax`;
      } catch {}
    }

    return account;
  }

  static getAccountHistory(): SavedAccount[] {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return this.memoryHistory;
  }

  static clearRememberedAccount(): void {
    this.memoryStore = null;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
        document.cookie = "nexora_remembered_account=; path=/; max-age=0; SameSite=Lax";
      } catch {}
    }
  }

  static removeAccountFromHistory(email: string): void {
    const cleanEmail = email.toLowerCase().trim();
    if (this.memoryStore?.email === cleanEmail) {
      this.clearRememberedAccount();
    }
    this.memoryHistory = this.memoryHistory.filter((a) => a.email !== cleanEmail);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(this.memoryHistory));
      } catch {}
    }
  }
}
