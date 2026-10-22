"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Play,
  Award,
  Sparkles,
  Clock,
  Layers,
  ChevronDown,
  Cpu,
  FileCheck,
} from "lucide-react";
import { NEXORA_MODEL_FAMILIES } from "@/lib/ai/model-registry";
import { EvaluationRunReport, TestCaseResult } from "@/lib/evaluations/types";

export default function EvaluationsPage() {
  const [selectedModel, setSelectedModel] = useState("nexora-core");
  const [running, setRunning] = useState(false);
  const [currentReport, setCurrentReport] = useState<EvaluationRunReport | null>(null);

  const handleRunEvaluation = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: selectedModel,
          useSimulation: true, // Use reproducible canonical benchmark simulation for fast test execution
        }),
      });

      const data = await res.json();
      if (data.report) {
        setCurrentReport(data.report);
      }
    } catch (err) {
      console.warn("Evaluation error:", err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-violet-400 uppercase tracking-wider">
          <Award className="w-4 h-4" />
          <span>AI Quality Evaluation</span>
        </div>
        <h1 className="text-2xl font-bold text-white mt-1">Model Benchmark & Regression Suite</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Repeatable synthetic evaluation dataset testing reasoning, coding, instruction following, and structured output.
        </p>
      </div>

      {/* Benchmark Control Bar */}
      <div className="rounded-2xl glass-card p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={running}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
          >
            {NEXORA_MODEL_FAMILIES.map((f) => (
              <option key={f.slug} value={f.slug}>
                {f.displayName} 1.0 (Profile)
              </option>
            ))}
            <option value="openai:gpt-4o-mini">OpenAI GPT-4o mini</option>
            <option value="openai:gpt-4o">OpenAI GPT-4o Flagship</option>
            <option value="anthropic:claude-3-5-sonnet">Claude 3.5 Sonnet</option>
          </select>

          <span className="text-xs text-zinc-500 font-mono">Dataset: nexora-bench-v1.0 (5 Tasks)</span>
        </div>

        <button
          onClick={handleRunEvaluation}
          disabled={running}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Play className={`w-3.5 h-3.5 ${running ? "animate-pulse" : ""}`} />
          <span>{running ? "Evaluating Model..." : "Run Quality Benchmark"}</span>
        </button>
      </div>

      {/* Benchmark Results Stage */}
      {currentReport && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl glass-panel p-5 border border-white/10 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Accuracy Score</span>
              <div className="text-3xl font-extrabold text-emerald-400">
                {currentReport.accuracyPercentage}%
              </div>
              <span className="text-[10px] text-zinc-500 block">
                {currentReport.passedTests} / {currentReport.totalTests} tests passed
              </span>
            </div>

            <div className="rounded-2xl glass-panel p-5 border border-white/10 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Average Latency</span>
              <div className="text-3xl font-extrabold text-white">
                {currentReport.averageLatencyMs} <span className="text-sm font-normal text-zinc-500">ms</span>
              </div>
              <span className="text-[10px] text-zinc-500 block">Per evaluation prompt</span>
            </div>

            <div className="rounded-2xl glass-panel p-5 border border-white/10 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Total Tokens</span>
              <div className="text-3xl font-extrabold text-indigo-400">
                {currentReport.totalTokensUsed}
              </div>
              <span className="text-[10px] text-zinc-500 block">Input + completion</span>
            </div>

            <div className="rounded-2xl glass-panel p-5 border border-white/10 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Model Evaluated</span>
              <div className="text-lg font-bold text-white truncate pt-1">
                {currentReport.modelEvaluated}
              </div>
              <span className="text-[10px] text-zinc-500 block">{currentReport.datasetVersion}</span>
            </div>
          </div>

          {/* Test Case Breakdown Table */}
          <div className="rounded-2xl glass-card border border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 font-semibold text-xs text-zinc-300">
              Benchmark Task Breakdown ({currentReport.results.length} Tasks)
            </div>
            <div className="divide-y divide-white/5">
              {currentReport.results.map((tc) => (
                <div key={tc.testCaseId} className="p-4 space-y-2 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {tc.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="font-semibold text-white text-xs">{tc.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-zinc-800 text-zinc-400">
                        {tc.taskType}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
                      <span>{tc.latencyMs} ms</span>
                      <span className="text-zinc-500">{tc.tokensIn + tc.tokensOut} tokens</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-white/5 font-mono text-[11px] text-zinc-300">
                    <pre className="whitespace-pre-wrap">{tc.outputSnippet}...</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
