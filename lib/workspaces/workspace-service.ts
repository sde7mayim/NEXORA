import crypto from "crypto";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  planId: "enterprise";
  status: "active" | "archived";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  tokenHash: string;
  expiresAt: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  createdAt: string;
}

export interface ConversationShare {
  id: string;
  conversationId: string;
  sharedByUserId: string;
  sharedWithWorkspaceId?: string;
  sharedWithUserId?: string;
  permission: "read" | "comment" | "edit";
  createdAt: string;
}

export interface WorkspacePolicy {
  workspaceId: string;
  allowedModels: string[]; // empty means all permitted
  maxMonthlySpendCents: number;
  currentMonthlySpendCents: number;
  enforceModelAllowlist: boolean;
  retentionDays: number;
}

export class WorkspaceService {
  // In-memory tenant store for resilient operations and tests
  private static workspaces: Map<string, Workspace> = new Map([
    [
      "ws-default",
      {
        id: "ws-default",
        name: "Acme Corp AI Labs",
        slug: "acme-corp",
        planId: "enterprise",
        status: "active",
        createdBy: "usr_alex",
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
      },
    ],
  ]);

  private static members: Map<string, WorkspaceMember[]> = new Map([
    [
      "ws-default",
      [
        {
          id: "m-1",
          workspaceId: "ws-default",
          userId: "usr_alex",
          userName: "Alex Rivera",
          userEmail: "alex@acme.com",
          role: "owner",
          joinedAt: "2026-10-01T00:00:00Z",
        },
        {
          id: "m-2",
          workspaceId: "ws-default",
          userId: "usr_sarah",
          userName: "Sarah Chen",
          userEmail: "sarah@acme.com",
          role: "admin",
          joinedAt: "2026-10-05T00:00:00Z",
        },
        {
          id: "m-3",
          workspaceId: "ws-default",
          userId: "usr_marcus",
          userName: "Marcus Brody",
          userEmail: "marcus@acme.com",
          role: "member",
          joinedAt: "2026-10-12T00:00:00Z",
        },
      ],
    ],
  ]);

  private static invitations: Map<string, WorkspaceInvitation[]> = new Map([
    ["ws-default", []],
  ]);

  private static conversationShares: Map<string, ConversationShare[]> = new Map();

  private static policies: Map<string, WorkspacePolicy> = new Map([
    [
      "ws-default",
      {
        workspaceId: "ws-default",
        allowedModels: ["nexora-core", "nexora-swift", "openai:gpt-4o-mini"],
        maxMonthlySpendCents: 50000,
        currentMonthlySpendCents: 12450,
        enforceModelAllowlist: true,
        retentionDays: 730,
      },
    ],
  ]);

  /**
   * Hashes an invitation token using SHA-256 for secure storage.
   */
  static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Generates a single-use expiring invitation token.
   */
  static generateInvitationToken(): { rawToken: string; tokenHash: string; expiresAt: Date } {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    return { rawToken, tokenHash, expiresAt };
  }

  /**
   * Evaluates if an actor's role can manage workspace settings or membership.
   */
  static canManageWorkspace(role: WorkspaceRole): boolean {
    return role === "owner" || role === "admin";
  }

  /**
   * Retrieves all workspaces where user is a member.
   */
  static getUserWorkspaces(userId: string): Workspace[] {
    const userWorkspaceIds: string[] = [];
    this.members.forEach((memberList, wsId) => {
      if (memberList.some((m) => m.userId === userId)) {
        userWorkspaceIds.push(wsId);
      }
    });

    return Array.from(this.workspaces.values()).filter(
      (ws) => userWorkspaceIds.includes(ws.id) && ws.status === "active"
    );
  }

  /**
   * Retrieves a single workspace by ID.
   */
  static getWorkspace(workspaceId: string): Workspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  /**
   * Creates a new workspace and assigns creator as the primary owner.
   */
  static createWorkspace(params: {
    name: string;
    slug: string;
    creatorUserId: string;
    creatorEmail: string;
    creatorName: string;
  }): { workspace: Workspace; ownerMember: WorkspaceMember } {
    const id = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const workspace: Workspace = {
      id,
      name: params.name,
      slug: params.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      planId: "enterprise",
      status: "active",
      createdBy: params.creatorUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ownerMember: WorkspaceMember = {
      id: `m_${Date.now()}_owner`,
      workspaceId: id,
      userId: params.creatorUserId,
      userName: params.creatorName,
      userEmail: params.creatorEmail,
      role: "owner",
      joinedAt: new Date().toISOString(),
    };

    this.workspaces.set(id, workspace);
    this.members.set(id, [ownerMember]);
    this.invitations.set(id, []);
    this.policies.set(id, {
      workspaceId: id,
      allowedModels: [],
      maxMonthlySpendCents: 100000,
      currentMonthlySpendCents: 0,
      enforceModelAllowlist: false,
      retentionDays: 730,
    });

    return { workspace, ownerMember };
  }

  /**
   * Updates workspace details.
   */
  static updateWorkspace(
    workspaceId: string,
    actorRole: WorkspaceRole,
    updates: { name?: string; status?: "active" | "archived" }
  ): Workspace {
    if (!this.canManageWorkspace(actorRole)) {
      throw new Error("Unauthorized: Only owners and admins can modify workspace details.");
    }
    const ws = this.workspaces.get(workspaceId);
    if (!ws) throw new Error("Workspace not found.");

    if (updates.name) ws.name = updates.name;
    if (updates.status) ws.status = updates.status;
    ws.updatedAt = new Date().toISOString();
    return ws;
  }

  /**
   * Lists all members of a workspace.
   */
  static getMembers(workspaceId: string): WorkspaceMember[] {
    return this.members.get(workspaceId) || [];
  }

  /**
   * Updates a member's role with protection against demoting the last owner.
   */
  static updateMemberRole(
    workspaceId: string,
    actorRole: WorkspaceRole,
    targetUserId: string,
    newRole: WorkspaceRole
  ): WorkspaceMember {
    if (actorRole !== "owner") {
      throw new Error("Unauthorized: Only workspace owners can change member roles.");
    }

    const memberList = this.members.get(workspaceId) || [];
    const target = memberList.find((m) => m.userId === targetUserId);
    if (!target) throw new Error("Member not found in workspace.");

    if (target.role === "owner" && newRole !== "owner") {
      const ownerCount = memberList.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) {
        throw new Error("Forbidden: Cannot demote the last owner. Transfer ownership first.");
      }
    }

    target.role = newRole;
    return target;
  }

  /**
   * Removes a member from the workspace, preventing removal of the last owner.
   */
  static removeMember(workspaceId: string, actorRole: WorkspaceRole, targetUserId: string): void {
    if (!this.canManageWorkspace(actorRole)) {
      throw new Error("Unauthorized: Only owners and admins can remove workspace members.");
    }

    const memberList = this.members.get(workspaceId) || [];
    const target = memberList.find((m) => m.userId === targetUserId);
    if (!target) throw new Error("Member not found in workspace.");

    if (target.role === "owner") {
      const ownerCount = memberList.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) {
        throw new Error("Forbidden: Cannot remove the last owner of the workspace.");
      }
    }

    this.members.set(
      workspaceId,
      memberList.filter((m) => m.userId !== targetUserId)
    );
  }

  /**
   * Issues an expiring invitation.
   */
  static createInvitation(
    workspaceId: string,
    actorRole: WorkspaceRole,
    email: string,
    role: WorkspaceRole = "member"
  ): { invitation: WorkspaceInvitation; rawToken: string } {
    if (!this.canManageWorkspace(actorRole)) {
      throw new Error("Unauthorized: Only owners and admins can send workspace invitations.");
    }

    const { rawToken, tokenHash, expiresAt } = this.generateInvitationToken();
    const invitation: WorkspaceInvitation = {
      id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      workspaceId,
      email: email.toLowerCase().trim(),
      role,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const currentInvites = this.invitations.get(workspaceId) || [];
    currentInvites.push(invitation);
    this.invitations.set(workspaceId, currentInvites);

    return { invitation, rawToken };
  }

  /**
   * Accepts a single-use invitation token.
   */
  static acceptInvitation(
    rawToken: string,
    user: { id: string; name: string; email: string }
  ): { workspace: Workspace; member: WorkspaceMember } {
    const tokenHash = this.hashToken(rawToken);
    let matchedInvite: WorkspaceInvitation | undefined;
    let matchedWsId: string | undefined;

    this.invitations.forEach((invList, wsId) => {
      const found = invList.find((i) => i.tokenHash === tokenHash);
      if (found) {
        matchedInvite = found;
        matchedWsId = wsId;
      }
    });

    if (!matchedInvite || !matchedWsId) {
      throw new Error("Invalid or unrecognised invitation token.");
    }

    if (matchedInvite.status !== "pending") {
      throw new Error(`Invitation is no longer valid (status: ${matchedInvite.status}).`);
    }

    if (new Date(matchedInvite.expiresAt).getTime() < Date.now()) {
      matchedInvite.status = "expired";
      throw new Error("Invitation token has expired. Please request a new invite.");
    }

    matchedInvite.status = "accepted";
    const newMember: WorkspaceMember = {
      id: `m_${Date.now()}`,
      workspaceId: matchedWsId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: matchedInvite.role,
      joinedAt: new Date().toISOString(),
    };

    const members = this.members.get(matchedWsId) || [];
    // Ensure idempotency
    const existingIdx = members.findIndex((m) => m.userId === user.id);
    if (existingIdx >= 0) {
      members[existingIdx] = newMember;
    } else {
      members.push(newMember);
    }
    this.members.set(matchedWsId, members);

    const ws = this.workspaces.get(matchedWsId)!;
    return { workspace: ws, member: newMember };
  }

  /**
   * Revokes a pending invitation.
   */
  static revokeInvitation(workspaceId: string, actorRole: WorkspaceRole, inviteId: string): void {
    if (!this.canManageWorkspace(actorRole)) {
      throw new Error("Unauthorized to revoke invitations.");
    }
    const invites = this.invitations.get(workspaceId) || [];
    const inv = invites.find((i) => i.id === inviteId);
    if (inv) inv.status = "revoked";
  }

  /**
   * Shares a conversation with a workspace or specific user (private by default).
   */
  static shareConversation(params: {
    conversationId: string;
    sharedByUserId: string;
    sharedWithWorkspaceId?: string;
    sharedWithUserId?: string;
    permission?: "read" | "comment" | "edit";
  }): ConversationShare {
    const share: ConversationShare = {
      id: `share_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId: params.conversationId,
      sharedByUserId: params.sharedByUserId,
      sharedWithWorkspaceId: params.sharedWithWorkspaceId,
      sharedWithUserId: params.sharedWithUserId,
      permission: params.permission || "read",
      createdAt: new Date().toISOString(),
    };

    const shares = this.conversationShares.get(params.conversationId) || [];
    shares.push(share);
    this.conversationShares.set(params.conversationId, shares);
    return share;
  }

  /**
   * Verifies if a user has access to a conversation (private by default, owner has full access, shares grant read/edit).
   */
  static canAccessConversation(
    conversationId: string,
    conversationOwnerId: string,
    requestingUserId: string,
    userWorkspaceIds: string[]
  ): { allowed: boolean; permission: "owner" | "read" | "comment" | "edit" | "none" } {
    if (conversationOwnerId === requestingUserId) {
      return { allowed: true, permission: "owner" };
    }

    const shares = this.conversationShares.get(conversationId) || [];
    // 1. Direct user share
    const directShare = shares.find((s) => s.sharedWithUserId === requestingUserId);
    if (directShare) {
      return { allowed: true, permission: directShare.permission };
    }

    // 2. Workspace share
    const wsShare = shares.find(
      (s) => s.sharedWithWorkspaceId && userWorkspaceIds.includes(s.sharedWithWorkspaceId)
    );
    if (wsShare) {
      return { allowed: true, permission: wsShare.permission };
    }

    return { allowed: false, permission: "none" };
  }

  /**
   * Gets workspace policy.
   */
  static getPolicy(workspaceId: string): WorkspacePolicy | undefined {
    return this.policies.get(workspaceId);
  }

  /**
   * Updates workspace policy.
   */
  static updatePolicy(
    workspaceId: string,
    actorRole: WorkspaceRole,
    updates: Partial<WorkspacePolicy>
  ): WorkspacePolicy {
    if (!this.canManageWorkspace(actorRole)) {
      throw new Error("Unauthorized: Only owners and admins can configure workspace policies.");
    }
    const policy = this.policies.get(workspaceId) || {
      workspaceId,
      allowedModels: [],
      maxMonthlySpendCents: 50000,
      currentMonthlySpendCents: 0,
      enforceModelAllowlist: false,
      retentionDays: 730,
    };

    const updated = { ...policy, ...updates };
    this.policies.set(workspaceId, updated);
    return updated;
  }
}
