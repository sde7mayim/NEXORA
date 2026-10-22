import { describe, it, expect } from "vitest";
import { WorkspaceService } from "@/lib/workspaces/workspace-service";
import { ModelRouter } from "@/lib/ai/router";

describe("Team Collaboration & Enterprise Workspaces", () => {
  it("should create workspace and assign creator as primary owner", () => {
    const { workspace, ownerMember } = WorkspaceService.createWorkspace({
      name: "Stark Industries AI",
      slug: "stark-ai",
      creatorUserId: "usr_tony",
      creatorEmail: "tony@stark.com",
      creatorName: "Tony Stark",
    });

    expect(workspace.id).toBeDefined();
    expect(workspace.name).toBe("Stark Industries AI");
    expect(workspace.status).toBe("active");
    expect(ownerMember.role).toBe("owner");
    expect(ownerMember.userId).toBe("usr_tony");
  });

  it("should generate secure, expiring single-use invitation tokens and accept successfully", () => {
    const { workspace } = WorkspaceService.createWorkspace({
      name: "Cyberdyne Systems",
      slug: "cyberdyne",
      creatorUserId: "usr_miles",
      creatorEmail: "miles@cyberdyne.com",
      creatorName: "Miles Dyson",
    });

    const { rawToken, invitation } = WorkspaceService.createInvitation(
      workspace.id,
      "owner",
      "john@cyberdyne.com",
      "member"
    );

    expect(rawToken.length).toBeGreaterThan(32);
    expect(invitation.status).toBe("pending");
    expect(invitation.tokenHash).not.toBe(rawToken);

    // Accept token
    const { member } = WorkspaceService.acceptInvitation(rawToken, {
      id: "usr_john",
      name: "John Connor",
      email: "john@cyberdyne.com",
    });

    expect(member.role).toBe("member");
    expect(member.workspaceId).toBe(workspace.id);

    // Replay should fail (single-use)
    expect(() => {
      WorkspaceService.acceptInvitation(rawToken, {
        id: "usr_imposter",
        name: "Imposter",
        email: "imposter@cyberdyne.com",
      });
    }).toThrow(/no longer valid/);
  });

  it("should prevent demoting or removing the last workspace owner", () => {
    const { workspace } = WorkspaceService.createWorkspace({
      name: "Wayne Enterprises",
      slug: "wayne",
      creatorUserId: "usr_bruce",
      creatorEmail: "bruce@wayne.com",
      creatorName: "Bruce Wayne",
    });

    expect(() => {
      WorkspaceService.updateMemberRole(workspace.id, "owner", "usr_bruce", "member");
    }).toThrow(/Cannot demote the last owner/);

    expect(() => {
      WorkspaceService.removeMember(workspace.id, "owner", "usr_bruce");
    }).toThrow(/Cannot remove the last owner/);
  });

  it("should maintain private-by-default access for conversations and authorize shared grants", () => {
    const convId = "conv-private-99";
    const ownerId = "usr_alice";

    // Unshared conversation: stranger has no access
    const noAccess = WorkspaceService.canAccessConversation(
      convId,
      ownerId,
      "usr_stranger",
      []
    );
    expect(noAccess.allowed).toBe(false);

    // Direct share
    WorkspaceService.shareConversation({
      conversationId: convId,
      sharedByUserId: ownerId,
      sharedWithUserId: "usr_bob",
      permission: "read",
    });

    const bobAccess = WorkspaceService.canAccessConversation(
      convId,
      ownerId,
      "usr_bob",
      []
    );
    expect(bobAccess.allowed).toBe(true);
    expect(bobAccess.permission).toBe("read");
  });

  it("should enforce workspace policies restricting disallowed models and spend caps", () => {
    const { workspace } = WorkspaceService.createWorkspace({
      name: "Policy Bound Org",
      slug: "policy-org",
      creatorUserId: "usr_admin",
      creatorEmail: "admin@policy.com",
      creatorName: "Policy Admin",
    });

    // Configure policy allowing only nexora-swift
    WorkspaceService.updatePolicy(workspace.id, "owner", {
      allowedModels: ["nexora-swift"],
      enforceModelAllowlist: true,
      maxMonthlySpendCents: 50000,
      currentMonthlySpendCents: 0,
    });

    // Allowed model succeeds
    const allowed = ModelRouter.resolveRoutes("nexora-swift", "enterprise", workspace.id);
    expect(allowed.length).toBeGreaterThan(0);

    // Disallowed model throws policy restriction error
    expect(() => {
      ModelRouter.resolveRoutes("openai:gpt-4o", "enterprise", workspace.id);
    }).toThrow(/prohibited by your workspace governance policy/);

    // Exceeded spend cap throws error
    WorkspaceService.updatePolicy(workspace.id, "owner", {
      currentMonthlySpendCents: 50000,
    });
    expect(() => {
      ModelRouter.resolveRoutes("nexora-swift", "enterprise", workspace.id);
    }).toThrow(/spending limit/);
  });
});
