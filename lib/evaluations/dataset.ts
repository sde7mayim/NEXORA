import { EvaluationTestCase } from "./types";

export const BENCHMARK_DATASET_VERSION = "nexora-bench-v1.0";

export const EVALUATION_TEST_CASES: EvaluationTestCase[] = [
  // 1. Coding: Fibonacci in TypeScript
  {
    id: "eval-code-01",
    name: "Fibonacci TypeScript Implementation",
    taskType: "coding",
    description: "Generates recursive or iterative Fibonacci with TypeScript types",
    prompt: "Write a TypeScript function `fibonacci(n: number): number` that returns the nth Fibonacci number.",
    expectedOutputPatterns: [
      /function\s+fibonacci\s*\(\s*n\s*:\s*number\s*\)\s*:\s*number/i,
      /return/i,
    ],
  },

  // 2. Multi-step Reasoning & Math
  {
    id: "eval-reason-01",
    name: "Linear Equation Multi-step Logic",
    taskType: "reasoning",
    description: "Solves a word problem with clear algebraic steps",
    prompt: "A train leaves Station A at 60 mph. Two hours later, a second train leaves Station A at 90 mph on the same track. How many hours after the second train departs will it catch the first train? Show the calculation and state the final answer clearly.",
    expectedOutputPatterns: [
      /120\s*(miles|mi)/i,
      /(4|four)\s*hours/i,
    ],
  },

  // 3. Structured Output: Valid JSON Object
  {
    id: "eval-json-01",
    name: "Strict JSON Output Generation",
    taskType: "structured_output",
    description: "Returns pure JSON meeting specified schema fields",
    prompt: "Return a valid JSON object with keys 'status', 'statusCode', and 'services' (an array with ['auth', 'database', 'ai']). Output JSON ONLY.",
    expectedJsonSchema: {
      status: "string",
      statusCode: "number",
      services: "array",
    },
    expectedOutputPatterns: [
      /\{[\s\S]*"status"[\s\S]*"statusCode"[\s\S]*"services"[\s\S]*\}/,
    ],
  },

  // 4. Summarization: Key Takeaways
  {
    id: "eval-summary-01",
    name: "Executive Fact Extraction",
    taskType: "summarization",
    description: "Extracts primary facts from financial text",
    prompt: "Summarize this in 2 bullet points:\n'In Q3, Nexora platform revenue expanded by 42% to ₹1.2 Cr, driven by Pro subscriptions. Operating margin improved to 28% while foundation model latency decreased by 18% across routing fallbacks.'",
    expectedOutputPatterns: [
      /42%/i,
      /28%/i,
    ],
  },

  // 5. Instruction Following: Strict Negative Constraints
  {
    id: "eval-instruct-01",
    name: "Negative Constraint Adherence",
    taskType: "instruction_following",
    description: "Answers without using specific prohibited words",
    prompt: "Explain cloud computing in exactly two sentences. Do NOT use the words 'server', 'internet', or 'data'.",
    expectedOutputPatterns: [
      /\b[A-Z].*?\.\s+[A-Z].*?\./,
    ],
  },
];

export const CANONICAL_BENCHMARK_CASES = EVALUATION_TEST_CASES;

