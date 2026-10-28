import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  HOMEPAGE_DEMOS,
  getNextDemoExample,
  cycleDemoExample,
  getLastViewedDemoId,
  DemoExample,
} from "@/lib/demo/homepage-demos";
import fs from "fs";
import path from "path";

describe("Dynamic Homepage Code Demos Architecture", () => {
  it("should provide a diverse catalogue of interactive frontend demo components", () => {
    expect(HOMEPAGE_DEMOS.length).toBeGreaterThanOrEqual(5);

    const ids = HOMEPAGE_DEMOS.map((d) => d.id);
    expect(ids).toContain("analytics-card");
    expect(ids).toContain("smart-calculator");
    expect(ids).toContain("task-manager");
    expect(ids).toContain("shopping-cart");
    expect(ids).toContain("pricing-calculator");

    // Verify all demos have required fields and non-empty code
    for (const demo of HOMEPAGE_DEMOS) {
      expect(demo.id).toBeTruthy();
      expect(demo.title).toBeTruthy();
      expect(demo.badge).toBeTruthy();
      expect(demo.prompt).toBeTruthy();
      expect(demo.description).toBeTruthy();
      expect(demo.code.length).toBeGreaterThan(100);
      expect(demo.language).toBe("jsx");

      // Verify each demo has a real functional export default component
      expect(demo.code).toMatch(/export\s+default\s+function\s+\w+/);
    }
  });

  it("should prevent repeating the same demo on subsequent selections", () => {
    for (const demo of HOMEPAGE_DEMOS) {
      // Running 10 times for each demo to ensure random candidate selection never chooses currentId
      for (let i = 0; i < 10; i++) {
        const next = getNextDemoExample(demo.id);
        expect(next.id).not.toBe(demo.id);
      }
    }
  });

  it("should deterministically cycle through the demo examples in order", () => {
    const first = HOMEPAGE_DEMOS[0];
    const second = HOMEPAGE_DEMOS[1];
    const last = HOMEPAGE_DEMOS[HOMEPAGE_DEMOS.length - 1];

    expect(cycleDemoExample(first.id, 1).id).toBe(second.id);
    expect(cycleDemoExample(last.id, 1).id).toBe(first.id);
    expect(cycleDemoExample(first.id, -1).id).toBe(last.id);
  });

  it("should handle session storage gracefully when window is undefined or storage throws", () => {
    // Should run safely in node/server-side environment without error
    const next = getNextDemoExample();
    expect(next).toBeDefined();
    expect(HOMEPAGE_DEMOS).toContain(next);

    const lastId = getLastViewedDemoId();
    expect(lastId === null || typeof lastId === "string").toBe(true);
  });

  it("should integrate Try Another Demo and dynamic switching on the homepage", () => {
    const pagePath = path.resolve(process.cwd(), "app/page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    // Check imports and client directive
    expect(content).toContain('"use client"');
    expect(content).toContain("HOMEPAGE_DEMOS");
    expect(content).toContain("getNextDemoExample");
    expect(content).toContain("Try Another Demo");
    expect(content).toContain("Examples:");

    // Check that LiveCodePreview is mounted with DEMO_REACT_CODE
    expect(content).toContain('<LiveCodePreview code={DEMO_REACT_CODE} language="jsx" />');
  });

  it("should verify TargetComponent resolution in LiveCodePreview supports all demo exports", () => {
    const previewPath = path.resolve(process.cwd(), "components/live-code-preview.tsx");
    const content = fs.readFileSync(previewPath, "utf-8");

    // Verify component resolution handles all our catalogue components
    expect(content).toContain("Calculator");
    expect(content).toContain("TaskManager");
    expect(content).toContain("ShoppingCart");
    expect(content).toContain("WeatherStation");
    expect(content).toContain("PricingCalculator");
    expect(content).toContain("AnalyticsCard");
    expect(content).toContain("__NexoraApp");
  });

  it("should provide safe optional AI demo generation endpoint with catalogue fallback", () => {
    const routePath = path.resolve(process.cwd(), "app/api/demo/generate/route.ts");
    expect(fs.existsSync(routePath)).toBe(true);

    const content = fs.readFileSync(routePath, "utf-8");
    // Verifies feature gating to prevent unapproved paid spend
    expect(content).toContain("ENABLE_AI_DEMO_GENERATION");
    // Verifies fallback to verified catalogue
    expect(content).toContain("getNextDemoExample");
    expect(content).toContain("HOMEPAGE_DEMOS");
  });
});
