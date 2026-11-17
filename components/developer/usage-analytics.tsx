"use client";

import React, { useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Zap,
} from "lucide-react";

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

interface UsageAnalyticsProps {
  summary: UsageSummary | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export function UsageAnalytics({ summary, onRefresh, isLoading }: UsageAnalyticsProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");
  const [searchFilter, setSearchFilter] = useState("");

  const events = summary?.recentEvents || [];

  const filteredEvents = events.filter((evt) => {
    // Status filter
    if (statusFilter === "success" && (evt.status < 200 || evt.status >= 400)) return false;
    if (statusFilter === "error" && evt.status >= 200 && evt.status < 400) return false;

    // Search filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        evt.endpoint.toLowerCase().includes(q) ||
        evt.requestId?.toLowerCase().includes(q) ||
        evt.provider?.toLowerCase().includes(q) ||
        evt.model?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate endpoint distribution
  const endpointCounts: Record<string, number> = {};
  events.forEach((evt) => {
    endpointCounts[evt.endpoint] = (endpointCounts[evt.endpoint] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
            <Activity className="w-4 h-4" />
            <span>Telemetry & Consumption</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">API Usage Analytics</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitor API traffic, success rate distribution, and real-time execution logs.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2 transition-all self-start sm:self-auto active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
            <span>Total Requests</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{summary?.totalRequests ?? 0}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Recorded across all active keys</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
            <span>Generation Units</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{summary?.totalUnits ?? 0}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Tokens and media synthesis units</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
            <span>Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{summary?.successRate ?? 100}%</div>
          <div className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{summary?.successfulRequests ?? 0} successful / {summary?.errorRequests ?? 0} errors</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
            <span>Unique Endpoints</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{Object.keys(endpointCounts).length}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Distinct routes invoked</div>
        </div>
      </div>

      {/* Traffic Log & Table */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        {/* Table Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by endpoint, model, or ID..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/5 border border-white/10 text-xs self-start sm:self-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === "all" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              All Events ({events.length})
            </button>
            <button
              onClick={() => setStatusFilter("success")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === "success" ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              2xx Success
            </button>
            <button
              onClick={() => setStatusFilter("error")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === "error" ? "bg-rose-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Errors
            </button>
          </div>
        </div>

        {/* Events Table */}
        <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-white/10 text-zinc-400">
              <tr>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Endpoint</th>
                <th className="p-3 font-semibold">Model / Provider</th>
                <th className="p-3 font-semibold">Units</th>
                <th className="p-3 font-semibold">Time</th>
                <th className="p-3 font-semibold">Request ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          evt.status >= 200 && evt.status < 300
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : evt.status === 429
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-white text-[11px]">{evt.endpoint}</td>
                    <td className="p-3 text-zinc-400 text-[11px]">
                      {evt.model ? (
                        <span className="text-zinc-300 font-mono">{evt.model}</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-zinc-400">{evt.usageUnits}</td>
                    <td className="p-3 text-zinc-400 text-[11px] whitespace-nowrap">
                      {new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="p-3 font-mono text-[10px] text-zinc-500 truncate max-w-[120px]">
                      {evt.requestId || evt.id}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500 text-xs">
                    No matching usage events recorded yet. Send requests from the Playground or external clients to populate telemetry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
