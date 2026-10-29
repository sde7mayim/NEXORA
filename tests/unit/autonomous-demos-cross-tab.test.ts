import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  HOMEPAGE_DEMOS,
  DemoExample,
} from "@/lib/demo/homepage-demos";
import {
  getTabSessionId,
  isNewBrowserTab,
  selectDemoForNewTab,
  getDemoForCurrentTab,
  getActiveLeases,
  registerTabLease,
  releaseTabLease,
  resetCrossTabState,
  CROSS_TAB_STORAGE_KEYS,
} from "@/lib/demo/cross-tab-coordinator";

// Mock localStorage and sessionStorage for cross-tab simulation
class MockStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

describe("Autonomous Demos & Cross-Tab Coordination Architecture", () => {
  let mockLocalStorage: MockStorage;
  let mockSessionStorage: MockStorage;

  beforeEach(() => {
    mockLocalStorage = new MockStorage();
    mockSessionStorage = new MockStorage();

    vi.stubGlobal("localStorage", mockLocalStorage);
    vi.stubGlobal("sessionStorage", mockSessionStorage);
    resetCrossTabState();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Cross-Tab Coordinated Demo Selection (Acceptance Test Suite)", () => {
    it("1. should open Nexora in Tab 1 and assign a valid demo", () => {
      const tab1Demo = selectDemoForNewTab("tab_1");
      expect(tab1Demo).toBeDefined();
      expect(HOMEPAGE_DEMOS.map((d) => d.id)).toContain(tab1Demo.id);

      const leases = getActiveLeases();
      expect(leases).toHaveLength(1);
      expect(leases[0].tabId).toBe("tab_1");
      expect(leases[0].demoId).toBe(tab1Demo.id);
    });

    it("2 & 3. should open Nexora in Tab 2 and select a DIFFERENT demo than Tab 1", () => {
      const tab1Demo = selectDemoForNewTab("tab_1");
      const tab2Demo = selectDemoForNewTab("tab_2");

      expect(tab2Demo).toBeDefined();
      expect(tab2Demo.id).not.toBe(tab1Demo.id);

      const leases = getActiveLeases();
      expect(leases).toHaveLength(2);
      expect(leases.find((l) => l.tabId === "tab_2")?.demoId).toBe(tab2Demo.id);
    });

    it("4. should confirm each tab's code and metadata match its assigned demo", () => {
      const tab1Demo = selectDemoForNewTab("tab_alpha");
      const tab2Demo = selectDemoForNewTab("tab_beta");

      expect(tab1Demo.code).toContain("export default function");
      expect(tab2Demo.code).toContain("export default function");
      expect(tab1Demo.code).not.toBe(tab2Demo.code);
      expect(tab1Demo.title).not.toBe(tab2Demo.title);
    });

    it("5. should avoid recently displayed demos across multiple new tabs until catalogue exhaustion", () => {
      const chosenDemoIds: string[] = [];

      // Open as many tabs as there are demos in the catalogue
      for (let i = 0; i < HOMEPAGE_DEMOS.length; i++) {
        const demo = selectDemoForNewTab(`tab_${i}`);
        chosenDemoIds.push(demo.id);
      }

      // Every tab should receive a unique demo with zero duplicates
      const uniqueIds = new Set(chosenDemoIds);
      expect(uniqueIds.size).toBe(HOMEPAGE_DEMOS.length);

      // Once catalogue is exhausted, the next tab should gracefully cycle
      const overflowDemo = selectDemoForNewTab("tab_overflow");
      expect(overflowDemo).toBeDefined();
      expect(HOMEPAGE_DEMOS.map((d) => d.id)).toContain(overflowDemo.id);
    });

    it("6. should maintain stable continuity on page refresh within the same tab", () => {
      // First visit in Tab X
      const initialDemo = getDemoForCurrentTab();
      expect(initialDemo).toBeDefined();

      // Page refresh in Tab X (sessionStorage holds the assigned tab demo)
      const refreshedDemo = getDemoForCurrentTab();
      expect(refreshedDemo.id).toBe(initialDemo.id);

      // Force rotation (e.g. Try Another Demo button)
      const rotatedDemo = getDemoForCurrentTab({ forceRotate: true });
      expect(rotatedDemo.id).not.toBe(initialDemo.id);
    });

    it("7. should operate gracefully if browser storage is unavailable or throws", () => {
      // Simulate private browsing with disabled / throwing storage
      const throwingStorage = {
        getItem: () => { throw new Error("SecurityError: Storage is disabled"); },
        setItem: () => { throw new Error("SecurityError: Storage is disabled"); },
        removeItem: () => { throw new Error("SecurityError: Storage is disabled"); },
        clear: () => {},
        key: () => null,
        length: 0,
      } as Storage;

      vi.stubGlobal("localStorage", throwingStorage);
      vi.stubGlobal("sessionStorage", throwingStorage);

      expect(() => {
        const demo = getDemoForCurrentTab();
        expect(demo).toBeDefined();
        expect(demo.id).toBeTruthy();
      }).not.toThrow();
    });
  });

  describe("Autonomous Demo Interactions Specification", () => {
    it("should implement WeatherStation autonomous city sequencing, labels, and pause controls", () => {
      const weatherDemo = HOMEPAGE_DEMOS.find((d) => d.id === "weather-station");
      expect(weatherDemo).toBeDefined();
      const code = weatherDemo!.code;

      // Tokyo -> San Francisco -> Bengaluru -> London sequence
      expect(code).toContain('"Tokyo"');
      expect(code).toContain('"San Francisco"');
      expect(code).toContain('"Bengaluru"');
      expect(code).toContain('"London"');
      expect(code).toContain('cities.indexOf(prevCity)');

      // Units toggle
      expect(code).toContain('°{unit}');
      expect(code).toContain('handleManualUnit');

      // Clear sample data label
      expect(code).toContain("Simulated Atmospheric Sensor Telemetry • Demonstration Data");

      // Pause and resume controls
      expect(code).toContain("isAutoPlaying");
      expect(code).toContain("Auto Demo: Cycling Cities");
      expect(code).toContain("Manual Mode (Paused)");
      expect(code).toContain("Pause");
      expect(code).toContain("Resume");

      // Visibility and reduced motion safety
      expect(code).toContain("visibilitychange");
      expect(code).toContain("prefers-reduced-motion");
    });

    it("should implement Calculator real calculation demonstration and division-by-zero protection", () => {
      const calcDemo = HOMEPAGE_DEMOS.find((d) => d.id === "smart-calculator");
      expect(calcDemo).toBeDefined();
      const code = calcDemo!.code;

      // Real calculation demonstration: 9 × 5 = 45
      expect(code).toContain('a: 9, op: "×", b: 5, expr: "9 × 5 ="');
      expect(code).toContain('12 + 8 =');
      expect(code).toContain("calculate(target.a, target.b, target.op)");

      // Real calculate function with division-by-zero guard
      expect(code).toContain('b !== 0 ? Math.round((a / b) * 10000) / 10000 : "Error"');

      // Manual interaction pause
      expect(code).toContain("handleDigit");
      expect(code).toContain("handleOp");
      expect(code).toContain("handleEquals");
      expect(code).toContain("setIsAutoPlaying(false)");
      expect(code).toContain("setIsUserInteracted(true)");
    });

    it("should implement ShoppingCart quantity adjustments, coupon application, and total calculations", () => {
      const cartDemo = HOMEPAGE_DEMOS.find((d) => d.id === "shopping-cart");
      expect(cartDemo).toBeDefined();
      const code = cartDemo!.code;

      // Real reactive cart calculations
      expect(code).toContain("items.reduce((acc, i) => acc + i.price * i.qty, 0)");
      expect(code).toContain("Math.round((subtotal * discountPercent) / 100)");
      expect(code).toContain("Math.round((subtotal - discountAmount) * 0.18)");

      // Automatic steps: quantity update + sample coupon
      expect(code).toContain("NEXORA10");
      expect(code).toContain("10% Coupon Applied! ✓");
      expect(code).toContain("Auto Demo: Simulating Cart");

      // Non-charging sample data label
      expect(code).toContain("Simulated Shopping Cart • No Real Transactions or Charges");
    });

    it("should implement AnalyticsCard automated timeframe switching and simulation", () => {
      const analyticsDemo = HOMEPAGE_DEMOS.find((d) => d.id === "analytics-card");
      expect(analyticsDemo).toBeDefined();
      const code = analyticsDemo!.code;

      // Deterministic timeframe transitions: 24h, 7d, 30d
      expect(code).toContain('"24h"');
      expect(code).toContain('"7d"');
      expect(code).toContain('"30d"');
      expect(code).toContain('setTimeframe("7d")');
      expect(code).toContain('setTimeframe("30d")');
      expect(code).toContain("setTokens((prev) => prev + 3200)");

      // Auto demo indicators and pause
      expect(code).toContain("Auto Demo: Streaming Telemetry");
      expect(code).toContain("Simulated Metrics Dashboard • Demonstration Telemetry");
    });

    it("should implement TaskManager automated task creation, completion toggling, and cleanup", () => {
      const taskDemo = HOMEPAGE_DEMOS.find((d) => d.id === "task-manager");
      expect(taskDemo).toBeDefined();
      const code = taskDemo!.code;

      // Real task state transitions
      expect(code).toContain("Evaluate multi-modal vision parsing");
      expect(code).toContain("t.id === 2 ? { ...t, done: true } : t");
      expect(code).toContain("completedCount");
      expect(code).toContain("Auto Demo: Tracking Sprint");
    });

    it("should implement PricingCalculator slider updates and tier recommendation", () => {
      const priceDemo = HOMEPAGE_DEMOS.find((d) => d.id === "pricing-calculator");
      expect(priceDemo).toBeDefined();
      const code = priceDemo!.code;

      // Real capacity formulas
      expect(code).toContain("users * 150");
      expect(code).toContain("tokensM * 80");
      expect(code).toContain('users > 50 || tokensM > 50 ? "Enterprise" : users > 5 ? "Pro Team" : "Starter"');

      // Automated steps
      expect(code).toContain("setUsers(50)");
      expect(code).toContain("setTokensM(40)");
      expect(code).toContain("setUsers(75)");
      expect(code).toContain("Auto Demo: Estimating Capacity");
    });
  });
});

