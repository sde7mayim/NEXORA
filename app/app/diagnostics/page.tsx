"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  ShieldAlert,
  Zap,
  Clock,
  TrendingUp,
  Cpu,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface TelemetryMetrics {
  totalRequests: number;
  averageLatencyMs: number;
  averageTtftMs: number;
  successRate: number;
  fallbackRate: number;
  totalCostUSD: number;
}

interface CircuitStatus {
  providerKey: string;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  consecutiveFailures: number;
  lastFailureTime?: number;
  lastStateChange: number;
}

interface TelemetryEvent {
  correlationId: string;
  actorHash: string;
  modelSelected: string;
  providerKey: string;
  actualModelId: string;
  latencyMs: number;
  timeToFirstTokenMs?: number;
  tokensIn: number;
  tokensOut: number;
  estimatedCostUSD: number;
  fallbackTriggered: boolean;
  circuitBreakerState: string;
  status: "success" | "error";
  errorCategory?: string;
  timestamp: string;
}

export default function DiagnosticsPage() {
  const [metrics, setMetrics] = useState<TelemetryMetrics>({
    totalRequests: 42,
    averageLatencyMs: 840,
    averageTtftMs: 290,
    successRate: 98,
    fallbackRate: 5,
    totalCostUSD: 0.184,
  });
  const [circuits, setCircuits] = useState<CircuitStatus[]>([
    { providerKey: "openai", state: "CLOSED", consecutiveFailures: 0, lastStateChange: Date.now() },
    { providerKey: "anthropic", state: "CLOSED", consecutiveFailures: 0, lastStateChange: Date.now() },
  ]);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/telemetry?limit=25");
      const data = await res.json();
      if (data.metrics) setMetrics(data.metrics);
      if (data.circuitStatuses) setCircuits(data.circuitStatuses);
      if (data.events) setEvents(data.events);
    } catch (err) {
      console.warn("Telemetry fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const handleResetCircuit = async (providerKey: string) => {
    try {
      const res = await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_circuit", providerKey }),
      });
      const data = await res.json();
      setResetMessage(data.message || `Circuit reset for ${providerKey}.`);
      fetchTelemetry();
      setTimeout(() => setResetMessage(null), 3000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            <Activity className="w-4 h-4" />
            <span>Operational Diagnostics</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Platform Observability & Telemetry</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time latency metrics, circuit breaker states, and privacy-redacted request traces.
          </p>
        </div>

        <button
          onClick={fetchTelemetry}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card border border-white/10 hover:bg-white/5 text-xs text-zinc-300 font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {resetMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Top Aggregates */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl glass-card p-4 border border-white/5 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold">Total Requests</span>
          <div className="text-xl font-bold text-white">{metrics.totalRequests}</div>
        </div>
        <div className="rounded-2xl glass-card p-4 border border-white/5 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold">Avg. TTFT</span>
          <div className="text-xl font-bold text-indigo-400">{metrics.averageTtftMs} ms</div>
        </div>
        <div className="rounded-2xl glass-card p-4 border border-white/5 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold">Avg. Latency</span>
          <div className="text-xl font-bold text-white">{metrics.averageLatencyMs} ms</div>
        </div>
        <div className="rounded-2xl glass-card p-4 border border-white/5 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold">Success Rate</span>
          <div className="text-xl font-bold text-emerald-400">{metrics.successRate}%</div>
        </div>
        <div className="rounded-2xl glass-card p-4 border border-white/5 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold">Fallback Rate</span>
          <div className="text-xl font-bold text-amber-400">{metrics.fallbackRate}%</div>
        </div>
        <div className="rounded-2xl glass-card p-4 border border-white/5 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold">Est. Spend</span>
          <div className="text-xl font-bold text-zinc-300">${metrics.totalCostUSD.toFixed(3)}</div>
        </div>
      </div>

      {/* Circuit Breaker Status Cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
          Foundation Provider Circuit Breakers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {circuits.map((c) => (
            <div key={c.providerKey} className="rounded-2xl glass-card p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-sm text-white uppercase">{c.providerKey} Adapter</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    c.state === "CLOSED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {c.state === "CLOSED" ? "Healthy (Closed)" : `Tripped (${c.state})`}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {c.state === "CLOSED"
                  ? "Operating normally. Consecutive failures: 0. Fast-fallback inactive."
                  : `Provider experiencing rate limits or errors (${c.consecutiveFailures} consecutive failures). Fast-fallback routing active.`}
              </p>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => handleResetCircuit(c.providerKey)}
                  className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Breaker</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Telemetry Event Traces */}
      <div className="rounded-2xl glass-card border border-white/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 font-semibold text-xs text-zinc-300 flex items-center justify-between">
          <span>Recent Request Telemetry Traces</span>
          <span className="text-[10px] text-zinc-500 font-mono">PII & Credentials Redacted</span>
        </div>
        <div className="divide-y divide-white/5 overflow-x-auto">
          {events.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500">
              No recent telemetry events recorded yet. Send a prompt in the chat workspace to record traces.
            </div>
          ) : (
            events.map((evt) => (
              <div
                key={evt.correlationId}
                className="p-3.5 flex items-center justify-between text-xs hover:bg-white/5 transition-colors gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      evt.status === "success" ? "bg-emerald-400" : "bg-rose-400"
                    }`}
                  />
                  <div>
                    <div className="font-mono text-zinc-300 font-semibold">{evt.correlationId}</div>
                    <div className="text-[10px] text-zinc-500">
                      Actor: <span className="font-mono">{evt.actorHash}</span> • Model:{" "}
                      <span className="text-indigo-300">{evt.modelSelected}</span> ({evt.actualModelId})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right shrink-0">
                  {evt.fallbackTriggered && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Fallback Active
                    </span>
                  )}
                  <div className="text-xs font-mono text-zinc-400">
                    <div>TTFT: {evt.timeToFirstTokenMs ? `${evt.timeToFirstTokenMs}ms` : "-"}</div>
                    <div className="text-[10px] text-zinc-500">Total: {evt.latencyMs}ms</div>
                  </div>
                  <div className="text-xs font-mono text-zinc-300">
                    ${evt.estimatedCostUSD.toFixed(4)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
