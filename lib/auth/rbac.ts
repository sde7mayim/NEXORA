export type AppRole =
  | "owner"
  | "admin"
  | "workspace_admin"
  | "family_owner"
  | "member"
  | "user";

export type Permission =
  | "platform:manage_models"
  | "platform:manage_packages"
  | "platform:manage_billing"
  | "platform:view_audit_logs"
  | "platform:manage_system"
  | "workspace:manage_members"
  | "workspace:manage_policies"
  | "family:manage_members"
  | "family:view_usage"
  | "chat:send_message"
  | "files:upload";

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  owner: [
    "platform:manage_models",
    "platform:manage_packages",
    "platform:manage_billing",
    "platform:view_audit_logs",
    "platform:manage_system",
    "workspace:manage_members",
    "workspace:manage_policies",
    "family:manage_members",
    "family:view_usage",
    "chat:send_message",
    "files:upload",
  ],
  admin: [
    "platform:manage_models",
    "platform:manage_packages",
    "platform:view_audit_logs",
    "workspace:manage_members",
    "chat:send_message",
    "files:upload",
  ],
  workspace_admin: [
    "workspace:manage_members",
    "workspace:manage_policies",
    "chat:send_message",
    "files:upload",
  ],
  family_owner: [
    "family:manage_members",
    "family:view_usage",
    "chat:send_message",
    "files:upload",
  ],
  member: [
    "chat:send_message",
    "files:upload",
  ],
  user: [
    "chat:send_message",
    "files:upload",
  ],
};

export class RBACService {
  /**
   * Checks whether a role has the specified permission.
   */
  static hasPermission(role: AppRole, permission: Permission): boolean {
    const list = ROLE_PERMISSIONS[role] || [];
    return list.includes(permission);
  }

  /**
   * Determines if an acting role is allowed to grant/modify a target role.
   * Safeguard: Only the Platform Owner can create/modify other owners or admins.
   */
  static canModifyRole(actingRole: AppRole, targetCurrentRole: AppRole, newRole: AppRole): boolean {
    if (actingRole === "owner") {
      return true; // Owner has full authorization
    }

    // Admins cannot change owner roles, nor can they promote anyone to owner
    if (actingRole === "admin") {
      if (targetCurrentRole === "owner" || newRole === "owner") {
        return false;
      }
      return targetCurrentRole !== "admin"; // Admins cannot demote peer admins
    }

    return false; // Ordinary users and workspace admins cannot modify global platform roles
  }

  /**
   * Validates if a user role modification is valid and not self-escalation.
   */
  static validateRoleChange(params: {
    actorUserId: string;
    actorRole: AppRole;
    targetUserId: string;
    targetCurrentRole: AppRole;
    newRole: AppRole;
  }): { allowed: boolean; reason?: string } {
    // 1. Prevent self-escalation (cannot promote yourself to higher privileges)
    if (params.actorUserId === params.targetUserId && params.newRole !== params.targetCurrentRole) {
      return {
        allowed: false,
        reason: "Self-escalation is strictly prohibited. An administrator or owner must grant role changes.",
      };
    }

    // 2. Check role hierarchy
    const canModify = this.canModifyRole(params.actorRole, params.targetCurrentRole, params.newRole);
    if (!canModify) {
      return {
        allowed: false,
        reason: `Role '${params.actorRole}' is unauthorized to assign role '${params.newRole}' to '${params.targetCurrentRole}'.`,
      };
    }

    return { allowed: true };
  }
}
