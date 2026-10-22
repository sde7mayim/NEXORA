export type PlanTier = "free" | "pro" | "enterprise";

export interface PlanConfig {
  id: PlanTier;
  displayName: string;
  priceINR: number;
  priceUSD: number;
  dailyMessageLimit: number;
  monthlyMessageLimit: number;
  monthlyResearchLimit: number;
  maxFileSizeMB: number;
  maxStorageMB: number;
  retentionDays: number;
  supportsTeams: boolean;
  prioritySupport: boolean;
}

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  free: {
    id: "free",
    displayName: "Free Starter",
    priceINR: 0,
    priceUSD: 0,
    dailyMessageLimit: 10,
    monthlyMessageLimit: 100,
    monthlyResearchLimit: 3,
    maxFileSizeMB: 5,
    maxStorageMB: 50,
    retentionDays: 30,
    supportsTeams: false,
    prioritySupport: false,
  },
  pro: {
    id: "pro",
    displayName: "Pro Individual",
    priceINR: 1999, // ₹1,999 / month
    priceUSD: 24,
    dailyMessageLimit: 100,
    monthlyMessageLimit: 2000,
    monthlyResearchLimit: 100,
    maxFileSizeMB: 25,
    maxStorageMB: 1024, // 1 GB
    retentionDays: 365,
    supportsTeams: false,
    prioritySupport: true,
  },
  enterprise: {
    id: "enterprise",
    displayName: "Enterprise Team",
    priceINR: 7999, // ₹7,999 / month baseline
    priceUSD: 99,
    dailyMessageLimit: 1000, // Org-configurable default
    monthlyMessageLimit: 25000,
    monthlyResearchLimit: 1000,
    maxFileSizeMB: 100,
    maxStorageMB: 10240, // 10 GB
    retentionDays: 730,
    supportsTeams: true,
    prioritySupport: true,
  },
};

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
}
