"use client";

import { useState } from "react";
import { Search, ExternalLink, Globe, Sparkles, AlertCircle } from "lucide-react";

interface SearchSource {
  title: string;
  url: string;
  snippet: string;
}

export default function WorkspaceResearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchSource[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          planTier: "pro",
          maxResults: 5,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Search failed");
      }

      setResults(data.sources || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Source-Grounded Web Research</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Perform live web searches protected by SSRF guardrails. Results provide verifiable links for multi-model synthesis.
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search current topics (e.g. Next.js 15 breaking changes, AI model releases)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
        >
          {loading ? "Searching..." : "Research"}
          <Globe className="w-4 h-4" />
        </button>
      </form>

      {error && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Results Display */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300">
            Retrieved Sources ({results.length})
          </h2>
          <div className="space-y-3">
            {results.map((source, index) => (
              <div key={index} className="rounded-2xl glass-card p-5 border border-white/10 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-white text-sm hover:text-indigo-400 flex items-center gap-1.5 transition-colors"
                  >
                    <span>[{index + 1}] {source.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                  </a>
                </div>
                <div className="text-[11px] font-mono text-zinc-500 truncate">{source.url}</div>
                <p className="text-xs text-zinc-300 leading-relaxed">{source.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
