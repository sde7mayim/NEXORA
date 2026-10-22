"use client";

import { BarChart2, TrendingUp, Cpu, Zap, CreditCard } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function WorkspaceAnalyticsPage() {
  const usageStats = {
    dailyMessagesUsed: 14,
    dailyLimit: 100,
    monthlyMessagesUsed: 342,
    monthlyLimit: 2000,
    monthlyResearchUsed: 18,
    monthlyResearchLimit: 100,
    totalInputTokens: 482000,
    totalOutputTokens: 94000,
    estimatedCostCents: 412, // $4.12
  };

  const recentEvents = [
    {
      id: "evt-1",
      model: "Nexora Core 1.0 (GPT-4o mini)",
      tokensIn: 1240,
      tokensOut: 480,
      costCents: 0.8,
      timestamp: "10 mins ago",
    },
    {
      id: "evt-2",
      model: "Nexora Reason 1.0 (Claude 3.5 Sonnet)",
      tokensIn: 3410,
      tokensOut: 1120,
      costCents: 4.2,
      timestamp: "1 hour ago",
    },
    {
      id: "evt-3",
      model: "Nexora Swift 1.0 (Claude 3.5 Haiku)",
      tokensIn: 820,
      tokensOut: 240,
      costCents: 0.4,
      timestamp: "3 hours ago",
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Usage & Token Accounting</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Monitor your real-time quota consumption, token volumes, and estimated foundation model costs.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="rounded-2xl glass-card p-5 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Daily Messages</span>
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {usageStats.dailyMessagesUsed} <span className="text-xs text-zinc-500 font-normal">/ {usageStats.dailyLimit}</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-1.5 rounded-full"
              style={{ width: `${(usageStats.dailyMessagesUsed / usageStats.dailyLimit) * 100}%` }}
            />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl glass-card p-5 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Monthly Messages</span>
            <TrendingUp className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {usageStats.monthlyMessagesUsed} <span className="text-xs text-zinc-500 font-normal">/ {usageStats.monthlyLimit}</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-violet-500 h-1.5 rounded-full"
              style={{ width: `${(usageStats.monthlyMessagesUsed / usageStats.monthlyLimit) * 100}%` }}
            />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl glass-card p-5 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Web Research</span>
            <BarChart2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {usageStats.monthlyResearchUsed} <span className="text-xs text-zinc-500 font-normal">/ {usageStats.monthlyResearchLimit}</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${(usageStats.monthlyResearchUsed / usageStats.monthlyResearchLimit) * 100}%` }}
            />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl glass-card p-5 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Est. Provider Spend</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatPrice(usageStats.estimatedCostCents, "USD")}
          </div>
          <span className="text-[10px] text-zinc-500 block">
            ~{formatPrice(usageStats.estimatedCostCents * 84, "INR")}
          </span>
        </div>
      </div>

      {/* Recent Usage Ledger */}
      <div className="rounded-2xl glass-card border border-white/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 font-semibold text-xs text-zinc-300">
          Recent Usage Events
        </div>
        <div className="divide-y divide-white/5">
          {recentEvents.map((evt) => (
            <div key={evt.id} className="p-4 flex items-center justify-between text-xs hover:bg-white/5 transition-colors">
              <div>
                <div className="font-semibold text-white">{evt.model}</div>
                <div className="text-[10px] text-zinc-500">
                  {evt.tokensIn.toLocaleString()} in • {evt.tokensOut.toLocaleString()} out • {evt.timestamp}
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-zinc-300">${(evt.costCents / 100).toFixed(4)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
