import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Mobile Responsiveness & Glassmorphism UI Architecture", () => {
  it("should define glassmorphism utilities in globals.css", () => {
    const cssPath = path.resolve(process.cwd(), "app/globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    expect(cssContent).toContain(".glass-topbar");
    expect(cssContent).toContain(".glass-drawer");
    expect(cssContent).toContain(".glass-composer");
    expect(cssContent).toContain("backdrop-filter: blur");
    expect(cssContent).toContain("-webkit-overflow-scrolling: touch");
  });

  it("should enforce min-w-0 and overflow-x-auto in markdown-renderer to prevent horizontal page blowout", () => {
    const mdRendererPath = path.resolve(process.cwd(), "components/markdown-renderer.tsx");
    const mdContent = fs.readFileSync(mdRendererPath, "utf-8");

    expect(mdContent).toContain("min-w-0 max-w-full");
    expect(mdContent).toContain("overflow-x-auto");
    expect(mdContent).toContain("[overflow-wrap:anywhere]");
  });

  it("should prevent duplicate mobile headers and dual-drawer conflicts in layout.tsx", () => {
    const layoutPath = path.resolve(process.cwd(), "app/app/layout.tsx");
    const layoutContent = fs.readFileSync(layoutPath, "utf-8");

    // layout header must hide when pathname === "/app" so the chat workspace provides a single unified mobile topbar
    expect(layoutContent).toContain('pathname !== "/app"');
    // auto-collapse on tablet
    expect(layoutContent).toContain("window.innerWidth < 1024");
    // Escape key handling for drawer
    expect(layoutContent).toContain('e.key === "Escape"');
  });

  it("should implement single unified mobile navigation and history drawer in page.tsx", () => {
    const pagePath = path.resolve(process.cwd(), "app/app/page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");

    // Unified drawer combines history and workspace navigation
    expect(pageContent).toContain("mobileDrawerOpen");
    expect(pageContent).toContain("glass-drawer");
    expect(pageContent).toContain("New Conversation");
    expect(pageContent).toContain("Search chats...");
    expect(pageContent).toContain("Pinned");
    expect(pageContent).toContain("Workspace");

    // Safe area bottom inset support for mobile home indicators
    expect(pageContent).toContain("env(safe-area-inset-bottom");
    // Tablet panel squeeze prevention (collapse history below 1280px by default)
    expect(pageContent).toContain("window.innerWidth >= 1280");
  });
});
