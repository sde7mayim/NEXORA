import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import {
  EXTERNAL_MODELS,
  NEXORA_MODEL_FAMILIES,
  NEXORA_MODEL_VERSIONS,
  MODEL_ROUTES,
} from "@/lib/ai/model-registry";
import { Sparkles, Cpu, Check, ShieldCheck, Zap, Layers } from "lucide-react";

export default function ModelsDirectoryPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Supported Model Directory
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-400">
            Transparently explore Nexora-branded routing profiles and official foundation models.
          </p>
        </div>

        {/* SECTION 1: NEXORA BRANDED PROFILES */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Nexora Branded Routing Profiles</h2>
              <p className="text-xs text-zinc-400">
                Managed profiles engineered for specific speed, reasoning, and modality requirements.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {NEXORA_MODEL_FAMILIES.map((family) => {
              const version = NEXORA_MODEL_VERSIONS.find((v) => v.familySlug === family.slug);
              const routes = MODEL_ROUTES.filter((r) => r.modelVersionId === version?.id);

              return (
                <div key={family.id} className="rounded-2xl glass-card p-6 border border-white/10 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{family.displayName}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          v{version?.versionLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">{family.description}</p>
                    </div>
                  </div>

                  {/* Underlying Routing Disclosure */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1 text-xs">
                    <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                      Configured Route Candidates
                    </span>
                    <div className="space-y-1 pt-1">
                      {routes.map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-zinc-300">
                          <span className="capitalize text-zinc-400">
                            {r.routeRole === "primary" ? "Primary Route:" : "Fallback Route:"}
                          </span>
                          <span className="font-mono text-indigo-300">{r.externalModelId}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div className="pt-2 flex flex-wrap gap-2 text-[10px]">
                    {version?.capabilities.supportsStreaming && (
                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">Streaming</span>
                    )}
                    {version?.capabilities.supportsVision && (
                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">Vision</span>
                    )}
                    {version?.capabilities.supportsDocumentInput && (
                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">Documents</span>
                    )}
                    {version?.capabilities.supportsWebSearch && (
                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">Web Search</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 2: OFFICIAL EXTERNAL MODELS */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Official Foundation Models</h2>
              <p className="text-xs text-zinc-400">
                Direct integration with verified provider API endpoints and context bounds.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {EXTERNAL_MODELS.map((model) => (
              <div key={model.id} className="rounded-2xl glass-card p-6 border border-white/10 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{model.displayName}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-zinc-800 text-zinc-300">
                        {model.providerKey}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-zinc-500 mt-0.5">ID: {model.providerModelId}</p>
                    <p className="mt-2 text-xs text-zinc-400">{model.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950/40 border border-white/5">
                    <span className="text-zinc-500 block text-[10px]">Context Window</span>
                    <span className="font-semibold text-zinc-200">
                      {model.contextWindow.toLocaleString()} tokens
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/40 border border-white/5">
                    <span className="text-zinc-500 block text-[10px]">Max Output</span>
                    <span className="font-semibold text-zinc-200">
                      {model.maxOutputTokens.toLocaleString()} tokens
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 border-t border-white/5">
                  <span className="text-[10px]">Verified: {new Date(model.verifiedAt).toLocaleDateString()}</span>
                  <span className="text-emerald-400 font-medium">Verified Active</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
