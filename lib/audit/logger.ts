export type AuditAction =
  | "member.invited"
  | "member.joined"
  | "member.role_updated"
  | "member.removed"
  | "workspace.updated"
  | "policy.updated"
  | "apikey.created"
  | "apikey.revoked"
  | "document.indexed"
  | "document.deleted"
  | "workflow.created"
  | "workflow.approved"
  | "workflow.executed"
  | "sso.configured"
  | "sso.verified";

export interface AuditRecord {
  id: string;
  orgId: string;
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

export class AuditLogger {
  private static records: AuditRecord[] = [
    {
      id: "aud-1",
      orgId: "ws-default",
      actorId: "usr_joshua",
      actorEmail: "thzcreterz05@gmail.com",
      action: "workspace.updated",
      targetType: "workspace",
      targetId: "ws-default",
      details: { name: "Acme Corp AI Labs", status: "active" },
      ipAddress: "192.0.2.1",
      timestamp: "2026-10-21T09:00:00Z",
    },
    {
      id: "aud-2",
      orgId: "ws-default",
      actorId: "usr_joshua",
      actorEmail: "thzcreterz05@gmail.com",
      action: "policy.updated",
      targetType: "policy",
      targetId: "ws-default",
      details: { maxMonthlySpendCents: 50000, enforceModelAllowlist: true },
      ipAddress: "192.0.2.1",
      timestamp: "2026-10-21T10:15:00Z",
    },
  ];

  /**
   * Records an immutable administrative audit event.
   */
  static log(record: Omit<AuditRecord, "id" | "timestamp">): AuditRecord {
    const fullRecord: AuditRecord = {
      ...record,
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    this.records.unshift(fullRecord);
    if (this.records.length > 1000) {
      this.records.pop();
    }
    return fullRecord;
  }

  /**
   * Queries audit logs with filtering by action, target, actor, or date range.
   */
  static search(params: {
    orgId: string;
    action?: string;
    actorEmail?: string;
    targetType?: string;
    limit?: number;
  }): AuditRecord[] {
    const limit = params.limit || 50;
    return this.records
      .filter((r) => {
        if (r.orgId !== params.orgId) return false;
        if (params.action && r.action !== params.action) return false;
        if (params.actorEmail && !r.actorEmail.toLowerCase().includes(params.actorEmail.toLowerCase())) return false;
        if (params.targetType && r.targetType !== params.targetType) return false;
        return true;
      })
      .slice(0, limit);
  }

  /**
   * Exports audit logs as CSV string for compliance reporting.
   */
  static exportCsv(orgId: string): string {
    const records = this.search({ orgId, limit: 500 });
    const headers = ["Timestamp", "Action", "Actor", "Target Type", "Target ID", "Details"];
    const rows = records.map((r) => [
      r.timestamp,
      r.action,
      r.actorEmail,
      r.targetType,
      r.targetId,
      JSON.stringify(r.details).replace(/"/g, '""'),
    ]);

    return [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
  }
}
