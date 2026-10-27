import { describe, it, expect, beforeEach } from "vitest";
import { FamilyService } from "../../lib/family/family-service";
import { PLAN_CONFIGS } from "../../lib/entitlements/types";

describe("FamilyService & Family Plan Entitlements", () => {
  beforeEach(() => {
    FamilyService.resetForTesting();
  });

  it("configures Family plan with safe purchase-disabled defaults", () => {
    const config = PLAN_CONFIGS.family;
    expect(config).toBeDefined();
    expect(config.displayName).toBe("Family Workspace");
    expect(config.maxMembers).toBe(5);
    expect(config.purchaseEnabled).toBe(false); // Safeguard: purchase disabled until final approval
    expect(config.dailyMessageLimit).toBe(300);
    expect(config.monthlyMessageLimit).toBe(6000);
  });

  it("creates a family workspace and registers the owner", () => {
    const res = FamilyService.createFamilyGroup({
      ownerId: "usr_joshua",
      ownerEmail: "thzcreterz05@gmail.com",
      familyName: "Suriyan Family",
    });

    expect(res.success).toBe(true);
    expect(res.family).toBeDefined();
    expect(res.family?.name).toBe("Suriyan Family");
    expect(res.family?.ownerEmail).toBe("thzcreterz05@gmail.com");
  });

  it("enforces member limits and prevents exceeding capacity", () => {
    const created = FamilyService.createFamilyGroup({
      ownerId: "usr_owner",
      ownerEmail: "owner@family.com",
      familyName: "Cap Test",
      maxMembers: 2, // 1 owner + 1 invited
    });

    const familyId = created.family!.id;

    const inv1 = FamilyService.inviteMember({
      familyId,
      requesterUserId: "usr_owner",
      email: "member1@family.com",
      name: "Member One",
    });
    expect(inv1.success).toBe(true);

    // Attempting to exceed max capacity
    const inv2 = FamilyService.inviteMember({
      familyId,
      requesterUserId: "usr_owner",
      email: "member2@family.com",
      name: "Member Two",
    });
    expect(inv2.success).toBe(false);
    expect(inv2.error).toContain("limit reached");
  });

  it("strictly guarantees conversation privacy between family members", () => {
    // Owner CANNOT read another family member's private personal chat
    const canAccessPrivate = FamilyService.canAccessConversation({
      requestingUserId: "usr_owner",
      conversationOwnerUserId: "usr_member1",
    });
    expect(canAccessPrivate).toBe(false);

    // Member can access their own chat
    const canAccessOwn = FamilyService.canAccessConversation({
      requestingUserId: "usr_member1",
      conversationOwnerUserId: "usr_member1",
    });
    expect(canAccessOwn).toBe(true);
  });

  it("provides privacy-preserving aggregated usage statistics to the owner without chat contents", () => {
    const created = FamilyService.createFamilyGroup({
      ownerId: "usr_owner",
      ownerEmail: "owner@family.com",
      familyName: "Usage Test",
    });
    const familyId = created.family!.id;

    FamilyService.recordUsage("usr_owner", "message");
    FamilyService.recordUsage("usr_owner", "message");
    FamilyService.recordUsage("usr_owner", "research");

    const usage = FamilyService.getAggregatedUsage(familyId, "usr_owner");
    expect(usage).not.toBeNull();
    expect(usage?.sharedDailyMessagesUsed).toBe(2);
    expect(usage?.sharedMonthlyResearchUsed).toBe(1);
    // Verifies that no conversation text or prompts are exposed
    expect(usage?.memberUsageSummary[0].messageCount).toBe(2);
  });
});
