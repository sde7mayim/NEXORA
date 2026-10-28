import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Live Coding & Preview Architecture", () => {
  it("should implement LiveCodePreview component with sandboxed execution", () => {
    const filePath = path.resolve(process.cwd(), "components/live-code-preview.tsx");
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, "utf-8");
    // Secure iframe with sandbox
    expect(content).toContain('sandbox="allow-scripts"');
    // Code, Preview and Split view modes
    expect(content).toContain('viewMode === "code"');
    expect(content).toContain('viewMode === "preview"');
    expect(content).toContain('viewMode === "split"');
    // Action controls
    expect(content).toContain("handleDownload");
    expect(content).toContain("handleCopy");
    expect(content).toContain("Refresh preview");
    // Tailwind and React support inside sandboxed iframe
    expect(content).toContain("cdn.tailwindcss.com");
    expect(content).toContain("react@18");
    expect(content).toContain("@babel/standalone");

    // Editable code editor, debounced auto-rendering, Run & Reset controls
    expect(content).toContain("handleRun");
    expect(content).toContain("handleReset");
    expect(content).toContain("debouncedSource");
    expect(content).toContain("textarea");
  });

  it("should integrate LiveCodePreview directly into MarkdownRenderer", () => {
    const mdPath = path.resolve(process.cwd(), "components/markdown-renderer.tsx");
    const content = fs.readFileSync(mdPath, "utf-8");

    expect(content).toContain("LiveCodePreview");
    expect(content).toContain("<LiveCodePreview key={index} code={code} language={language} />");
  });

  it("should reflect 'Your AI Workspace, Reimagined' and reduced background glow on the homepage", () => {
    const homePath = path.resolve(process.cwd(), "app/page.tsx");
    const content = fs.readFileSync(homePath, "utf-8");

    // Title & CTAs
    expect(content).toContain("Your AI Workspace,");
    expect(content).toContain("Reimagined.");
    expect(content).toContain("Start Chatting");
    expect(content).toContain("Explore Features");
    // Reduced glow
    expect(content).toContain("bg-indigo-950/20 blur-[100px]");
    expect(content).not.toContain("blur-[130px]");
    // Live code preview embedded in workspace demo
    expect(content).toContain("<LiveCodePreview code={DEMO_REACT_CODE} language=\"jsx\" />");
  });

  it("should verify public pages have consistent glassmorphic styling and ambient lighting", () => {
    const publicPages = [
      "app/page.tsx",
      "app/features/page.tsx",
      "app/models/page.tsx",
      "app/pricing/page.tsx",
      "app/security/page.tsx",
      "app/contact/page.tsx",
    ];

    for (const pageRel of publicPages) {
      const fullPath = path.resolve(process.cwd(), pageRel);
      expect(fs.existsSync(fullPath)).toBe(true);
      const text = fs.readFileSync(fullPath, "utf-8");
      expect(text).toContain("bg-slate-950 text-slate-100");
      expect(text).toContain("home-card-interactive");
      expect(text).toContain("home-ambient-light-hero");
    }
  });

  it("should implement contact API endpoint with Zod schema validation", () => {
    const contactRoutePath = path.resolve(process.cwd(), "app/api/contact/route.ts");
    expect(fs.existsSync(contactRoutePath)).toBe(true);
    const text = fs.readFileSync(contactRoutePath, "utf-8");
    expect(text).toContain("ContactSchema");
    expect(text).toContain("safeParse");
    expect(text).toContain("ticketId");
  });
});
