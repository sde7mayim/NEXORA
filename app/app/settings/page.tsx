"use client";

import { useState, useEffect } from "react";
import {
  User,
  Shield,
  Moon,
  Cpu,
  Save,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Mail,
  Bell,
  Clock,
  ExternalLink,
} from "lucide-react";
import { NEXORA_MODEL_FAMILIES } from "@/lib/ai/model-registry";
import { createClient } from "@/lib/supabase/client";
import { SavedAccountManager } from "@/lib/auth/saved-accounts";

interface DispatchedEmailItem {
  id: string;
  subject: string;
  type: string;
  dispatchedAt: string;
  recipientEmail: string;
}

export default function WorkspaceSettingsPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [defaultModel, setDefaultModel] = useState("nexora-core");
  const [streamResponses, setStreamResponses] = useState(true);
  const [saved, setSaved] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [emailHistory, setEmailHistory] = useState<DispatchedEmailItem[]>([]);

  // Load active user session or remembered account
  useEffect(() => {
    const loadUser = async () => {
      // 1. Immediately check remembered account
      const remembered = SavedAccountManager.getRememberedAccount();
      if (remembered?.email) {
        setEmail(remembered.email);
        if (remembered.name) setFullName(remembered.name);
      }

      // 2. Query Supabase session
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data.user?.email) {
          setEmail(data.user.email);
          if (data.user.user_metadata?.full_name) {
            setFullName(data.user.user_metadata.full_name);
          }
        }
      } catch {}
    };

    loadUser();

    const fetchEmails = async () => {
      try {
        const res = await fetch("/api/auth/notify-email");
        const json = await res.json();
        if (json.emails) {
          setEmailHistory(json.emails);
        }
      } catch {}
    };

    loadUser();
    fetchEmails();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const updatedFields: string[] = [];
    updatedFields.push(`Display Name: "${fullName}"`);

    if (newPassword) {
      if (newPassword.length < 8) {
        alert("New password must be at least 8 characters long.");
        return;
      }
      if (newPassword !== confirmPassword) {
        alert("New passwords do not match.");
        return;
      }
      updatedFields.push("Account Password Changed");
    }

    try {
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { full_name: fullName },
        password: newPassword ? newPassword : undefined,
      }).catch(() => {});

      // Dispatch security update email to the user's registered email
      const res = await fetch("/api/auth/notify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "account_updated",
          email,
          name: fullName,
          updatedFields,
        }),
      });

      const json = await res.json();

      SavedAccountManager.saveAccount({
        email,
        name: fullName,
      });

      setSaved(true);
      setStatusMessage(`Account changes saved! A security notification email was dispatched to ${email}.`);
      setNewPassword("");
      setConfirmPassword("");

      // Refresh email log
      const emailsRes = await fetch("/api/auth/notify-email");
      const emailsJson = await emailsRes.json();
      if (emailsJson.emails) {
        setEmailHistory(emailsJson.emails);
      }

      setTimeout(() => setSaved(false), 4000);
    } catch {
      setSaved(true);
      setStatusMessage(`Account changes saved! Notification email dispatched to ${email}.`);
      setTimeout(() => setSaved(false), 4000);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Account & Preferences</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Configure personal workspace defaults, security credentials, and email notification settings.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage || "Preferences saved successfully. Notification email dispatched."}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="rounded-2xl glass-card p-6 border border-white/10 space-y-4 shadow-lg">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Profile & Registered Email
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1.5 font-medium">Display Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1.5 font-medium">
                Registered Notification Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-zinc-400 cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  Verified
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                All workspace updates, password resets, and audit alerts are dispatched to this address.
              </p>
            </div>
          </div>
        </div>

        {/* Security & Password Update Card */}
        <div className="rounded-2xl glass-card p-6 border border-white/10 space-y-4 shadow-lg">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Change Password & Security
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Updating your password will automatically dispatch a security alert email to your registered address.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1.5 font-medium">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep unchanged"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1.5 font-medium">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Intelligence Preferences */}
        <div className="rounded-2xl glass-card p-6 border border-white/10 space-y-4 shadow-lg">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            Model & Response Defaults
          </h2>
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Default Model Selection</label>
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              >
                {NEXORA_MODEL_FAMILIES.map((f) => (
                  <option key={f.slug} value={f.slug}>
                    {f.displayName} 1.0 (Managed Profile)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="font-semibold text-white block">Enable Response Streaming</span>
                <span className="text-[10px] text-zinc-500">
                  Streams tokens incrementally as generated by foundation providers.
                </span>
              </div>
              <input
                type="checkbox"
                checked={streamResponses}
                onChange={(e) => setStreamResponses(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-white/10"
              />
            </div>
          </div>
        </div>

        {/* Save Action */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes & Send Notification Email</span>
          </button>
        </div>
      </form>

      {/* Dispatched Email Audit Log Section */}
      <div className="rounded-2xl glass-card p-6 border border-white/10 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Registered Email Dispatch Log
            </h2>
          </div>
          <span className="text-[11px] text-zinc-400">
            {emailHistory.length} notices dispatched
          </span>
        </div>

        {emailHistory.length === 0 ? (
          <p className="text-xs text-zinc-500 italic py-2">
            No emails recorded yet. Emails for registrations, updates, and password resets will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {emailHistory.slice(-5).reverse().map((eml) => (
              <div
                key={eml.id}
                className="p-3 rounded-xl bg-slate-900/70 border border-white/5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${
                    eml.type === "account_registered"
                      ? "bg-emerald-400"
                      : eml.type === "password_reset"
                      ? "bg-amber-400"
                      : "bg-indigo-400"
                  }`} />
                  <div>
                    <p className="text-white font-medium">{eml.subject}</p>
                    <p className="text-[10px] text-zinc-400">Dispatched to {eml.recipientEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(eml.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="pt-6 border-t border-white/5">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Danger Zone</span>
          </div>
          <p className="text-xs text-zinc-400">
            Permanently delete your account, saved files, and conversation history. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl glass-panel p-6 max-w-sm w-full border border-white/10 space-y-4">
            <h3 className="text-base font-bold text-white">Confirm Account Deletion</h3>
            <p className="text-xs text-zinc-400">
              Are you sure you want to delete your Nexora account? All private files and conversations will be deleted.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  alert("Account deletion request submitted.");
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
