"use client";

import React, { useState } from "react";
import {
  Code2,
  Copy,
  Check,
  Search,
  Terminal,
  Lock,
  Key,
  Layers,
  Sparkles,
  FileText,
  Activity,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Play,
  Zap,
  Image as ImageIcon,
  Music,
  Video,
} from "lucide-react";
import {
  DOC_SECTIONS,
  API_ENDPOINTS,
  ERROR_CODES,
  generateCurlSnippet,
  generateJavaScriptSnippet,
  generateTypeScriptSnippet,
  generatePythonSnippet,
  ApiEndpointDoc,
} from "./doc-data";

interface ApiDocumentationProps {
  onSelectPlaygroundEndpoint?: (endpointId: string) => void;
}

export function ApiDocumentation({ onSelectPlaygroundEndpoint }: ApiDocumentationProps) {
  const [activeSectionId, setActiveSectionId] = useState<string>("getting-started");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [codeLang, setCodeLang] = useState<"curl" | "javascript" | "typescript" | "python">("curl");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredSections = DOC_SECTIONS.filter((sec) =>
    sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSection = DOC_SECTIONS.find((s) => s.id === activeSectionId) || DOC_SECTIONS[0];
  const activeEndpoint = API_ENDPOINTS.find((ep) => {
    if (activeSectionId === "chat") return ep.id === "chat-completions";
    if (activeSectionId === "images") return ep.id === "image-generations";
    if (activeSectionId === "music") return ep.id === "music-generations";
    if (activeSectionId === "videos") return ep.id === "video-generations";
    if (activeSectionId === "lyrics") return ep.id === "lyrics-generations";
    if (activeSectionId === "models") return ep.id === "models-list";
    if (activeSectionId === "usage-limits") return ep.id === "usage-summary";
    return false;
  });

  const getCodeSnippet = (endpoint: ApiEndpointDoc) => {
    switch (codeLang) {
      case "curl":
        return generateCurlSnippet(endpoint);
      case "javascript":
        return generateJavaScriptSnippet(endpoint);
      case "typescript":
        return generateTypeScriptSnippet(endpoint);
      case "python":
        return generatePythonSnippet(endpoint);
      default:
        return generateCurlSnippet(endpoint);
    }
  };

  const renderSectionIcon = (iconName: string, className = "w-4 h-4") => {
    switch (iconName) {
      case "Sparkles": return <Sparkles className={className} />;
      case "Lock": return <Lock className={className} />;
      case "Key": return <Key className={className} />;
      case "Layers": return <Layers className={className} />;
      case "Terminal": return <Terminal className={className} />;
      case "Image": return <ImageIcon className={className} />;
      case "Music": return <Music className={className} />;
      case "Video": return <Video className={className} />;
      case "FileText": return <FileText className={className} />;
      case "Activity": return <Activity className={className} />;
      case "AlertCircle": return <AlertCircle className={className} />;
      case "Clock": return <Clock className={className} />;
      default: return <Code2 className={className} />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-3 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search API docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Section List */}
        <div className="p-2 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Documentation Index
          </div>
          {filteredSections.map((sec) => {
            const isActive = activeSectionId === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSectionId(sec.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className={isActive ? "text-indigo-400" : "text-zinc-500"}>
                    {renderSectionIcon(sec.iconName)}
                  </span>
                  <span className="truncate">{sec.title}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Quick Links / Resources */}
        <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs space-y-2">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Interactive Playground</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Test any endpoint with live responses or safe zero-cost sandbox simulation right in the dashboard.
          </p>
          {onSelectPlaygroundEndpoint && (
            <button
              onClick={() => onSelectPlaygroundEndpoint("chat-completions")}
              className="mt-1 w-full py-1.5 px-3 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Open Playground</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Documentation Content */}
      <div className="lg:col-span-9 space-y-6">
        {/* Section Header */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            {renderSectionIcon(activeSection.iconName)}
            <span>Nexora Developer Reference</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{activeSection.title}</h2>
          <p className="text-sm text-zinc-400">{activeSection.summary}</p>
        </div>

        {/* SECTION 1: Getting Started */}
        {activeSectionId === "getting-started" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <h3 className="text-base font-semibold text-white">Welcome to the Nexora API</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                The Nexora API platform provides programmable access to our multi-provider intelligence router, multimodal generation engines (images, music, video, and lyrics), and account telemetry. All endpoints follow REST principles, accept JSON-encoded request bodies, and return standard JSON responses.
              </p>

              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Base URLs</div>
                <div className="space-y-1.5 font-mono text-xs text-zinc-200">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Production:</span>
                    <span className="text-indigo-300">https://api.nexora.ai</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Development / Local:</span>
                    <span className="text-zinc-300">http://localhost:3000</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick 3-step integration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">1</div>
                <h4 className="text-xs font-semibold text-white">Issue an API Key</h4>
                <p className="text-[11px] text-zinc-400">
                  Create a live (<code className="text-indigo-300">nx_live_...</code>) or sandbox test key (<code className="text-emerald-300">nx_test_...</code>) in the <strong>API Keys</strong> tab.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">2</div>
                <h4 className="text-xs font-semibold text-white">Select Your Engine</h4>
                <p className="text-[11px] text-zinc-400">
                  Use our OpenAI-compatible <code className="text-indigo-300">/api/v1/chat/completions</code> for LLM tasks or dedicated multimodal endpoints for media.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">3</div>
                <h4 className="text-xs font-semibold text-white">Test in Playground</h4>
                <p className="text-[11px] text-zinc-400">
                  Experiment with inputs, inspect status codes, and copy production-ready code in Python, TypeScript, and cURL.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Authentication */}
        {activeSectionId === "authentication" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <h3 className="text-base font-semibold text-white">API Authentication & Headers</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                The Nexora API uses Bearer authentication. All requests to versioned endpoints (<code className="text-indigo-300">/api/v1/*</code>) must include your secret API key in the standard <code className="text-zinc-200">Authorization</code> HTTP header.
              </p>

              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Supported Header Formats</div>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="text-emerald-400">Authorization: Bearer nx_live_abc123...</div>
                  <div className="text-zinc-400">x-api-key: nx_live_abc123... (alternative fallback)</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Security Best Practice:</span> Never hardcode API keys in client-side code or public repositories. Store them in protected environment variables (<code className="text-white">process.env.NEXORA_API_KEY</code>).
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: API Keys & Scopes */}
        {activeSectionId === "api-keys" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <h3 className="text-base font-semibold text-white">Key Formats & Granular Scopes</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Nexora issues cryptographically hashed API keys prefixed by their environment. Secrets are shown once upon creation and stored exclusively as SHA-256 hashes in PostgreSQL with Row-Level Security.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs space-y-1">
                  <div className="font-semibold text-indigo-300 font-mono">Live Keys (nx_live_...)</div>
                  <p className="text-[11px] text-zinc-400">Production environment keys that route to live provider inference engines and track real billing units.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-1">
                  <div className="font-semibold text-emerald-300 font-mono">Test Keys (nx_test_...)</div>
                  <p className="text-[11px] text-zinc-400">Zero-cost sandbox keys that simulate media generation, validate parameters, and test integrations safely.</p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Available Scopes</div>
                <div className="border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 border-b border-white/10 text-zinc-400">
                      <tr>
                        <th className="p-3 font-semibold">Scope Identifier</th>
                        <th className="p-3 font-semibold">Description</th>
                        <th className="p-3 font-semibold">Associated Endpoints</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      <tr><td className="p-3 font-mono text-indigo-300">chat:write</td><td className="p-3">Chat & text completions</td><td className="p-3 font-mono text-[11px]">/api/v1/chat/completions</td></tr>
                      <tr><td className="p-3 font-mono text-indigo-300">images:generate</td><td className="p-3">Image generation (FLUX, SDXL, Imagen)</td><td className="p-3 font-mono text-[11px]">/api/v1/images/generations</td></tr>
                      <tr><td className="p-3 font-mono text-indigo-300">music:generate</td><td className="p-3">Generative music & audio tracks</td><td className="p-3 font-mono text-[11px]">/api/v1/music/generations</td></tr>
                      <tr><td className="p-3 font-mono text-indigo-300">videos:generate</td><td className="p-3">Cinematic video generation</td><td className="p-3 font-mono text-[11px]">/api/v1/videos/generations</td></tr>
                      <tr><td className="p-3 font-mono text-indigo-300">lyrics:generate</td><td className="p-3">Structured song lyrics generation</td><td className="p-3 font-mono text-[11px]">/api/v1/lyrics/generations</td></tr>
                      <tr><td className="p-3 font-mono text-indigo-300">models:read</td><td className="p-3">Inspect active model registry & status</td><td className="p-3 font-mono text-[11px]">/api/v1/models</td></tr>
                      <tr><td className="p-3 font-mono text-indigo-300">usage:read</td><td className="p-3">Inspect account request telemetry</td><td className="p-3 font-mono text-[11px]">/api/v1/usage</td></tr>
                      <tr><td className="p-3 font-mono text-indigo-300">keys:manage</td><td className="p-3">Create and revoke API keys</td><td className="p-3 font-mono text-[11px]">/api/v1/keys</td></tr>
                      <tr><td className="p-3 font-mono text-indigo-300">*</td><td className="p-3">Full Access (All scopes)</td><td className="p-3 font-mono text-[11px]">All endpoints</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: Available Models */}
        {activeSectionId === "models" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <h3 className="text-base font-semibold text-white">Nexora Model Architecture & Router</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Nexora provides unified model slugs backed by our intelligent ModelRouter. In production, requests automatically route to active tier-1 providers (Google DeepMind, OpenAI, Anthropic) with transparent failover and latency tracking.
              </p>

              <div className="space-y-3">
                <div className="border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 border-b border-white/10 text-zinc-400">
                      <tr>
                        <th className="p-3 font-semibold">Model Slug</th>
                        <th className="p-3 font-semibold">Modality</th>
                        <th className="p-3 font-semibold">Best For</th>
                        <th className="p-3 font-semibold">Context Window</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      <tr>
                        <td className="p-3 font-mono font-bold text-white">nexora-chat</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300">text</span></td>
                        <td className="p-3 text-zinc-400">Conversational AI, assistant tasks, general queries</td>
                        <td className="p-3 font-mono text-[11px]">128k tokens</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-white">nexora-swift</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300">text</span></td>
                        <td className="p-3 text-zinc-400">Ultra-low latency, real-time completions, high frequency</td>
                        <td className="p-3 font-mono text-[11px]">128k tokens</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-white">nexora-core</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300">text</span></td>
                        <td className="p-3 text-zinc-400">Balanced, general-purpose reasoning and code generation</td>
                        <td className="p-3 font-mono text-[11px]">128k tokens</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-white">nexora-reason</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300">text</span></td>
                        <td className="p-3 text-zinc-400">Complex multi-step logic, math, analysis, and architecture</td>
                        <td className="p-3 font-mono text-[11px]">128k tokens</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-white">nexora-vision</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] bg-violet-500/20 text-violet-300">multimodal</span></td>
                        <td className="p-3 text-zinc-400">Technical diagram reading, image understanding, OCR</td>
                        <td className="p-3 font-mono text-[11px]">128k tokens</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-white">nexora-image</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300">image</span></td>
                        <td className="p-3 text-zinc-400">Visual synthesis (FLUX.1-schnell, SDXL Turbo, Imagen)</td>
                        <td className="p-3 font-mono text-[11px]">4k tokens</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-white">nexora-lyrics-v1</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300">lyrics</span></td>
                        <td className="p-3 text-zinc-400">Structured musical lyrics with verses, chorus, and vocal guides</td>
                        <td className="p-3 font-mono text-[11px]">16k tokens</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION: Endpoint Detail View (Chat, Images, Music, Videos, Lyrics, Models, Usage) */}
        {activeEndpoint && (
          <div className="space-y-6">
            {/* Endpoint Meta Header */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                      activeEndpoint.method === "POST"
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {activeEndpoint.method}
                  </span>
                  <span className="font-mono text-sm font-semibold text-white">{activeEndpoint.path}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-white/5 border border-white/10 text-zinc-400">
                    Scope: <span className="text-indigo-300">{activeEndpoint.scope}</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-white/5 border border-white/10 text-zinc-400">
                    Rate: <span className="text-zinc-200">{activeEndpoint.rateLimit}</span>
                  </span>
                  {onSelectPlaygroundEndpoint && (
                    <button
                      onClick={() => onSelectPlaygroundEndpoint(activeEndpoint.id)}
                      className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Try in Playground</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">{activeEndpoint.description}</p>

              {activeEndpoint.testModeSupported && activeEndpoint.testModeBehavior && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold mr-1">Sandbox Test Mode:</span>
                    <span>{activeEndpoint.testModeBehavior}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Parameters Table */}
            {activeEndpoint.parameters.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Request Body Parameters</h4>
                <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 border-b border-white/10 text-zinc-400">
                      <tr>
                        <th className="p-3 font-semibold">Parameter</th>
                        <th className="p-3 font-semibold">Type</th>
                        <th className="p-3 font-semibold">Required</th>
                        <th className="p-3 font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      {activeEndpoint.parameters.map((param) => (
                        <tr key={param.name}>
                          <td className="p-3 font-mono font-medium text-white">{param.name}</td>
                          <td className="p-3 font-mono text-indigo-300 text-[11px]">{param.type}</td>
                          <td className="p-3">
                            {param.required ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                required
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
                                optional
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-zinc-400">
                            <div>{param.description}</div>
                            {param.defaultValue && (
                              <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                                Default: <code className="text-zinc-300">{param.defaultValue}</code>
                              </div>
                            )}
                            {param.options && (
                              <div className="text-[10px] text-zinc-500 mt-0.5">
                                Options: {param.options.map((opt) => (
                                  <span key={opt} className="mr-1 font-mono text-indigo-300/80 bg-white/5 px-1 py-0.2 rounded">
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Code Examples Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Code Examples</h4>
                <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                  {(["curl", "javascript", "typescript", "python"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setCodeLang(lang)}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        codeLang === lang
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {lang === "curl" ? "cURL" : lang === "javascript" ? "JavaScript" : lang === "typescript" ? "TypeScript" : "Python"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative rounded-2xl bg-black/60 border border-white/10 overflow-hidden font-mono text-xs">
                <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 text-[11px] text-zinc-400">
                  <span>{codeLang.toUpperCase()}</span>
                  <button
                    onClick={() => copyToClipboard(getCodeSnippet(activeEndpoint), "snippet")}
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
                  >
                    {copiedKey === "snippet" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto text-zinc-300 leading-relaxed">
                  <code>{getCodeSnippet(activeEndpoint)}</code>
                </pre>
              </div>
            </div>

            {/* Example Response JSON */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Example Response (200 OK)</h4>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(activeEndpoint.responseExample, null, 2), "resp")}
                  className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copiedKey === "resp" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "resp" ? "Copied" : "Copy JSON"}</span>
                </button>
              </div>
              <div className="rounded-2xl bg-black/60 border border-white/10 p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
                <pre><code>{JSON.stringify(activeEndpoint.responseExample, null, 2)}</code></pre>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: Usage & Rate Limits */}
        {activeSectionId === "usage-limits" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <h3 className="text-base font-semibold text-white">Rate Limits & Quotas</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Nexora enforces per-key sliding-window rate limits to ensure cluster stability and prevent abuse. Limits are evaluated over rolling 60-second windows and returned with standard RFC headers on every response.
              </p>

              <div className="border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-zinc-400">
                    <tr>
                      <th className="p-3 font-semibold">Response Header</th>
                      <th className="p-3 font-semibold">Description</th>
                      <th className="p-3 font-semibold">Example Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    <tr><td className="p-3 font-mono text-indigo-300">x-ratelimit-limit</td><td className="p-3">Maximum requests allowed in window</td><td className="p-3 font-mono text-zinc-400">60</td></tr>
                    <tr><td className="p-3 font-mono text-indigo-300">x-ratelimit-remaining</td><td className="p-3">Remaining requests available before reset</td><td className="p-3 font-mono text-zinc-400">54</td></tr>
                    <tr><td className="p-3 font-mono text-indigo-300">x-ratelimit-reset</td><td className="p-3">Seconds until quota window refreshes</td><td className="p-3 font-mono text-zinc-400">42</td></tr>
                    <tr><td className="p-3 font-mono text-indigo-300">retry-after</td><td className="p-3">Seconds to wait before retrying (sent on HTTP 429)</td><td className="p-3 font-mono text-rose-300">18</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 6: Error Codes Reference */}
        {activeSectionId === "errors" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <h3 className="text-base font-semibold text-white">Standard Error Format & Status Codes</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                When a request fails, Nexora returns a non-200 HTTP status code alongside a standard error payload. Every error includes a correlation identifier (<code className="text-zinc-200 font-mono">correlation_id</code>) for support tracing.
              </p>

              <div className="rounded-2xl bg-black/60 border border-white/10 p-4 font-mono text-xs text-rose-300">
                <pre><code>{`{
  "error": {
    "message": "Insufficient key permissions. Endpoint requires scope 'chat:write'.",
    "type": "permission_denied",
    "code": "insufficient_scope",
    "correlation_id": "req_1731885900_e7f8"
  }
}`}</code></pre>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Error Catalog</h4>
                <div className="border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 border-b border-white/10 text-zinc-400">
                      <tr>
                        <th className="p-3 font-semibold">HTTP</th>
                        <th className="p-3 font-semibold">Error Code</th>
                        <th className="p-3 font-semibold">Type</th>
                        <th className="p-3 font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      {ERROR_CODES.map((err) => (
                        <tr key={err.code}>
                          <td className="p-3 font-mono font-bold text-rose-400">{err.status}</td>
                          <td className="p-3 font-mono text-indigo-300 font-semibold">{err.code}</td>
                          <td className="p-3 font-mono text-zinc-400 text-[11px]">{err.type}</td>
                          <td className="p-3 text-zinc-300">{err.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 7: API Versioning */}
        {activeSectionId === "versioning" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <h3 className="text-base font-semibold text-white">API Versioning Policy</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Nexora uses URI path versioning (currently <code className="text-indigo-300 font-mono">/api/v1/</code>). All endpoints under <code className="text-zinc-200">v1</code> are production-stable and backwards compatible.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs space-y-1">
                  <div className="font-semibold text-white">Non-Breaking Additions</div>
                  <p className="text-[11px] text-zinc-400">
                    We may add new endpoints, optional request parameters, or new response properties to existing endpoints without incrementing the major version. Your client libraries should ignore unrecogized fields.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs space-y-1">
                  <div className="font-semibold text-white">Breaking Changes</div>
                  <p className="text-[11px] text-zinc-400">
                    If breaking schema changes are required (e.g. removing fields, altering required parameters), a new version path (e.g. <code className="text-indigo-300 font-mono">/api/v2/</code>) will be introduced with an advance deprecation notice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
