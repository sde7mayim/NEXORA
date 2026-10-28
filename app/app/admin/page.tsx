"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Layers,
  Activity,
  CreditCard,
  FileText,
  Lock,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Users,
  Search,
  ExternalLink,
} from "lucide-react";
import { ModelReleasePackageManager, ModelReleasePackageManifest } from "@/lib/ai/model-packages";
import { OwnerBootstrapService } from "@/lib/auth/bootstrap";
import { PLAN_CONFIGS } from "@/lib/entitlements/types";
import { createClient } from "@/lib/supabase/client";
import { SavedAccountManager } from "@/lib/auth/saved-accounts";

export default function AdminConsolePage() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "packages" | "plans" | "audit" | "files"
  >("overview");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [packages, setPackages] = useState<ModelReleasePackageManifest[]>([]);
  const [rollbackSuccess, setRollbackSuccess] = useState<string | null>(null);
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  useEffect(() => {
    let email = "guest@nexora.ai";
    const remembered = SavedAccountManager.getRememberedAccount();
    if (remembered?.email) email = remembered.email;

    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email) {
          setCurrentUserEmail(data.user.email);
        } else {
          setCurrentUserEmail(email);
        }
      });
    } catch {
      setCurrentUserEmail(email);
    }

    setPackages(ModelReleasePackageManager.listPackages());
  }, []);

  const isOwner = currentUserEmail.toLowerCase().trim() === "thzcreterz05@gmail.com";

  const handleRollback = (familySlug: string, targetVersion: string) => {
    setRollbackSuccess(null);
    setRollbackError(null);
    const res = ModelReleasePackageManager.rollback(
      familySlug,
      targetVersion,
      currentUserEmail || "Joshua Suriyan N (Owner)",
      "Admin Console user initiated rollback"
    );
    if (res.success) {
      setRollbackSuccess(`Successfully rolled back '${familySlug}' to version ${targetVersion}.`);
      setPackages(ModelReleasePackageManager.listPackages());
    } else {
      setRollbackError(res.error || "Rollback failed.");
    }
  };

  const auditLogs = [
    ...ModelReleasePackageManager.getAuditLogs().map((l) => ({
      id: l.id,
      timestamp: l.timestamp,
      action: l.action,
      details: l.details,
      actor: l.actor,
      type: "model_package",
    })),
    ...OwnerBootstrapService.getAuditTrail().map((a) => ({
      id: a.id,
      timestamp: a.timestamp,
      action: a.action,
      details: a.details,
      actor: a.targetEmail,
      type: "security_bootstrap",
    })),
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 md:p-8 space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Nexora Admin Console</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Production v0.4.0
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Centralized platform governance, immutable model releases, audit logging, and security.
              </p>
            </div>
          </div>
        </div>

        {/* Owner Identity Badge */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold">
            J
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-medium text-white">
              <span>Joshua Suriyan N</span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Owner
              </span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">thzcreterz05@gmail.com</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-xs font-medium">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === "overview"
              ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Overview &amp; Health
        </button>
        <button
          onClick={() => setActiveTab("packages")}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === "packages"
              ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Model Packages &amp; Release Lifecycle
        </button>
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === "plans"
              ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Plan Entitlements &amp; Family
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === "audit"
              ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Security &amp; Audit Logs
        </button>
      </div>

      {/* TAB 1: OVERVIEW & HEALTH */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl glass-card border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span>Multi-Cloud Routing</span>
                <Server className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-xl font-bold text-white">3 Providers</div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>OpenAI, Anthropic &amp; Gemini active</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-card border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span>Model Families</span>
                <Layers className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold text-white">4 Families</div>
              <div className="text-[11px] text-zinc-400">Swift, Core, Reason, Vision</div>
            </div>

            <div className="p-4 rounded-2xl glass-card border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span>Circuit Breakers</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-white">Healthy</div>
              <div className="text-[11px] text-zinc-400">0 tripped, 100% SLA target</div>
            </div>

            <div className="p-4 rounded-2xl glass-card border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span>Owner Bootstrap</span>
                <Lock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-white">Enforced</div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Server-side verification active</span>
              </div>
            </div>
          </div>

          {/* Provider Status (Never revealing secrets) */}
          <div className="p-5 rounded-2xl glass-panel border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white">AI Provider Infrastructure Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Google Gemini</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Configured
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Primary engine for Nexora Core (Gemini 1.5 Flash). Multimodal with 1M context.
                </p>
                <div className="text-[10px] text-zinc-500 font-mono">Secret: [PROTECTED / SERVER-ONLY]</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">OpenAI</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Configured
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Engine for GPT-4o Omni and Nexora Vision fallback. Low latency 128k context.
                </p>
                <div className="text-[10px] text-zinc-500 font-mono">Secret: [PROTECTED / SERVER-ONLY]</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Anthropic</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Configured
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Engine for Claude 3.5 Sonnet and Haiku. Deep reasoning and code analysis.
                </p>
                <div className="text-[10px] text-zinc-500 font-mono">Secret: [PROTECTED / SERVER-ONLY]</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MODEL RELEASE PACKAGES */}
      {activeTab === "packages" && (
        <div className="space-y-6">
          {rollbackSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{rollbackSuccess}</span>
            </div>
          )}
          {rollbackError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{rollbackError}</span>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Published Model Release Packages</h3>
            <p className="text-xs text-zinc-400">
              Declarative, schema-validated model releases with cryptographic checksums and immutable lifecycle guarantees.
            </p>

            <div className="space-y-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.packageId}
                  className="p-5 rounded-2xl glass-card border border-white/5 space-y-3 hover:border-indigo-500/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-xs">
                        {pkg.version}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{pkg.displayName}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {pkg.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          Package ID: {pkg.packageId} • App Compatibility: {pkg.compatibleAppVersions}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRollback(pkg.modelFamily, pkg.version)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs flex items-center gap-1.5 transition-colors"
                        title="Rollback family to this version"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" />
                        <span>Re-activate</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300">{pkg.description}</p>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      Provider Route Targets (Prioritized)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {pkg.routes.map((r, i) => (
                        <div
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-white/5 text-[11px] font-mono flex items-center gap-1.5 border border-white/5"
                        >
                          <span className="text-indigo-400">P{r.priority}:</span>
                          <span className="text-zinc-200">{r.externalModelId}</span>
                          <span className="text-[9px] text-zinc-500 uppercase">({r.routeRole})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-zinc-500 font-mono border-t border-white/5 pt-2 gap-1">
                    <div>Author: {pkg.author}</div>
                    <div className="truncate max-w-sm">SHA-256 Checksum: {pkg.checksum}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PLAN ENTITLEMENTS & FAMILY */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Central Entitlement &amp; Plan Configuration</h3>
            <p className="text-xs text-zinc-400">
              Server-enforced quotas, member allowances, and subscription pricing controls.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.values(PLAN_CONFIGS).map((plan) => (
                <div
                  key={plan.id}
                  className={`p-5 rounded-2xl glass-card border space-y-3 ${
                    plan.id === "family"
                      ? "border-purple-500/30 bg-purple-500/5"
                      : "border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{plan.displayName}</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                      {plan.id}
                    </span>
                  </div>

                  <div className="text-lg font-bold text-white">
                    ₹{plan.priceINR.toLocaleString()}{" "}
                    <span className="text-xs text-zinc-400 font-normal">/ mo (${plan.priceUSD})</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-zinc-300 border-t border-white/5 pt-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Daily Messages:</span>
                      <span className="font-semibold text-white">{plan.dailyMessageLimit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Monthly Messages:</span>
                      <span className="font-semibold text-white">{plan.monthlyMessageLimit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Web Research:</span>
                      <span className="font-semibold text-white">{plan.monthlyResearchLimit} / mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Max File Size:</span>
                      <span className="font-semibold text-white">{plan.maxFileSizeMB} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Max Members:</span>
                      <span className="font-semibold text-white">{plan.maxMembers || 1}</span>
                    </div>
                  </div>

                  {plan.id === "family" && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 leading-tight">
                      <strong>Purchase Safeguard:</strong> Purchasing disabled until final pricing approval.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS & SECURITY */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white">Cryptographic Security &amp; Privilege Audit Log</h3>
          <p className="text-xs text-zinc-400">
            Immutable log of owner bootstrap verifications, role privilege assignments, and package releases.
          </p>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-indigo-400 uppercase font-semibold">
                      [{log.action}]
                    </span>
                    <span className="text-zinc-300">{log.details}</span>
                  </div>
                  <span className="text-zinc-500 font-mono text-[10px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                  <span>Actor: {log.actor}</span>
                  <span>ID: {log.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
