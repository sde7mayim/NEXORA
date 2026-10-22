import { describe, it, expect } from "vitest";
import { WorkflowEngine } from "@/lib/workflows/workflow-engine";
import { WorkflowStepConfig } from "@/lib/workflows/types";

describe("AI Workflows & Agents Execution Engine", () => {
  it("should validate workflow step connectivity and detect broken nextStepId links", () => {
    const brokenSteps: WorkflowStepConfig[] = [
      { id: "step-1", name: "Start", type: "user_input", nextStepId: "step-nonexistent" },
    ];
    const validation = WorkflowEngine.validateWorkflow(brokenSteps);
    expect(validation.valid).toBe(false);
    expect(validation.errors[0]).toContain("step-nonexistent");
  });

  it("should validate and save valid workflow graph definitions", () => {
    const validSteps: WorkflowStepConfig[] = [
      { id: "s-1", name: "Inbound Question", type: "user_input", nextStepId: "s-2" },
      { id: "s-2", name: "Format Final", type: "final_output" },
    ];
    const wf = WorkflowEngine.saveWorkflow({
      name: "Simple Q&A Pipeline",
      description: "Basic pipeline",
      userId: "usr_tester",
      steps: validSteps,
    });

    expect(wf.id).toBeDefined();
    expect(wf.name).toBe("Simple Q&A Pipeline");
    expect(wf.version).toBe(1);
  });

  it("should pause workflow execution when encountering human approval checkpoint and resume upon approval", async () => {
    const steps: WorkflowStepConfig[] = [
      { id: "s-input", name: "Input", type: "user_input", nextStepId: "s-approval" },
      {
        id: "s-approval",
        name: "Security Officer Signoff",
        type: "human_approval",
        approvalRoleRequired: "admin",
        nextStepId: "s-output",
      },
      { id: "s-output", name: "Final Output", type: "final_output" },
    ];

    const workflow = WorkflowEngine.saveWorkflow({
      name: "Approval Required Agent",
      description: "Agent pausing for human review",
      userId: "usr_tester",
      steps,
    });

    // 1. Initial run should pause at approval step
    const initialRun = await WorkflowEngine.executeWorkflow({
      workflowId: workflow.id,
      initialInput: { question: "Can we deploy to us-east-1?" },
      userId: "usr_tester",
    });

    expect(initialRun.status).toBe("paused_approval");
    expect(initialRun.pendingApprovalStepId).toBe("s-approval");
    expect(initialRun.stepResults["s-approval"].status).toBe("awaiting_approval");

    // 2. Approve the step
    const resumedRun = await WorkflowEngine.approveStep(initialRun.runId, "s-approval", "admin");
    expect(resumedRun.status).toBe("completed");
    expect(resumedRun.pendingApprovalStepId).toBeUndefined();
    expect(resumedRun.stepResults["s-approval"].status).toBe("completed");
    expect(resumedRun.stepResults["s-output"].status).toBe("completed");
  });
});
