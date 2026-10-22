export type WorkflowStepType =
  | "user_input"
  | "model_call"
  | "knowledge_retrieval"
  | "conditional_branch"
  | "data_transform"
  | "human_approval"
  | "final_output";

export interface WorkflowStepConfig {
  id: string;
  name: string;
  type: WorkflowStepType;
  promptTemplate?: string;
  modelId?: string; // e.g. "nexora-core"
  collectionIds?: string[];
  condition?: {
    field: string;
    operator: "equals" | "contains" | "not_contains" | "greater_than";
    value: string;
    trueNextStepId: string;
    falseNextStepId: string;
  };
  transformExpression?: string; // Safe templating: "{{step_1.output}} formatted"
  approvalRoleRequired?: "owner" | "admin";
  nextStepId?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: number;
  status: "draft" | "published" | "disabled" | "archived";
  userId: string;
  orgId?: string;
  steps: WorkflowStepConfig[];
  toolAllowlist: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StepExecutionResult {
  stepId: string;
  stepType: WorkflowStepType;
  status: "completed" | "failed" | "awaiting_approval" | "skipped";
  inputPayload: unknown;
  outputPayload: unknown;
  tokensUsed: number;
  costUSD: number;
  durationMs: number;
  errorMessage?: string;
}

export interface WorkflowRunState {
  runId: string;
  workflowId: string;
  workflowName: string;
  version: number;
  userId: string;
  orgId?: string;
  status: "running" | "completed" | "failed" | "paused_approval" | "cancelled";
  currentStepId?: string;
  initialInput: Record<string, unknown>;
  stepResults: Record<string, StepExecutionResult>;
  finalOutput?: unknown;
  totalTokens: number;
  totalCostUSD: number;
  pendingApprovalStepId?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}
