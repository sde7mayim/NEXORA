export type EvaluationTaskType =
  | "coding"
  | "reasoning"
  | "summarization"
  | "structured_output"
  | "instruction_following";

export interface EvaluationTestCase {
  id: string;
  name: string;
  taskType: EvaluationTaskType;
  prompt: string;
  systemPrompt?: string;
  expectedOutputPatterns?: RegExp[];
  expectedJsonSchema?: Record<string, string>;
  maxLatencyMs?: number;
  description: string;
}

export interface TestCaseResult {
  testCaseId: string;
  name: string;
  taskType: EvaluationTaskType;
  passed: boolean;
  score: number; // 0.0 to 1.0
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  outputSnippet: string;
  failureReason?: string;
}

export interface EvaluationRunReport {
  id: string;
  datasetVersion: string;
  modelEvaluated: string;
  timestamp: string;
  totalTests: number;
  passedTests: number;
  accuracyPercentage: number;
  averageLatencyMs: number;
  totalTokensUsed: number;
  results: TestCaseResult[];
  notes: string;
}
