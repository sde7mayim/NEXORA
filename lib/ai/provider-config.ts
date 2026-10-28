import fs from "fs";
import path from "path";

export type ProviderKey = "openai" | "anthropic" | "gemini";

export type ProviderOperationalStatus =
  | "not_configured"
  | "configured_unverified"
  | "available"
  | "auth_error"
  | "quota_or_billing_error"
  | "rate_limited"
  | "temporary_failure"
  | "model_unavailable";

export interface ProviderDiagnosticInfo {
  providerKey: ProviderKey;
  displayName: string;
  envVarName: string;
  isConfigured: boolean;
  status: ProviderOperationalStatus;
  lastErrorCategory?: string;
  lastErrorMessage?: string;
  lastCheckedAt?: number;
  lastSuccessAt?: number;
}

export class ProviderConfig {
  private static statusMap = new Map<ProviderKey, {
    status: ProviderOperationalStatus;
    lastErrorCategory?: string;
    lastErrorMessage?: string;
    lastCheckedAt?: number;
    lastSuccessAt?: number;
  }>();

  private static readonly PLACEHOLDER_PREFIXES = [
    "sk-...your",
    "sk-ant-...your",
    "AQ...your",
    "your-",
    "placeholder",
    "test-placeholder",
    "...",
  ];

  /**
   * Safe helper to read environment variable with fallback to local files in dev/standalone test runtimes.
   */
  private static readEnvVar(name: string): string {
    // 1. First priority: process.env (populated by Next.js or shell)
    const val = process.env[name];
    if (val && typeof val === "string" && val.trim().length > 0) {
      return val.trim();
    }

    // 2. Safe fallback for direct test runs or detached scripts: read .env.local or .env
    try {
      const candidates = [".env.local", ".env"];
      for (const file of candidates) {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf8");
          const regex = new RegExp(`^${name}=(.*)$`, "m");
          const match = content.match(regex);
          if (match && match[1]) {
            const parsed = match[1].trim().replace(/^["']|["']$/g, "");
            if (parsed.length > 0) return parsed;
          }
        }
      }
    } catch {
      // Fallback silently if filesystem cannot be read
    }

    return "";
  }

  /**
   * Checks if an API key value is a genuine key rather than empty or placeholder template.
   */
  static isRealKey(val: string | undefined | null): boolean {
    if (!val || typeof val !== "string") return false;
    const trimmed = val.trim();
    if (trimmed.length < 10) return false;

    for (const prefix of this.PLACEHOLDER_PREFIXES) {
      if (trimmed.includes(prefix)) return false;
    }

    return true;
  }

  /**
   * Retrieves the raw API key for a provider on the server side only.
   * Never expose this to client responses, logs, or telemetry.
   */
  static getApiKey(provider: ProviderKey): string {
    switch (provider) {
      case "openai":
        return this.readEnvVar("OPENAI_API_KEY");
      case "anthropic":
        return this.readEnvVar("ANTHROPIC_API_KEY");
      case "gemini": {
        // Support GEMINI_API_KEY (primary) and GOOGLE_API_KEY (canonical fallback)
        const geminiKey = this.readEnvVar("GEMINI_API_KEY");
        if (this.isRealKey(geminiKey)) return geminiKey;
        return this.readEnvVar("GOOGLE_API_KEY");
      }
      default:
        return "";
    }
  }

  /**
   * Returns whether a provider has a validly configured API key in the environment.
   */
  static isConfigured(provider: ProviderKey): boolean {
    const key = this.getApiKey(provider);
    return this.isRealKey(key);
  }

  /**
   * Returns list of currently configured provider keys.
   */
  static getConfiguredProviders(): ProviderKey[] {
    const providers: ProviderKey[] = ["openai", "anthropic", "gemini"];
    return providers.filter((p) => this.isConfigured(p));
  }

  /**
   * Returns public, non-secret diagnostic status for a specific provider.
   */
  static getStatus(provider: ProviderKey): ProviderOperationalStatus {
    if (!this.isConfigured(provider)) {
      return "not_configured";
    }

    const state = this.statusMap.get(provider);
    if (!state || state.status === "not_configured") {
      return "configured_unverified";
    }

    return state.status;
  }

  /**
   * Records a successful live request for a provider, marking it available.
   */
  static recordSuccess(provider: ProviderKey): void {
    const now = Date.now();
    this.statusMap.set(provider, {
      status: "available",
      lastSuccessAt: now,
      lastCheckedAt: now,
    });
  }

  /**
   * Categorizes an error and updates the provider operational status accordingly.
   */
  static recordError(provider: ProviderKey, error: Error | any): ProviderOperationalStatus {
    const now = Date.now();
    const msg = String(error?.message || error || "");
    const status = (error as any)?.status || (error as any)?.statusCode;

    let category: ProviderOperationalStatus = "temporary_failure";

    // 1. Check for unconfigured
    if (!this.isConfigured(provider) || msg.includes("not configured")) {
      category = "not_configured";
    }
    // 2. Authentication error
    else if (
      status === 401 ||
      msg.includes("401") ||
      /invalid[\s_-]?api[\s_-]?key/i.test(msg) ||
      /authentication/i.test(msg) ||
      /unauthorized/i.test(msg)
    ) {
      category = "auth_error";
    }
    // 3. Quota or Billing error
    else if (
      /insufficient_quota/i.test(msg) ||
      /billing/i.test(msg) ||
      /quota/i.test(msg) ||
      /credit/i.test(msg) ||
      /exceeded your current quota/i.test(msg)
    ) {
      category = "quota_or_billing_error";
    }
    // 4. Rate limited (concurrency / TPM / RPM)
    else if (
      status === 429 ||
      msg.includes("429") ||
      /rate[\s_-]?limit/i.test(msg) ||
      /too many requests/i.test(msg)
    ) {
      category = "rate_limited";
    }
    // 5. Model not found or unavailable
    else if (
      status === 404 ||
      /model_not_found/i.test(msg) ||
      /does not exist/i.test(msg) ||
      /unsupported model/i.test(msg)
    ) {
      category = "model_unavailable";
    }
    // 6. Temporary service or network failure
    else {
      category = "temporary_failure";
    }

    // Mask any secrets from error message before storing in diagnostics
    const sanitizedMsg = msg
      .replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_API_KEY]")
      .replace(/sk-ant-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_API_KEY]")
      .replace(/key=[^&\s]+/g, "key=[REDACTED]")
      .slice(0, 150);

    this.statusMap.set(provider, {
      status: category,
      lastErrorCategory: category,
      lastErrorMessage: sanitizedMsg,
      lastCheckedAt: now,
    });

    return category;
  }

  /**
   * Returns safe, client-facing status for all providers.
   * Absolutely zero secrets or sensitive keys are returned.
   */
  static getAllDiagnostics(): ProviderDiagnosticInfo[] {
    const list: Array<{ key: ProviderKey; name: string; env: string }> = [
      { key: "openai", name: "OpenAI", env: "OPENAI_API_KEY" },
      { key: "anthropic", name: "Anthropic", env: "ANTHROPIC_API_KEY" },
      { key: "gemini", name: "Google Gemini", env: "GEMINI_API_KEY (or GOOGLE_API_KEY)" },
    ];

    return list.map((item) => {
      const isConfig = this.isConfigured(item.key);
      const state = this.statusMap.get(item.key);
      const status = isConfig
        ? state?.status || "configured_unverified"
        : "not_configured";

      return {
        providerKey: item.key,
        displayName: item.name,
        envVarName: item.env,
        isConfigured: isConfig,
        status,
        lastErrorCategory: state?.lastErrorCategory,
        lastErrorMessage: state?.lastErrorMessage,
        lastCheckedAt: state?.lastCheckedAt,
        lastSuccessAt: state?.lastSuccessAt,
      };
    });
  }

  /**
   * Resets internal status cache (for tests or manual refresh).
   */
  static reset(): void {
    this.statusMap.clear();
  }
}
