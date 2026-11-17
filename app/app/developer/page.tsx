"use client";

import { useState, useEffect } from "react";
import {
  Code2,
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  X,
  Clock,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Lock,
  Zap,
  Globe,
  Music,
  Image as ImageIcon,
  Video,
  FileText,
  RefreshCw,
  Search,
  Loader2,
  Play,
} from "lucide-react";
import { ApiKeyScope, ApiKeyEnvironment, SanitizedApiKey } from "@/lib/developer/api-keys";
import { createClient } from "@/lib/supabase/client";
import { SavedAccountManager } from "@/lib/auth/saved-accounts";
import { DeveloperOverview } from "@/components/developer/developer-overview";
import { ApiDocumentation } from "@/components/developer/api-documentation";
import { ApiPlayground } from "@/components/developer/api-playground";
import { UsageAnalytics } from "@/components/developer/usage-analytics";

interface ApiUsageEvent {
  id: string;
  apiKeyId: string;
  requestId: string;
  endpoint: string;
  provider?: string;
  model?: string;
  status: number;
  usageUnits: number;
  createdAt: string;
}

interface UsageSummary {
  totalRequests: number;
  totalUnits: number;
  successfulRequests: number;
  errorRequests: number;
  successRate: number;
  recentEvents: ApiUsageEvent[];
}

interface SupabaseHealthData {
  connected: boolean;
  status: string;
  statusCode: string;
  message: string;
  details?: string;
  projectRef?: string;
  isConfigured?: boolean;
  isOnline?: boolean;
  migrationReady?: boolean;
  tables?: { apiKeys: boolean; apiUsage: boolean };
  checkedAt: string;
}

const AVAILABLE_SCOPES: { id: ApiKeyScope; label: string; desc: string }[] = [
  { id: "lyrics:generate", label: "Lyrics Generation", desc: "Generate original song lyrics and musical sections" },
  { id: "images:generate", label: "Image Generation", desc: "Text-to-image synthesis (FLUX, SDXL, Imagen)" },
  { id: "music:generate", label: "Music & Audio", desc: "Playable song generation, audio themes, and melodies" },
  { id: "videos:generate", label: "Video Generation", desc: "Cinematic text-to-video generative clips" },
  { id: "models:read", label: "Model Registry", desc: "List active AI models, capabilities, and provider status" },
  { id: "chat:write", label: "Chat Completions", desc: "Direct LLM completions with fallback & router routing" },
  { id: "usage:read", label: "Usage Telemetry", desc: "Read account request usage, metrics, and logs" },
  { id: "keys:manage", label: "Key Management", desc: "Programmatic creation and revocation of API keys" },
  { id: "*", label: "Full Access (*)", desc: "All current and future Nexora API capabilities" },
];

export type DeveloperTab = "overview" | "keys" | "docs" | "playground" | "usage";

export default function DeveloperPlatformPage() {
  const [activeTab, setActiveTab] = useState<DeveloperTab>("overview");
  const [playgroundEndpoint, setPlaygroundEndpoint] = useState<string>("chat-completions");
  const [keys, setKeys] = useState<SanitizedApiKey[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [persistence, setPersistence] = useState<{
    statusCode?: string;
    isConfigured: boolean;
    storageMode: string;
    migrationReady: boolean;
    isOnline: boolean;
    isProduction: boolean;
    productionBlocked: boolean;
    message: string;
    details?: string;
    projectRef?: string;
  } | null>(null);
  const [health, setHealth] = useState<SupabaseHealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [rateLimiting, setRateLimiting] = useState<{
    strategy: string;
    scope: string;
    isDistributed: boolean;
    concurrencySafe: boolean;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Key creation state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEnvironment, setNewKeyEnvironment] = useState<ApiKeyEnvironment>("live");
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([
    "lyrics:generate",
    "images:generate",
    "music:generate",
    "models:read",
    "chat:write",
  ]);
  const [newKeyRateLimit, setNewKeyRateLimit] = useState<number>(60);
  const [expiresInDays, setExpiresInDays] = useState<string>("never");

  // One-time newly created key display
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Revoke confirmation modal state
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string>("usr_alex");

  const checkHealth = async (forceRefresh: boolean = false) => {
    try {
      setHealthLoading(true);
      const res = await fetch(`/api/developer/health${forceRefresh ? "?refresh=true" : ""}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data: SupabaseHealthData = await res.json();
        setHealth(data);
        setPersistence((prev) => {
          if (prev) {
            return {
              ...prev,
              statusCode: data.statusCode,
              isConfigured: !!data.isConfigured,
              storageMode: data.connected ? "supabase-postgres" : "in-memory-fallback",
              migrationReady: !!data.migrationReady,
              isOnline: !!data.isOnline,
              message: data.message,
              details: data.details,
              projectRef: data.projectRef || prev.projectRef,
            };
          }
          return {
            statusCode: data.statusCode,
            isConfigured: !!data.isConfigured,
            storageMode: data.connected ? "supabase-postgres" : "in-memory-fallback",
            migrationReady: !!data.migrationReady,
            isOnline: !!data.isOnline,
            isProduction: false,
            productionBlocked: false,
            message: data.message,
            details: data.details,
            projectRef: data.projectRef,
          };
        });
      } else {
        setHealth({
          connected: false,
          status: "error",
          statusCode: "DATABASE_UNAVAILABLE",
          message: `Health check returned HTTP ${res.status}`,
          checkedAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setHealth({
        connected: false,
        status: "error",
        statusCode: "DATABASE_UNAVAILABLE",
        message: err?.message || "Health check request failed",
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setHealthLoading(false);
    }
  };

  const loadData = async (forceRefresh: boolean | React.MouseEvent = false, overrideUserId?: string) => {
    try {
      const force = forceRefresh === true;
      const targetUserId = overrideUserId || resolvedUserId;
      setLoading(true);
      if (force) {
        checkHealth(true);
      }
      const res = await fetch(`/api/developer/keys?userId=${encodeURIComponent(targetUserId)}${force ? "&refresh=true" : ""}`);
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
        setUsageSummary(data.summary || null);
        if (data.persistence) {
          setPersistence(data.persistence);
        }
        setRateLimiting(data.rateLimiting || null);
        if (data.userId) {
          setResolvedUserId(data.userId);
        }
      }
    } catch (err) {
      console.warn("Failed to load developer keys:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth(false);
    const resolveUser = async () => {
      let uid = "usr_alex";
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data.user?.id) {
          uid = data.user.id;
        } else {
          const saved = SavedAccountManager.getRememberedAccount();
          if (saved?.email) {
            uid = saved.email.toLowerCase().trim();
          }
        }
      } catch {}
      setResolvedUserId(uid);
      loadData(false, uid);
    };
    resolveUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      setErrorMessage("Please enter an API key name.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      const expDays = expiresInDays === "never" ? undefined : parseInt(expiresInDays, 10);

      const res = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          environment: newKeyEnvironment,
          scopes: selectedScopes,
          rateLimit: newKeyRateLimit,
          expiresInDays: expDays,
          userId: resolvedUserId,
          orgId: "ws-default",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create API key.");
      }

      setKeys((prev) => [data.record, ...prev]);
      setCreatedSecret(data.rawSecret);
      setIsCreateModalOpen(false);
      setNewKeyName("");
      setNewKeyEnvironment("live");
      setExpiresInDays("never");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create key.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      const res = await fetch(`/api/developer/keys?id=${encodeURIComponent(keyId)}&userId=${encodeURIComponent(resolvedUserId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setKeys((prev) =>
          prev.map((k) =>
            k.id === keyId ? { ...k, revokedAt: new Date().toISOString() } : k
          )
        );
      }
    } catch (err) {
      console.error("Failed to revoke key:", err);
    } finally {
      setRevokingKeyId(null);
    }
  };

  const copySecret = () => {
    if (createdSecret) {
      navigator.clipboard.writeText(createdSecret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const toggleScope = (scope: ApiKeyScope) => {
    if (scope === "*") {
      if (selectedScopes.includes("*")) {
        setSelectedScopes(["models:read", "chat:write"]);
      } else {
        setSelectedScopes(["*"]);
      }
      return;
    }
    const filtered = selectedScopes.filter((s) => s !== "*");
    if (filtered.includes(scope)) {
      setSelectedScopes(filtered.filter((s) => s !== scope));
    } else {
      setSelectedScopes([...filtered, scope]);
    }
  };

  const activeKeysCount = keys.filter(
    (k) => !k.revokedAt && (!k.expiresAt || new Date(k.expiresAt).getTime() > Date.now())
  ).length;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
              <Code2 className="w-4 h-4" />
              <span>Nexora Developer Platform</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                API Keys & Engine Hub
              </h1>

              {/* Real-time Connection Status Badge */}
              {healthLoading ? (
                <div
                  data-testid="supabase-status-checking"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Checking...</span>
                </div>
              ) : health?.connected ? (
                <div
                  data-testid="supabase-status-connected"
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium shadow-sm shadow-emerald-950/40"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-semibold text-emerald-200">Connected</span>
                  {health.projectRef && (
                    <span className="font-mono text-[10px] text-emerald-400/80 border-l border-emerald-500/30 pl-2">
                      {health.projectRef}
                    </span>
                  )}
                </div>
              ) : (
                <div
                  data-testid="supabase-status-disconnected"
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-medium"
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  <span className="font-semibold text-rose-200">Disconnected</span>
                  <button
                    onClick={() => checkHealth(true)}
                    className="ml-1 text-[11px] underline hover:text-white font-normal"
                    title="Retry Supabase connection check"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Issue and manage Nexora native API keys for lyrics, image, music, video, and chat models.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                loadData(true);
                checkHealth(true);
              }}
              disabled={loading || healthLoading}
              title="Refresh database connectivity and status"
              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-sm font-medium flex items-center gap-2 active:scale-95 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading || healthLoading ? "animate-spin text-indigo-400" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => {
                setCreatedSecret(null);
                setErrorMessage(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create API Key</span>
            </button>
          </div>
        </div>

        {/* Persistence & System Diagnostics Banner */}
        {healthLoading && !health && !persistence ? (
          <div className="p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 bg-white/[0.02] border-white/10 text-zinc-400">
            <div className="flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Verifying Supabase database connectivity...</span>
            </div>
          </div>
        ) : (health || persistence) ? (
          <div className="space-y-3">
            <div
              className={`p-4 rounded-2xl border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                health?.connected || persistence?.statusCode === "CONNECTED"
                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                  : (health?.statusCode === "SCHEMA_NOT_READY" || persistence?.statusCode === "SCHEMA_NOT_READY")
                  ? "bg-amber-950/20 border-amber-500/30 text-amber-300"
                  : persistence?.productionBlocked || (health && !health.connected && health.statusCode !== "NOT_CONFIGURED") || persistence?.statusCode === "AUTHENTICATION_FAILURE" || persistence?.statusCode === "DATABASE_UNAVAILABLE"
                  ? "bg-rose-950/30 border-rose-500/50 text-rose-200"
                  : "bg-indigo-950/20 border-indigo-500/30 text-zinc-300"
              }`}
            >
              <div className="flex items-start md:items-center gap-2.5">
                {health?.connected || persistence?.statusCode === "CONNECTED" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 md:mt-0 text-emerald-400" />
                ) : (health?.statusCode === "SCHEMA_NOT_READY" || persistence?.statusCode === "SCHEMA_NOT_READY") ? (
                  <Terminal className="w-4 h-4 shrink-0 mt-0.5 md:mt-0 text-amber-400" />
                ) : persistence?.productionBlocked || (health && !health.connected) ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 md:mt-0 text-rose-400" />
                ) : (
                  <Layers className="w-4 h-4 shrink-0 mt-0.5 md:mt-0 text-indigo-400" />
                )}
                <div>
                  <span className="font-semibold mr-1.5">
                    {health?.connected || persistence?.statusCode === "CONNECTED"
                      ? "Supabase Connected:"
                      : persistence?.productionBlocked
                      ? "Production Persistence Blocked:"
                      : (health?.statusCode === "SCHEMA_NOT_READY" || persistence?.statusCode === "SCHEMA_NOT_READY")
                      ? "PostgreSQL Connected (Schema Pending):"
                      : (health?.statusCode === "AUTHENTICATION_FAILURE" || persistence?.statusCode === "AUTHENTICATION_FAILURE")
                      ? "Supabase Auth Failure:"
                      : (health?.statusCode === "DATABASE_UNAVAILABLE" || persistence?.statusCode === "DATABASE_UNAVAILABLE")
                      ? "Supabase Unreachable:"
                      : "Development Storage (In-Memory):"}
                  </span>
                  <span>{health?.message || persistence?.message}</span>
                  {health && !health.connected && health.details && (
                    <span className="block text-[11px] text-rose-300/80 mt-0.5 font-mono">
                      {health.details}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {health?.connected || persistence?.statusCode === "CONNECTED" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    Connected
                  </span>
                ) : healthLoading ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                    Checking...
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-200 border border-rose-500/40">
                      Disconnected
                    </span>
                    <button
                      onClick={() => checkHealth(true)}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 transition-colors"
                      title="Retry connection"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {rateLimiting && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Scope: {rateLimiting.scope}
                  </span>
                )}
              </div>
            </div>

            {/* Diagnostic Details if Schema is Not Ready */}
            {(health?.statusCode === "SCHEMA_NOT_READY" || persistence?.statusCode === "SCHEMA_NOT_READY") && (
              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-1.5 text-zinc-300">
                <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Execute SQL Migration in Supabase Dashboard</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Supabase database is connected, but the API key tables do not exist yet. Run the platform migration script in your Supabase SQL Editor:
                </p>
                <div className="p-2 rounded-lg bg-black/40 font-mono text-[11px] text-amber-200 space-y-0.5">
                  <div>Migration File: <span className="text-white">supabase/migrations/20261115000001_api_keys_and_usage_platform.sql</span></div>
                  <div className="text-zinc-500 pt-0.5">Target: Creates public.api_keys and public.api_usage with RLS policies and cascade triggers.</div>
                </div>
              </div>
            )}

            {/* Diagnostic Details if Unconfigured */}
            {((health?.statusCode === "NOT_CONFIGURED" && !health.isConfigured) || (persistence?.statusCode === "NOT_CONFIGURED" && !persistence.isConfigured)) && (
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs space-y-1.5 text-zinc-400">
                <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Optional: Activate Persistent PostgreSQL Storage</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  To persist API keys across server restarts, add your Supabase credentials to <code className="text-zinc-200 bg-white/5 px-1 py-0.5 rounded">.env.local</code>:
                </p>
                <div className="p-2 rounded-lg bg-black/40 font-mono text-[11px] text-zinc-300 space-y-0.5">
                  <div>NEXT_PUBLIC_SUPABASE_URL=https://{health?.projectRef || persistence?.projectRef || "dayswxpdkzzrjpjncqtt"}.supabase.co</div>
                  <div>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=&lt;publishable-key&gt;</div>
                  <div>SUPABASE_SECRET_KEY=&lt;secret-key&gt;</div>
                  <div className="text-zinc-500 pt-1"># Migration file: supabase/migrations/20261115000001_api_keys_and_usage_platform.sql</div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
              <span>Active Keys</span>
              <Key className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">{activeKeysCount}</div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {keys.length} total ({keys.filter((k) => k.environment === "live").length} live / {keys.filter((k) => k.environment === "test").length} test)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
              <span>Total API Requests</span>
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {usageSummary?.totalRequests || 0}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {usageSummary?.totalUnits || 0} units generated
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
              <span>API Success Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {usageSummary?.successRate ?? 100}%
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Operational
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
              <span>Storage Status</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-base font-bold text-white truncate flex items-center gap-1.5">
              {healthLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400 shrink-0" />
                  <span className="text-sm text-zinc-400 font-medium">Checking...</span>
                </>
              ) : health?.connected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span>PostgreSQL</span>
                </>
              ) : persistence?.isConfigured ? (
                "PostgreSQL"
              ) : (
                "In-Memory"
              )}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {healthLoading
                ? "Checking connectivity..."
                : health?.connected
                ? "Supabase Connected"
                : persistence?.isConfigured
                ? "Supabase Configured"
                : "Ephemeral Session"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
              <span>Rate Limit Scope</span>
              <Clock className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-base font-bold text-white">
              {rateLimiting?.scope === "process-local" ? "Process-Local" : "Distributed"}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Sliding Window (60s)
            </div>
          </div>
        </div>

        {/* Newly Created Key Display Banner */}
        {createdSecret && (
          <div className="p-5 rounded-2xl bg-indigo-950/40 border-2 border-indigo-500/50 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Your New Nexora API Key Has Been Created</span>
                </div>
                <p className="text-xs text-amber-200/90 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  Make sure to copy your API key now. For security, you will never be able to see it again.
                </p>
              </div>
              <button
                onClick={() => setCreatedSecret(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/60 border border-indigo-500/30 font-mono text-sm text-indigo-200">
              <span className="flex-1 truncate select-all">{createdSecret}</span>
              <button
                onClick={copySecret}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedKey ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Key</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 border-b border-white/10 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("keys")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "keys"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
          >
            <Key className="w-4 h-4" />
            <span>API Keys</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
              {keys.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("docs")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "docs"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>API Documentation</span>
          </button>

          <button
            onClick={() => setActiveTab("playground")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "playground"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
          >
            <Play className="w-4 h-4 fill-current text-indigo-400" />
            <span>API Playground</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Sandbox
            </span>
          </button>

          <button
            onClick={() => setActiveTab("usage")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "usage"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Usage Analytics</span>
          </button>
        </div>

        {/* Tab 0: Overview */}
        {activeTab === "overview" && (
          <DeveloperOverview
            onNavigateTab={setActiveTab}
            activeKeys={keys}
            usageSummary={usageSummary}
            persistenceStatus={persistence}
          />
        )}

        {/* Tab 1: Keys List */}
        {activeTab === "keys" && (
          <div className="space-y-4">
            {loading ? (
              <div className="p-8 text-center text-zinc-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                <p className="text-sm">Loading API keys...</p>
              </div>
            ) : keys.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <Key className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-base font-semibold text-white">No API Keys Created Yet</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Create your first Nexora API key to authenticate programmatically against our creative engines and chat APIs.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create API Key</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {keys.map((k) => {
                  const isRevoked = Boolean(k.revokedAt);
                  const isExpired = Boolean(
                    k.expiresAt && new Date(k.expiresAt).getTime() < Date.now()
                  );
                  const isActive = !isRevoked && !isExpired;

                  return (
                    <div
                      key={k.id}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white text-sm">
                            {k.name}
                          </span>

                          {/* Environment Pill */}
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                              k.environment === "live"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {k.environment || "live"}
                          </span>

                          {/* Status Pill */}
                          {isActive && (
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/25 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          )}
                          {isRevoked && (
                            <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-md border border-rose-500/25">
                              Revoked
                            </span>
                          )}
                          {isExpired && !isRevoked && (
                            <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-500/15 px-2 py-0.5 rounded-md border border-zinc-500/25">
                              Expired
                            </span>
                          )}
                        </div>

                        {/* Prefix & Metadata */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 font-mono">
                          <span className="text-zinc-200 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                            {k.keyPrefix}
                          </span>
                          <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                          {k.lastUsedAt && (
                            <span>
                              Last used: {new Date(k.lastUsedAt).toLocaleDateString()}{" "}
                              {new Date(k.lastUsedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                          {k.expiresAt && (
                            <span>
                              Expires: {new Date(k.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                          <span className="text-zinc-500">
                            Limit: {k.rateLimit || 60} req/min
                          </span>
                        </div>

                        {/* Scopes */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {k.scopes?.map((s) => (
                            <span
                              key={s}
                              className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 font-mono"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        {isActive && (
                          <button
                            onClick={() => setRevokingKeyId(k.id)}
                            className="px-3 py-1.5 rounded-xl border border-rose-500/30 hover:border-rose-500/60 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Revoke Key</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Documentation */}
        {activeTab === "docs" && (
          <ApiDocumentation
            onSelectPlaygroundEndpoint={(ep) => {
              setPlaygroundEndpoint(ep);
              setActiveTab("playground");
            }}
          />
        )}

        {/* Tab 3: API Playground */}
        {activeTab === "playground" && (
          <ApiPlayground
            initialEndpointId={playgroundEndpoint}
            activeKeys={keys}
            userId={resolvedUserId}
          />
        )}

        {/* Tab 4: Usage Analytics */}
        {activeTab === "usage" && (
          <UsageAnalytics
            summary={usageSummary}
            onRefresh={() => loadData(true)}
            isLoading={loading}
          />
        )}

        {/* Modal: Create API Key */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white">Create New API Key</h3>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleCreateKey} className="space-y-4">
                {/* Key Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Key Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Production Mobile App"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Environment Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Environment</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewKeyEnvironment("live")}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                        newKeyEnvironment === "live"
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold"
                          : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Live (nx_live_...)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewKeyEnvironment("test")}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                        newKeyEnvironment === "test"
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold"
                          : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Test (nx_test_...)</span>
                    </button>
                  </div>
                </div>

                {/* Scopes Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300">
                    Permissions & Scopes ({selectedScopes.length} selected)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {AVAILABLE_SCOPES.map((scope) => {
                      const isChecked =
                        selectedScopes.includes(scope.id) || selectedScopes.includes("*");
                      return (
                        <div
                          key={scope.id}
                          onClick={() => toggleScope(scope.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer text-left transition-all ${
                            isChecked
                              ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-200"
                              : "bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{scope.label}</span>
                            <input
                              type="checkbox"
                              readOnly
                              checked={isChecked}
                              className="rounded border-zinc-600 text-indigo-600 pointer-events-none"
                            />
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                            {scope.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Expiration & Rate Limit */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Expiration</label>
                    <select
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="never" className="bg-slate-900">Never Expire</option>
                      <option value="30" className="bg-slate-900">30 Days</option>
                      <option value="60" className="bg-slate-900">60 Days</option>
                      <option value="90" className="bg-slate-900">90 Days</option>
                      <option value="365" className="bg-slate-900">1 Year</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Rate Limit (req/min)</label>
                    <input
                      type="number"
                      min={5}
                      max={1000}
                      value={newKeyRateLimit}
                      onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value, 10) || 60)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-3.5 h-3.5" />
                        <span>Generate Key</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Revoke Confirmation Dialog */}
        {revokingKeyId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-rose-500/30 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Trash2 className="w-5 h-5" />
                <span>Revoke API Key?</span>
              </div>
              <p className="text-xs text-zinc-300">
                Are you sure you want to revoke this API key? Applications and integrations currently using this key will immediately receive HTTP 401 Unauthorized errors. This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setRevokingKeyId(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRevokeKey(revokingKeyId)}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                >
                  Revoke Immediately
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
