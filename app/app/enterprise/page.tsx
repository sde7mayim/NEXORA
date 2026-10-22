"use client";

import { useState } from "react";
import {
  Building2,
  Users,
  Shield,
  UserPlus,
  Trash2,
  Sliders,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Lock,
  Globe,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { WorkspaceMember, WorkspaceRole } from "@/lib/workspaces/workspace-service";

export default function EnterpriseWorkspacePage() {
  const [activeTab, setActiveTab] = useState<"members" | "policies" | "audit" | "sso">("members");

  // Members State
  const [members, setMembers] = useState<WorkspaceMember[]>([
    {
      id: "m-1",
      workspaceId: "ws-default",
      userId: "usr_alex",
      userName: "Alex Rivera",
      userEmail: "alex@acme.com",
      role: "owner",
      joinedAt: "2026-10-01",
    },
    {
      id: "m-2",
      workspaceId: "ws-default",
      userId: "usr_sarah",
      userName: "Sarah Chen",
      userEmail: "sarah@acme.com",
      role: "admin",
      joinedAt: "2026-10-05",
    },
    {
      id: "m-3",
      workspaceId: "ws-default",
      userId: "usr_marcus",
      userName: "Marcus Brody",
      userEmail: "marcus@acme.com",
      role: "member",
      joinedAt: "2026-10-12",
    },
  ]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member");
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);

  // Policy State
  const [spendingCap, setSpendingCap] = useState(50000); // ₹50,000
  const [allowedModels, setAllowedModels] = useState<string[]>([
    "nexora-core",
    "nexora-swift",
    "openai:gpt-4o-mini",
  ]);

  // SSO State
  const [ssoProtocol, setSsoProtocol] = useState<"saml" | "oidc">("saml");
  const [idpIssuer, setIdpIssuer] = useState("https://identity.okta.com/app/exk12345/sso/saml");
  const [ssoLoginUrl, setSsoLoginUrl] = useState("https://identity.okta.com/app/exk12345/sso/saml/login");
  const [ssoVerified, setSsoVerified] = useState(true);

  // Assertion Simulator State
  const [testAssertionIssuer, setTestAssertionIssuer] = useState("https://identity.okta.com/app/exk12345/sso/saml");
  const [testAssertionAudience, setTestAssertionAudience] = useState("https://app.nexora.ai/saml/sp");
  const [testAssertionEmail, setTestAssertionEmail] = useState("alex@acme.com");
  const [testAssertionResult, setTestAssertionResult] = useState<{
    valid: boolean;
    claims?: { email: string; name?: string; issuer: string; audience: string; sessionIndex?: string };
    error?: string;
  } | null>(null);
  const [isTestingAssertion, setIsTestingAssertion] = useState(false);

  const handleTestAssertion = async () => {
    setIsTestingAssertion(true);
    try {
      const res = await fetch("/api/enterprise/sso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_assertion",
          orgId: "ws-default",
          issuer: testAssertionIssuer,
          audience: testAssertionAudience,
          email: testAssertionEmail,
        }),
      });
      const data = await res.json();
      setTestAssertionResult(data.result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTestingAssertion(false);
    }
  };

  // Audit Logs State
  const [auditLogs] = useState([
    {
      id: "aud-1",
      action: "workspace.updated",
      actor: "alex@acme.com",
      target: "Acme Corp AI Labs",
      timestamp: "2026-10-21 09:00",
    },
    {
      id: "aud-2",
      action: "policy.updated",
      actor: "alex@acme.com",
      target: "Spending Cap ₹50,000",
      timestamp: "2026-10-21 10:15",
    },
    {
      id: "aud-3",
      action: "member.invited",
      actor: "sarah@acme.com",
      target: "dev-lead@acme.com",
      timestamp: "2026-10-21 14:20",
    },
  ]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const newMember: WorkspaceMember = {
      id: `m-${Date.now()}`,
      workspaceId: "ws-default",
      userId: `usr_${Date.now()}`,
      userName: inviteEmail.split("@")[0],
      userEmail: inviteEmail,
      role: inviteRole,
      joinedAt: new Date().toISOString().split("T")[0],
    };

    setMembers([...members, newMember]);
    setInviteFeedback(`Invitation sent to ${inviteEmail} with 7-day single-use token.`);
    setInviteEmail("");
    setTimeout(() => setInviteFeedback(null), 3000);
  };

  const handleRoleChange = (memberId: string, newRole: WorkspaceRole) => {
    const target = members.find((m) => m.id === memberId);
    if (target?.role === "owner" && newRole !== "owner") {
      const ownerCount = members.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) {
        alert("Cannot demote the last workspace owner.");
        return;
      }
    }
    setMembers(members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
  };

  const handleRemoveMember = (memberId: string) => {
    const target = members.find((m) => m.id === memberId);
    if (target?.role === "owner") {
      const ownerCount = members.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) {
        alert("Cannot remove the last workspace owner.");
        return;
      }
    }
    setMembers(members.filter((m) => m.id !== memberId));
  };

  const downloadAuditCsv = () => {
    window.open("/api/enterprise/audit?format=csv", "_blank");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Enterprise Workspace & Governance</h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Manage multi-user workspaces, RBAC policies, compliance audit trails, and SAML/OIDC SSO federation.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-900 border border-white/10 p-1 text-xs">
          <button
            onClick={() => setActiveTab("members")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === "members" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            Team & Roles
          </button>
          <button
            onClick={() => setActiveTab("policies")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === "policies" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            Policies & Spend
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === "audit" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            Audit Trail
          </button>
          <button
            onClick={() => setActiveTab("sso")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === "sso" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            SSO & Identity
          </button>
        </div>
      </div>

      {/* Tab 1: Team & Roles */}
      {activeTab === "members" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span>Invite New Team Member</span>
            </h3>
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="member">Member (Chat & Tools)</option>
                <option value="viewer">Viewer (Read-Only)</option>
                <option value="admin">Administrator (Settings & Invites)</option>
                <option value="owner">Owner (Full Permissions)</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
              >
                Send Invite
              </button>
            </form>
            {inviteFeedback && (
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
                {inviteFeedback}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/40 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-zinc-400 font-medium">
                  <th className="p-4">Member</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.01]">
                    <td className="p-4">
                      <div className="font-semibold text-white">{m.userName}</div>
                      <div className="text-zinc-400 text-[11px]">{m.userEmail}</div>
                    </td>
                    <td className="p-4">
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value as WorkspaceRole)}
                        className="bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="p-4 text-zinc-400">{m.joinedAt}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-zinc-500 hover:text-rose-400 p-1"
                        title="Remove Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Policies & Spend */}
      {activeTab === "policies" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Workspace Spending Limits</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Hard server-side cap on monthly model token usage. Once reached, paid model calls are blocked until reconciled.
            </p>
            <div className="space-y-2">
              <label className="text-xs text-zinc-300 font-medium">Monthly Cap: {formatPrice(spendingCap)}</label>
              <input
                type="range"
                min={10000}
                max={250000}
                step={5000}
                value={spendingCap}
                onChange={(e) => setSpendingCap(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Model Whitelist Restrictions</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Restrict members to approved models to prevent unauthorized provider routing or cost spikes.
            </p>
            <div className="space-y-2 text-xs">
              {["nexora-swift", "nexora-core", "nexora-reason", "openai:gpt-4o"].map((model) => (
                <label key={model} className="flex items-center gap-2 text-zinc-300">
                  <input
                    type="checkbox"
                    checked={allowedModels.includes(model)}
                    onChange={(e) => {
                      if (e.target.checked) setAllowedModels([...allowedModels, model]);
                      else setAllowedModels(allowedModels.filter((m) => m !== model));
                    }}
                    className="rounded border-white/10 bg-slate-950 text-indigo-600"
                  />
                  <span className="font-mono">{model}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Audit Trail */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Immutable Governance Audit Logs
            </h3>
            <button
              onClick={downloadAuditCsv}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white font-medium flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/40 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-zinc-400 font-medium">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Target Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.01]">
                    <td className="p-4 font-mono text-zinc-500">{log.timestamp}</td>
                    <td className="p-4 font-mono text-indigo-300">{log.action}</td>
                    <td className="p-4 text-white">{log.actor}</td>
                    <td className="p-4 text-zinc-400">{log.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: SSO & Identity Federation */}
      {activeTab === "sso" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>Enterprise Identity Provider Federation</span>
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-zinc-400">Identity Provider Issuer URL</label>
                <input
                  type="text"
                  value={idpIssuer}
                  onChange={(e) => setIdpIssuer(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-zinc-400">Single Sign-On Login Endpoint</label>
                <input
                  type="text"
                  value={ssoLoginUrl}
                  onChange={(e) => setSsoLoginUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono mt-1"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-2 text-xs">
              <span className="font-semibold text-zinc-300">Nexora Service Provider (SP) Metadata</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-zinc-400">
                <div>SP Entity ID: <span className="text-indigo-300">https://app.nexora.ai/saml/sp</span></div>
                <div>ACS Callback URL: <span className="text-indigo-300">https://app.nexora.ai/api/auth/sso/callback</span></div>
              </div>
            </div>

            {/* Live SSO Assertion Validation Simulator */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/20 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span>Inbound Assertion & Claims Simulator</span>
                  </span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Verify IdP issuer matching, SP audience binding, and subject claim extraction before going live.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestAssertion}
                  disabled={isTestingAssertion}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {isTestingAssertion ? "Verifying..." : "Validate Claims"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400">Simulated Issuer</label>
                  <input
                    type="text"
                    value={testAssertionIssuer}
                    onChange={(e) => setTestAssertionIssuer(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400">Simulated Audience</label>
                  <input
                    type="text"
                    value={testAssertionAudience}
                    onChange={(e) => setTestAssertionAudience(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400">Subject NameID (Email)</label>
                  <input
                    type="email"
                    value={testAssertionEmail}
                    onChange={(e) => setTestAssertionEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono mt-1"
                  />
                </div>
              </div>

              {testAssertionResult && (
                <div
                  className={`p-3 rounded-lg border text-xs font-mono ${
                    testAssertionResult.valid
                      ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                      : "bg-red-950/40 border-red-500/30 text-red-300"
                  }`}
                >
                  {testAssertionResult.valid ? (
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Assertion Verified: Valid SAML 2.0 Subject</span>
                      </div>
                      <div className="text-[11px] text-zinc-300">
                        Email: {testAssertionResult.claims?.email} | Issuer: {testAssertionResult.claims?.issuer}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-red-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Validation Failed</span>
                      </div>
                      <div className="text-[11px]">{testAssertionResult.error}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
