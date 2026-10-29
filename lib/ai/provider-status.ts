import fs from "fs";
import path from "path";

export type AIProviderKey = "openai" | "anthropic" | "gemini";
export type ProviderKey = AIProviderKey;

export type ProviderStatus =
  | "not_configured"
  | "configured_unverified"
  | "available"
  | "auth_error"
  | "quota_error"
  | "rate_limited"
  | "temporary_failure"
  | "model_unavailable";

export interface ProviderRuntimeState {
  status: ProviderStatus;
  lastCheckedAt: number;
  lastSuccessAt?: number;
  consecutiveFailures?: number;
  lastErrorCategory?: string;
  lastErrorDetailsSafe?: string;
}

export interface SafeProviderStatusSummary {
  providerKey: ProviderKey;
  displayName: string;
  isConfigured: boolean;
  state: ProviderStatus;
  statusMessage: string;
  lastSuccessAt?: string;
  lastErrorCategory?: string;
}

// In-memory runtime status cache across requests
const runtimeState: Record<ProviderKey, ProviderRuntimeState> = {
  openai: { status: "configured_unverified", lastCheckedAt: 0, consecutiveFailures: 0 },
  anthropic: { status: "configured_unverified", lastCheckedAt: 0, consecutiveFailures: 0 },
  gemini: { status: "configured_unverified", lastCheckedAt: 0, consecutiveFailures: 0 },
};

/**
 * Safely cleans an environment value by stripping whitespace and wrapping quotes.
 */
function cleanEnvValue(raw: string): string {
  if (!raw) return "";
  let val = raw.trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1).trim();
  }
  return val;
}

/**
 * Validates whether a key string is merely a dummy template placeholder
 */
export function isPlaceholderKey(val: string): boolean {
  if (!val) return true;
  const lower = val.toLowerCase().trim();
  return (
    lower.includes("...your-") ||
    lower.includes("your-key") ||
    lower.includes("your_key") ||
    lower.startsWith("sk-placeholder") ||
    lower.startsWith("sk-ant-placeholder") ||
    lower.includes("placeholder") ||
    lower === "sk-..." ||
    lower === "sk-ant-..." ||
    lower === "aq..."
  );
}

/**
 * Safely reads a key from process.env or falls back to .env.local on disk (Node.js runtime only)
 */
function readEnvVariable(varNames: string[]): string {
  // 1. Check process.env first
  for (const name of varNames) {
    const raw = process.env[name];
    if (raw) {
      const val = cleanEnvValue(raw);
      if (val && !isPlaceholderKey(val)) {
        return val;
      }
    }
  }

  // 2. Fall back to parsing .env.local on disk if available in local development
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const name of varNames) {
        const match = content.match(new RegExp(`^${name}=(.*)$`, "m"));
        if (match && match[1]) {
          const val = cleanEnvValue(match[1]);
          if (val && !isPlaceholderKey(val)) {
            return val;
          }
        }
      }
    }
  } catch {
    // Environment file read is purely best-effort for local development
  }

  return "";
}

export class ProviderStatusService {
  /**
   * Retrieves the raw API key for a provider if configured, or undefined/empty string.
   * NEVER exposed to the client.
   */
  static getApiKey(provider: ProviderKey): string | undefined {
    let key = "";
    switch (provider) {
      case "openai":
        key = readEnvVariable(["OPENAI_API_KEY"]);
        break;
      case "anthropic":
        key = readEnvVariable(["ANTHROPIC_API_KEY"]);
        break;
      case "gemini":
        key = readEnvVariable(["GEMINI_API_KEY", "GOOGLE_API_KEY"]);
        break;
    }
    return key || undefined;
  }

  /**
   * Checks whether a provider has a valid, non-placeholder API key configured.
   */
  static isConfigured(provider: ProviderKey): boolean {
    const key = this.getApiKey(provider);
    return Boolean(key && !isPlaceholderKey(key));
  }

  /**
   * Returns a list of all providers that have valid API keys on this machine.
   */
  static getConfiguredProviders(): ProviderKey[] {
    const all: ProviderKey[] = ["gemini", "openai", "anthropic"];
    return all.filter((p) => this.isConfigured(p));
  }

  /**
   * Evaluates whether a provider is eligible to be used as a candidate or fallback.
   * Unconfigured providers or providers with active auth_error / quota_error are filtered out.
   */
  static isEligibleForRouting(provider: ProviderKey): boolean {
    if (!this.isConfigured(provider)) {
      return false;
    }

    const state = runtimeState[provider];
    const isRecent = Date.now() - state.lastCheckedAt < 60000;
    if (isRecent && (state.status === "auth_error" || state.status === "quota_error")) {
      return false;
    }

    return true;
  }

  /**
   * Categorizes a raw runtime error from a provider call.
   */
  static categorizeError(
    providerOrError: ProviderKey | unknown,
    maybeError?: unknown
  ): ProviderStatus {
    const error = maybeError !== undefined ? maybeError : providerOrError;
    const raw = error instanceof Error ? error.message : String(error);
    const lower = raw.toLowerCase();
    const statusVal = (error as any)?.status || (error as any)?.statusCode;

    // 1. Authentication errors (401 / Invalid API Key)
    if (
      statusVal === 401 ||
      lower.includes("401") ||
      lower.includes("invalid_api_key") ||
      lower.includes("incorrect api key") ||
      lower.includes("unauthorized") ||
      lower.includes("authentication_error") ||
      lower.includes("api_key_invalid")
    ) {
      return "auth_error";
    }

    // 2. Quota / Credits / Billing errors (429 insufficient quota)
    if (
      lower.includes("insufficient_quota") ||
      lower.includes("billing") ||
      lower.includes("credit balance") ||
      lower.includes("exceeded your current quota") ||
      lower.includes("quota exceeded") ||
      lower.includes("check your plan and billing")
    ) {
      return "quota_error";
    }

    // 3. Rate limiting (429 without quota exhaustion keywords)
    if (
      statusVal === 429 ||
      lower.includes("429") ||
      lower.includes("rate limit") ||
      lower.includes("rate_limit") ||
      lower.includes("too many requests")
    ) {
      return "rate_limited";
    }

    // 4. Model unavailable / decommissioned (404)
    if (
      statusVal === 404 ||
      lower.includes("404") ||
      lower.includes("model not found") ||
      lower.includes("model_not_found")
    ) {
      return "model_unavailable";
    }

    // 5. Temporary server / network failures (500, 502, 503, timeout)
    if (
      statusVal === 500 ||
      statusVal === 502 ||
      statusVal === 503 ||
      statusVal === 504 ||
      lower.includes("500") ||
      lower.includes("502") ||
      lower.includes("503") ||
      lower.includes("504") ||
      lower.includes("overloaded") ||
      lower.includes("high demand") ||
      lower.includes("service unavailable") ||
      lower.includes("econnreset") ||
      lower.includes("etimedout") ||
      lower.includes("timeout") ||
      lower.includes("network")
    ) {
      return "temporary_failure";
    }

    return "temporary_failure";
  }

  /**
   * Records a successful completion from a provider.
   */
  static recordSuccess(provider: ProviderKey): void {
    runtimeState[provider] = {
      status: "available",
      lastCheckedAt: Date.now(),
      lastSuccessAt: Date.now(),
      consecutiveFailures: 0,
    };
  }

  /**
   * Records a failed attempt with sanitized categorization.
   */
  static recordError(provider: ProviderKey, error: unknown): { status: ProviderStatus; safeMessage: string } {
    return this.recordFailure(provider, error);
  }

  static recordFailure(provider: ProviderKey, error: unknown): { status: ProviderStatus; safeMessage: string } {
    const status = this.categorizeError(provider, error);
    const raw = error instanceof Error ? error.message : String(error);
    const consecutive = (runtimeState[provider]?.consecutiveFailures || 0) + 1;

    let safeMessage = "Provider request encountered an error.";
    if (status === "auth_error") safeMessage = "Authentication failed. Check your API key in .env.local.";
    if (status === "quota_error") safeMessage = "API quota or credits exhausted.";
    if (status === "rate_limited") safeMessage = "Provider rate limit reached. Backing off temporarily.";
    if (status === "temporary_failure") safeMessage = "Provider temporary failure or network timeout.";
    if (status === "model_unavailable") safeMessage = "Selected model is not supported or unavailable on this provider.";

    runtimeState[provider] = {
      status,
      lastCheckedAt: Date.now(),
      consecutiveFailures: consecutive,
      lastErrorCategory: status,
      lastErrorDetailsSafe: safeMessage,
    };
    return { status, safeMessage };
  }

  /**
   * Returns current internal state for a provider.
   */
  static getStatus(provider: ProviderKey): ProviderRuntimeState & { isConfigured: boolean; state: ProviderStatus } {
    const configured = this.isConfigured(provider);
    const curr = runtimeState[provider];
    const effectiveStatus: ProviderStatus = configured ? curr.status : "not_configured";
    return {
      ...curr,
      status: effectiveStatus,
      state: effectiveStatus,
      isConfigured: configured,
    };
  }

  /**
   * Returns client-safe status information for all providers as a dictionary.
   * NEVER reveals raw secrets or API keys.
   */
  static getSafeStatusSummary(): Record<ProviderKey, SafeProviderStatusSummary> {
    const providers: Array<{ key: ProviderKey; name: string }> = [
      { key: "gemini", name: "Google Gemini" },
      { key: "openai", name: "OpenAI" },
      { key: "anthropic", name: "Anthropic" },
    ];

    const result: Partial<Record<ProviderKey, SafeProviderStatusSummary>> = {};

    for (const { key, name } of providers) {
      const configured = this.isConfigured(key);
      const state = runtimeState[key];
      const effectiveStatus: ProviderStatus = configured ? state.status : "not_configured";

      let statusMessage = "Not configured. Set API key in .env.local to enable.";
      if (configured) {
        switch (state.status) {
          case "available":
            statusMessage = "Operational and verified.";
            break;
          case "configured_unverified":
            statusMessage = "API key configured (ready for request).";
            break;
          case "auth_error":
            statusMessage = "Authentication failed. Check your API key.";
            break;
          case "quota_error":
            statusMessage = "Quota exhausted. Check billing balance.";
            break;
          case "rate_limited":
            statusMessage = "Rate limited. Throttling requests.";
            break;
          case "temporary_failure":
            statusMessage = "Temporary service failure or timeout.";
            break;
          case "model_unavailable":
            statusMessage = "Model not found on provider.";
            break;
        }
      }

      result[key] = {
        providerKey: key,
        displayName: name,
        isConfigured: configured,
        state: effectiveStatus,
        statusMessage,
        lastSuccessAt: state.lastSuccessAt ? new Date(state.lastSuccessAt).toISOString() : undefined,
        lastErrorCategory: state.lastErrorCategory,
      };
    }

    return result as Record<ProviderKey, SafeProviderStatusSummary>;
  }

  /**
   * Resets runtime state and caches (for testing and dev reload).
   */
  static resetCache(): void {
    this.resetRuntimeState();
  }

  static resetRuntimeState(): void {
    runtimeState.openai = { status: "configured_unverified", lastCheckedAt: 0, consecutiveFailures: 0 };
    runtimeState.anthropic = { status: "configured_unverified", lastCheckedAt: 0, consecutiveFailures: 0 };
    runtimeState.gemini = { status: "configured_unverified", lastCheckedAt: 0, consecutiveFailures: 0 };
  }
}
