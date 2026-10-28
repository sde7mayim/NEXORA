import { PLAN_CONFIGS } from "../entitlements/types";

export interface FamilyGroup {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  maxMembers: number;
  billingStatus: "active" | "trial" | "pending_approval";
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  email: string;
  name: string;
  role: "family_owner" | "family_member";
  status: "active" | "invited" | "removed";
  joinedAt: string;
}

export interface FamilySharedSpace {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  createdBy: string;
  allowedMemberIds: string[];
  createdAt: string;
}

export interface FamilyAggregatedUsage {
  familyId: string;
  familyName: string;
  totalMembers: number;
  maxMembers: number;
  sharedDailyMessagesUsed: number;
  sharedDailyMessageLimit: number;
  sharedMonthlyMessagesUsed: number;
  sharedMonthlyMessageLimit: number;
  sharedMonthlyResearchUsed: number;
  sharedMonthlyResearchLimit: number;
  sharedStorageUsedMB: number;
  sharedStorageLimitMB: number;
  // Strictly privacy-preserving: breakdown by member is counts only, zero message contents
  memberUsageSummary: Array<{
    userId: string;
    email: string;
    name: string;
    messageCount: number;
    researchCount: number;
  }>;
}

export class FamilyService {
  private static families: Map<string, FamilyGroup> = new Map();
  private static members: Map<string, FamilyMember[]> = new Map(); // familyId -> members
  private static spaces: Map<string, FamilySharedSpace[]> = new Map(); // familyId -> spaces
  private static memberUsage: Map<string, { messageCount: number; researchCount: number }> = new Map();

  /**
   * Creates a new family workspace. Enforces configurable member cap and privacy constraints.
   */
  static createFamilyGroup(params: {
    ownerId: string;
    ownerEmail: string;
    familyName: string;
    maxMembers?: number;
  }): { success: boolean; error?: string; family?: FamilyGroup } {
    const config = PLAN_CONFIGS.family;
    const maxMembers = params.maxMembers || config.maxMembers || 5;

    const familyId = `fam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const family: FamilyGroup = {
      id: familyId,
      name: params.familyName,
      ownerId: params.ownerId,
      ownerEmail: params.ownerEmail.toLowerCase().trim(),
      maxMembers,
      billingStatus: "trial", // Safe default
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ownerMember: FamilyMember = {
      id: `fm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      familyId,
      userId: params.ownerId,
      email: params.ownerEmail.toLowerCase().trim(),
      name: "Family Owner",
      role: "family_owner",
      status: "active",
      joinedAt: new Date().toISOString(),
    };

    this.families.set(familyId, family);
    this.members.set(familyId, [ownerMember]);
    this.spaces.set(familyId, []);

    return { success: true, family };
  }

  /**
   * Invites a new member to the family. Enforces capacity limits.
   */
  static inviteMember(params: {
    familyId: string;
    requesterUserId: string;
    email: string;
    name: string;
  }): { success: boolean; error?: string; member?: FamilyMember } {
    const family = this.families.get(params.familyId);
    if (!family) {
      return { success: false, error: "Family workspace not found." };
    }

    // Safeguard: Only the family owner can invite new members
    if (family.ownerId !== params.requesterUserId) {
      return { success: false, error: "Only the family owner can invite new members." };
    }

    const currentMembers = this.members.get(params.familyId) || [];
    const activeAndInvited = currentMembers.filter((m) => m.status !== "removed");

    if (activeAndInvited.length >= family.maxMembers) {
      return {
        success: false,
        error: `Family member limit reached (${family.maxMembers} maximum). Upgrade or adjust members.`,
      };
    }

    const cleanEmail = params.email.toLowerCase().trim();
    const alreadyMember = activeAndInvited.some((m) => m.email === cleanEmail);
    if (alreadyMember) {
      return { success: false, error: `User with email '${cleanEmail}' is already a family member.` };
    }

    const newMember: FamilyMember = {
      id: `fm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      familyId: params.familyId,
      userId: `usr_pending_${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      name: params.name,
      role: "family_member",
      status: "invited",
      joinedAt: new Date().toISOString(),
    };

    currentMembers.push(newMember);
    this.members.set(params.familyId, currentMembers);

    return { success: true, member: newMember };
  }

  /**
   * Accepts a family invitation.
   */
  static acceptInvitation(
    familyId: string,
    memberEmail: string,
    userId: string
  ): { success: boolean; error?: string } {
    const members = this.members.get(familyId) || [];
    const member = members.find(
      (m) => m.email === memberEmail.toLowerCase().trim() && m.status === "invited"
    );
    if (!member) {
      return { success: false, error: "Invitation not found or already processed." };
    }

    member.userId = userId;
    member.status = "active";
    return { success: true };
  }

  /**
   * Removes a member from the family workspace.
   * Safeguard: Owner cannot be removed, and removed member keeps their private chats.
   */
  static removeMember(
    familyId: string,
    requesterUserId: string,
    targetUserId: string
  ): { success: boolean; error?: string } {
    const family = this.families.get(familyId);
    if (!family) return { success: false, error: "Family not found." };

    if (family.ownerId !== requesterUserId && requesterUserId !== targetUserId) {
      return { success: false, error: "Unauthorized to remove member." };
    }

    if (family.ownerId === targetUserId) {
      return { success: false, error: "Family owner cannot be removed. Transfer ownership first." };
    }

    const members = this.members.get(familyId) || [];
    const target = members.find((m) => m.userId === targetUserId && m.status === "active");
    if (!target) return { success: false, error: "Member not found." };

    target.status = "removed";
    return { success: true };
  }

  /**
   * Checks whether user A is allowed to view user B's conversation.
   * STRICT PRIVACY GUARANTEE: Even the family owner CANNOT access another member's private chats.
   */
  static canAccessConversation(params: {
    requestingUserId: string;
    conversationOwnerUserId: string;
    sharedSpaceId?: string;
    familyId?: string;
  }): boolean {
    // 1. Direct owner always has access
    if (params.requestingUserId === params.conversationOwnerUserId) {
      return true;
    }

    // 2. If it's an explicitly permissioned shared space in the family
    if (params.familyId && params.sharedSpaceId) {
      const familySpaces = this.spaces.get(params.familyId) || [];
      const space = familySpaces.find((s) => s.id === params.sharedSpaceId);
      if (space && space.allowedMemberIds.includes(params.requestingUserId)) {
        return true;
      }
    }

    // 3. Otherwise strictly forbidden (NO automatic access)
    return false;
  }

  /**
   * Retrieves aggregated usage metrics for the family owner without disclosing message text.
   */
  static getAggregatedUsage(familyId: string, requesterUserId: string): FamilyAggregatedUsage | null {
    const family = this.families.get(familyId);
    if (!family) return null;

    // Only owner can view aggregated family billing/usage
    if (family.ownerId !== requesterUserId) return null;

    const members = (this.members.get(familyId) || []).filter((m) => m.status === "active");
    const plan = PLAN_CONFIGS.family;

    let totalMsg = 0;
    let totalResearch = 0;

    const summary = members.map((m) => {
      const u = this.memberUsage.get(m.userId) || { messageCount: 0, researchCount: 0 };
      totalMsg += u.messageCount;
      totalResearch += u.researchCount;
      return {
        userId: m.userId,
        email: m.email,
        name: m.name,
        messageCount: u.messageCount,
        researchCount: u.researchCount,
      };
    });

    return {
      familyId,
      familyName: family.name,
      totalMembers: members.length,
      maxMembers: family.maxMembers,
      sharedDailyMessagesUsed: totalMsg,
      sharedDailyMessageLimit: plan.dailyMessageLimit,
      sharedMonthlyMessagesUsed: totalMsg,
      sharedMonthlyMessageLimit: plan.monthlyMessageLimit,
      sharedMonthlyResearchUsed: totalResearch,
      sharedMonthlyResearchLimit: plan.monthlyResearchLimit,
      sharedStorageUsedMB: 120, // Example placeholder
      sharedStorageLimitMB: plan.maxStorageMB,
      memberUsageSummary: summary,
    };
  }

  /**
   * Records member usage for aggregated counters.
   */
  static recordUsage(userId: string, type: "message" | "research") {
    const current = this.memberUsage.get(userId) || { messageCount: 0, researchCount: 0 };
    if (type === "message") current.messageCount += 1;
    if (type === "research") current.researchCount += 1;
    this.memberUsage.set(userId, current);
  }

  /**
   * Resets local state (useful for unit tests).
   */
  static resetForTesting() {
    this.families.clear();
    this.members.clear();
    this.spaces.clear();
    this.memberUsage.clear();
  }
}
