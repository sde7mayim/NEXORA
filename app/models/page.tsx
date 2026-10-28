"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import {
  EXTERNAL_MODELS,
  NEXORA_MODEL_FAMILIES,
  NEXORA_MODEL_VERSIONS,
  MODEL_ROUTES,
} from "@/lib/ai/model-registry";
import { Sparkles, Cpu, Check, ShieldCheck, Zap, Layers, ArrowRight, Eye, Search } from "lucide-react";

export default function ModelsDirectoryPage() {
  const [filter, setFilter] = useState<"all" | "profiles" | "openai" | "anthropic">("all");

  const filteredExternalModels = EXTERNAL_MODELS.filter((model) => {
    if (filter === "all") return true;
    if (filter === "openai") return model.providerKey === "openai";
    if (filter === "anthropic") return model.providerKey === "anthropic";
    return false;
  });

  const showProfiles = filter === "all" || filter === "profiles";

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 relative overflow-hidden py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Subtle Geometric Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f60a_1px,transparent_1px),linear-gradient(to_bottom,#3b82f60a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_20%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Ambient Light Fields */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[750px] h-[340px] rounded-full pointer-events-none home-ambient-light-hero home-ambient-glow-1 blur-[80px]" />
        <div className="absolute top-[550px] left-1/2 -translate-x-1/2 w-[900px] h-[360px] rounded-full pointer-events-none home-ambient-light-workspace home-ambient-glow-2 blur-[90px]" />

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="home-hero-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-indigo-300 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Full Routing Transparency • Verified Provider APIs</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight">
              Supported Model Directory
            </h1>
            <p className="mt-4 text-base sm:text-xl text-zinc-300 leading-relaxed">
              Transparently explore Nexora-branded routing profiles and underlying foundation models with real token limits, fallback routes, and capability flags.
            </p>

            {/* Filter Pills */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  filter === "all"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                    : "home-btn-glass text-zinc-300 hover:text-white"
                }`}
              >
                All Models &amp; Profiles
              </button>
              <button
                onClick={() => setFilter("profiles")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  filter === "profiles"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                    : "home-btn-glass text-zinc-300 hover:text-white"
                }`}
              >
                Nexora Routing Profiles
              </button>
              <button
                onClick={() => setFilter("openai")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  filter === "openai"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                    : "home-btn-glass text-zinc-300 hover:text-white"
                }`}
              >
                OpenAI Models
              </button>
              <button
                onClick={() => setFilter("anthropic")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  filter === "anthropic"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                    : "home-btn-glass text-zinc-300 hover:text-white"
                }`}
              >
                Anthropic Models
              </button>
            </div>
          </div>

          {/* SECTION 1: NEXORA BRANDED PROFILES */}
          {showProfiles && (
            <section className="mb-20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Nexora Managed Routing Profiles</h2>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    Engineered task profiles that dynamically resolve queries to verified foundation models with automatic circuit breaking.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {NEXORA_MODEL_FAMILIES.map((family) => {
                  const version = NEXORA_MODEL_VERSIONS.find((v) => v.familySlug === family.slug);
                  const routes = MODEL_ROUTES.filter((r) => r.modelVersionId === version?.id);

                  return (
                    <div key={family.id} className="home-card-interactive rounded-3xl p-6 sm:p-7 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-white">{family.displayName}</h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              v{version?.versionLabel}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs sm:text-sm text-zinc-300 leading-relaxed">{family.description}</p>
                        </div>
                      </div>

                      {/* Underlying Routing Disclosure */}
                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 space-y-1.5 text-xs">
                        <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                          Configured Route Candidates
                        </span>
                        <div className="space-y-1 pt-1">
                          {routes.map((r, i) => (
                            <div key={i} className="flex items-center justify-between text-zinc-300">
                              <span className="capitalize text-zinc-400">
                                {r.routeRole === "primary" ? "Primary Route:" : "Standby Route:"}
                              </span>
                              <span className="font-mono text-indigo-300 font-semibold">{r.externalModelId}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Capabilities */}
                      <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                        {version?.capabilities.supportsStreaming && (
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                            Streaming
                          </span>
                        )}
                        {version?.capabilities.supportsVision && (
                          <span className="px-2.5 py-1 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/20">
                            Vision
                          </span>
                        )}
                        {version?.capabilities.supportsDocumentInput && (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                            Documents
                          </span>
                        )}
                        {version?.capabilities.supportsWebSearch && (
                          <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/20">
                            Web Research
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* SECTION 2: OFFICIAL EXTERNAL MODELS */}
          {filter !== "profiles" && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Official Foundation Models</h2>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    Direct integration with official provider API endpoints, full context windows, and verified output parameters.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredExternalModels.map((model) => (
                  <div key={model.id} className="home-card-interactive rounded-3xl p-6 sm:p-7 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-white">{model.displayName}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-zinc-800 text-zinc-300 border border-white/5">
                            {model.providerKey}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-zinc-400 mt-1">ID: {model.providerModelId}</p>
                        <p className="mt-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">{model.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5">
                        <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Context Window</span>
                        <span className="font-bold text-white text-sm">
                          {model.contextWindow.toLocaleString()} tokens
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5">
                        <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Max Output</span>
                        <span className="font-bold text-white text-sm">
                          {model.maxOutputTokens.toLocaleString()} tokens
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs text-zinc-400 border-t border-white/5">
                      <span className="text-[11px]">Provider: {model.providerKey.toUpperCase()}</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Verified Active
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Bottom Action */}
          <div className="mt-20 text-center">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02]"
            >
              Test Models in Live Workspace
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
