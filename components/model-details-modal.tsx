"use client";

import { X, Sparkles, Cpu, Layers, ShieldCheck, Check, AlertCircle } from "lucide-react";
import { ModelRegistry, MODEL_ROUTES } from "@/lib/ai/model-registry";

interface ModelDetailsModalProps {
  modelId: string | null;
  onClose: () => void;
}

export function ModelDetailsModal({ modelId, onClose }: ModelDetailsModalProps) {
  if (!modelId) return null;

  const externalModel = ModelRegistry.getExternalModel(modelId);
  const versionId = modelId.includes("@") ? modelId : `${modelId}@1.0.0`;
  const brandedVersion = ModelRegistry.getModelVersion(versionId);
  const routes = brandedVersion ? ModelRegistry.getRoutesForVersion(brandedVersion.id) : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="rounded-2xl glass-panel max-w-lg w-full border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              {brandedVersion ? <Sparkles className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {brandedVersion ? `${brandedVersion.familySlug.replace("nexora-", "Nexora ")}` : externalModel?.displayName}
              </h3>
              <span className="text-[10px] font-mono text-zinc-400">
                {brandedVersion ? `Version ${brandedVersion.versionLabel} (Immutable)` : externalModel?.providerModelId}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-zinc-300 max-h-[75vh] overflow-y-auto">
          {/* Branded Profile Routing Details */}
          {brandedVersion && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                  Configured Routing Strategy
                </span>
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  This Nexora routing profile is an immutable, versioned abstraction that dynamically dispatches to verified official third-party foundation models.
                </p>
                <div className="space-y-1.5 pt-1">
                  {routes.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-zinc-800 text-[10px] font-mono flex items-center justify-center text-zinc-300">
                          {r.priority}
                        </span>
                        <span className="capitalize text-zinc-300 font-medium">{r.routeRole} Route</span>
                      </div>
                      <span className="font-mono text-indigo-300 text-[11px]">{r.externalModelId}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Capabilities Grid */}
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block mb-2">
                  Verified Model Capabilities
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(brandedVersion.capabilities).map(([key, val]) => (
                    <div
                      key={key}
                      className={`p-2 rounded-lg border flex items-center justify-between ${
                        val
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                          : "bg-slate-900/50 border-white/5 text-zinc-500"
                      }`}
                    >
                      <span className="text-[11px] capitalize">
                        {key.replace("supports", "").replace(/([A-Z])/g, " $1")}
                      </span>
                      {val ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* External Model Details */}
          {externalModel && (
            <div className="space-y-3">
              <p className="text-zinc-400 leading-relaxed text-xs">{externalModel.description}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-zinc-500 block text-[10px]">Context Window</span>
                  <span className="font-semibold text-white">
                    {externalModel.contextWindow.toLocaleString()} tokens
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-zinc-500 block text-[10px]">Max Output Tokens</span>
                  <span className="font-semibold text-white">
                    {externalModel.maxOutputTokens.toLocaleString()} tokens
                  </span>
                </div>
              </div>

              {/* Verification Audit */}
              <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  Verified Active
                </span>
                <span>Audited: {new Date(externalModel.verifiedAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-white/5 bg-slate-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
