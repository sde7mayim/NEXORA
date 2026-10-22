"use client";

import { useState } from "react";
import { NEXORA_MODEL_FAMILIES, EXTERNAL_MODELS, MODEL_ROUTES } from "@/lib/ai/model-registry";
import { Sparkles, Cpu, Check, ArrowRight, ShieldCheck, Zap, Layers, Info } from "lucide-react";
import { ModelDetailsModal } from "@/components/model-details-modal";
import Link from "next/link";

export default function WorkspaceModelsPage() {
  const [inspectingModelId, setInspectingModelId] = useState<string | null>(null);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Model Management & Routing Registry</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Review active foundation models, Nexora routing profiles, and verified capabilities.
          </p>
        </div>
      </div>

      {/* Nexora Branded Profiles */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
          Nexora Branded Intelligence Profiles (v1.0.0)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {NEXORA_MODEL_FAMILIES.map((family) => {
            const routes = MODEL_ROUTES.filter((r) => r.modelVersionId.startsWith(family.slug));
            return (
              <div key={family.id} className="rounded-2xl glass-card p-5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{family.displayName} 1.0</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                      Immutable
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium">Active</span>
                </div>
                <p className="text-xs text-zinc-400">{family.description}</p>
                <div className="pt-2 border-t border-white/5 space-y-1 text-xs">
                  <div className="text-[10px] text-zinc-500 font-semibold uppercase">Configured Routes</div>
                  {routes.map((r, idx) => (
                    <div key={idx} className="flex justify-between text-zinc-300 text-xs">
                      <span className="capitalize text-zinc-400">{r.routeRole}:</span>
                      <span className="font-mono text-indigo-300">{r.externalModelId}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* External Models */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-violet-400">
          Underlying Foundation Models
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EXTERNAL_MODELS.map((model) => (
            <div key={model.id} className="rounded-2xl glass-card p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{model.displayName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    {model.providerKey}
                  </span>
                  <button
                    onClick={() => setInspectingModelId(model.id)}
                    className="p-1 text-zinc-400 hover:text-indigo-400 rounded hover:bg-white/5 transition-colors"
                    title="Inspect model details"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-[11px] font-mono text-zinc-500">API ID: {model.providerModelId}</div>
              <p className="text-xs text-zinc-400">{model.description}</p>
              <div className="flex gap-4 pt-2 border-t border-white/5 text-xs text-zinc-400">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Context</span>
                  <span className="font-semibold text-zinc-200">{model.contextWindow.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Max Output</span>
                  <span className="font-semibold text-zinc-200">{model.maxOutputTokens.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ModelDetailsModal
        modelId={inspectingModelId}
        onClose={() => setInspectingModelId(null)}
      />
    </div>
  );
}
