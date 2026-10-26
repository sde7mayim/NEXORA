import { describe, it, expect, beforeEach } from "vitest";
import { SavedAccountManager } from "@/lib/auth/saved-accounts";

describe("SavedAccountManager", () => {
  beforeEach(() => {
    SavedAccountManager.clearRememberedAccount();
  });

  it("should save and retrieve remembered account attributes", () => {
    const saved = SavedAccountManager.saveAccount({
      email: "sarah.connor@cyberdyne.com",
      name: "Sarah Connor",
      provider: "email",
    });

    expect(saved.email).toBe("sarah.connor@cyberdyne.com");
    expect(saved.name).toBe("Sarah Connor");
    expect(saved.avatarInitial).toBe("S");
    expect(saved.lastLoginAt).toBeDefined();

    const retrieved = SavedAccountManager.getRememberedAccount();
    expect(retrieved?.email).toBe("sarah.connor@cyberdyne.com");
    expect(retrieved?.name).toBe("Sarah Connor");
    expect(retrieved?.avatarInitial).toBe("S");
  });

  it("should clear remembered account on explicit logout/forget", () => {
    SavedAccountManager.saveAccount({ email: "temporary@user.com" });
    expect(SavedAccountManager.getRememberedAccount()).not.toBeNull();

    SavedAccountManager.clearRememberedAccount();
    expect(SavedAccountManager.getRememberedAccount()).toBeNull();
  });

  it("should record account history and remove specific account", () => {
    SavedAccountManager.saveAccount({ email: "user.one@example.com", name: "User One" });
    SavedAccountManager.saveAccount({ email: "user.two@example.com", name: "User Two" });

    const history = SavedAccountManager.getAccountHistory();
    expect(history.length).toBeGreaterThanOrEqual(1);

    SavedAccountManager.removeAccountFromHistory("user.one@example.com");
    const updatedHistory = SavedAccountManager.getAccountHistory();
    expect(updatedHistory.some((a) => a.email === "user.one@example.com")).toBe(false);
  });
});
