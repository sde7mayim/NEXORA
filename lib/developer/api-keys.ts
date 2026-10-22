import crypto from "crypto";

export type ApiKeyScope =
  | "models:read"
  | "chat:write"
  | "knowledge:read"
  | "workflows:run";

export interface ApiKeyRecord {
  id: string;
  userId: string;
  orgId?: string;
  name: string;
  keyPrefix: string; // e.g. "nx_live_9a7b..."
  keyHash: string;
  scopes: ApiKeyScope[];
  expiresAt?: string;
  revokedAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface ApiKeyUsageEvent {
  keyId: string;
  endpoint: string;
  statusCode: number;
  tokensUsed: number;
  timestamp: string;
}

export class ApiKeyService {
  private static keys: Map<string, ApiKeyRecord> = new Map();
  private static usageEvents: ApiKeyUsageEvent[] = [];

  /**
   * Hashes raw secret token using SHA-256 for secure constant-time lookup.
   */
  static hashSecret(secret: string): string {
    return crypto.createHash("sha256").update(secret).digest("hex");
  }

  /**
   * Creates an API key. Returns rawSecret ONLY ONCE.
   */
  static createApiKey(params: {
    name: string;
    userId: string;
    orgId?: string;
    scopes?: ApiKeyScope[];
    expiresInDays?: number;
  }): { record: ApiKeyRecord; rawSecret: string } {
    const rawSecret = `nx_live_${crypto.randomBytes(24).toString("hex")}`;
    const keyPrefix = rawSecret.slice(0, 14) + "...";
    const keyHash = this.hashSecret(rawSecret);

    let expiresAt: string | undefined;
    if (params.expiresInDays) {
      expiresAt = new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    }

    const id = `key_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const record: ApiKeyRecord = {
      id,
      userId: params.userId,
      orgId: params.orgId,
      name: params.name,
      keyPrefix,
      keyHash,
      scopes: params.scopes || ["models:read", "chat:write"],
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    this.keys.set(keyHash, record);
    return { record, rawSecret };
  }

  /**
   * Authenticates and authorizes an API key against required scope.
   */
  static authenticateKey(
    rawKey: string,
    requiredScope?: ApiKeyScope
  ): { valid: boolean; record?: ApiKeyRecord; error?: string } {
    if (!rawKey || !rawKey.startsWith("nx_live_")) {
      return { valid: false, error: "Invalid API key format. Expected 'nx_live_...' key." };
    }

    const keyHash = this.hashSecret(rawKey);
    const record = this.keys.get(keyHash);

    if (!record) {
      return { valid: false, error: "API key does not exist or has been deleted." };
    }

    if (record.revokedAt) {
      return { valid: false, error: "API key has been revoked." };
    }

    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      return { valid: false, error: "API key has expired." };
    }

    if (requiredScope && !record.scopes.includes(requiredScope)) {
      return {
        valid: false,
        error: `Insufficient key permissions. Key lacks required scope: '${requiredScope}'.`,
      };
    }

    // Touch last used timestamp
    record.lastUsedAt = new Date().toISOString();
    return { valid: true, record };
  }

  /**
   * Records usage metrics for developer analytics.
   */
  static recordUsage(keyId: string, endpoint: string, statusCode: number, tokensUsed: number): void {
    this.usageEvents.unshift({
      keyId,
      endpoint,
      statusCode,
      tokensUsed,
      timestamp: new Date().toISOString(),
    });
    if (this.usageEvents.length > 500) {
      this.usageEvents.pop();
    }
  }

  /**
   * Revokes an API key immediately.
   */
  static revokeKey(keyId: string, userId: string): void {
    this.keys.forEach((record) => {
      if (record.id === keyId && record.userId === userId) {
        record.revokedAt = new Date().toISOString();
      }
    });
  }

  /**
   * Lists keys for a user / workspace.
   */
  static getKeys(userId: string, orgId?: string): ApiKeyRecord[] {
    return Array.from(this.keys.values()).filter((k) => {
      if (k.userId === userId) return true;
      if (orgId && k.orgId === orgId) return true;
      return false;
    });
  }

  /**
   * Computes key usage summary.
   */
  static getUsageSummary(userId: string) {
    const userKeyIds = new Set(this.getKeys(userId).map((k) => k.id));
    const userEvents = this.usageEvents.filter((e) => userKeyIds.has(e.keyId));

    const totalRequests = userEvents.length;
    const totalTokens = userEvents.reduce((acc, e) => acc + e.tokensUsed, 0);
    const successfulRequests = userEvents.filter((e) => e.statusCode < 400).length;

    return {
      totalRequests,
      totalTokens,
      successRate: totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 100,
      recentEvents: userEvents.slice(0, 10),
    };
  }
}
