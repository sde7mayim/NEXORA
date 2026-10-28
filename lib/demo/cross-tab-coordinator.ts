import { HOMEPAGE_DEMOS, DemoExample } from "./homepage-demos";

export interface TabLease {
  tabId: string;
  demoId: string;
  leasedAt: number;
}

export const CROSS_TAB_STORAGE_KEYS = {
  TAB_SESSION_ID: "nexora_tab_session_id",
  TAB_ASSIGNED_DEMO: "nexora_tab_assigned_demo",
  CROSS_TAB_LEDGER: "nexora_cross_tab_demo_ledger_v1",
  LAST_ROTATION_INDEX: "nexora_cross_tab_rotation_index",
} as const;

// Leases expire after 15 minutes of inactivity so closed tabs do not permanently tie up a demo ID
const LEASE_EXPIRY_MS = 15 * 60 * 1000;

// In-memory fallback if localStorage / sessionStorage is blocked or unavailable
let inMemoryTabId: string | null = null;
let inMemoryAssignedDemoId: string | null = null;
let inMemoryLedger: TabLease[] = [];
let inMemoryRotationCounter = 0;

/**
 * Safely accesses sessionStorage
 */
function safeSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Safely accesses localStorage
 */
function safeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Generates or retrieves a unique tab session identifier for the current browsing context.
 * Genuinely new browser tabs have independent sessionStorages.
 */
export function getTabSessionId(): string {
  const session = safeSessionStorage();
  if (session) {
    try {
      let tabId = session.getItem(CROSS_TAB_STORAGE_KEYS.TAB_SESSION_ID);
      if (!tabId) {
        tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        session.setItem(CROSS_TAB_STORAGE_KEYS.TAB_SESSION_ID, tabId);
      }
      return tabId;
    } catch {
      // Fall through to memory fallback
    }
  }

  if (!inMemoryTabId) {
    inMemoryTabId = `mem_tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  return inMemoryTabId;
}

/**
 * Checks whether the current visit represents a genuinely new browser tab/window
 * (i.e. has no prior tab session identity in sessionStorage).
 */
export function isNewBrowserTab(): boolean {
  const session = safeSessionStorage();
  if (session) {
    try {
      return !session.getItem(CROSS_TAB_STORAGE_KEYS.TAB_SESSION_ID);
    } catch {
      return inMemoryTabId === null;
    }
  }
  return inMemoryTabId === null;
}

/**
 * Reads and cleans active cross-tab leases from localStorage.
 */
export function getActiveLeases(): TabLease[] {
  const local = safeLocalStorage();
  const now = Date.now();

  let leases: TabLease[] = [];
  if (local) {
    try {
      const raw = local.getItem(CROSS_TAB_STORAGE_KEYS.CROSS_TAB_LEDGER);
      if (raw) {
        leases = JSON.parse(raw);
      }
    } catch {
      leases = inMemoryLedger;
    }
  } else {
    leases = inMemoryLedger;
  }

  // Filter out expired leases
  const active = leases.filter((lease) => now - lease.leasedAt < LEASE_EXPIRY_MS);

  // Sync back cleaned leases if modified
  if (active.length !== leases.length) {
    saveActiveLeases(active);
  }

  return active;
}

/**
 * Persists the active lease array back to storage.
 */
function saveActiveLeases(leases: TabLease[]): void {
  const local = safeLocalStorage();
  if (local) {
    try {
      local.setItem(CROSS_TAB_STORAGE_KEYS.CROSS_TAB_LEDGER, JSON.stringify(leases));
      return;
    } catch {
      // Storage quota or restriction, fall through to memory
    }
  }
  inMemoryLedger = leases;
}

/**
 * Selects a demo for a newly opened browser tab.
 * Avoids demos currently leased by other active tabs, selecting from unleased demos first.
 * If all demos are leased (catalogue exhaustion), selects the demo with the oldest lease.
 */
export function selectDemoForNewTab(customTabId?: string): DemoExample {
  if (!HOMEPAGE_DEMOS || HOMEPAGE_DEMOS.length === 0) {
    throw new Error("No demo examples configured");
  }

  const tabId = customTabId || getTabSessionId();
  const leases = getActiveLeases();

  // Find demo IDs currently leased by OTHER active tabs
  const otherActiveDemoIds = new Set(
    leases.filter((l) => l.tabId !== tabId).map((l) => l.demoId)
  );

  // Prefer demos not currently active in other tabs
  const availableCandidates = HOMEPAGE_DEMOS.filter((d) => !otherActiveDemoIds.has(d.id));

  let chosen: DemoExample;

  if (availableCandidates.length > 0) {
    // Pick the candidate that was least recently leased or rotation index
    const local = safeLocalStorage();
    let nextIndex = 0;
    if (local) {
      try {
        const storedIdx = local.getItem(CROSS_TAB_STORAGE_KEYS.LAST_ROTATION_INDEX);
        nextIndex = storedIdx ? (parseInt(storedIdx, 10) + 1) % availableCandidates.length : 0;
        local.setItem(CROSS_TAB_STORAGE_KEYS.LAST_ROTATION_INDEX, String(nextIndex));
      } catch {
        nextIndex = inMemoryRotationCounter++ % availableCandidates.length;
      }
    } else {
      nextIndex = inMemoryRotationCounter++ % availableCandidates.length;
    }

    chosen = availableCandidates[nextIndex] || availableCandidates[0];
  } else {
    // Catalogue exhausted: all demos are currently assigned to active tabs.
    // Select the demo whose lease was recorded earliest (oldest lease).
    const sortedByLeaseTime = [...leases].sort((a, b) => a.leasedAt - b.leasedAt);
    const oldestDemoId = sortedByLeaseTime[0]?.demoId;
    chosen = HOMEPAGE_DEMOS.find((d) => d.id === oldestDemoId) || HOMEPAGE_DEMOS[0];
  }

  // Register or update lease for this tab
  registerTabLease(tabId, chosen.id);

  return chosen;
}

/**
 * Registers or refreshes a lease for a tab in the cross-tab ledger.
 */
export function registerTabLease(tabId: string, demoId: string): void {
  const leases = getActiveLeases().filter((l) => l.tabId !== tabId);
  leases.push({
    tabId,
    demoId,
    leasedAt: Date.now(),
  });
  saveActiveLeases(leases);

  // Record in tab's sessionStorage
  const session = safeSessionStorage();
  if (session) {
    try {
      session.setItem(CROSS_TAB_STORAGE_KEYS.TAB_ASSIGNED_DEMO, demoId);
    } catch {
      inMemoryAssignedDemoId = demoId;
    }
  } else {
    inMemoryAssignedDemoId = demoId;
  }
}

/**
 * Returns the demo example for the current tab, respecting:
 * 1. Genuinely new browser tabs -> coordinated unique allocation.
 * 2. Normal page refresh in same tab -> stable assigned demo preservation.
 * 3. Force rotation (e.g. Try Another Demo) -> cycles to next demo cleanly.
 */
export function getDemoForCurrentTab(options: { forceRotate?: boolean } = {}): DemoExample {
  if (!HOMEPAGE_DEMOS || HOMEPAGE_DEMOS.length === 0) {
    throw new Error("No demo examples configured");
  }

  const tabId = getTabSessionId();
  const session = safeSessionStorage();

  // If force rotation requested (e.g. user clicked "Try Another Demo")
  if (options.forceRotate) {
    let currentId: string | null = null;
    if (session) {
      try {
        currentId = session.getItem(CROSS_TAB_STORAGE_KEYS.TAB_ASSIGNED_DEMO);
      } catch {}
    }
    if (!currentId) currentId = inMemoryAssignedDemoId;

    // Pick a candidate differing from currentId
    const candidates = HOMEPAGE_DEMOS.filter((d) => d.id !== currentId);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)] || HOMEPAGE_DEMOS[0];
    registerTabLease(tabId, chosen.id);
    return chosen;
  }

  // Check if this tab already has an assigned demo from a previous load (page refresh)
  let existingDemoId: string | null = null;
  if (session) {
    try {
      existingDemoId = session.getItem(CROSS_TAB_STORAGE_KEYS.TAB_ASSIGNED_DEMO);
    } catch {}
  }
  if (!existingDemoId) existingDemoId = inMemoryAssignedDemoId;

  if (existingDemoId) {
    const existing = HOMEPAGE_DEMOS.find((d) => d.id === existingDemoId);
    if (existing) {
      // Touch/renew lease timestamp
      registerTabLease(tabId, existing.id);
      return existing;
    }
  }

  // Genuinely new tab visit: perform coordinated cross-tab allocation
  return selectDemoForNewTab(tabId);
}

/**
 * Releases a tab's lease upon tab closure / unload.
 */
export function releaseTabLease(tabId: string): void {
  const leases = getActiveLeases().filter((l) => l.tabId !== tabId);
  saveActiveLeases(leases);
}

/**
 * Resets all cross-tab leases and storage keys (useful for tests).
 */
export function resetCrossTabState(): void {
  const local = safeLocalStorage();
  const session = safeSessionStorage();

  if (local) {
    try {
      local.removeItem(CROSS_TAB_STORAGE_KEYS.CROSS_TAB_LEDGER);
      local.removeItem(CROSS_TAB_STORAGE_KEYS.LAST_ROTATION_INDEX);
    } catch {}
  }

  if (session) {
    try {
      session.removeItem(CROSS_TAB_STORAGE_KEYS.TAB_SESSION_ID);
      session.removeItem(CROSS_TAB_STORAGE_KEYS.TAB_ASSIGNED_DEMO);
    } catch {}
  }

  inMemoryTabId = null;
  inMemoryAssignedDemoId = null;
  inMemoryLedger = [];
  inMemoryRotationCounter = 0;
}
