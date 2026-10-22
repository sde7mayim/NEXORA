import crypto from "crypto";

export type OrgRole = "owner" | "admin" | "member";

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  planId: "enterprise";
  createdAt: string;
}

export interface OrganisationMember {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  joinedAt: string;
}

export interface OrganisationPolicy {
  orgId: string;
  allowedModels: string[]; // e.g. ["nexora-core", "openai:gpt-4o"]
  maxMonthlySpendCents: number;
  retentionDays: number;
}

export interface AuditEvent {
  id: string;
  orgId?: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export class EnterpriseService {
  /**
   * Hashes an invitation token with SHA-256 before database storage.
   */
  static hashInvitationToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Generates a cryptographically secure invitation token.
   */
  static generateInvitationToken(): { token: string; tokenHash: string; expiresAt: Date } {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = this.hashInvitationToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day expiration
    return { token, tokenHash, expiresAt };
  }

  /**
   * Verifies if a user role has permissions for administrative enterprise actions.
   */
  static canManageOrganisation(role: OrgRole): boolean {
    return role === "owner" || role === "admin";
  }

  /**
   * Checks if a requested model is permitted by an organization's policy.
   */
  static isModelPermitted(modelId: string, policy?: OrganisationPolicy): boolean {
    if (!policy || !policy.allowedModels || policy.allowedModels.length === 0) {
      return true; // No restrictive policy set
    }
    return policy.allowedModels.includes(modelId);
  }
}
