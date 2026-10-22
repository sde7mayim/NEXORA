export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold: number; // e.g. 3 consecutive failures to trip
  recoveryTimeoutMs: number; // e.g. 30,000 ms before attempting probe
}

export interface CircuitStatus {
  providerKey: string;
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureTime?: number;
  lastStateChange: number;
}

export class CircuitBreaker {
  private static circuits = new Map<string, {
    state: CircuitState;
    failures: number;
    lastFailureTime: number;
    lastStateChange: number;
    options: CircuitBreakerOptions;
  }>();

  private static defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 3,
    recoveryTimeoutMs: 30000, // 30s
  };

  /**
   * Configures or retrieves circuit breaker for a given provider or model target.
   */
  private static getCircuit(providerKey: string, options?: Partial<CircuitBreakerOptions>) {
    if (!this.circuits.has(providerKey)) {
      this.circuits.set(providerKey, {
        state: "CLOSED",
        failures: 0,
        lastFailureTime: 0,
        lastStateChange: Date.now(),
        options: { ...this.defaultOptions, ...options },
      });
    }
    return this.circuits.get(providerKey)!;
  }

  /**
   * Evaluates if a provider route is available or currently tripped.
   */
  static isAvailable(providerKey: string): boolean {
    const circuit = this.getCircuit(providerKey);
    const now = Date.now();

    if (circuit.state === "OPEN") {
      // Check if recovery cooldown has elapsed
      if (now - circuit.lastFailureTime > circuit.options.recoveryTimeoutMs) {
        circuit.state = "HALF_OPEN";
        circuit.lastStateChange = now;
        return true; // Allow single canary probe
      }
      return false; // Fast-fail
    }

    return true; // CLOSED or HALF_OPEN canary
  }

  /**
   * Records a successful provider request. Resets failure counter and closes circuit.
   */
  static recordSuccess(providerKey: string): void {
    const circuit = this.getCircuit(providerKey);
    circuit.failures = 0;
    if (circuit.state !== "CLOSED") {
      circuit.state = "CLOSED";
      circuit.lastStateChange = Date.now();
    }
  }

  /**
   * Records a failed provider request. Trips to OPEN if threshold exceeded.
   */
  static recordFailure(providerKey: string, error?: Error): void {
    const circuit = this.getCircuit(providerKey);
    const now = Date.now();
    circuit.failures += 1;
    circuit.lastFailureTime = now;

    if (circuit.state === "HALF_OPEN" || circuit.failures >= circuit.options.failureThreshold) {
      circuit.state = "OPEN";
      circuit.lastStateChange = now;
      console.warn(
        `[CircuitBreaker] Provider '${providerKey}' tripped to OPEN. Fast-fallback activated for ${circuit.options.recoveryTimeoutMs / 1000}s. Reason: ${error?.message || "Failure threshold exceeded"}`
      );
    }
  }

  /**
   * Manually resets circuit breaker (e.g. from admin diagnostics).
   */
  static reset(providerKey: string): void {
    const circuit = this.getCircuit(providerKey);
    circuit.state = "CLOSED";
    circuit.failures = 0;
    circuit.lastFailureTime = 0;
    circuit.lastStateChange = Date.now();
  }

  /**
   * Resets all provider circuit breakers back to CLOSED.
   */
  static resetAll(): void {
    this.circuits.forEach((val) => {
      val.state = "CLOSED";
      val.failures = 0;
      val.lastFailureTime = 0;
      val.lastStateChange = Date.now();
    });
  }

  /**
   * Configures circuit breaker options for a specific provider.
   */
  static configure(providerKey: string, options: Partial<CircuitBreakerOptions>): void {
    const circuit = this.getCircuit(providerKey, options);
    circuit.options = { ...circuit.options, ...options };
  }

  /**
   * Returns current status of all tracked provider circuits.
   */
  static getAllStatuses(): CircuitStatus[] {
    // Ensure standard providers are tracked
    this.getCircuit("openai");
    this.getCircuit("anthropic");

    return Array.from(this.circuits.entries()).map(([key, val]) => ({
      providerKey: key,
      state: val.state,
      consecutiveFailures: val.failures,
      lastFailureTime: val.lastFailureTime || undefined,
      lastStateChange: val.lastStateChange,
    }));
  }
}

// Convenient alias for registry operations
export const CircuitBreakerRegistry = CircuitBreaker;

