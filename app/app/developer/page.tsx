"use client";

import { useState } from "react";
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
} from "lucide-react";
import { ApiKeyRecord, ApiKeyScope } from "@/lib/developer/api-keys";

export default function DeveloperPlatformPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([
    {
      id: "key-1",
      userId: "usr_alex",
      orgId: "ws-default",
      name: "Production Backend Integration",
      keyPrefix: "nx_live_a8b2c4...",
      keyHash: "hash-1",
      scopes: ["models:read", "chat:write", "knowledge:read"],
      createdAt: "2026-10-14",
      lastUsedAt: "2026-10-21 17:30",
    },
    {
      id: "key-2",
      userId: "usr_alex",
      orgId: "ws-default",
      name: "Staging Pipeline Agent",
      keyPrefix: "nx_live_f1e9d3...",
      keyHash: "hash-2",
      scopes: ["models:read", "chat:write"],
      createdAt: "2026-10-18",
      lastUsedAt: "2026-10-20 09:15",
    },
  ]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([
    "models:read",
    "chat:write",
  ]);
  const [newlyCreatedRawSecret, setNewlyCreatedRawSecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Quick Start / Code snippets tab
  const [snippetTab, setSnippetTab] = useState<"curl" | "typescript">("curl");

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const res = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName,
          scopes: selectedScopes,
          userId: "usr_alex",
          orgId: "ws-default",
        }),
      });
      const data = await res.json();
      setKeys([...keys, data.record]);
      setNewlyCreatedRawSecret(data.rawSecret);
      setNewKeyName("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      await fetch(`/api/developer/keys?id=${keyId}&userId=usr_alex`, { method: "DELETE" });
      setKeys(
        keys.map((k) =>
          k.id === keyId ? { ...k, revokedAt: new Date().toISOString() } : k
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const copySecret = () => {
    if (newlyCreatedRawSecret) {
      navigator.clipboard.writeText(newlyCreatedRawSecret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const curlExample = `curl -X POST https://app.nexora.ai/api/v1/chat/completions \\
  -H "Authorization: Bearer nx_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "nexora-core",
    "messages": [{"role": "user", "content": "Explain microservices routing"}]
  }'`;

  const tsExample = `import { NexoraClient } from "@nexora/sdk";

const client = new NexoraClient({ apiKey: process.env.NEXORA_API_KEY });

const completion = await client.chat.completions.create({
  model: "nexora-core",
  messages: [{ role: "user", content: "Explain microservices routing" }],
});

console.log(completion.choices[0].message.content);`;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <Code2 className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Nexora Developer Platform</h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Build with OpenAI-compatible public APIs, scoped API keys, intelligent model routing, and production telemetry.
          </p>
        </div>

        <button
          onClick={() => {
            setNewlyCreatedRawSecret(null);
            setIsCreateModalOpen(true);
          }}
          className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Generate API Key</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            API Request Volume
          </span>
          <p className="text-xl font-bold text-white font-mono">1,420</p>
          <span className="text-[10px] text-zinc-500">Past 30 days</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            Tokens Processed
          </span>
          <p className="text-xl font-bold text-white font-mono">482,900</p>
          <span className="text-[10px] text-zinc-500">Across routed models</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            API Availability
          </span>
          <p className="text-xl font-bold text-emerald-400 font-mono">99.98%</p>
          <span className="text-[10px] text-zinc-500">Fast-fallback enabled</span>
        </div>
      </div>

      {/* API Keys Table */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Active API Keys
        </h2>
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-zinc-400 font-medium">
                <th className="p-4">Key Name</th>
                <th className="p-4">Prefix</th>
                <th className="p-4">Scopes</th>
                <th className="p-4">Created</th>
                <th className="p-4">Last Used</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-white/[0.01]">
                  <td className="p-4 font-semibold text-white">{k.name}</td>
                  <td className="p-4 font-mono text-zinc-400">{k.keyPrefix}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-mono"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-zinc-400">{k.createdAt}</td>
                  <td className="p-4 text-zinc-400">{k.lastUsedAt || "Never"}</td>
                  <td className="p-4 text-right">
                    {k.revokedAt ? (
                      <span className="text-rose-400 text-[11px]">Revoked</span>
                    ) : (
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                        title="Revoke Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code Examples & Quick Start */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Quick Start Integration Examples
          </h2>
          <div className="flex rounded-xl bg-slate-900 border border-white/10 p-0.5 text-xs">
            <button
              onClick={() => setSnippetTab("curl")}
              className={`px-3 py-1 rounded-lg font-medium ${
                snippetTab === "curl" ? "bg-cyan-600 text-white" : "text-zinc-400"
              }`}
            >
              cURL
            </button>
            <button
              onClick={() => setSnippetTab("typescript")}
              className={`px-3 py-1 rounded-lg font-medium ${
                snippetTab === "typescript" ? "bg-cyan-600 text-white" : "text-zinc-400"
              }`}
            >
              TypeScript
            </button>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto">
          <pre>{snippetTab === "curl" ? curlExample : tsExample}</pre>
        </div>
      </div>

      {/* Interactive API Test Console */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-cyan-500/30 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Interactive API Sandbox & Header Inspector</span>
          </h2>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            Live Endpoint Testing
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-400">Endpoint Target</label>
              <select
                id="testEndpoint"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1 font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="/api/v1/models">GET /api/v1/models (List Models)</option>
                <option value="/api/v1/chat/completions">POST /api/v1/chat/completions (OpenAI Compatible)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400">API Bearer Key</label>
              <input
                type="text"
                id="testApiKey"
                defaultValue="nx_live_demo_test_key"
                placeholder="nx_live_..."
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="button"
              onClick={async () => {
                const ep = (document.getElementById("testEndpoint") as HTMLSelectElement).value;
                const key = (document.getElementById("testApiKey") as HTMLInputElement).value;
                const outputEl = document.getElementById("testConsoleOutput");
                if (outputEl) outputEl.textContent = "Executing API request...";

                try {
                  const res = await fetch(ep, {
                    method: ep.includes("chat") ? "POST" : "GET",
                    headers: {
                      Authorization: `Bearer ${key}`,
                      "Content-Type": "application/json",
                    },
                    body: ep.includes("chat")
                      ? JSON.stringify({
                          model: "nexora-core",
                          messages: [{ role: "user", content: "Hello from Developer Console" }],
                        })
                      : undefined,
                  });

                  const headersObj: Record<string, string> = {};
                  res.headers.forEach((v, k) => {
                    if (k.startsWith("x-")) headersObj[k] = v;
                  });

                  const json = await res.json();
                  if (outputEl) {
                    outputEl.textContent = JSON.stringify(
                      {
                        http_status: `${res.status} ${res.statusText}`,
                        telemetry_headers: headersObj,
                        response_body: json,
                      },
                      null,
                      2
                    );
                  }
                } catch (err) {
                  if (outputEl) outputEl.textContent = `Error: ${(err as Error).message}`;
                }
              }}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition-all"
            >
              Dispatch Test Request
            </button>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-zinc-400">Response Inspector</span>
            <pre
              id="testConsoleOutput"
              className="h-44 p-3 rounded-xl bg-black/70 border border-white/5 text-[11px] font-mono text-zinc-300 overflow-y-auto whitespace-pre-wrap select-all"
            >
              {"// Click 'Dispatch Test Request' to inspect live headers & payloads..."}
            </pre>
          </div>
        </div>
      </div>

      {/* Generate API Key Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Generate Developer API Key</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {newlyCreatedRawSecret ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Copy and store this secret key securely. For your security, this key will never be displayed again.
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-cyan-300 break-all select-all">
                    {newlyCreatedRawSecret}
                  </span>
                  <button
                    onClick={copySecret}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 shrink-0"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 text-white text-xs font-semibold"
                >
                  I Have Saved My Secret Key
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400">Key Identifier Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Analytics Ingestion Worker"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400">Key Scopes & Entitlements</label>
                  <div className="space-y-1.5 mt-2">
                    {(["models:read", "chat:write", "knowledge:read", "workflows:run"] as ApiKeyScope[]).map(
                      (scope) => (
                        <label key={scope} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedScopes.includes(scope)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedScopes([...selectedScopes, scope]);
                              } else {
                                setSelectedScopes(selectedScopes.filter((s) => s !== scope));
                              }
                            }}
                            className="rounded border-white/10 bg-slate-950 text-cyan-600"
                          />
                          <span className="font-mono">{scope}</span>
                        </label>
                      )
                    )}
                  </div>
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
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                  >
                    Create API Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
