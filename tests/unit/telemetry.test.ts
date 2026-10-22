import { describe, it, expect, beforeEach } from "vitest";
import {
  TelemetryLogger,
  generateCorrelationId,
  hashActorId,
  redactSensitiveData,
} from "@/lib/telemetry/logger";

describe("Telemetry Logger & Privacy Redaction", () => {
  beforeEach(() => {
    TelemetryLogger.clear();
  });

  it("should generate cryptographically unique correlation IDs with req_ prefix", () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();

    expect(id1).toMatch(/^req_\d+_[a-f0-9]{8}$/);
    expect(id2).toMatch(/^req_\d+_[a-f0-9]{8}$/);
    expect(id1).not.toBe(id2);
  });

  it("should generate deterministic privacy-safe actor hashes with usr_ prefix", () => {
    const rawUserId = "user-12345-uuid-secure";
    const hashed1 = hashActorId(rawUserId);
    const hashed2 = hashActorId(rawUserId);

    expect(hashed1).toMatch(/^usr_[a-f0-9]{10}$/);
    expect(hashed1).toBe(hashed2);
    expect(hashed1).not.toContain(rawUserId);
  });

  it("should redact API secrets, bearer tokens, and credit card numbers from telemetry text", () => {
    const sensitive =
      "Request with key sk-proj1234567890abcdef12345678 and Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    const cleaned = redactSensitiveData(sensitive);

    expect(cleaned).not.toContain("sk-proj1234567890abcdef12345678");
    expect(cleaned).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    expect(cleaned).toContain("[REDACTED_API_KEY]");
    expect(cleaned).toContain("Bearer [REDACTED_TOKEN]");
  });

  it("should record telemetry events and compute aggregated operational metrics", () => {
    TelemetryLogger.recordEvent({
      correlationId: generateCorrelationId(),
      actorHash: hashActorId("user-1"),
      modelSelected: "nexora-core",
      providerKey: "openai",
      actualModelId: "gpt-4o-mini",
      latencyMs: 400,
      timeToFirstTokenMs: 120,
      tokensIn: 100,
      tokensOut: 50,
      estimatedCostUSD: 0.0001,
      fallbackTriggered: false,
      circuitBreakerState: "CLOSED",
      status: "success",
      timestamp: new Date().toISOString(),
    });

    TelemetryLogger.recordEvent({
      correlationId: generateCorrelationId(),
      actorHash: hashActorId("user-1"),
      modelSelected: "nexora-reason",
      providerKey: "anthropic",
      actualModelId: "claude-3-5-sonnet",
      latencyMs: 800,
      timeToFirstTokenMs: 250,
      tokensIn: 200,
      tokensOut: 100,
      estimatedCostUSD: 0.002,
      fallbackTriggered: false,
      circuitBreakerState: "CLOSED",
      status: "success",
      timestamp: new Date().toISOString(),
    });

    const metrics = TelemetryLogger.getMetricsSummary();
    expect(metrics.totalRequests).toBe(2);
    expect(metrics.successRate).toBe(100);
    expect(metrics.averageLatencyMs).toBe(600);
    expect(metrics.averageTtftMs).toBe(185);
    expect(metrics.totalCostUSD).toBeCloseTo(0.0021, 4);
  });
});
