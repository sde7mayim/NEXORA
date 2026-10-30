export type PlanTier = "free" | "pro" | "family" | "enterprise";

export interface PlanConfig {
  id: PlanTier;
  displayName: string;
  priceINR: number;
  priceUSD: number;
  dailyMessageLimit: number;
  monthlyMessageLimit: number;
  monthlyResearchLimit: number;
  monthlyImageGenerations: number;
  monthlyImageEdits: number;
  monthlyLyricsGenerations: number;
  monthlyMusicGenerations: number;
  monthlyAudioMinutes: number;
  maxFileSizeMB: number;
  maxStorageMB: number;
  retentionDays: number;
  supportsTeams: boolean;
  prioritySupport: boolean;
  maxMembers?: number;
  purchaseEnabled?: boolean;
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
    monthlyImageGenerations: 10,
    monthlyImageEdits: 5,
    monthlyLyricsGenerations: 20,
    monthlyMusicGenerations: 5,
    monthlyAudioMinutes: 10,
    maxFileSizeMB: 5,
    maxStorageMB: 50,
    retentionDays: 30,
    supportsTeams: false,
    prioritySupport: false,
    maxMembers: 1,
    purchaseEnabled: true,
  },
  pro: {
    id: "pro",
    displayName: "Pro Individual",
    priceINR: 1999, // ₹1,999 / month
    priceUSD: 24,
    dailyMessageLimit: 100,
    monthlyMessageLimit: 2000,
    monthlyResearchLimit: 100,
    monthlyImageGenerations: 200,
    monthlyImageEdits: 100,
    monthlyLyricsGenerations: 500,
    monthlyMusicGenerations: 60,
    monthlyAudioMinutes: 120,
    maxFileSizeMB: 25,
    maxStorageMB: 1024, // 1 GB
    retentionDays: 365,
    supportsTeams: false,
    prioritySupport: true,
    maxMembers: 1,
    purchaseEnabled: true,
  },
  family: {
    id: "family",
    displayName: "Family Workspace",
    priceINR: 2999, // Configurable placeholder
    priceUSD: 39,
    dailyMessageLimit: 300,
    monthlyMessageLimit: 6000,
    monthlyResearchLimit: 200,
    monthlyImageGenerations: 400,
    monthlyImageEdits: 200,
    monthlyLyricsGenerations: 1000,
    monthlyMusicGenerations: 120,
    monthlyAudioMinutes: 240,
    maxFileSizeMB: 50,
    maxStorageMB: 4096, // 4 GB shared storage
    retentionDays: 365,
    supportsTeams: true,
    maxMembers: 5,
    prioritySupport: true,
    purchaseEnabled: false, // Requirement: Prevent purchase until final pricing approved
  },
  enterprise: {
    id: "enterprise",
    displayName: "Enterprise Team",
    priceINR: 7999, // ₹7,999 / month baseline
    priceUSD: 99,
    dailyMessageLimit: 1000, // Org-configurable default
    monthlyMessageLimit: 25000,
    monthlyResearchLimit: 1000,
    monthlyImageGenerations: 2000,
    monthlyImageEdits: 1000,
    monthlyLyricsGenerations: 5000,
    monthlyMusicGenerations: 600,
    monthlyAudioMinutes: 1000,
    maxFileSizeMB: 100,
    maxStorageMB: 10240, // 10 GB
    retentionDays: 730,
    supportsTeams: true,
    prioritySupport: true,
    maxMembers: 50,
    purchaseEnabled: true,
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
