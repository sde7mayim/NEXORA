/**
 * NEXORA NATIVE API KEY GENERATION & MANAGEMENT ENGINE
 *
 * Implements cryptographically secure API key issuance, constant-time verification,
 * scoped authorization, sliding-window rate limiting, and detailed usage analytics.
 *
 * Formats:
 * - Live keys: nx_live_<64-hex-secret>
 * - Test keys: nx_test_<64-hex-secret>
 *
 * Security:
 * - High-entropy keys generated using Node.js crypto.randomBytes (never Math.random).
 * - Only SHA-256 hash is persisted in the database; raw secret is returned ONLY ONCE.
 * - Constant-time comparison prevents timing attacks.
 * - Complete bearer tokens and cryptographic hashes are never returned in public listings.
 * - Strict multi-tenant user isolation enforced on all operations.
 */

import crypto from "crypto";
import {
  createAdminClient,
  checkSupabaseHealth,
  getSupabaseConfig,
  type SupabaseConnectionCode,
  type SupabaseHealthCheckResult,
} from "@/lib/supabase/admin";

export type { SupabaseConnectionCode, SupabaseHealthCheckResult };

export type ApiKeyEnvironment = "live" | "test";

export type ApiKeyScope =
  | "lyrics:generate"
  | "images:generate"
  | "music:generate"
  | "videos:generate"
  | "models:read"
  | "chat:write"
  | "knowledge:read"
  | "workflows:run"
  | "usage:read"
  | "keys:manage"
  | "*";

export interface ApiKeyRecord {
  id: string;
  userId: string;
  orgId?: string;
  name: string;
  keyPrefix: string; // e.g. "nx_live_9a7b1c3e..."
  keyHash: string;
  environment: ApiKeyEnvironment;
  scopes: ApiKeyScope[];
  rateLimit: number; // Max requests per minute (e.g. 60)
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  persisted?: boolean;
}

export type SanitizedApiKey = Omit<ApiKeyRecord, "keyHash">;

export interface ApiKeyUsageEvent {
  id: string;
  apiKeyId: string;
  userId: string;
  requestId: string;
  endpoint: string;
  provider?: string;
  model?: string;
  status: number;
  usageUnits: number;
  createdAt: string;
  // Legacy aliases for backward compatibility
  keyId?: string;
  statusCode?: number;
  tokensUsed?: number;
  timestamp?: string;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
  reset: number;
}

export interface AuthenticateKeyResult {
  valid: boolean;
  record?: ApiKeyRecord;
  error?: string;
  statusCode: number;
  rateLimitInfo?: RateLimitCheckResult;
}

export interface PersistenceStatus {
  statusCode: SupabaseConnectionCode;
  isConfigured: boolean;
  storageMode: "supabase" | "in-memory-ephemeral";
  migrationReady: boolean;
  isOnline: boolean;
  isProduction: boolean;
  productionBlocked: boolean;
  message: string;
  details?: string;
  projectRef?: string;
  tables?: {
    apiKeys: boolean;
    apiUsage: boolean;
  };
}

export interface RateLimitingStatus {
  strategy: "sliding-window";
  scope: "process-local";
  isDistributed: boolean;
  concurrencySafe: boolean;
  message: string;
}

// In-Memory store for instantaneous zero-latency lookups & offline development
const inMemoryKeys: Map<string, ApiKeyRecord> = new Map();
const inMemoryUsage: ApiKeyUsageEvent[] = [];
// Sliding window rate limit tracker: Map<apiKeyId, timestamp[]>
const rateLimitBuckets: Map<string, number[]> = new Map();

/**
 * Safely initializes Supabase admin client if credentials are configured
 */
function getSupabaseAdmin() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export class ApiKeyService {
  /**
   * Hashes raw secret token using SHA-256 for secure constant-time lookup.
   */
  static hashSecret(secret: string): string {
    return crypto.createHash("sha256").update(secret.trim()).digest("hex");
  }

  /**
   * Truthfully inspects whether Supabase database persistence is active or in ephemeral session mode.
   * Fast synchronous check based on environment configuration.
   */
  static getPersistenceStatus(): PersistenceStatus {
    const config = getSupabaseConfig();
    const isProduction = process.env.NODE_ENV === "production";
    const isConfigured = !config.isPlaceholderUrl && !config.isPlaceholderKey;
    const productionBlocked = isProduction && !isConfigured;

    if (!isConfigured) {
      return {
        statusCode: "NOT_CONFIGURED",
        isConfigured: false,
        storageMode: "in-memory-ephemeral",
        migrationReady: false,
        isOnline: false,
        isProduction,
        productionBlocked,
        message: isProduction
          ? "CRITICAL: Supabase credentials not configured in production environment. API key creation is disabled to prevent ephemeral data loss."
          : "Supabase service role credentials not configured in .env.local. API key storage is currently operating in ephemeral in-memory mode. Keys will be lost on server restart.",
        details:
          config.isPlaceholderUrl && config.isPlaceholderKey
            ? "Both NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are placeholders."
            : config.isPlaceholderUrl
              ? "NEXT_PUBLIC_SUPABASE_URL is missing or contains placeholder."
              : "SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY is missing or contains placeholder.",
        projectRef: config.projectRef,
      };
    }

    return {
      statusCode: "CONNECTED",
      isConfigured: true,
      storageMode: "supabase",
      migrationReady: true,
      isOnline: true,
      isProduction,
      productionBlocked: false,
      message: "Connected to Supabase PostgreSQL. API keys and usage telemetry are persistently stored.",
      projectRef: config.projectRef,
    };
  }

  /**
   * Asynchronous check that tests live database connectivity and schema readiness.
   * Results are cached with TTL (45s) to avoid redundant network roundtrips.
   */
  static async getPersistenceStatusAsync(options?: {
    forceRefresh?: boolean;
  }): Promise<PersistenceStatus> {
    const isProduction = process.env.NODE_ENV === "production";
    const health = await checkSupabaseHealth(options);
    const productionBlocked = isProduction && !health.isConfigured;

    return {
      statusCode: health.statusCode,
      isConfigured: health.isConfigured,
      storageMode: health.isConfigured ? "supabase" : "in-memory-ephemeral",
      migrationReady: health.migrationReady,
      isOnline: health.isOnline,
      isProduction,
      productionBlocked,
      message: health.message,
      details: health.details,
      projectRef: health.projectRef,
      tables: health.tables,
    };
  }

  /**
   * Returns rate limiting architecture status.
   */
  static getRateLimitingStatus(): RateLimitingStatus {
    return {
      strategy: "sliding-window",
      scope: "process-local",
      isDistributed: false,
      concurrencySafe: true,
      message:
        "Rate limiting is enforced via an in-memory sliding window per Node.js server process. Distributed multi-region synchronization requires Redis/Upstash connection.",
    };
  }

  /**
   * Generates a cryptographically secure random API key.
   * Returns the raw secret strictly ONCE.
   */
  static createApiKey(
    params: {
      name: string;
      userId: string;
      orgId?: string;
      environment?: ApiKeyEnvironment;
      scopes?: ApiKeyScope[];
      rateLimit?: number;
      expiresInDays?: number;
    },
    options?: { syncToDb?: boolean }
  ): { record: ApiKeyRecord; rawSecret: string } {
    const name = params.name.trim();
    if (!name) {
      throw new Error("API key name is required.");
    }

    const persistence = this.getPersistenceStatus();
    const isProduction = process.env.NODE_ENV === "production";

    // Strict safety check: Never permit ephemeral key creation in production
    if (isProduction && !persistence.isConfigured) {
      throw new Error(
        "API key creation rejected: Persistent database storage is required in production environment. Supabase credentials (SUPABASE_SERVICE_ROLE_KEY) are not configured or unreachable. In-memory ephemeral keys are strictly disabled in production."
      );
    }

    const environment: ApiKeyEnvironment = params.environment === "test" ? "test" : "live";
    const entropyBytes = crypto.randomBytes(32); // 256 bits of cryptographically secure entropy
    const secretPart = entropyBytes.toString("hex");
    const rawSecret = `nx_${environment}_${secretPart}`;
    const keyPrefix = rawSecret.slice(0, 14) + "...";
    const keyHash = this.hashSecret(rawSecret);

    let expiresAt: string | undefined;
    if (params.expiresInDays && params.expiresInDays > 0) {
      expiresAt = new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    }

    const id = crypto.randomUUID();
    const rateLimit = params.rateLimit && params.rateLimit > 0 ? params.rateLimit : environment === "test" ? 30 : 60;
    const scopes: ApiKeyScope[] =
      params.scopes && params.scopes.length > 0
        ? params.scopes
        : ["models:read", "chat:write", "lyrics:generate", "images:generate"];

    const fullRecord: ApiKeyRecord = {
      id,
      userId: params.userId,
      orgId: params.orgId,
      name,
      keyPrefix,
      keyHash,
      environment,
      scopes,
      rateLimit,
      createdAt: new Date().toISOString(),
      expiresAt,
      persisted: false,
    };

    // 1. Store in memory cache
    inMemoryKeys.set(keyHash, fullRecord);

    // 2. Synchronize to Supabase in background if syncToDb is true (default is true when called standalone)
    const shouldSync = options?.syncToDb !== false;
    if (shouldSync && persistence.isConfigured) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        Promise.resolve(
          supabase.from("api_keys").insert({
            id,
            user_id: params.userId,
            org_id: params.orgId || null,
            name,
            key_prefix: keyPrefix,
            key_hash: keyHash,
            environment,
            scopes,
            rate_limit: rateLimit,
            expires_at: expiresAt || null,
            created_at: fullRecord.createdAt,
          })
        ).then(
          ({ error }: any) => {
            if (error) {
              console.warn("[ApiKeyService] Supabase persistence error:", error.message);
              fullRecord.persisted = false;
            } else {
              fullRecord.persisted = true;
            }
          },
          (err: any) => {
            console.warn("[ApiKeyService] Supabase connectivity error:", err?.message);
            fullRecord.persisted = false;
          }
        );
      }
    }

    return {
      record: fullRecord,
      rawSecret,
    };
  }

  /**
   * Asynchronous creation that strictly awaits and guarantees database persistence when configured.
   * Throws in production if persistence fails.
   */
  static async createApiKeyAsync(params: {
    name: string;
    userId: string;
    orgId?: string;
    environment?: ApiKeyEnvironment;
    scopes?: ApiKeyScope[];
    rateLimit?: number;
    expiresInDays?: number;
  }): Promise<{ record: ApiKeyRecord; rawSecret: string; warning?: string }> {
    const isProduction = process.env.NODE_ENV === "production";
    const persistence = this.getPersistenceStatus();

    if (isProduction && !persistence.isConfigured) {
      throw new Error(
        "API key creation rejected: Persistent database storage is required in production environment. Supabase credentials (SUPABASE_SERVICE_ROLE_KEY) are not configured or unreachable. In-memory ephemeral keys are strictly disabled in production."
      );
    }

    // Call createApiKey with syncToDb: false to prevent duplicate insert race condition
    const { record, rawSecret } = this.createApiKey(params, { syncToDb: false });

    if (persistence.isConfigured) {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        if (isProduction) {
          inMemoryKeys.delete(record.keyHash);
          throw new Error("Persistent database client could not be initialized in production.");
        }
      } else {
        const { error } = await supabase.from("api_keys").insert({
          id: record.id,
          user_id: record.userId,
          org_id: record.orgId || null,
          name: record.name,
          key_prefix: record.keyPrefix,
          key_hash: record.keyHash,
          environment: record.environment,
          scopes: record.scopes,
          rate_limit: record.rateLimit,
          expires_at: record.expiresAt || null,
          created_at: record.createdAt,
        });

        if (error) {
          if (isProduction) {
            inMemoryKeys.delete(record.keyHash);
            throw new Error(`Database persistence failure in production: ${error.message}`);
          } else {
            console.warn("[ApiKeyService] Failed to persist key to Supabase:", error.message);
            record.persisted = false;
          }
        } else {
          record.persisted = true;
        }
      }
    }

    const warning = !persistence.isConfigured
      ? "Running in development ephemeral mode. This API key is stored in memory and will reset when the server restarts."
      : undefined;

    return { record, rawSecret, warning };
  }

  /**
   * Asynchronously authenticates and authorizes an API key.
   * Checks process-local cache first for sub-millisecond execution, and on cache miss
   * queries Supabase to ensure keys survive server restarts.
   */
  static async authenticateKeyAsync(
    rawKey: string,
    requiredScope?: ApiKeyScope
  ): Promise<AuthenticateKeyResult> {
    if (!rawKey || typeof rawKey !== "string") {
      return {
        valid: false,
        statusCode: 401,
        error: "Missing API key in Authorization header. Expected 'Authorization: Bearer nx_live_...'",
      };
    }

    const cleanKey = rawKey.replace(/^Bearer\s+/i, "").trim();

    // 1. Format validation (nx_live_ or nx_test_ followed by 32-64 hex chars)
    const formatRegex = /^nx_(live|test)_[a-f0-9]{32,64}$/i;
    if (!formatRegex.test(cleanKey)) {
      return {
        valid: false,
        statusCode: 401,
        error: "Invalid API key format. Expected format 'nx_live_<secret>' or 'nx_test_<secret>'.",
      };
    }

    // 2. Compute hash
    const computedHash = this.hashSecret(cleanKey);
    let record = inMemoryKeys.get(computedHash);

    // 3. Cache-miss lookup in Supabase (survives application restarts)
    const persistence = this.getPersistenceStatus();
    const isProduction = process.env.NODE_ENV === "production";

    if (!record && persistence.isConfigured) {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        if (isProduction) {
          return {
            valid: false,
            statusCode: 503,
            error: "Database persistence error: persistent database client could not be initialized.",
          };
        }
      } else {
        const { data, error } = await supabase
          .from("api_keys")
          .select("*")
          .eq("key_hash", computedHash)
          .maybeSingle();

        if (error) {
          if (isProduction) {
            return {
              valid: false,
              statusCode: 503,
              error: `Database persistence error: ${error.message}`,
            };
          }
          console.warn("[ApiKeyService] Supabase authentication lookup error:", error.message);
        } else if (data) {
          record = {
            id: data.id,
            userId: data.user_id,
            orgId: data.org_id || undefined,
            name: data.name,
            keyPrefix: data.key_prefix,
            keyHash: data.key_hash,
            environment: data.environment,
            scopes: data.scopes,
            rateLimit: data.rate_limit,
            createdAt: data.created_at,
            lastUsedAt: data.last_used_at || undefined,
            expiresAt: data.expires_at || undefined,
            revokedAt: data.revoked_at || undefined,
            persisted: true,
          };
          inMemoryKeys.set(computedHash, record);
        }
      }
    }

    if (!record) {
      return {
        valid: false,
        statusCode: 401,
        error: "API key does not exist or has been revoked.",
      };
    }

    // 4. Constant-time comparison
    const recordHashBuffer = Buffer.from(record.keyHash, "hex");
    const computedHashBuffer = Buffer.from(computedHash, "hex");
    if (
      recordHashBuffer.length !== computedHashBuffer.length ||
      !crypto.timingSafeEqual(recordHashBuffer, computedHashBuffer)
    ) {
      return {
        valid: false,
        statusCode: 401,
        error: "API key authentication failed.",
      };
    }

    // 5. Revocation status
    if (record.revokedAt) {
      return {
        valid: false,
        statusCode: 401,
        error: "API key has been revoked and is no longer valid.",
      };
    }

    // 6. Expiration check
    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      return {
        valid: false,
        statusCode: 401,
        error: "API key has expired.",
      };
    }

    // 7. Sliding-window rate limit enforcement (per minute)
    const rateLimitResult = this.checkRateLimit(record.id, record.rateLimit);
    if (!rateLimitResult.allowed) {
      return {
        valid: false,
        statusCode: 429,
        error: `Rate limit exceeded. Maximum ${record.rateLimit} requests per minute allowed. Try again in ${rateLimitResult.retryAfterSeconds}s.`,
        rateLimitInfo: rateLimitResult,
      };
    }

    // 8. Scope authorization check
    if (requiredScope && requiredScope !== "*") {
      const hasWildcard = record.scopes.includes("*");
      const hasDirectScope = record.scopes.includes(requiredScope);
      if (!hasWildcard && !hasDirectScope) {
        return {
          valid: false,
          statusCode: 403,
          error: `Insufficient key permissions. Key lacks required scope: '${requiredScope}'.`,
          rateLimitInfo: rateLimitResult,
        };
      }
    }

    // 9. Touch last-used timestamp in memory and Supabase
    record.lastUsedAt = new Date().toISOString();
    if (persistence.isConfigured) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        Promise.resolve(
          supabase.from("api_keys").update({ last_used_at: record.lastUsedAt }).eq("id", record.id)
        ).catch(() => { });
      }
    }

    return {
      valid: true,
      statusCode: 200,
      record,
      rateLimitInfo: rateLimitResult,
    };
  }

  /**
   * Synchronous authentication for cached / test contexts.
   */
  static authenticateKey(
    rawKey: string,
    requiredScope?: ApiKeyScope
  ): AuthenticateKeyResult {
    if (!rawKey || typeof rawKey !== "string") {
      return {
        valid: false,
        statusCode: 401,
        error: "Missing API key in Authorization header. Expected 'Authorization: Bearer nx_live_...'",
      };
    }

    const cleanKey = rawKey.replace(/^Bearer\s+/i, "").trim();

    // 1. Format validation (nx_live_ or nx_test_ followed by 32-64 hex chars)
    const formatRegex = /^nx_(live|test)_[a-f0-9]{32,64}$/i;
    if (!formatRegex.test(cleanKey)) {
      return {
        valid: false,
        statusCode: 401,
        error: "Invalid API key format. Expected format 'nx_live_<secret>' or 'nx_test_<secret>'.",
      };
    }

    // 2. Constant-time hash verification
    const computedHash = this.hashSecret(cleanKey);
    const record = inMemoryKeys.get(computedHash);

    if (!record) {
      return {
        valid: false,
        statusCode: 401,
        error: "API key does not exist or has been revoked.",
      };
    }

    // Constant-time comparison
    const recordHashBuffer = Buffer.from(record.keyHash, "hex");
    const computedHashBuffer = Buffer.from(computedHash, "hex");
    if (
      recordHashBuffer.length !== computedHashBuffer.length ||
      !crypto.timingSafeEqual(recordHashBuffer, computedHashBuffer)
    ) {
      return {
        valid: false,
        statusCode: 401,
        error: "API key authentication failed.",
      };
    }

    // 3. Revocation status
    if (record.revokedAt) {
      return {
        valid: false,
        statusCode: 401,
        error: "API key has been revoked and is no longer valid.",
      };
    }

    // 4. Expiration check
    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      return {
        valid: false,
        statusCode: 401,
        error: "API key has expired.",
      };
    }

    // 5. Sliding-window rate limit enforcement (per minute)
    const rateLimitResult = this.checkRateLimit(record.id, record.rateLimit);
    if (!rateLimitResult.allowed) {
      return {
        valid: false,
        statusCode: 429,
        error: `Rate limit exceeded. Maximum ${record.rateLimit} requests per minute allowed. Try again in ${rateLimitResult.retryAfterSeconds}s.`,
        rateLimitInfo: rateLimitResult,
      };
    }

    // 6. Scope authorization check
    if (requiredScope && requiredScope !== "*") {
      const hasWildcard = record.scopes.includes("*");
      const hasDirectScope = record.scopes.includes(requiredScope);
      if (!hasWildcard && !hasDirectScope) {
        return {
          valid: false,
          statusCode: 403,
          error: `Insufficient key permissions. Key lacks required scope: '${requiredScope}'.`,
          rateLimitInfo: rateLimitResult,
        };
      }
    }

    // 7. Touch last-used timestamp
    record.lastUsedAt = new Date().toISOString();

    const persistence = this.getPersistenceStatus();
    if (persistence.isConfigured) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        Promise.resolve(
          supabase.from("api_keys").update({ last_used_at: record.lastUsedAt }).eq("id", record.id)
        ).catch(() => { });
      }
    }

    return {
      valid: true,
      statusCode: 200,
      record,
      rateLimitInfo: rateLimitResult,
    };
  }

  /**
   * Concurrency-safe sliding-window rate limiter per key ID.
   */
  private static checkRateLimit(
    keyId: string,
    limitPerMinute: number
  ): RateLimitCheckResult {
    const now = Date.now();
    const windowStart = now - 60000;

    let timestamps = rateLimitBuckets.get(keyId) || [];
    // Discard timestamps older than 60 seconds
    timestamps = timestamps.filter((t) => t > windowStart);

    const reset = timestamps.length > 0 ? Math.ceil((timestamps[0] + 60000) / 1000) : Math.ceil((now + 60000) / 1000);

    if (timestamps.length >= limitPerMinute) {
      const oldestInWindow = timestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + 60000 - now) / 1000));
      rateLimitBuckets.set(keyId, timestamps);
      return { allowed: false, remaining: 0, retryAfterSeconds, limit: limitPerMinute, reset };
    }

    timestamps.push(now);
    rateLimitBuckets.set(keyId, timestamps);
    return {
      allowed: true,
      remaining: Math.max(0, limitPerMinute - timestamps.length),
      retryAfterSeconds: 0,
      limit: limitPerMinute,
      reset,
    };
  }

  /**
   * Records API usage telemetry and persistence.
   */
  static recordUsage(
    keyId: string,
    endpoint: string,
    statusCode: number,
    usageUnits: number,
    metadata?: {
      userId?: string;
      requestId?: string;
      provider?: string;
      model?: string;
    }
  ): void {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const requestId = metadata?.requestId || `req_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // Find key to attribute user
    let userId = metadata?.userId || "unknown";
    inMemoryKeys.forEach((record) => {
      if (record.id === keyId) {
        userId = record.userId;
      }
    });

    const event: ApiKeyUsageEvent = {
      id,
      apiKeyId: keyId,
      userId,
      requestId,
      endpoint,
      provider: metadata?.provider,
      model: metadata?.model,
      status: statusCode,
      usageUnits,
      createdAt: now,
      // Backward compatibility mappings
      keyId,
      statusCode,
      tokensUsed: usageUnits,
      timestamp: now,
    };

    inMemoryUsage.unshift(event);
    if (inMemoryUsage.length > 1000) {
      inMemoryUsage.pop();
    }

    // Async persist to Supabase if available
    const persistence = this.getPersistenceStatus();
    if (persistence.isConfigured) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        Promise.resolve(
          supabase
            .from("api_usage")
            .insert({
              id,
              api_key_id: keyId,
              user_id: userId,
              request_id: requestId,
              endpoint,
              provider: metadata?.provider || null,
              model: metadata?.model || null,
              status: statusCode,
              usage_units: usageUnits,
              created_at: now,
            })
        ).catch(() => { });
      }
    }
  }

  /**
   * Asynchronous usage recording that awaits and confirms database write when configured.
   */
  static async recordUsageAsync(
    keyId: string,
    endpoint: string,
    statusCode: number,
    usageUnits: number,
    metadata?: {
      userId?: string;
      requestId?: string;
      provider?: string;
      model?: string;
    }
  ): Promise<void> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const requestId = metadata?.requestId || `req_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    let userId = metadata?.userId || "unknown";
    inMemoryKeys.forEach((record) => {
      if (record.id === keyId) {
        userId = record.userId;
      }
    });

    const event: ApiKeyUsageEvent = {
      id,
      apiKeyId: keyId,
      userId,
      requestId,
      endpoint,
      provider: metadata?.provider,
      model: metadata?.model,
      status: statusCode,
      usageUnits,
      createdAt: now,
      keyId,
      statusCode,
      tokensUsed: usageUnits,
      timestamp: now,
    };

    inMemoryUsage.unshift(event);
    if (inMemoryUsage.length > 1000) {
      inMemoryUsage.pop();
    }

    const persistence = this.getPersistenceStatus();
    const isProduction = process.env.NODE_ENV === "production";

    if (persistence.isConfigured) {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        if (isProduction) {
          throw new Error("Database persistence error: persistent database client could not be initialized.");
        }
      } else {
        const { error } = await supabase.from("api_usage").insert({
          id,
          api_key_id: keyId,
          user_id: userId,
          request_id: requestId,
          endpoint,
          provider: metadata?.provider || null,
          model: metadata?.model || null,
          status: statusCode,
          usage_units: usageUnits,
          created_at: now,
        });

        if (error) {
          if (isProduction) {
            throw new Error(`Database persistence failure in production: ${error.message}`);
          }
          console.warn("[ApiKeyService] Failed to record usage to Supabase:", error.message);
        }
      }
    }
  }

  /**
   * Revokes an API key immediately. Strictly enforces ownership in memory.
   */
  static revokeKey(keyId: string, userId: string): boolean {
    let found = false;
    inMemoryKeys.forEach((record) => {
      // Strict ownership check: Only the user who created the key can revoke it
      if (record.id === keyId && record.userId === userId) {
        record.revokedAt = new Date().toISOString();
        found = true;
      }
    });

    if (found) {
      const persistence = this.getPersistenceStatus();
      if (persistence.isConfigured) {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          Promise.resolve(
            supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", keyId)
          ).catch(() => { });
        }
      }
    }

    return found;
  }

  /**
   * Asynchronously revokes an API key in Supabase and memory. Strictly enforces user ownership.
   */
  static async revokeKeyAsync(keyId: string, userId: string): Promise<boolean> {
    const persistence = this.getPersistenceStatus();
    const isProduction = process.env.NODE_ENV === "production";
    let dbFound = false;

    if (persistence.isConfigured) {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        if (isProduction) {
          throw new Error("Database persistence error: persistent database client could not be initialized.");
        }
      } else {
        const { data, error } = await supabase
          .from("api_keys")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", keyId)
          .eq("user_id", userId)
          .select("id");

        if (error) {
          if (isProduction) {
            throw new Error(`Database persistence failure in production: ${error.message}`);
          }
          console.warn("[ApiKeyService] Supabase revokeKey error:", error.message);
        } else if (data && data.length > 0) {
          dbFound = true;
        }
      }
    }

    // Also update in-memory cache if present
    const memoryFound = this.revokeKey(keyId, userId);

    return dbFound || memoryFound;
  }

  /**
   * Lists keys for a user / workspace. NEVER returns keyHash.
   * Strictly enforces user isolation.
   */
  static getKeys(userId: string, orgId?: string): SanitizedApiKey[] {
    const list: SanitizedApiKey[] = [];
    inMemoryKeys.forEach((record) => {
      // Strict ownership check: only keys explicitly owned by this user or this org
      if (record.userId === userId || (orgId && record.orgId === orgId)) {
        list.push(this.sanitizeRecord(record));
      }
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Asynchronously lists keys from Supabase for a user.
   * Strictly enforces user isolation and guarantees persistent database retrieval.
   */
  static async getKeysAsync(userId: string, orgId?: string): Promise<SanitizedApiKey[]> {
    const persistence = this.getPersistenceStatus();
    const isProduction = process.env.NODE_ENV === "production";

    if (persistence.isConfigured) {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        if (isProduction) {
          throw new Error("Database persistence error: persistent database client could not be initialized.");
        }
      } else {
        let query = supabase.from("api_keys").select("*").eq("user_id", userId);
        const { data, error } = await query.order("created_at", { ascending: false });

        if (error) {
          if (isProduction) {
            throw new Error(`Database persistence failure in production: ${error.message}`);
          }
          console.warn("[ApiKeyService] Supabase getKeys error:", error.message);
        } else if (data) {
          return data.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            orgId: row.org_id || undefined,
            name: row.name,
            keyPrefix: row.key_prefix,
            environment: row.environment,
            scopes: row.scopes,
            rateLimit: row.rate_limit,
            createdAt: row.created_at,
            lastUsedAt: row.last_used_at || undefined,
            expiresAt: row.expires_at || undefined,
            revokedAt: row.revoked_at || undefined,
            persisted: true,
          }));
        }
      }
    }

    return this.getKeys(userId, orgId);
  }

  /**
   * Retrieves usage history and metrics for a user or key in memory.
   * Strictly enforces user ownership.
   */
  static getUsageSummary(userId: string, apiKeyId?: string) {
    const userKeys = this.getKeys(userId);
    const userKeyIds = new Set(userKeys.map((k) => k.id));

    // If a specific keyId is requested, verify it belongs to this user
    if (apiKeyId && !userKeyIds.has(apiKeyId)) {
      return {
        totalRequests: 0,
        totalUnits: 0,
        totalTokens: 0,
        successfulRequests: 0,
        errorRequests: 0,
        successRate: 100,
        recentEvents: [],
      };
    }

    let events = inMemoryUsage.filter((e) => userKeyIds.has(e.apiKeyId || e.keyId || ""));
    if (apiKeyId) {
      events = events.filter((e) => (e.apiKeyId || e.keyId) === apiKeyId);
    }

    const totalRequests = events.length;
    const totalUnits = events.reduce((acc, e) => acc + (e.usageUnits || e.tokensUsed || 0), 0);
    const successfulRequests = events.filter((e) => (e.status || e.statusCode || 200) < 400).length;
    const errorRequests = totalRequests - successfulRequests;
    const successRate = totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 100;

    return {
      totalRequests,
      totalUnits,
      totalTokens: totalUnits, // Legacy alias
      successfulRequests,
      errorRequests,
      successRate,
      recentEvents: events.slice(0, 50),
    };
  }

  /**
   * Asynchronously retrieves persistent usage telemetry from Supabase.
   * Strictly enforces user ownership.
   */
  static async getUsageSummaryAsync(userId: string, apiKeyId?: string) {
    const persistence = this.getPersistenceStatus();
    const isProduction = process.env.NODE_ENV === "production";

    if (persistence.isConfigured) {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        if (isProduction) {
          throw new Error("Database persistence error: persistent database client could not be initialized.");
        }
      } else {
        let query = supabase.from("api_usage").select("*").eq("user_id", userId);
        if (apiKeyId) {
          query = query.eq("api_key_id", apiKeyId);
        }
        const { data, error } = await query.order("created_at", { ascending: false }).limit(200);

        if (error) {
          if (isProduction) {
            throw new Error(`Database persistence failure in production: ${error.message}`);
          }
          console.warn("[ApiKeyService] Supabase getUsageSummary error:", error.message);
        } else if (data) {
          const events: ApiKeyUsageEvent[] = data.map((row: any) => ({
            id: row.id,
            apiKeyId: row.api_key_id,
            userId: row.user_id,
            requestId: row.request_id,
            endpoint: row.endpoint,
            provider: row.provider || undefined,
            model: row.model || undefined,
            status: row.status,
            usageUnits: row.usage_units,
            createdAt: row.created_at,
            keyId: row.api_key_id,
            statusCode: row.status,
            tokensUsed: row.usage_units,
            timestamp: row.created_at,
          }));

          const totalRequests = events.length;
          const totalUnits = events.reduce((acc, e) => acc + (e.usageUnits || 0), 0);
          const successfulRequests = events.filter((e) => (e.status || 200) < 400).length;
          const errorRequests = totalRequests - successfulRequests;
          const successRate = totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 100;

          return {
            totalRequests,
            totalUnits,
            totalTokens: totalUnits,
            successfulRequests,
            errorRequests,
            successRate,
            recentEvents: events.slice(0, 50),
          };
        }
      }
    }

    return this.getUsageSummary(userId, apiKeyId);
  }

  /**
   * Removes raw cryptographic hash from objects returned to callers.
   */
  public static sanitizeRecord(record: ApiKeyRecord): SanitizedApiKey {
    const { keyHash, ...sanitized } = record;
    return sanitized;
  }

  /**
   * Clears in-memory keys (for test suite hygiene)
   */
  static resetForTesting(): void {
    inMemoryKeys.clear();
    inMemoryUsage.length = 0;
    rateLimitBuckets.clear();
  }
}
