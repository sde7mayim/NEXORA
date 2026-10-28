"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Code2,
  Eye,
  Columns,
  RefreshCw,
  Copy,
  Check,
  Download,
  Terminal,
  ExternalLink,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface LiveCodePreviewProps {
  code: string;
  language: string;
}

/**
 * Checks whether the language or snippet represents previewable frontend code (HTML, JSX, TSX, JS, SVG, CSS)
 */
function isPreviewableLanguage(language: string, code: string): boolean {
  const lang = (language || "").toLowerCase().trim();
  const frontendLanguages = ["html", "htm", "jsx", "tsx", "javascript", "js", "react", "svg", "css"];
  if (frontendLanguages.includes(lang)) return true;

  // Detect HTML or React component tags inside code
  const trimmed = code.trim();
  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    (trimmed.includes("<div") && trimmed.includes("</div>")) ||
    (trimmed.includes("export default function") && trimmed.includes("return (")) ||
    (trimmed.includes("function App()") && trimmed.includes("return (")) ||
    trimmed.startsWith("<svg")
  ) {
    return true;
  }

  return false;
}

/**
 * Builds a secure sandboxed document containing Tailwind CSS and React/Babel runners for live execution
 */
function buildSandboxedDoc(sourceCode: string, language: string): string {
  const lang = (language || "").toLowerCase().trim();
  const isSvg = lang === "svg" || sourceCode.trim().startsWith("<svg");
  const isHtml =
    lang === "html" ||
    lang === "htm" ||
    sourceCode.trim().startsWith("<!DOCTYPE") ||
    sourceCode.trim().startsWith("<html");

  if (isSvg) {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #0b0f19; padding: 1.5rem; }
      svg { max-width: 100%; height: auto; }
    </style>
  </head>
  <body>
    ${sourceCode}
  </body>
</html>`;
  }

  if (isHtml) {
    // If it already has a full HTML structure, inject Tailwind if not present
    if (sourceCode.includes("<head>")) {
      return sourceCode.replace(
        "<head>",
        `<head><script src="https://cdn.tailwindcss.com"></script><style>body { background-color: #0b0f19; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }</style>`
      );
    }
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { margin: 0; padding: 1.25rem; background-color: #0b0f19; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
    </style>
  </head>
  <body>
    ${sourceCode}
  </body>
</html>`;
  }

  // React / JSX / JS Component Wrapper
  // Strip import statements that Babel standalone in browser cannot resolve directly, and extract the Component name
  const cleanCode = sourceCode
    .replace(/^import\s+.*?from\s+['"].*?['"];?/gm, "")
    .replace(/^export\s+default\s+/gm, "const __NexoraApp = ")
    .replace(/^export\s+/gm, "");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
      body {
        margin: 0;
        padding: 1.25rem;
        background-color: #0b0f19;
        color: #f8fafc;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      #error-boundary {
        display: none;
        padding: 1rem;
        border-radius: 0.75rem;
        background-color: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #f87171;
        font-family: monospace;
        font-size: 0.8125rem;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <div id="error-boundary"></div>
    <div id="root"></div>

    <script type="text/babel">
      const { useState, useEffect, useRef, useMemo, useCallback } = React;

      window.onerror = function(message, source, lineno, colno, error) {
        const errEl = document.getElementById("error-boundary");
        if (errEl) {
          errEl.style.display = "block";
          errEl.textContent = "Preview error: " + (message || "Failed to render component");
        }
      };

      try {
        ${cleanCode}

        const TargetComponent = typeof __NexoraApp !== "undefined"
          ? __NexoraApp
          : (typeof App !== "undefined" ? App : (typeof Dashboard !== "undefined" ? Dashboard : null));

        if (TargetComponent) {
          const root = ReactDOM.createRoot(document.getElementById("root"));
          root.render(React.createElement(TargetComponent));
        } else {
          // If no React component detected, check if there was pure HTML or JSX expression
          document.getElementById("root").innerHTML = \`<div class="text-zinc-400 text-xs font-mono p-4">Component rendered successfully</div>\`;
        }
      } catch (err) {
        const errEl = document.getElementById("error-boundary");
        if (errEl) {
          errEl.style.display = "block";
          errEl.textContent = "Preview error: " + err.message;
        }
      }
    </script>
  </body>
</html>`;
}

export function LiveCodePreview({ code, language }: LiveCodePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"code" | "preview" | "split">("preview");
  const [source, setSource] = useState(code);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync if code prop updates
  useEffect(() => {
    setSource(code);
  }, [code]);

  const previewable = isPreviewableLanguage(language, source);

  const handleCopy = () => {
    navigator.clipboard.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext =
      language === "jsx" || language === "tsx"
        ? language
        : language === "html" || language === "htm"
        ? "html"
        : language === "css"
        ? "css"
        : language === "svg"
        ? "svg"
        : language === "python" || language === "py"
        ? "py"
        : language === "sql"
        ? "sql"
        : "txt";

    const blob = new Blob([source], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexora-snippet.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sandboxedDoc = previewable ? buildSandboxedDoc(source, language) : "";

  // If not previewable (e.g. Python, SQL, Bash), render clean modern code block
  if (!previewable) {
    return (
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-950 my-4 shadow-xl min-w-0 max-w-full">
        <div className="px-4 py-3 bg-slate-900/90 border-b border-white/5 flex items-center justify-between text-sm text-zinc-300">
          <div className="flex items-center gap-2 min-w-0">
            <Terminal className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-mono uppercase text-xs sm:text-sm tracking-wider text-zinc-200 font-bold truncate">
              {language || "code"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title="Download code"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
              title="Copy code"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 shrink-0" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
        <div className="p-4 md:p-5 overflow-x-auto font-mono text-[14.5px] text-zinc-200 leading-relaxed max-w-full overscroll-x-contain">
          <pre className="overflow-x-auto whitespace-pre font-mono">{source}</pre>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden border border-white/10 bg-slate-950 my-4 shadow-2xl transition-all duration-200 min-w-0 max-w-full ${
        isExpanded ? "ring-2 ring-indigo-500/40" : ""
      }`}
    >
      {/* Top Toolbar */}
      <div className="px-3 sm:px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-white/5 text-xs font-semibold">
          <button
            onClick={() => setViewMode("code")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
              viewMode === "code"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>
          <button
            onClick={() => setViewMode("preview")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
              viewMode === "preview"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
              viewMode === "split"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
            title="Side by side code & preview"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split View</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="hidden sm:inline font-mono uppercase text-[11px] font-bold px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">
            {language || "react"}
          </span>

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title="Refresh preview"
            aria-label="Refresh preview"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title="Download source"
            aria-label="Download source"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title={isExpanded ? "Collapse height" : "Expand height"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={`transition-all duration-200 overflow-hidden ${
          isExpanded ? "h-[580px]" : "h-[380px] sm:h-[420px]"
        }`}
      >
        {/* Split View (Desktop) */}
        {viewMode === "split" && (
          <div className="hidden md:grid md:grid-cols-2 h-full divide-x divide-white/10">
            {/* Code Column */}
            <div className="h-full overflow-auto bg-slate-950 p-4 font-mono text-[13.5px] text-zinc-200 leading-relaxed">
              <pre className="whitespace-pre font-mono">{source}</pre>
            </div>

            {/* Preview Column */}
            <div className="h-full bg-slate-900/50 relative">
              <iframe
                key={refreshKey}
                srcDoc={sandboxedDoc}
                sandbox="allow-scripts"
                title="Nexora Live Preview"
                className="w-full h-full border-0 bg-[#0b0f19]"
              />
            </div>
          </div>
        )}

        {/* Code View */}
        {viewMode === "code" && (
          <div className="h-full overflow-auto bg-slate-950 p-4 md:p-5 font-mono text-[14px] text-zinc-200 leading-relaxed">
            <pre className="whitespace-pre font-mono">{source}</pre>
          </div>
        )}

        {/* Preview View */}
        {viewMode === "preview" && (
          <div className="w-full h-full bg-slate-900/50 relative">
            <iframe
              key={refreshKey}
              srcDoc={sandboxedDoc}
              sandbox="allow-scripts"
              title="Nexora Live Preview"
              className="w-full h-full border-0 bg-[#0b0f19]"
            />
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="px-4 py-2 bg-slate-950 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Sandboxed Execution • Tailwind CSS & React Supported</span>
        </div>
        <span>Safe Client-Side Preview</span>
      </div>
    </div>
  );
}

