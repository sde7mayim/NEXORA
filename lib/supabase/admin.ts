import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type SupabaseConnectionCode =
  | "CONNECTED"
  | "NOT_CONFIGURED"
  | "INVALID_CREDENTIALS"
  | "DATABASE_UNAVAILABLE"
  | "AUTHENTICATION_FAILURE"
  | "SCHEMA_NOT_READY";

export interface SupabaseHealthCheckResult {
  statusCode: SupabaseConnectionCode;
  message: string;
  details?: string;
  projectRef?: string;
  isConfigured: boolean;
  isOnline: boolean;
  migrationReady: boolean;
  tables?: {
    apiKeys: boolean;
    apiUsage: boolean;
  };
  checkedAt: string;
}

export interface SupabaseConfigStatus {
  hasUrl: boolean;
  hasServiceKey: boolean;
  hasAnonKey: boolean;
  isPlaceholderUrl: boolean;
  isPlaceholderKey: boolean;
  isPlaceholderClientKey: boolean;
  isNewSecretFormat: boolean;
  isNewPublishableFormat: boolean;
  keyFormatValid: boolean;
  clientKeyFormatValid: boolean;
  projectRef?: string;
  activeSecretVar: "SUPABASE_SECRET_KEY" | "SUPABASE_SERVICE_ROLE_KEY" | "none";
  activeClientVar: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" | "NEXT_PUBLIC_SUPABASE_ANON_KEY" | "none";
}

/**
 * Validates the format of a Supabase secret key without exposing its content.
 * Accepts new secret key format ('sb_secret_...') and legacy JWT service role ('eyJ...').
 */
export function isValidSecretKeyFormat(key: string): boolean {
  if (!key) return false;
  const clean = key.trim();
  if (clean.includes("placeholder") || clean.includes("...your-")) return false;
  if (clean.startsWith("sb_secret_") && clean.length >= 25) return true;
  if (clean.startsWith("eyJ") && clean.split(".").length === 3) return true;
  return false;
}

/**
 * Validates the format of a Supabase publishable / anon key without exposing its content.
 * Accepts new publishable key format ('sb_publishable_...') and legacy JWT anon ('eyJ...').
 */
export function isValidPublishableKeyFormat(key: string): boolean {
  if (!key) return false;
  const clean = key.trim();
  if (clean.includes("placeholder") || clean.includes("...your-")) return false;
  if (clean.startsWith("sb_publishable_") && clean.length >= 25) return true;
  if (clean.startsWith("eyJ") && clean.split(".").length === 3) return true;
  return false;
}

/**
 * Creates an administrative Supabase client using server secret credentials.
 * Prefers SUPABASE_SECRET_KEY (new format: sb_secret_...), falling back to legacy SUPABASE_SERVICE_ROLE_KEY.
 * Configured strictly for server-side admin operations:
 * - persistSession: false
 * - autoRefreshToken: false
 * - detectSessionInUrl: false
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer new SUPABASE_SECRET_KEY, fallback to legacy SUPABASE_SERVICE_ROLE_KEY
  const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    supabaseUrl.includes("placeholder") ||
    supabaseUrl.includes("your-project")
  ) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not configured. Server administrative operations require a valid Supabase project URL."
    );
  }

  if (
    !secretKey ||
    secretKey.includes("...your-service-role-key") ||
    secretKey.includes("...your-secret-key") ||
    secretKey.includes("placeholder")
  ) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. Server administrative operations require service role credentials."
    );
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Inspects environment configuration safely without throwing or leaking credentials.
 * Prefers new variable names (SUPABASE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
 * with backward compatibility for legacy names.
 */
export function getSupabaseConfig(): SupabaseConfigStatus {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  // Prefer SUPABASE_SECRET_KEY, fallback to SUPABASE_SERVICE_ROLE_KEY
  const hasSecretKey = Boolean(process.env.SUPABASE_SECRET_KEY);
  const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const activeSecretVar: "SUPABASE_SECRET_KEY" | "SUPABASE_SERVICE_ROLE_KEY" | "none" =
    hasSecretKey
      ? "SUPABASE_SECRET_KEY"
      : process.env.SUPABASE_SERVICE_ROLE_KEY
        ? "SUPABASE_SERVICE_ROLE_KEY"
        : "none";

  // Prefer NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, fallback to NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasPublishableKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  const activeClientVar: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" | "NEXT_PUBLIC_SUPABASE_ANON_KEY" | "none" =
    hasPublishableKey
      ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        : "none";

  const isPlaceholderUrl =
    !supabaseUrl ||
    supabaseUrl.includes("placeholder") ||
    supabaseUrl.includes("your-project");

  const isPlaceholderKey =
    !secretKey ||
    secretKey.includes("...your-service-role-key") ||
    secretKey.includes("...your-secret-key") ||
    secretKey.includes("placeholder");

  const isPlaceholderClientKey =
    !publishableKey ||
    publishableKey.includes("...your-anon-key") ||
    publishableKey.includes("...your-publishable-key") ||
    publishableKey.includes("placeholder");

  const isNewSecretFormat = secretKey.startsWith("sb_secret_");
  const isNewPublishableFormat = publishableKey.startsWith("sb_publishable_");

  const keyFormatValid = !isPlaceholderKey && isValidSecretKeyFormat(secretKey);
  const clientKeyFormatValid = !isPlaceholderClientKey && isValidPublishableKeyFormat(publishableKey);

  // Extract project ref from URL if standard Supabase domain
  let projectRef: string | undefined;
  try {
    const match = supabaseUrl.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i);
    if (match && match[1] && match[1] !== "your-project") {
      projectRef = match[1];
    }
  } catch {
    // Ignore URL parse failure
  }

  return {
    hasUrl: Boolean(supabaseUrl),
    hasServiceKey: Boolean(secretKey),
    hasAnonKey: Boolean(publishableKey),
    isPlaceholderUrl,
    isPlaceholderKey,
    isPlaceholderClientKey,
    isNewSecretFormat,
    isNewPublishableFormat,
    keyFormatValid,
    clientKeyFormatValid,
    projectRef,
    activeSecretVar,
    activeClientVar,
  };
}

// In-process cache to prevent redundant remote network roundtrips on rapid requests
let cachedHealthResult: SupabaseHealthCheckResult | null = null;
let lastHealthCheckTimestamp = 0;
const HEALTH_CACHE_TTL_MS = 45_000; // 45 seconds TTL

/**
 * Resets the health check cache (useful for testing or manual user refresh)
 */
export function resetSupabaseHealthCache(): void {
  cachedHealthResult = null;
  lastHealthCheckTimestamp = 0;
}

/**
 * Performs a comprehensive, honest health check against the Supabase database.
 * Distinguishes between:
 * - CONNECTED: Database reachable and schema ready
 * - NOT_CONFIGURED: Missing or placeholder environment variables
 * - INVALID_CREDENTIALS: Project URL or keys malformed
 * - DATABASE_UNAVAILABLE: Network timeout or unreachable
 * - AUTHENTICATION_FAILURE: 401/403 credentials rejected
 * - SCHEMA_NOT_READY: Database authenticated, but migration tables not yet applied
 */
export async function checkSupabaseHealth(options?: {
  forceRefresh?: boolean;
}): Promise<SupabaseHealthCheckResult> {
  const now = Date.now();
  if (
    !options?.forceRefresh &&
    cachedHealthResult &&
    now - lastHealthCheckTimestamp < HEALTH_CACHE_TTL_MS
  ) {
    return cachedHealthResult;
  }

  const config = getSupabaseConfig();
  const checkedAt = new Date().toISOString();

  // 1. Missing or placeholder configuration
  if (config.isPlaceholderUrl || config.isPlaceholderKey) {
    const result: SupabaseHealthCheckResult = {
      statusCode: "NOT_CONFIGURED",
      message:
        "Supabase credentials not configured in .env.local. API key storage is currently operating in ephemeral in-memory mode. Keys will be lost on server restart.",
      details:
        config.isPlaceholderUrl && config.isPlaceholderKey
          ? "Both NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are placeholders."
          : config.isPlaceholderUrl
            ? "NEXT_PUBLIC_SUPABASE_URL is missing or contains placeholder."
            : "SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY is missing or contains placeholder.",
      projectRef: config.projectRef,
      isConfigured: false,
      isOnline: false,
      migrationReady: false,
      checkedAt,
    };
    cachedHealthResult = result;
    lastHealthCheckTimestamp = now;
    return result;
  }

  // 2. Validate URL formatting
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  try {
    const parsed = new URL(supabaseUrl);
    if (!parsed.protocol.startsWith("http")) {
      const result: SupabaseHealthCheckResult = {
        statusCode: "INVALID_CREDENTIALS",
        message: "NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP/HTTPS URL.",
        projectRef: config.projectRef,
        isConfigured: false,
        isOnline: false,
        migrationReady: false,
        checkedAt,
      };
      cachedHealthResult = result;
      lastHealthCheckTimestamp = now;
      return result;
    }
  } catch {
    const result: SupabaseHealthCheckResult = {
      statusCode: "INVALID_CREDENTIALS",
      message: "NEXT_PUBLIC_SUPABASE_URL contains a malformed URL.",
      projectRef: config.projectRef,
      isConfigured: false,
      isOnline: false,
      migrationReady: false,
      checkedAt,
    };
    cachedHealthResult = result;
    lastHealthCheckTimestamp = now;
    return result;
  }

  // 3. Validate Secret Key Format before attempting remote connection
  if (!config.keyFormatValid) {
    const result: SupabaseHealthCheckResult = {
      statusCode: "INVALID_CREDENTIALS",
      message:
        "Supabase secret key format is invalid. Expected new secret key format ('sb_secret_...') or legacy JWT format ('eyJ...').",
      details: "Configured secret key does not match recognized Supabase token formats.",
      projectRef: config.projectRef,
      isConfigured: true,
      isOnline: false,
      migrationReady: false,
      checkedAt,
    };
    cachedHealthResult = result;
    lastHealthCheckTimestamp = now;
    return result;
  }

  // 4. Perform live connection and schema check
  try {
    const admin = createAdminClient();

    // Query api_keys table with strict timeout
    const keysPromise = admin.from("api_keys").select("id").limit(1);
    const timeoutPromise = new Promise<{ data: null; error: { message: string; code: string } }>(
      (_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout: Supabase did not respond within 5000ms")), 5000)
    );

    const { error: keysError } = await (Promise.race([
      keysPromise,
      timeoutPromise,
    ]) as Promise<{ data: any; error: any }>);

    if (keysError) {
      const errCode = keysError.code || "";
      const errMsg = (keysError.message || "").toLowerCase();

      // Check for authentication failure (401, 403, invalid JWT, invalid API key, secret API key required)
      if (
        errCode === "PGRST301" ||
        keysError.status === 401 ||
        keysError.status === 403 ||
        errMsg.includes("jwt") ||
        errMsg.includes("invalid api key") ||
        errMsg.includes("secret api key required") ||
        errMsg.includes("unauthorized")
      ) {
        const result: SupabaseHealthCheckResult = {
          statusCode: "AUTHENTICATION_FAILURE",
          message:
            "Supabase rejected credentials (401/403). Check SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env.local.",
          details: keysError.message,
          projectRef: config.projectRef,
          isConfigured: true,
          isOnline: false,
          migrationReady: false,
          checkedAt,
        };
        cachedHealthResult = result;
        lastHealthCheckTimestamp = now;
        return result;
      }

      // Check for schema missing (table does not exist in database / schema cache)
      if (
        errCode === "42P01" ||
        errCode === "PGRST204" ||
        errCode === "PGRST205" ||
        errMsg.includes("relation") ||
        errMsg.includes("does not exist") ||
        errMsg.includes("could not find the table") ||
        errMsg.includes("could not find the 'api_keys' table")
      ) {
        const result: SupabaseHealthCheckResult = {
          statusCode: "SCHEMA_NOT_READY",
          message:
            "Database connected and authenticated, but migration tables (api_keys, api_usage) are not yet applied. Run migration 20261115000001_api_keys_and_usage_platform.sql in Supabase SQL Editor.",
          details: keysError.message,
          projectRef: config.projectRef,
          isConfigured: true,
          isOnline: true,
          migrationReady: false,
          tables: {
            apiKeys: false,
            apiUsage: false,
          },
          checkedAt,
        };
        cachedHealthResult = result;
        lastHealthCheckTimestamp = now;
        return result;
      }

      // General database or reachability error
      const result: SupabaseHealthCheckResult = {
        statusCode: "DATABASE_UNAVAILABLE",
        message: `Database error: ${keysError.message || "Failed to communicate with Supabase"}`,
        details: keysError.message,
        projectRef: config.projectRef,
        isConfigured: true,
        isOnline: false,
        migrationReady: false,
        checkedAt,
      };
      cachedHealthResult = result;
      lastHealthCheckTimestamp = now;
      return result;
    }

    // Check api_usage table as well
    const { error: usageError } = await admin.from("api_usage").select("id").limit(1);

    if (usageError) {
      const result: SupabaseHealthCheckResult = {
        statusCode: "SCHEMA_NOT_READY",
        message:
          "api_keys table exists, but api_usage table is missing. Run migration 20261115000001_api_keys_and_usage_platform.sql in Supabase SQL Editor.",
        details: usageError.message,
        projectRef: config.projectRef,
        isConfigured: true,
        isOnline: true,
        migrationReady: false,
        tables: {
          apiKeys: true,
          apiUsage: false,
        },
        checkedAt,
      };
      cachedHealthResult = result;
      lastHealthCheckTimestamp = now;
      return result;
    }

    // Both tables verified and accessible
    const result: SupabaseHealthCheckResult = {
      statusCode: "CONNECTED",
      message: "Connected to Supabase PostgreSQL. Tables verified and ready.",
      projectRef: config.projectRef,
      isConfigured: true,
      isOnline: true,
      migrationReady: true,
      tables: {
        apiKeys: true,
        apiUsage: true,
      },
      checkedAt,
    };
    cachedHealthResult = result;
    lastHealthCheckTimestamp = now;
    return result;
  } catch (err: any) {
    const errMsg = (err?.message || "").toLowerCase();

    // Check if network / reachability issue
    const isNetworkError =
      errMsg.includes("fetch failed") ||
      errMsg.includes("enotfound") ||
      errMsg.includes("econnrefused") ||
      errMsg.includes("timeout") ||
      errMsg.includes("network");

    const statusCode: SupabaseConnectionCode = isNetworkError
      ? "DATABASE_UNAVAILABLE"
      : "AUTHENTICATION_FAILURE";

    const result: SupabaseHealthCheckResult = {
      statusCode,
      message: isNetworkError
        ? `Database unreachable: ${err.message}. Check network connection and Supabase project status.`
        : `Supabase connection error: ${err.message}`,
      details: err.message,
      projectRef: config.projectRef,
      isConfigured: true,
      isOnline: false,
      migrationReady: false,
      checkedAt,
    };
    cachedHealthResult = result;
    lastHealthCheckTimestamp = now;
    return result;
  }
}
