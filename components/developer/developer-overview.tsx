"use client";

import React from "react";
import {
  Code2,
  Key,
  BookOpen,
  Play,
  Activity,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Zap,
  ArrowRight,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { SanitizedApiKey } from "@/lib/developer/api-keys";

interface DeveloperOverviewProps {
  onNavigateTab: (tab: "overview" | "keys" | "docs" | "playground" | "usage") => void;
  activeKeys: SanitizedApiKey[];
  usageSummary: {
    totalRequests: number;
    totalUnits: number;
    successRate: number;
  } | null;
  persistenceStatus: {
    statusCode?: string;
    isConfigured: boolean;
    storageMode: string;
    isOnline: boolean;
    projectRef?: string;
  } | null;
}

export function DeveloperOverview({
  onNavigateTab,
  activeKeys,
  usageSummary,
  persistenceStatus,
}: DeveloperOverviewProps) {
  const liveKeysCount = activeKeys.filter((k) => k.environment === "live" && !k.revokedAt).length;
  const testKeysCount = activeKeys.filter((k) => k.environment === "test" && !k.revokedAt).length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-950 border border-indigo-500/20 p-6 md:p-8">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Nexora Developer Hub v1.1</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Build Intelligent Multimodal Apps with Nexora
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Integrate OpenAI-compatible text completions with transparent multi-provider failover, alongside high-fidelity image, music, video, and song lyrics generation through a unified REST API.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigateTab("docs")}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/30 active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              <span>Explore API Documentation</span>
            </button>
            <button
              onClick={() => onNavigateTab("playground")}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-medium flex items-center gap-2 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current text-indigo-400" />
              <span>Launch Playground</span>
            </button>
          </div>
        </div>

        {/* Decorative subtle background gradient blob */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: API Keys */}
        <div
          onClick={() => onNavigateTab("keys")}
          className="cursor-pointer p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-indigo-500/30 transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 transition-transform">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
              API Keys
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Create and manage scoped keys for live production and sandbox environments.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>{liveKeysCount} live / {testKeysCount} test</span>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
          </div>
        </div>

        {/* Card 2: Documentation */}
        <div
          onClick={() => onNavigateTab("docs")}
          className="cursor-pointer p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-indigo-500/30 transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
              Documentation
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Complete guides, parameters, schemas, and code examples for cURL, JS, TS, and Python.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>12 Guides & Specs</span>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-purple-400 transition-colors" />
          </div>
        </div>

        {/* Card 3: Playground */}
        <div
          onClick={() => onNavigateTab("playground")}
          className="cursor-pointer p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-indigo-500/30 transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
            <Play className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
              API Playground
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Interactive test bench with sandbox mode, live response headers, and latency metrics.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>Safe ₹0 Sandbox</span>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
          </div>
        </div>

        {/* Card 4: Usage Analytics */}
        <div
          onClick={() => onNavigateTab("usage")}
          className="cursor-pointer p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-indigo-500/30 transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
              Usage Telemetry
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Track request volumes, unit consumption, success rate, and endpoint performance.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>{usageSummary?.totalRequests ?? 0} requests</span>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
          </div>
        </div>
      </div>

      {/* Model Registry Highlights */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <Layers className="w-4 h-4" />
            <span>Supported Engine Slugs</span>
          </div>
          <button
            onClick={() => onNavigateTab("docs")}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>View Full Specs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { slug: "nexora-chat", label: "Nexora Chat", type: "text", desc: "Everyday conversation" },
            { slug: "nexora-swift", label: "Nexora Swift", type: "text", desc: "Ultra-low latency" },
            { slug: "nexora-core", label: "Nexora Core", type: "text", desc: "Balanced reasoning" },
            { slug: "nexora-reason", label: "Nexora Reason", type: "text", desc: "Complex logic & math" },
            { slug: "nexora-vision", label: "Nexora Vision", type: "multimodal", desc: "Visual understanding" },
            { slug: "nexora-image", label: "Nexora Image", type: "image", desc: "FLUX / SDXL / Imagen" },
            { slug: "nexora-music", label: "Nexora Music", type: "audio", desc: "Generative melodies" },
            { slug: "nexora-video", label: "Nexora Video", type: "video", desc: "Cinematic clips" },
            { slug: "nexora-lyrics-v1", label: "Nexora Lyrics", type: "lyrics", desc: "Song composition" },
          ].map((m) => (
            <div key={m.slug} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-white">{m.label}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-indigo-300">
                  {m.type}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
