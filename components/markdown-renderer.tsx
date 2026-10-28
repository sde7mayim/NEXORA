"use client";

import React, { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { LiveCodePreview } from "@/components/live-code-preview";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Regex to detect code blocks: ```lang ... ```
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-4 text-chat-body text-zinc-100 leading-relaxed break-words [overflow-wrap:anywhere] font-sans selection:bg-indigo-500/30 min-w-0 max-w-full">
      {parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          // Extract language and code content
          const match = part.match(/^```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```$/);
          const language = match ? match[1] || "text" : "text";
          const code = match ? match[2] : part.slice(3, -3);

          return <LiveCodePreview key={index} code={code} language={language} />;
        }

        // Standard text lines with inline markdown and table parser
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
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-950 my-4 shadow-xl min-w-0 max-w-full">
      <div className="px-4 py-3 bg-slate-900 border-b border-white/5 flex items-center justify-between text-sm text-zinc-300">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="font-mono uppercase text-sm tracking-wider text-zinc-200 font-bold truncate">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5 shrink-0"
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
      <div className="p-4 md:p-5 overflow-x-auto font-mono text-[15px] text-zinc-200 leading-relaxed max-w-full overscroll-x-contain">
        <pre className="overflow-x-auto whitespace-pre font-mono">{code}</pre>
      </div>
    </div>
  );
}

function TableBlock({ lines }: { lines: string[] }) {
  const validLines = lines.map((l) => l.trim()).filter((l) => l.length > 0 && l.includes("|"));
  if (validLines.length === 0) return null;

  const parseCells = (line: string) => {
    return line
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim());
  };

  const isSeparator = (line: string) => /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(line);

  const headers = parseCells(validLines[0]);
  let bodyStartIndex = 1;
  if (validLines.length > 1 && isSeparator(validLines[1])) {
    bodyStartIndex = 2;
  }

  const rows = validLines.slice(bodyStartIndex).filter((l) => !isSeparator(l)).map(parseCells);

  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-white/10 bg-zinc-950/70 shadow-md min-w-0 max-w-full overscroll-x-contain">
      <table className="w-full border-collapse text-left text-sm md:text-base">
        <thead className="bg-zinc-900 border-b border-white/10 text-zinc-200">
          <tr>
            {headers.map((h, idx) => (
              <th
                key={idx}
                className="px-4 py-3 font-semibold text-zinc-100 uppercase tracking-wider text-xs md:text-sm whitespace-nowrap bg-white/[0.03]"
              >
                {renderInlineFormatting(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-zinc-300">
          {rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className="hover:bg-white/[0.02] transition-colors even:bg-zinc-900/30"
            >
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-4 py-3 leading-relaxed align-top">
                  {renderInlineFormatting(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TextBlock({ text }: { text: string }) {
  const rawLines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentTableLines: string[] = [];

  const flushTable = (key: string | number) => {
    if (currentTableLines.length > 0) {
      elements.push(<TableBlock key={`tbl_${key}`} lines={currentTableLines} />);
      currentTableLines = [];
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // Check if line belongs to a markdown table (e.g. "| col | col |")
    const isTableLine = trimmed.startsWith("|") && (trimmed.endsWith("|") || trimmed.includes("|"));

    if (isTableLine) {
      currentTableLines.push(trimmed);
      continue;
    } else {
      flushTable(i);
    }

    if (!trimmed) {
      elements.push(<div key={`gap_${i}`} className="h-2" />);
      continue;
    }

    // Horizontal Divider (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<hr key={`hr_${i}`} className="my-4 border-white/10" />);
      continue;
    }

    // Headings # to ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingContent = headingMatch[2];
      const content = renderInlineFormatting(headingContent);

      if (level === 1) {
        elements.push(
          <h1 key={`h1_${i}`} className="text-3xl md:text-4xl font-extrabold text-white pt-5 pb-2.5 border-b border-white/10 tracking-tight">
            {content}
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2 key={`h2_${i}`} className="text-2xl md:text-[28px] font-bold text-white pt-4 pb-2 tracking-tight">
            {content}
          </h2>
        );
      } else if (level === 3) {
        elements.push(
          <h3 key={`h3_${i}`} className="text-xl md:text-2xl font-bold text-zinc-100 pt-3.5 pb-1.5">
            {content}
          </h3>
        );
      } else if (level === 4) {
        elements.push(
          <h4 key={`h4_${i}`} className="text-lg md:text-xl font-semibold text-zinc-200 pt-3 pb-1">
            {content}
          </h4>
        );
      } else if (level === 5) {
        elements.push(
          <h5 key={`h5_${i}`} className="text-base md:text-lg font-semibold uppercase tracking-wider text-zinc-300 pt-2.5 pb-1">
            {content}
          </h5>
        );
      } else {
        elements.push(
          <h6 key={`h6_${i}`} className="text-sm md:text-base font-semibold uppercase tracking-wider text-zinc-400 pt-2 pb-0.5">
            {content}
          </h6>
        );
      }
      continue;
    }

    // Bullet Lists (- , * , + )
    const bulletMatch = trimmed.match(/^([-*+])\s+(.*)$/);
    if (bulletMatch) {
      elements.push(
        <div key={`li_${i}`} className="flex items-start gap-3 my-2 pl-1">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 mt-2 shrink-0 shadow-sm shadow-indigo-500/50" />
          <span className="text-zinc-100 text-[17px] md:text-[18px] leading-[1.68]">{renderInlineFormatting(bulletMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Ordered Lists (1. , 2. )
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      elements.push(
        <div key={`oli_${i}`} className="flex items-start gap-3 my-2 pl-1">
          <span className="font-mono text-base font-bold text-indigo-400 shrink-0 mt-0.5 min-w-[1.75rem]">
            {orderedMatch[1]}.
          </span>
          <span className="text-zinc-100 text-[17px] md:text-[18px] leading-[1.68]">{renderInlineFormatting(orderedMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Blockquote (> )
    if (trimmed.startsWith("> ")) {
      elements.push(
        <blockquote
          key={`bq_${i}`}
          className="pl-4 py-2.5 border-l-3 border-indigo-400/80 bg-indigo-500/10 rounded-r-xl text-zinc-200 italic text-[17px] leading-[1.65] my-3"
        >
          {renderInlineFormatting(trimmed.substring(2))}
        </blockquote>
      );
      continue;
    }

    // Standard paragraph line
    elements.push(
      <p key={`p_${i}`} className="text-zinc-100 text-[17px] md:text-[18px] leading-[1.68]">
        {renderInlineFormatting(line)}
      </p>
    );
  }

  flushTable("final");

  return <div className="space-y-1.5">{elements}</div>;
}

export function renderInlineFormatting(str: string): React.ReactNode {
  if (!str) return "";

  // Regex tokens:
  // 1. `inline code`
  // 2. **bold** or __bold__
  // 3. ~~strikethrough~~
  // 4. [link text](url)
  // 5. *italic* or _italic_
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\[[^\]]+\]\([^)]+\)|\*[^*]+\*|_[^_]+_)/g;
  const parts = str.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline code
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-2 py-0.5 rounded-md bg-zinc-800/90 text-indigo-300 font-mono text-[14.5px] border border-white/10 shadow-sm"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold (** or __)
    if (
      (part.startsWith("**") && part.endsWith("**") && part.length >= 4) ||
      (part.startsWith("__") && part.endsWith("__") && part.length >= 4)
    ) {
      return (
        <strong key={index} className="font-semibold text-white tracking-wide">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Strikethrough (~~)
    if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
      return (
        <del key={index} className="line-through text-zinc-500">
          {part.slice(2, -2)}
        </del>
      );
    }

    // Links [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors font-medium"
        >
          {linkMatch[1]}
        </a>
      );
    }

    // Italic (* or _)
    if (
      (part.startsWith("*") && part.endsWith("*") && part.length >= 2 && !part.startsWith("**")) ||
      (part.startsWith("_") && part.endsWith("_") && part.length >= 2 && !part.startsWith("__"))
    ) {
      return (
        <em key={index} className="italic text-zinc-200">
          {part.slice(1, -1)}
        </em>
      );
    }

    return part;
  });
}
