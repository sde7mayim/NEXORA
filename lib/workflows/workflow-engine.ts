import {
  WorkflowDefinition,
  WorkflowRunState,
  WorkflowStepConfig,
  StepExecutionResult,
} from "./types";
import { KnowledgeService } from "../knowledge/knowledge-service";
import { ModelRouter } from "../ai/router";

export class WorkflowEngine {
  private static workflows: Map<string, WorkflowDefinition> = new Map([
    [
      "wf-triage-agent",
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
          {
            id: "step-1",
            name: "Receive Inquiry",
            type: "user_input",
            nextStepId: "step-2",
          },
          {
            id: "step-2",
            name: "Query Knowledge Hub",
            type: "knowledge_retrieval",
            collectionIds: ["col-default-1"],
            nextStepId: "step-3",
          },
          {
            id: "step-3",
            name: "Generate Resolution",
            type: "model_call",
            modelId: "nexora-core",
            promptTemplate: "Answer the following security question based on retrieved RFC context: {{step_1.input}}\n\nContext:\n{{step_2.citations}}",
            nextStepId: "step-4",
          },
          {
            id: "step-4",
            name: "Format Response Payload",
            type: "data_transform",
            transformExpression: "RESOLUTION SUMMARY:\n{{step_3.output}}",
            nextStepId: "step-5",
          },
          {
            id: "step-5",
            name: "Admin Human Signoff",
            type: "human_approval",
            approvalRoleRequired: "admin",
            nextStepId: "step-6",
          },
          {
            id: "step-6",
            name: "Deliver Final Output",
            type: "final_output",
          },
        ],
        createdAt: "2026-10-18T00:00:00Z",
        updatedAt: "2026-10-18T00:00:00Z",
      },
    ],
  ]);

  private static runs: Map<string, WorkflowRunState> = new Map();

  /**
   * Validates workflow structure and step connectivity.
   */
  static validateWorkflow(steps: WorkflowStepConfig[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!steps || steps.length === 0) {
      return { valid: false, errors: ["Workflow must contain at least one step."] };
    }

    const stepIds = new Set(steps.map((s) => s.id));
    if (stepIds.size !== steps.length) {
      errors.push("Duplicate step IDs detected in workflow definition.");
    }

    for (const step of steps) {
      if (step.nextStepId && !stepIds.has(step.nextStepId)) {
        errors.push(`Step '${step.name}' references non-existent nextStepId '${step.nextStepId}'.`);
      }
      if (step.type === "conditional_branch" && step.condition) {
        if (!stepIds.has(step.condition.trueNextStepId)) {
          errors.push(`Conditional step '${step.name}' trueNextStepId target not found.`);
        }
        if (!stepIds.has(step.condition.falseNextStepId)) {
          errors.push(`Conditional step '${step.name}' falseNextStepId target not found.`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Retrieves all workflows for a user / workspace.
   */
  static getWorkflows(userId: string, orgId?: string): WorkflowDefinition[] {
    return Array.from(this.workflows.values()).filter((w) => {
      if (w.userId === userId) return true;
      if (orgId && w.orgId === orgId) return true;
      return false;
    });
  }

  /**
   * Retrieves workflow by ID.
   */
  static getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Creates or updates a workflow.
   */
  static saveWorkflow(params: {
    id?: string;
    name: string;
    description: string;
    userId: string;
    orgId?: string;
    steps: WorkflowStepConfig[];
    toolAllowlist?: string[];
    status?: "draft" | "published" | "disabled";
  }): WorkflowDefinition {
    const validation = this.validateWorkflow(params.steps);
    if (!validation.valid) {
      throw new Error(`Invalid workflow definition: ${validation.errors.join("; ")}`);
    }

    const id = params.id || `wf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const existing = this.workflows.get(id);

    const workflow: WorkflowDefinition = {
      id,
      name: params.name,
      description: params.description,
      version: existing ? existing.version + 1 : 1,
      status: params.status || (existing ? existing.status : "draft"),
      userId: params.userId,
      orgId: params.orgId,
      steps: params.steps,
      toolAllowlist: params.toolAllowlist || ["knowledge_retrieval", "model_call"],
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.workflows.set(id, workflow);
    return workflow;
  }

  /**
   * Duplicates an existing workflow.
   */
  static duplicateWorkflow(workflowId: string, userId: string): WorkflowDefinition {
    const original = this.workflows.get(workflowId);
    if (!original) throw new Error("Source workflow not found.");

    const newId = `wf_${Date.now()}_copy`;
    const copy: WorkflowDefinition = {
      ...original,
      id: newId,
      name: `${original.name} (Copy)`,
      version: 1,
      status: "draft",
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.workflows.set(newId, copy);
    return copy;
  }

  /**
   * Initiates workflow execution.
   */
  static async executeWorkflow(params: {
    workflowId: string;
    initialInput: Record<string, unknown>;
    userId: string;
    orgId?: string;
    userPlan?: "free" | "pro" | "enterprise";
  }): Promise<WorkflowRunState> {
    const wf = this.workflows.get(params.workflowId);
    if (!wf) throw new Error("Workflow not found.");
    if (wf.status === "disabled" || wf.status === "archived") {
      throw new Error(`Workflow is currently ${wf.status} and cannot be executed.`);
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const runState: WorkflowRunState = {
      runId,
      workflowId: wf.id,
      workflowName: wf.name,
      version: wf.version,
      userId: params.userId,
      orgId: params.orgId,
      status: "running",
      initialInput: params.initialInput,
      stepResults: {},
      totalTokens: 0,
      totalCostUSD: 0,
      startedAt: new Date().toISOString(),
    };

    this.runs.set(runId, runState);

    // Execute step sequence starting from first step
    await this.advanceExecution(wf, runState, wf.steps[0].id, params.userPlan || "enterprise");
    return runState;
  }

  /**
   * Resumes a paused execution after human approval.
   */
  static async approveStep(
    runId: string,
    stepId: string,
    approverRole: "owner" | "admin"
  ): Promise<WorkflowRunState> {
    const run = this.runs.get(runId);
    if (!run) throw new Error("Run not found.");
    if (run.status !== "paused_approval" || run.pendingApprovalStepId !== stepId) {
      throw new Error("Workflow run is not awaiting approval on this step.");
    }

    const wf = this.workflows.get(run.workflowId);
    if (!wf) throw new Error("Workflow not found.");

    const step = wf.steps.find((s) => s.id === stepId);
    if (!step) throw new Error("Step not found in workflow.");

    if (step.approvalRoleRequired === "owner" && approverRole !== "owner") {
      throw new Error("Forbidden: This step requires Owner authorization.");
    }

    // Mark step as completed
    run.stepResults[stepId] = {
      stepId,
      stepType: "human_approval",
      status: "completed",
      inputPayload: { approvedByRole: approverRole },
      outputPayload: { approved: true, approvedAt: new Date().toISOString() },
      tokensUsed: 0,
      costUSD: 0,
      durationMs: 50,
    };

    run.status = "running";
    run.pendingApprovalStepId = undefined;

    if (step.nextStepId) {
      await this.advanceExecution(wf, run, step.nextStepId, "enterprise");
    } else {
      run.status = "completed";
      run.completedAt = new Date().toISOString();
    }

    return run;
  }

  /**
   * Internal runner to advance step by step.
   */
  private static async advanceExecution(
    wf: WorkflowDefinition,
    run: WorkflowRunState,
    startStepId: string,
    planId: "free" | "pro" | "enterprise"
  ): Promise<void> {
    let currentStepId: string | undefined = startStepId;

    while (currentStepId) {
      const step: WorkflowStepConfig | undefined = wf.steps.find((s) => s.id === currentStepId);
      if (!step) break;

      run.currentStepId = step.id;
      const stepStart = Date.now();

      try {
        let stepOutput: unknown = null;
        let tokens = 0;
        let cost = 0;

        switch (step.type) {
          case "user_input": {
            stepOutput = run.initialInput;
            break;
          }

          case "knowledge_retrieval": {
            const query = String(
              run.initialInput.query || run.initialInput.input || "cloud security"
            );
            const citations = KnowledgeService.search({
              collectionIds: step.collectionIds || ["col-default-1"],
              query,
              requestingUserId: run.userId,
              requestingOrgId: run.orgId,
              topK: 3,
            });
            stepOutput = { citations, count: citations.length };
            break;
          }

          case "model_call": {
            const modelTarget = step.modelId || "nexora-core";
            const prompt = `Workflow Task:\nInput: ${JSON.stringify(run.initialInput)}\nPlease provide a structured resolution.`;

            // Deterministic simulation or router call
            if (process.env.OPENAI_API_KEY) {
              const res = await ModelRouter.generateWithFallback({
                modelSelectionId: modelTarget,
                messages: [{ role: "user", content: prompt }],
                userId: run.userId,
                userPlanId: planId,
              });
              stepOutput = res.content;
              tokens = res.promptTokens + res.completionTokens;
              cost = 0.0002;
            } else {
              // High-fidelity fixture
              stepOutput = "Simulated Model Resolution: Inbound mTLS architecture validated against policy RFC-002.";
              tokens = 180;
              cost = 0.0001;
            }
            break;
          }

          case "data_transform": {
            const prevOutput = JSON.stringify(run.stepResults);
            stepOutput = {
              transformed: true,
              summary: step.transformExpression?.replace("{{step_3.output}}", "Validated") || prevOutput,
            };
            break;
          }

          case "human_approval": {
            run.status = "paused_approval";
            run.pendingApprovalStepId = step.id;
            const executionDuration = Date.now() - stepStart;
            run.stepResults[step.id] = {
              stepId: step.id,
              stepType: step.type,
              status: "awaiting_approval",
              inputPayload: { approvalRequired: step.approvalRoleRequired || "admin" },
              outputPayload: null,
              tokensUsed: 0,
              costUSD: 0,
              durationMs: executionDuration,
            };
            return; // Pause execution loop
          }

          case "final_output": {
            stepOutput = {
              workflow: wf.name,
              runId: run.runId,
              completedSuccessfully: true,
              result: run.stepResults,
            };
            run.finalOutput = stepOutput;
            break;
          }
        }

        const duration = Date.now() - stepStart;
        run.totalTokens += tokens;
        run.totalCostUSD += cost;

        const result: StepExecutionResult = {
          stepId: step.id,
          stepType: step.type,
          status: "completed",
          inputPayload: { stepName: step.name },
          outputPayload: stepOutput,
          tokensUsed: tokens,
          costUSD: cost,
          durationMs: duration,
        };

        run.stepResults[step.id] = result;
        currentStepId = step.nextStepId;
      } catch (err) {
        run.status = "failed";
        run.errorMessage = (err as Error).message;
        run.completedAt = new Date().toISOString();
        return;
      }
    }

    run.status = "completed";
    run.completedAt = new Date().toISOString();
  }

  /**
   * Retrieves run by ID.
   */
  static getRun(runId: string): WorkflowRunState | undefined {
    return this.runs.get(runId);
  }

  /**
   * Lists runs for a user / workspace.
   */
  static getRuns(userId: string, orgId?: string): WorkflowRunState[] {
    return Array.from(this.runs.values()).filter((r) => {
      if (r.userId === userId) return true;
      if (orgId && r.orgId === orgId) return true;
      return false;
    });
  }
}
