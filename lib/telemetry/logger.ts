import crypto from "crypto";

export interface TelemetryEvent {
  correlationId: string;
  actorHash: string; // Privacy-safe anonymized hash
  modelSelected: string;
  providerKey: string;
  actualModelId: string;
  latencyMs: number;
  timeToFirstTokenMs?: number;
  tokensIn: number;
  tokensOut: number;
  estimatedCostUSD: number;
  fallbackTriggered: boolean;
  circuitBreakerState: string;
  status: "success" | "error";
  errorCategory?: string;
  timestamp: string;
}

export class TelemetryLogger {
  private static bufferSize = 250;
  private static eventBuffer: TelemetryEvent[] = [];

  /**
   * Generates a unique, traceable correlation ID for a server request lifecycle.
   */
  static generateCorrelationId(): string {
    return `req_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  }

  /**
   * Computes a privacy-safe one-way anonymized hash for an actor reference.
   */
  static hashActor(identifier: string): string {
    return `usr_${crypto.createHash("sha256").update(identifier).digest("hex").slice(0, 10)}`;
  }

  /**
   * Redacts sensitive strings (API keys, authorization headers, credit cards).
   */
  static redactSensitive(text: string): string {
    return text
      .replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_API_KEY]")
      .replace(/sk-ant-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_ANTHROPIC_KEY]")
      .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer [REDACTED_TOKEN]")
      .replace(/rzp_(test|live)_[a-zA-Z0-9]+/g, "[REDACTED_PAYMENT_KEY]")
      .replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, "[REDACTED_CARD]");
  }

  /**
   * Records a structured telemetry event.
   */
  static recordEvent(event: TelemetryEvent): void {
    this.eventBuffer.unshift(event);
    if (this.eventBuffer.length > this.bufferSize) {
      this.eventBuffer.pop();
    }
  }

  /**
   * Retrieves recent telemetry events for admin diagnostics.
   */
  static getRecentEvents(limit = 50): TelemetryEvent[] {
    return this.eventBuffer.slice(0, limit);
  }

  /**
   * Computes operational aggregate metrics for diagnostics.
   */
  static getMetricsSummary() {
    const total = this.eventBuffer.length;
    if (total === 0) {
      return {
        totalRequests: 0,
        averageLatencyMs: 0,
        averageTtftMs: 0,
        successRate: 100,
        fallbackRate: 0,
        totalCostUSD: 0,
      };
    }

    const successes = this.eventBuffer.filter((e) => e.status === "success").length;
    const fallbacks = this.eventBuffer.filter((e) => e.fallbackTriggered).length;
    const totalLatency = this.eventBuffer.reduce((acc, e) => acc + e.latencyMs, 0);
    const ttftEvents = this.eventBuffer.filter((e) => e.timeToFirstTokenMs !== undefined);
    const totalTtft = ttftEvents.reduce((acc, e) => acc + (e.timeToFirstTokenMs || 0), 0);
    const totalCost = this.eventBuffer.reduce((acc, e) => acc + e.estimatedCostUSD, 0);

    return {
      totalRequests: total,
      averageLatencyMs: Math.round(totalLatency / total),
      averageTtftMs: ttftEvents.length > 0 ? Math.round(totalTtft / ttftEvents.length) : 0,
      successRate: Math.round((successes / total) * 100),
      fallbackRate: Math.round((fallbacks / total) * 100),
      totalCostUSD: parseFloat(totalCost.toFixed(4)),
    };
  }

  /**
   * Clears telemetry event buffer (primarily used in testing).
   */
  static clear(): void {
    this.eventBuffer = [];
  }
}

// Standalone exported helpers
export const generateCorrelationId = TelemetryLogger.generateCorrelationId.bind(TelemetryLogger);
export const hashActorId = TelemetryLogger.hashActor.bind(TelemetryLogger);
export const redactSensitiveData = TelemetryLogger.redactSensitive.bind(TelemetryLogger);

