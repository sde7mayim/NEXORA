"use client";

import { useState } from "react";
import {
  Cpu,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Layers,
  FileCheck,
  RefreshCw,
  Sparkles,
  Database,
  UserCheck,
  Plus,
  X,
} from "lucide-react";
import { WorkflowDefinition, WorkflowRunState, WorkflowStepConfig } from "@/lib/workflows/types";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([
    {
      id: "wf-triage-agent",
      name: "Security Inquiry Triage & Knowledge Resolver",
      description: "Retrieves enterprise security RFCs, synthesizes a model response, and requests admin signoff before release.",
      version: 1,
      status: "published",
      userId: "usr_alex",
      orgId: "ws-default",
      toolAllowlist: ["knowledge_retrieval", "model_call"],
      steps: [
        { id: "step-1", name: "Receive Inquiry", type: "user_input", nextStepId: "step-2" },
        { id: "step-2", name: "Query Knowledge Hub", type: "knowledge_retrieval", collectionIds: ["col-default-1"], nextStepId: "step-3" },
        { id: "step-3", name: "Generate Resolution", type: "model_call", modelId: "nexora-core", nextStepId: "step-4" },
        { id: "step-4", name: "Format Response Payload", type: "data_transform", nextStepId: "step-5" },
        { id: "step-5", name: "Admin Human Signoff", type: "human_approval", approvalRoleRequired: "admin", nextStepId: "step-6" },
        { id: "step-6", name: "Deliver Final Output", type: "final_output" },
      ],
      createdAt: "2026-10-18",
      updatedAt: "2026-10-18",
    },
  ]);

  const [selectedWf, setSelectedWf] = useState<WorkflowDefinition>(workflows[0]);
  const [runInput, setRunInput] = useState("What are the mTLS requirements for external microservices?");
  const [activeRun, setActiveRun] = useState<WorkflowRunState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isCreateWfModalOpen, setIsCreateWfModalOpen] = useState(false);
  const [newWfName, setNewWfName] = useState("");
  const [newWfDesc, setNewWfDesc] = useState("");
  const [newWfTemplate, setNewWfTemplate] = useState<"qa" | "approval" | "transform">("qa");
  const [isSubmittingWf, setIsSubmittingWf] = useState(false);

  const handleRunWorkflow = async () => {
    setIsRunning(true);
    try {
      const res = await fetch(`/api/workflows/${selectedWf.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { query: runInput },
          userId: "usr_alex",
          orgId: "ws-default",
          userPlan: "enterprise",
        }),
      });
      const data = await res.json();
      setActiveRun(data.run);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleApproveStep = async (stepId: string) => {
    if (!activeRun) return;
    setIsApproving(true);
    try {
      const res = await fetch(`/api/workflows/${activeRun.runId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, approverRole: "admin" }),
      });
      const data = await res.json();
      setActiveRun(data.run);
    } catch (err) {
      console.error(err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWfName.trim()) return;

    setIsSubmittingWf(true);
    try {
      let steps: WorkflowStepConfig[] = [];
      if (newWfTemplate === "qa") {
        steps = [
          { id: "step-1", name: "Inquiry Input", type: "user_input", nextStepId: "step-2" },
          { id: "step-2", name: "Retrieve Knowledge Hub Context", type: "knowledge_retrieval", collectionIds: ["col-default-1"], nextStepId: "step-3" },
          { id: "step-3", name: "Synthesize Answer", type: "model_call", modelId: "nexora-core", nextStepId: "step-4" },
          { id: "step-4", name: "Deliver Response", type: "final_output" },
        ];
      } else if (newWfTemplate === "approval") {
        steps = [
          { id: "step-1", name: "Command Input", type: "user_input", nextStepId: "step-2" },
          { id: "step-2", name: "Generate Action Plan", type: "model_call", modelId: "nexora-omni", nextStepId: "step-3" },
          { id: "step-3", name: "Enterprise Admin Verification", type: "human_approval", approvalRoleRequired: "admin", nextStepId: "step-4" },
          { id: "step-4", name: "Execute & Finalize", type: "final_output" },
        ];
      } else {
        steps = [
          { id: "step-1", name: "Data Payload", type: "user_input", nextStepId: "step-2" },
          { id: "step-2", name: "Extract & Transform", type: "data_transform", nextStepId: "step-3" },
          { id: "step-3", name: "Summarize Analytics", type: "model_call", modelId: "nexora-spark", nextStepId: "step-4" },
          { id: "step-4", name: "Structured Result", type: "final_output" },
        ];
      }

      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWfName.trim(),
          description: newWfDesc.trim() || "Automated multi-step agent workflow.",
          steps,
          toolAllowlist: ["knowledge_retrieval", "model_call"],
          userId: "usr_alex",
          orgId: "ws-default",
        }),
      });

      const data = await res.json();
      if (data.workflow) {
        setWorkflows((prev) => [data.workflow, ...prev]);
        setSelectedWf(data.workflow);
        setNewWfName("");
        setNewWfDesc("");
        setIsCreateWfModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to create workflow:", err);
    } finally {
      setIsSubmittingWf(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">AI Workflows & Agents</h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Author, orchestrate, and execute multi-step AI agents with grounded knowledge retrieval and human approval checkpoints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateWfModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Workflow</span>
          </button>
          <button
            onClick={handleRunWorkflow}
            disabled={isRunning}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isRunning ? "Executing Agent..." : "Run Active Workflow"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Workflow Directory */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Workflows Directory
          </h2>
          {workflows.map((wf) => (
            <div
              key={wf.id}
              onClick={() => setSelectedWf(wf)}
              className="p-4 rounded-2xl bg-slate-900/60 border border-violet-500/40 shadow-lg shadow-violet-950/20 cursor-pointer space-y-2"
            >
              <div className="flex items-start justify-between">
                <span className="font-semibold text-sm text-white">{wf.name}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {wf.status}
                </span>
              </div>
              <p className="text-xs text-zinc-400">{wf.description}</p>
              <div className="flex items-center gap-3 pt-2 text-[11px] text-zinc-500 border-t border-white/5">
                <span>v{wf.version}.0</span>
                <span>•</span>
                <span>{wf.steps.length} sequential steps</span>
              </div>
            </div>
          ))}

          {/* Test Input Form */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-3">
            <span className="text-xs font-semibold text-zinc-300">Execution Input Data</span>
            <textarea
              rows={3}
              value={runInput}
              onChange={(e) => setRunInput(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
            />
          </div>
        </div>

        {/* Right Column (2 cols): Step Graph & Real-Time Run Execution */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step Sequence Visualizer */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Workflow Pipeline Architecture
            </h3>
            <div className="space-y-2">
              {selectedWf.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/5 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-zinc-400 font-mono">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-white">{step.name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                    {step.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Run Status & Step Results */}
          {activeRun && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-violet-500/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span>Run: {activeRun.runId}</span>
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                    <span>Tokens: {activeRun.totalTokens}</span>
                    <span>•</span>
                    <span>Cost: ${(activeRun.totalCostUSD).toFixed(5)}</span>
                  </div>
                </div>

                <span
                  className={`text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${
                    activeRun.status === "completed"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : activeRun.status === "paused_approval"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
                      : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                  }`}
                >
                  {activeRun.status}
                </span>
              </div>

              {/* Human Approval Required Checkpoint */}
              {activeRun.status === "paused_approval" && activeRun.pendingApprovalStepId && (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-amber-200">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <p className="font-semibold">Human Approval Required</p>
                      <p className="text-amber-300/80">
                        Agent paused before delivering output. Requires Administrator or Owner verification.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApproveStep(activeRun.pendingApprovalStepId!)}
                    disabled={isApproving}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50 shrink-0"
                  >
                    {isApproving ? "Verifying..." : "Approve & Deliver"}
                  </button>
                </div>
              )}

              {/* Step Outputs */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-zinc-400">Step Outputs:</span>
                {Object.entries(activeRun.stepResults).map(([stepId, res]) => (
                  <div key={stepId} className="p-3 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-indigo-400">{stepId} ({res.stepType})</span>
                      <span className="text-zinc-500">{res.durationMs}ms</span>
                    </div>
                    <pre className="text-[11px] text-zinc-300 font-mono overflow-x-auto p-2 rounded bg-black/40">
                      {JSON.stringify(res.outputPayload, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Workflow Modal */}
      {isCreateWfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-violet-500/30 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-600/20 text-violet-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Create New Workflow Agent</h3>
              </div>
              <button
                onClick={() => setIsCreateWfModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkflow} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Workflow Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Compliance Report Generator"
                  value={newWfName}
                  onChange={(e) => setNewWfName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe the agent's goal and execution pipeline..."
                  value={newWfDesc}
                  onChange={(e) => setNewWfDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Architecture Template</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewWfTemplate("qa")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newWfTemplate === "qa"
                        ? "bg-violet-600/20 border-violet-500 text-white"
                        : "bg-slate-950/60 border-white/10 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <p className="text-xs font-semibold">Grounded Q&A</p>
                    <p className="text-[10px] text-zinc-400 mt-1">Input → Knowledge → Model → Output</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewWfTemplate("approval")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newWfTemplate === "approval"
                        ? "bg-violet-600/20 border-violet-500 text-white"
                        : "bg-slate-950/60 border-white/10 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <p className="text-xs font-semibold">Admin Signoff</p>
                    <p className="text-[10px] text-zinc-400 mt-1">Input → Model → Human Gate → Output</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewWfTemplate("transform")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newWfTemplate === "transform"
                        ? "bg-violet-600/20 border-violet-500 text-white"
                        : "bg-slate-950/60 border-white/10 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <p className="text-xs font-semibold">Data Pipeline</p>
                    <p className="text-[10px] text-zinc-400 mt-1">Input → Transform → Model → Output</p>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateWfModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWf || !newWfName.trim()}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                >
                  {isSubmittingWf ? "Publishing..." : "Create Workflow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
