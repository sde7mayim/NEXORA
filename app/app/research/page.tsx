"use client";

import { useState } from "react";
import {
  Search,
  ExternalLink,
  Globe,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  Calendar,
  Layers,
  BookOpen,
  ArrowRight,
  Filter,
  RefreshCw,
  X,
  ShieldCheck,
} from "lucide-react";

interface SearchSource {
  id?: string;
  title: string;
  url: string;
  domain?: string;
  snippet: string;
  publishedDate?: string;
  score?: number;
  sourceType?: string;
  queryMatched?: string;
}

const STARTER_TOPICS = [
  "Software engineering",
  "React useEffect cleanup function",
  "Latest software engineering trends",
  "Python official documentation list comprehension",
  "Fault-tolerant microservices architecture",
];

export default function WorkspaceResearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [results, setResults] = useState<SearchSource[]>([]);
  const [subqueries, setSubqueries] = useState<string[]>([]);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"relevance" | "date">("relevance");
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [searchStep, setSearchStep] = useState<string>("");

  const handleSearch = async (overrideQuery?: string, newSortBy?: "relevance" | "date") => {
    const q = (overrideQuery || query).trim();
    if (!q || loading) return;

    const sort = newSortBy || sortBy;

    setLoading(true);
    setError(null);
    setResults([]);
    setSubqueries([]);
    setTotalResults(0);
    setCurrentPage(1);
    setHasMore(false);
    setSearchStep("Analyzing query & expanding subtopics...");

    try {
      setTimeout(() => {
        setSearchStep("Querying verified web sources across subtopics...");
      }, 700);

      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          planTier: "enterprise",
          page: 1,
          pageSize: 10,
          sortBy: sort,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Search failed");
      }

      setResults(data.sources || []);
      setSubqueries(data.subqueries || []);
      setTotalResults(data.totalResults || (data.sources ? data.sources.length : 0));
      setHasMore(Boolean(data.hasMore));
      setCurrentPage(1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setSearchStep("");
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || !query.trim()) return;

    setLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          planTier: "enterprise",
          page: nextPage,
          pageSize: 10,
          sortBy,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load more results");
      }

      const newSources = data.sources || [];
      setResults((prev) => [...prev, ...newSources]);
      setCurrentPage(nextPage);
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSortChange = (newSort: "relevance" | "date") => {
    if (newSort === sortBy) return;
    setSortBy(newSort);
    if (results.length > 0 && query.trim()) {
      handleSearch(query, newSort);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const formatSourceType = (type?: string) => {
    switch (type) {
      case "official_docs":
        return { label: "Official Docs", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
      case "educational":
        return { label: "Educational", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
      case "technical_publication":
        return { label: "Tech Guide", color: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30" };
      case "research_paper":
        return { label: "Research", color: "bg-purple-500/10 text-purple-300 border-purple-500/30" };
      case "community_discussion":
        return { label: "Community", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
      default:
        return { label: "Web Article", color: "bg-white/5 text-zinc-400 border-white/10" };
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Deep Web Research</span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Broad &amp; Grounded
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Multi-query search coverage with automatic query expansion, relevance ranking, and SSRF guardrails.
            </p>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search broad engineering topics, documentation, or technical questions..."
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-900/90 border border-white/10 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all shadow-inner"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                aria-label="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all shrink-0 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Deep Research</span>
              </>
            )}
          </button>
        </form>

        {/* Quick starter topics */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
          <span className="text-[11px] uppercase font-semibold tracking-wider text-zinc-500 mr-1">
            Try:
          </span>
          {STARTER_TOPICS.map((topic, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(topic);
                handleSearch(topic);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 text-[11px] transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Progress / Loading State */}
      {loading && (
        <div className="p-6 rounded-2xl glass-card border border-indigo-500/20 bg-indigo-950/20 text-center space-y-3 animate-pulse">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-400">
              <Globe className="w-6 h-6 animate-spin" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">Conducting Multi-Query Web Search</h3>
            <p className="text-xs text-indigo-300 font-mono">{searchStep || "Gathering verified candidate sources..."}</p>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold">Search notice</span>
            <p className="leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Results Header & Subqueries Bar */}
      {!loading && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Retrieved Web Sources</span>
                <span className="text-xs font-normal text-zinc-400">
                  (Showing {results.length} of {totalResults} verified candidates)
                </span>
              </h2>
              {subqueries.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                    Explored Facets:
                  </span>
                  {subqueries.map((sq, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-zinc-300"
                    >
                      {sq}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto p-1 rounded-xl bg-slate-900 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => handleSortChange("relevance")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  sortBy === "relevance"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Most Relevant
              </button>
              <button
                type="button"
                onClick={() => handleSortChange("date")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  sortBy === "date"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Latest Date
              </button>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-3.5">
            {results.map((source, index) => {
              const typeBadge = formatSourceType(source.sourceType);
              return (
                <div
                  key={source.id || index}
                  className="rounded-2xl glass-card p-4 sm:p-5 border border-white/10 hover:border-indigo-500/30 transition-all space-y-2.5 group"
                >
                  {/* Card Header: Domain, Type, Date, Score */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-[11px] text-zinc-300 font-semibold">
                        {source.domain || "web"}
                      </span>
                      <span
                        className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-md border ${typeBadge.color}`}
                      >
                        {typeBadge.label}
                      </span>
                      {source.publishedDate && (
                        <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                          <Calendar className="w-3 h-3 text-zinc-500" />
                          <span>{source.publishedDate}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {source.score !== undefined && (
                        <span className="text-[10px] font-mono text-zinc-500">
                          Relevance {(source.score * 100).toFixed(0)}%
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(source.url)}
                        className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                        title="Copy source link"
                      >
                        {copiedUrl === source.url ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Title & Link */}
                  <div>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>
                        [{index + 1}] {source.title}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                    </a>
                    <div className="text-[11px] font-mono text-indigo-400/80 truncate mt-0.5">
                      {source.url}
                    </div>
                  </div>

                  {/* Snippet */}
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans line-clamp-3 group-hover:line-clamp-none transition-all">
                    {source.snippet}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold inline-flex items-center gap-2 hover:border-indigo-500/40 transition-all cursor-pointer"
              >
                {loadingMore ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading more sources...</span>
                  </>
                ) : (
                  <>
                    <span>Load More Results</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State when no search executed yet */}
      {!loading && results.length === 0 && !error && (
        <div className="p-8 sm:p-12 rounded-2xl glass-card border border-white/5 text-center space-y-4 max-w-xl mx-auto my-8">
          <div className="flex justify-center">
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Globe className="w-7 h-7" />
            </div>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-white">Google-Grade Deep Web Research</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Enter any broad engineering topic or specific technical question. Nexora retrieves, deduplicates,
              and ranks dozens of real web sources across documentation, publications, and official repositories.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-3 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SSRF Protected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Multi-Query Coverage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>Substantive Sources</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
