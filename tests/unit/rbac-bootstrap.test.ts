import { describe, it, expect, beforeEach } from "vitest";
import { OwnerBootstrapService } from "../../lib/auth/bootstrap";
import { RBACService, AppRole } from "../../lib/auth/rbac";

describe("OwnerBootstrapService & RBAC Authorization", () => {
  beforeEach(() => {
    OwnerBootstrapService.resetForTesting();
  });

  it("bootstraps the canonical owner identity safely and idempotently", () => {
    const res1 = OwnerBootstrapService.bootstrapOwner({
      authenticatedUserId: "usr_joshua_suriyan",
      authenticatedUserEmail: "thzcreterz05@gmail.com",
    });

    expect(res1.success).toBe(true);
    expect(res1.isInitialBootstrap).toBe(true);
    expect(res1.ownerUser?.email).toBe("thzcreterz05@gmail.com");
    expect(res1.ownerUser?.role).toBe("owner");

    // Idempotent secondary invocation
    const res2 = OwnerBootstrapService.bootstrapOwner({
      authenticatedUserId: "usr_joshua_suriyan",
      authenticatedUserEmail: "thzcreterz05@gmail.com",
    });

    expect(res2.success).toBe(true);
    expect(res2.isInitialBootstrap).toBe(false); // Verified without duplicate creation
  });

  it("strictly rejects bootstrap attempts from unauthorized emails", () => {
    const res = OwnerBootstrapService.bootstrapOwner({
      authenticatedUserId: "usr_attacker",
      authenticatedUserEmail: "attacker@randomdomain.com",
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain("Unauthorized");

    const audit = OwnerBootstrapService.getAuditTrail();
    expect(audit.length).toBeGreaterThan(0);
    expect(audit[0].status).toBe("rejected");
  });

  it("prevents self-escalation by ordinary users", () => {
    const res = RBACService.validateRoleChange({
      actorUserId: "usr_regular",
      actorRole: "user",
      targetUserId: "usr_regular",
      targetCurrentRole: "user",
      newRole: "admin", // Attempting self-promotion to admin
    });

    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("Self-escalation is strictly prohibited");
  });

  it("enforces role permissions hierarchy correctly", () => {
    // Owner has platform management capabilities
    expect(RBACService.hasPermission("owner", "platform:manage_models")).toBe(true);
    expect(RBACService.hasPermission("owner", "platform:manage_billing")).toBe(true);

    // Admin has model management but cannot manage owner billing or system root
    expect(RBACService.hasPermission("admin", "platform:manage_models")).toBe(true);
    expect(RBACService.hasPermission("admin", "platform:manage_billing")).toBe(false);

    // Ordinary user cannot manage models
    expect(RBACService.hasPermission("user", "platform:manage_models")).toBe(false);
    expect(RBACService.hasPermission("user", "chat:send_message")).toBe(true);
  });
});
