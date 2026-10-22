"use client";

import { useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  Globe,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  Eye,
  X,
} from "lucide-react";
import { GroundedCitation, KnowledgeCollection, KnowledgeDocument } from "@/lib/knowledge/knowledge-service";

export default function KnowledgeHubPage() {
  const [collections, setCollections] = useState<KnowledgeCollection[]>([
    {
      id: "col-default-1",
      userId: "usr_alex",
      orgId: "ws-default",
      name: "Enterprise Architecture & Standards",
      description: "Official cloud architecture blueprints and security RFCs.",
      isWorkspaceShared: true,
      documentCount: 2,
      totalTokens: 1450,
      createdAt: "2026-10-15",
      updatedAt: "2026-10-15",
    },
    {
      id: "col-default-2",
      userId: "usr_alex",
      name: "Product & Marketing Briefs",
      description: "Q3/Q4 positioning strategies and customer feedback.",
      isWorkspaceShared: false,
      documentCount: 1,
      totalTokens: 620,
      createdAt: "2026-10-18",
      updatedAt: "2026-10-18",
    },
  ]);

  const [selectedColId, setSelectedColId] = useState<string>("col-default-1");
  const [searchQuery, setSearchQuery] = useState("");
  const [citations, setCitations] = useState<GroundedCitation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<KnowledgeDocument | null>(null);

  // New Collection Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");
  const [newColShared, setNewColShared] = useState(true);

  // Ingest Document Modal State
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docSourceType, setDocSourceType] = useState<"text" | "url">("text");
  const [docText, setDocText] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch("/api/knowledge/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionIds: [selectedColId],
          query: searchQuery,
          userId: "usr_alex",
          orgId: "ws-default",
        }),
      });
      const data = await res.json();
      setCitations(data.citations || []);
    } catch {
      setCitations([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    const newCol: KnowledgeCollection = {
      id: `col_${Date.now()}`,
      userId: "usr_alex",
      orgId: newColShared ? "ws-default" : undefined,
      name: newColName,
      description: newColDesc,
      isWorkspaceShared: newColShared,
      documentCount: 0,
      totalTokens: 0,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };

    setCollections([...collections, newCol]);
    setSelectedColId(newCol.id);
    setIsCreateModalOpen(false);
    setNewColName("");
    setNewColDesc("");
  };

  const handleIngestDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle) return;

    setIngestStatus("Indexing semantic chunks...");
    try {
      const res = await fetch("/api/knowledge/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId: selectedColId,
          title: docTitle,
          sourceType: docSourceType,
          rawText: docSourceType === "text" ? docText : undefined,
          url: docSourceType === "url" ? docUrl : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ingestion failed");
      }

      setIngestStatus("Document indexed successfully with grounded chunks.");
      setTimeout(() => {
        setIsIngestModalOpen(false);
        setIngestStatus(null);
        setDocTitle("");
        setDocText("");
        setDocUrl("");
      }, 1200);
    } catch (err) {
      setIngestStatus(`Error: ${(err as Error).message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-6 md:p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Nexora Knowledge Hub</h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Grounded retrieval-augmented intelligence (RAG) with permissions-aware semantic citations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Collection</span>
          </button>
          <button
            onClick={() => setIsIngestModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
          >
            <Database className="w-4 h-4" />
            <span>Ingest Source</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Collections Selector & Search Query Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Collections Explorer */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Collections Directory
          </h2>
          <div className="space-y-2">
            {collections.map((col) => {
              const isSelected = selectedColId === col.id;
              return (
                <div
                  key={col.id}
                  onClick={() => setSelectedColId(col.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-950/50"
                      : "bg-slate-900/50 border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-semibold text-sm text-white">{col.name}</span>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                        col.isWorkspaceShared
                          ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                          : "bg-zinc-800 text-zinc-400 border-white/5"
                      }`}
                    >
                      {col.isWorkspaceShared ? "Workspace" : "Private"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{col.description}</p>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5 text-[11px] text-zinc-500">
                    <span>{col.documentCount} sources</span>
                    <span>~{col.totalTokens} tokens</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (2 cols): Semantic Search & Grounded Citations Console */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-400" />
              <span>Grounded Knowledge Retrieval</span>
            </h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask or search across indexed documents (e.g. 'mTLS requirements' or 'RFC')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {isSearching ? "Searching..." : "Retrieve"}
              </button>
            </form>

            {/* Citations Results */}
            {citations.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-white/5">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Grounded Citations ({citations.length})
                </span>
                <div className="space-y-2.5">
                  {citations.map((cite, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/20 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-medium text-indigo-300">
                          <FileText className="w-3.5 h-3.5" />
                          <span>{cite.documentTitle}</span>
                          {cite.sectionTitle && (
                            <span className="text-zinc-500">› {cite.sectionTitle}</span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                          Score: {Math.round(cite.relevanceScore * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed font-mono bg-black/30 p-2.5 rounded-lg border border-white/5">
                        &ldquo;{cite.snippet}&rdquo;
                      </p>
                      {cite.pageNumber && (
                        <div className="text-[10px] text-zinc-500">Page Reference: {cite.pageNumber}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ingest Source Modal */}
      {isIngestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Ingest Knowledge Source</h3>
              <button onClick={() => setIsIngestModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIngestDocument} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-400">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Consensus RFC.md"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400">Source Ingestion Mode</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setDocSourceType("text")}
                    className={`py-2 text-xs rounded-xl font-medium border ${
                      docSourceType === "text"
                        ? "bg-indigo-600/30 border-indigo-500 text-white"
                        : "bg-slate-950 border-white/10 text-zinc-400"
                    }`}
                  >
                    Direct Text / Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocSourceType("url")}
                    className={`py-2 text-xs rounded-xl font-medium border ${
                      docSourceType === "url"
                        ? "bg-indigo-600/30 border-indigo-500 text-white"
                        : "bg-slate-950 border-white/10 text-zinc-400"
                    }`}
                  >
                    SSRF-Safe Web URL
                  </button>
                </div>
              </div>

              {docSourceType === "text" ? (
                <div>
                  <label className="text-xs text-zinc-400">Document Body</label>
                  <textarea
                    rows={5}
                    placeholder="Paste technical documentation or guidelines here..."
                    value={docText}
                    onChange={(e) => setDocText(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white mt-1 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-zinc-400">Target Web URL (SSRF Protected)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/docs/spec.html"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {ingestStatus && (
                <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs">
                  {ingestStatus}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsIngestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
                >
                  Index Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Collection Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Create Knowledge Collection</h3>
            <form onSubmit={handleCreateCollection} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-400">Collection Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Legal Contracts & Compliance"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Description</label>
                <textarea
                  rows={2}
                  placeholder="Purpose of this collection..."
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white mt-1 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sharedCheck"
                  checked={newColShared}
                  onChange={(e) => setNewColShared(e.target.checked)}
                  className="rounded border-white/10 bg-slate-950 text-indigo-600"
                />
                <label htmlFor="sharedCheck" className="text-xs text-zinc-300">
                  Share with Workspace Members
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Create Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
