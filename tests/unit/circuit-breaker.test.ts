import { describe, it, expect, beforeEach } from "vitest";
import { CircuitBreaker, CircuitBreakerRegistry } from "@/lib/ai/circuit-breaker";

describe("Circuit Breaker Pattern for AI Providers", () => {
  beforeEach(() => {
    CircuitBreaker.resetAll();
  });

  it("should initialize circuit breaker in CLOSED state and allow requests", () => {
    expect(CircuitBreaker.isAvailable("test-provider")).toBe(true);
    const statuses = CircuitBreaker.getAllStatuses();
    const testStatus = statuses.find((s) => s.providerKey === "test-provider");
    expect(testStatus?.state).toBe("CLOSED");
  });

  it("should transition from CLOSED to OPEN after consecutive failures trip the threshold", () => {
    CircuitBreaker.configure("fragile-provider", {
      failureThreshold: 2,
      recoveryTimeoutMs: 10000,
    });

    expect(CircuitBreaker.isAvailable("fragile-provider")).toBe(true);

    CircuitBreaker.recordFailure("fragile-provider", new Error("Timeout 1"));
    expect(CircuitBreaker.isAvailable("fragile-provider")).toBe(true);

    CircuitBreaker.recordFailure("fragile-provider", new Error("Timeout 2"));
    expect(CircuitBreaker.isAvailable("fragile-provider")).toBe(false);

    const status = CircuitBreaker.getAllStatuses().find((s) => s.providerKey === "fragile-provider");
    expect(status?.state).toBe("OPEN");
    expect(status?.consecutiveFailures).toBe(2);
  });

  it("should reset circuit breaker back to CLOSED on manual reset", () => {
    CircuitBreaker.configure("openai", { failureThreshold: 3 });
    CircuitBreaker.recordFailure("openai", new Error("Err 1"));
    CircuitBreaker.recordFailure("openai", new Error("Err 2"));
    CircuitBreaker.recordFailure("openai", new Error("Err 3"));

    expect(CircuitBreaker.isAvailable("openai")).toBe(false);

    CircuitBreaker.reset("openai");
    expect(CircuitBreaker.isAvailable("openai")).toBe(true);

    const status = CircuitBreaker.getAllStatuses().find((s) => s.providerKey === "openai");
    expect(status?.state).toBe("CLOSED");
    expect(status?.consecutiveFailures).toBe(0);
  });

  it("should reset consecutive failure count upon recording a success", () => {
    CircuitBreaker.configure("resilient-provider", { failureThreshold: 3 });
    CircuitBreaker.recordFailure("resilient-provider", new Error("Intermittent error"));

    let status = CircuitBreaker.getAllStatuses().find((s) => s.providerKey === "resilient-provider");
    expect(status?.consecutiveFailures).toBe(1);

    CircuitBreaker.recordSuccess("resilient-provider");
    status = CircuitBreaker.getAllStatuses().find((s) => s.providerKey === "resilient-provider");
    expect(status?.consecutiveFailures).toBe(0);
    expect(status?.state).toBe("CLOSED");
  });

  it("should expose statuses across all registered providers", () => {
    CircuitBreaker.recordSuccess("openai");
    CircuitBreaker.recordFailure("anthropic", new Error("Fail"));

    const allStatuses = CircuitBreakerRegistry.getAllStatuses();
    expect(allStatuses.find((s) => s.providerKey === "openai")).toBeDefined();
    expect(allStatuses.find((s) => s.providerKey === "anthropic")?.consecutiveFailures).toBe(1);
  });
});
