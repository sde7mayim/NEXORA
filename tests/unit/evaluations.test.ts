import { describe, it, expect } from "vitest";
import { CANONICAL_BENCHMARK_CASES } from "@/lib/evaluations/dataset";
import { EvaluationRunner } from "@/lib/evaluations/runner";

describe("AI Quality Evaluation Framework", () => {
  it("should contain a balanced set of canonical benchmark tasks", () => {
    expect(CANONICAL_BENCHMARK_CASES.length).toBeGreaterThanOrEqual(5);

    const taskTypes = CANONICAL_BENCHMARK_CASES.map((c) => c.taskType);
    expect(taskTypes).toContain("reasoning");
    expect(taskTypes).toContain("coding");
    expect(taskTypes).toContain("structured_output");
    expect(taskTypes).toContain("summarization");
    expect(taskTypes).toContain("instruction_following");

    for (const testCase of CANONICAL_BENCHMARK_CASES) {
      expect(testCase.id).toBeDefined();
      expect(testCase.prompt.length).toBeGreaterThan(10);
      expect(testCase.description.length).toBeGreaterThan(5);
    }
  });

  it("should run benchmark suite in simulation mode without incurring external API costs", async () => {
    const report = await EvaluationRunner.runBenchmark("nexora-core", {
      useSimulation: true,
    });

    expect(report).toBeDefined();
    expect(report.modelEvaluated).toBe("nexora-core");
    expect(report.totalTests).toBe(5);
    expect(report.results.length).toBe(5);
    expect(report.accuracyPercentage).toBeGreaterThanOrEqual(80);
    expect(report.averageLatencyMs).toBeGreaterThanOrEqual(0);
    expect(report.totalTokensUsed).toBeGreaterThan(0);

    for (const res of report.results) {
      expect(res.latencyMs).toBeGreaterThanOrEqual(0);
      expect(res.tokensIn).toBeGreaterThan(0);
      expect(res.outputSnippet.length).toBeGreaterThan(0);
    }
  });

  it("should accurately validate deterministic JSON structured output assertions", async () => {
    const report = await EvaluationRunner.runBenchmark("nexora-core", {
      useSimulation: true,
    });

    const jsonResult = report.results.find((r) => r.taskType === "structured_output");
    expect(jsonResult).toBeDefined();
    expect(jsonResult?.passed).toBe(true);
    expect(jsonResult?.score).toBe(1.0);
  });
});
