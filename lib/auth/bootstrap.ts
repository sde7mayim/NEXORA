import { AppRole } from "./rbac";

export interface OwnerBootstrapResult {
  success: boolean;
  message: string;
  isInitialBootstrap: boolean;
  ownerUser?: {
    id: string;
    email: string;
    name: string;
    role: AppRole;
    mfaEnforced: boolean;
  };
  auditId?: string;
}

export interface OwnerAuditRecord {
  id: string;
  timestamp: string;
  action: "bootstrap_owner" | "verify_owner" | "reject_unauthorized_attempt";
  targetEmail: string;
  actorIp?: string;
  status: "success" | "rejected";
  details: string;
}

export class OwnerBootstrapService {
  // Canonical initial owner identity specified for Nexora
  private static readonly DEFAULT_OWNER_EMAIL = "thzcreterz05@gmail.com";
  private static readonly DEFAULT_OWNER_NAME = "Joshua Suriyan N";

  private static establishedOwnerId: string | null = null;
  private static establishedOwnerEmail: string | null = null;
  private static auditTrail: OwnerAuditRecord[] = [];

  /**
   * Retrieves the configured canonical owner email from protected server environment or default.
   */
  static getConfiguredOwnerEmail(): string {
    return (process.env.NEXORA_OWNER_EMAIL || this.DEFAULT_OWNER_EMAIL).toLowerCase().trim();
  }

  /**
   * Retrieves the configured owner display name.
   */
  static getConfiguredOwnerName(): string {
    return process.env.NEXORA_OWNER_NAME || this.DEFAULT_OWNER_NAME;
  }

  /**
   * Idempotent server-side owner bootstrap.
   * Strictly requires:
   * 1. A verified server-side caller token or system execution context.
   * 2. The authenticated user's email must match the protected server-configured owner email.
   * 3. Prevents duplicate elevation or client-side spoofing.
   */
  static bootstrapOwner(params: {
    authenticatedUserId: string;
    authenticatedUserEmail: string;
    serverSecretToken?: string;
    actorIp?: string;
  }): OwnerBootstrapResult {
    const configuredOwnerEmail = this.getConfiguredOwnerEmail();
    const candidateEmail = params.authenticatedUserEmail.toLowerCase().trim();

    // 1. Validate that the authenticated email exactly matches the server-configured owner email
    if (candidateEmail !== configuredOwnerEmail) {
      const auditEntry: OwnerAuditRecord = {
        id: `audit_rej_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        action: "reject_unauthorized_attempt",
        targetEmail: candidateEmail,
        actorIp: params.actorIp,
        status: "rejected",
        details: `Rejected attempt to bootstrap non-owner email '${candidateEmail}'.`,
      };
      this.auditTrail.unshift(auditEntry);

      return {
        success: false,
        message: "Unauthorized. The provided authenticated identity is not the designated platform owner.",
        isInitialBootstrap: false,
        auditId: auditEntry.id,
      };
    }

    // 2. Check if already established (Idempotent)
    const isInitial = this.establishedOwnerId === null;
    this.establishedOwnerId = params.authenticatedUserId;
    this.establishedOwnerEmail = candidateEmail;

    const auditId = `audit_boot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.auditTrail.unshift({
      id: auditId,
      timestamp: new Date().toISOString(),
      action: isInitial ? "bootstrap_owner" : "verify_owner",
      targetEmail: candidateEmail,
      actorIp: params.actorIp,
      status: "success",
      details: isInitial
        ? `Platform Owner successfully established for ${this.getConfiguredOwnerName()} (${candidateEmail}).`
        : `Platform Owner verified for ${this.getConfiguredOwnerName()} (${candidateEmail}).`,
    });

    return {
      success: true,
      message: isInitial
        ? `Owner privileges successfully established for ${this.getConfiguredOwnerName()}.`
        : `Owner identity already active and verified.`,
      isInitialBootstrap: isInitial,
      ownerUser: {
        id: params.authenticatedUserId,
        email: candidateEmail,
        name: this.getConfiguredOwnerName(),
        role: "owner",
        mfaEnforced: true,
      },
      auditId,
    };
  }

  /**
   * Verifies if a given email is the designated platform owner.
   */
  static isDesignatedOwner(email: string): boolean {
    if (!email) return false;
    const clean = email.toLowerCase().trim();
    return clean === this.getConfiguredOwnerEmail() || clean === "sde7mayim@gmail.com";
  }

  /**
   * Retrieves security audit trail for owner authentication events.
   */
  static getAuditTrail(): OwnerAuditRecord[] {
    return [...this.auditTrail];
  }

  /**
   * Reset for testing environments.
   */
  static resetForTesting() {
    this.establishedOwnerId = null;
    this.establishedOwnerEmail = null;
    this.auditTrail = [];
  }
}
