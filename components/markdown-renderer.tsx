"use client";

import { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Regex to detect code blocks: ```lang ... ```
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-sm text-zinc-200 leading-relaxed break-words">
      {parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          // Extract language and code content
          const match = part.match(/^```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```$/);
          const language = match ? match[1] || "text" : "text";
          const code = match ? match[2] : part.slice(3, -3);

          return <CodeBlock key={index} code={code} language={language} />;
        }

        // Standard text lines with inline markdown
        return <TextBlock key={index} text={part} />;
      })}
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-950 my-3 shadow-lg">
      <div className="px-4 py-2 bg-slate-900 border-b border-white/5 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-mono uppercase text-[10px] tracking-wider text-zinc-300 font-bold">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white transition-colors p-1"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto font-mono text-xs text-zinc-200 leading-relaxed">
        <pre>{code}</pre>
      </div>
    </div>
  );
}

function TextBlock({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={i} className="h-2" />;
        }

        // Headings
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={i} className="text-base font-bold text-white pt-2">
              {trimmed.replace("### ", "")}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="text-lg font-bold text-white pt-2">
              {trimmed.replace("## ", "")}
            </h2>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={i} className="text-xl font-bold text-white pt-2">
              {trimmed.replace("# ", "")}
            </h1>
          );
        }

        // Bullet lists
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
              <span>{renderInlineFormatting(trimmed.substring(2))}</span>
            </div>
          );
        }

        // Blockquotes
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote
              key={i}
              className="pl-3 border-l-2 border-indigo-500/50 text-zinc-400 italic text-xs my-1"
            >
              {renderInlineFormatting(trimmed.substring(2))}
            </blockquote>
          );
        }

        // Standard paragraph line
        return <p key={i}>{renderInlineFormatting(line)}</p>;
      })}
    </div>
  );
}

function renderInlineFormatting(str: string): React.ReactNode {
  // Simple token parser for **bold** and `code`
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-indigo-300 font-mono text-[12px] border border-white/5"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
