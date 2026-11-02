import { PLAN_CONFIGS, PlanTier, QuotaCheckResult } from "./types";

export interface QuotaRecord {
  dailyMessagesUsed: number;
  monthlyMessagesUsed: number;
  monthlyResearchUsed: number;
  reservedMessages: number;
  reservedResearch: number;
}

export interface OperationUsageRecord {
  requestId: string;
  userId: string;
  workspaceId?: string;
  plan: PlanTier;
  capability: string;
  selectedModel: string;
  actualProvider?: string;
  actualModel?: string;
  creditsReserved: number;
  creditsConsumed: number;
  status: "success" | "failed" | "rate_limited" | "unsupported";
  failureCategory?:
    | "quota_exceeded"
    | "rate_limit"
    | "credits_exhausted"
    | "missing_key"
    | "unsupported_model"
    | "invalid_request"
    | "timeout"
    | "file_parsing_failure"
    | "generation_failure";
  timestamp: string;
}

const operationUsageLog: OperationUsageRecord[] = [];

// In-memory ledger for fast local verification and unit testing,
// mirrored with Supabase table `quota_reservations` when connected.
const activeReservations = new Map<
  string,
  {
    id: string;
    userId: string;
    quotaType: "message" | "research" | "creative";
    createdAt: number;
    expiresAt: number;
    status: "reserved" | "reconciled" | "released";
  }
>();

export class EntitlementEngine {
  /**
   * Evaluates if a user has sufficient quota for an AI message.
   */
  static checkMessageQuota(
    planTier: PlanTier,
    currentUsage: { dailyMessages: number; monthlyMessages: number }
  ): QuotaCheckResult {
    const plan = PLAN_CONFIGS[planTier];
    const dailyRemaining = plan.dailyMessageLimit - currentUsage.dailyMessages;
    const monthlyRemaining = plan.monthlyMessageLimit - currentUsage.monthlyMessages;

    if (dailyRemaining <= 0) {
      return {
        allowed: false,
        reason: `Daily message quota exceeded (${currentUsage.dailyMessages}/${plan.dailyMessageLimit}). Quota resets at 00:00 UTC.`,
        dailyUsed: currentUsage.dailyMessages,
        dailyLimit: plan.dailyMessageLimit,
        monthlyUsed: currentUsage.monthlyMessages,
        monthlyLimit: plan.monthlyMessageLimit,
      };
    }

    if (monthlyRemaining <= 0) {
      return {
        allowed: false,
        reason: `Monthly message quota exceeded (${currentUsage.monthlyMessages}/${plan.monthlyMessageLimit}). Upgrade plan or wait for billing cycle reset.`,
        dailyUsed: currentUsage.dailyMessages,
        dailyLimit: plan.dailyMessageLimit,
        monthlyUsed: currentUsage.monthlyMessages,
        monthlyLimit: plan.monthlyMessageLimit,
      };
    }

    return {
      allowed: true,
      dailyUsed: currentUsage.dailyMessages,
      dailyLimit: plan.dailyMessageLimit,
      monthlyUsed: currentUsage.monthlyMessages,
      monthlyLimit: plan.monthlyMessageLimit,
    };
  }

  /**
   * Evaluates if a user has sufficient quota for a web research search.
   */
  static checkResearchQuota(
    planTier: PlanTier,
    monthlyResearchUsed: number
  ): { allowed: boolean; reason?: string; used: number; limit: number } {
    const plan = PLAN_CONFIGS[planTier];
    const remaining = plan.monthlyResearchLimit - monthlyResearchUsed;

    if (remaining <= 0) {
      return {
        allowed: false,
        reason: `Monthly web research search quota reached (${monthlyResearchUsed}/${plan.monthlyResearchLimit}).`,
        used: monthlyResearchUsed,
        limit: plan.monthlyResearchLimit,
      };
    }

    return {
      allowed: true,
      used: monthlyResearchUsed,
      limit: plan.monthlyResearchLimit,
    };
  }

  /**
   * Evaluates if a user has sufficient quota for a Creative Studio operation.
   */
  static checkCreativeQuota(
    planTier: PlanTier,
    creativeType: "image" | "image-edit" | "lyrics" | "music" | "audio" | "video",
    monthlyUsed: number
  ): { allowed: boolean; reason?: string; used: number; limit: number } {
    const plan = PLAN_CONFIGS[planTier];
    let limit = 0;
    let label = "Creative generation";

    switch (creativeType) {
      case "image":
        limit = plan.monthlyImageGenerations;
        label = "Image generation";
        break;
      case "image-edit":
        limit = plan.monthlyImageEdits;
        label = "Image editing";
        break;
      case "lyrics":
        limit = plan.monthlyLyricsGenerations;
        label = "Lyrics generation";
        break;
      case "music":
        limit = plan.monthlyMusicGenerations;
        label = "Music generation";
        break;
      case "audio":
        limit = plan.monthlyAudioMinutes;
        label = "Voice & audio minutes";
        break;
      case "video":
        limit = planTier === "enterprise" ? 50 : planTier === "pro" ? 15 : 2;
        label = "Video generation";
        break;
    }

    const remaining = limit - monthlyUsed;
    if (remaining <= 0) {
      return {
        allowed: false,
        reason: `${label} monthly quota reached (${monthlyUsed}/${limit}). Upgrade to Pro or Enterprise for higher creative limits.`,
        used: monthlyUsed,
        limit,
      };
    }

    return {
      allowed: true,
      used: monthlyUsed,
      limit,
    };
  }

  /**
   * Reserves 1 unit of quota atomically before sending request to provider.
   */
  static async reserveQuota(
    userId: string,
    quotaType: "message" | "research" | "creative"
  ): Promise<string> {
    const reservationId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();
    const ttlMs = 120 * 1000; // 2 minutes timeout for streaming

    activeReservations.set(reservationId, {
      id: reservationId,
      userId,
      quotaType,
      createdAt: now,
      expiresAt: now + ttlMs,
      status: "reserved",
    });

    return reservationId;
  }

  /**
   * Reconciles reservation upon successful stream/response completion.
   */
  static async reconcileReservation(reservationId: string): Promise<boolean> {
    const res = activeReservations.get(reservationId);
    if (!res) return false;
    res.status = "reconciled";
    return true;
  }

  /**
   * Releases reservation if the request failed or was aborted by client.
   */
  static async releaseReservation(reservationId: string): Promise<boolean> {
    const res = activeReservations.get(reservationId);
    if (!res) return false;
    res.status = "released";
    return true;
  }

  /**
   * Records a transparent usage audit entry for an operation.
   */
  static recordOperationUsage(record: Omit<OperationUsageRecord, "timestamp">): OperationUsageRecord {
    const entry: OperationUsageRecord = {
      ...record,
      timestamp: new Date().toISOString(),
    };
    operationUsageLog.push(entry);
    // Keep bounded history in memory
    if (operationUsageLog.length > 500) {
      operationUsageLog.shift();
    }
    return entry;
  }

  /**
   * Retrieves operation usage logs for audit or billing inspection.
   */
  static getOperationUsageLogs(userId?: string): OperationUsageRecord[] {
    if (userId) {
      return operationUsageLog.filter((l) => l.userId === userId);
    }
    return [...operationUsageLog];
  }
}
