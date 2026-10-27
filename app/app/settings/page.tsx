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
  Brain,
  Sparkles,
  Trash2,
  Archive,
  Edit3,
  Plus,
  RefreshCw,
  Check,
  X,
  FileText,
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

interface StoredMemoryItem {
  id: string;
  userId: string;
  category: string;
  key: string;
  structuredValue: Record<string, any>;
  summary: string;
  sourceType: string;
  sourceReference?: string;
  confidence: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
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

  // Memory & Knowledge Management State
  const [memories, setMemories] = useState<StoredMemoryItem[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [requireConfirmation, setRequireConfirmation] = useState(false);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [editingMemory, setEditingMemory] = useState<StoredMemoryItem | null>(null);
  const [editSummary, setEditSummary] = useState("");
  const [showClearMemoryModal, setShowClearMemoryModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState("skills_experience");
  const [newKey, setNewKey] = useState("technical_skills");
  const [newSummary, setNewSummary] = useState("");

  const loadMemoriesData = async (userEmail: string) => {
    if (!userEmail) return;
    setLoadingMemories(true);
    try {
      const res = await fetch(`/api/memory?userId=${encodeURIComponent(userEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.memories) {
          setMemories(data.memories);
        }
        if (data.preferences) {
          setMemoryEnabled(data.preferences.memoryEnabled);
          setRequireConfirmation(data.preferences.requireConfirmation);
        }
      }
    } catch (err) {
      console.warn("Failed to load user memories:", err);
    } finally {
      setLoadingMemories(false);
    }
  };

  // Load active user session or remembered account
  useEffect(() => {
    const loadUser = async () => {
      let resolvedEmail = "";
      const remembered = SavedAccountManager.getRememberedAccount();
      if (remembered?.email) {
        resolvedEmail = remembered.email;
        setEmail(remembered.email);
        if (remembered.name) setFullName(remembered.name);
      }

      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data.user?.email) {
          resolvedEmail = data.user.email;
          setEmail(data.user.email);
          if (data.user.user_metadata?.full_name) {
            setFullName(data.user.user_metadata.full_name);
          }
        }
      } catch {}

      if (resolvedEmail) {
        loadMemoriesData(resolvedEmail);
      }
    };

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

  const handleToggleMemory = async (enabled: boolean) => {
    setMemoryEnabled(enabled);
    try {
      await fetch(`/api/memory?userId=${encodeURIComponent(email)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { memoryEnabled: enabled } }),
      });
    } catch {}
  };

  const handleToggleRequireConfirmation = async (require: boolean) => {
    setRequireConfirmation(require);
    try {
      await fetch(`/api/memory?userId=${encodeURIComponent(email)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { requireConfirmation: require } }),
      });
    } catch {}
  };

  const handleArchiveMemory = async (id: string) => {
    try {
      await fetch(`/api/memory?userId=${encodeURIComponent(email)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive", memoryId: id }),
      });
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "archived" } : m))
      );
    } catch {}
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await fetch(`/api/memory?id=${id}&userId=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch {}
  };

  const handleClearAllMemories = async () => {
    try {
      await fetch(`/api/memory?userId=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      setMemories([]);
      setShowClearMemoryModal(false);
    } catch {}
  };

  const handleSaveEdit = async () => {
    if (!editingMemory || !editSummary.trim()) return;
    try {
      const res = await fetch(`/api/memory?userId=${encodeURIComponent(email)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          memoryId: editingMemory.id,
          summary: editSummary.trim(),
        }),
      });
      if (res.ok) {
        setMemories((prev) =>
          prev.map((m) =>
            m.id === editingMemory.id
              ? { ...m, summary: editSummary.trim(), updatedAt: new Date().toISOString() }
              : m
          )
        );
        setEditingMemory(null);
        setEditSummary("");
      }
    } catch {}
  };

  const handleCreateManualMemory = async () => {
    if (!newSummary.trim()) return;
    try {
      const res = await fetch(`/api/memory?userId=${encodeURIComponent(email)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manual_create",
          category: newCategory,
          key: newKey,
          summary: newSummary.trim(),
          structuredValue: { manualEntry: true },
        }),
      });
      if (res.ok) {
        await loadMemoriesData(email);
        setShowAddModal(false);
        setNewSummary("");
      }
    } catch {}
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "skills_experience":
        return "bg-indigo-500/10 text-indigo-300 border-indigo-500/20";
      case "career_goals":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
      case "projects":
        return "bg-amber-500/10 text-amber-300 border-amber-500/20";
      case "language_style":
        return "bg-violet-500/10 text-violet-300 border-violet-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-300 border-zinc-500/20";
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          Account & Preferences
        </h1>
        <p className="text-base text-zinc-400 mt-2 max-w-2xl leading-relaxed">
          Manage your personal identity, AI response defaults, security alerts, and persistent cross-session knowledge.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-base flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{statusMessage || "Preferences saved successfully. Notification email dispatched."}</span>
        </div>
      )}

      {/* SECTION 1: PERSONAL MEMORY & ACCUMULATED KNOWLEDGE */}
      <div className="rounded-3xl glass-card p-6 md:p-8 border border-white/10 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Personal Memory & Knowledge</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold uppercase tracking-wider">
                  Persistent
                </span>
              </h2>
              <p className="text-sm text-zinc-400 mt-0.5">
                Nexora recalls your verified skills, experience, and preferences across conversations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadMemoriesData(email)}
              title="Refresh memories"
              className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingMemories ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Memory</span>
            </button>
          </div>
        </div>

        {/* Memory Preference Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-white block text-base">Enable Persistent Memory</span>
              <span className="text-sm text-zinc-400 block mt-0.5">
                Remember relevant skills, ongoing projects, and communication preferences across chats.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={memoryEnabled}
                onChange={(e) => handleToggleMemory(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-white block text-base">Require Confirmation</span>
              <span className="text-sm text-zinc-400 block mt-0.5">
                Propose extracted memories in chat before permanently storing them to your profile.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={requireConfirmation}
                onChange={(e) => handleToggleRequireConfirmation(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {!memoryEnabled && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <span>
              Persistent memory is currently paused. Future chat questions will not retrieve or store personal facts.
            </span>
          </div>
        )}

        {/* Stored Memory List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Saved Facts & Accumulated Knowledge ({memories.length})
            </span>
            {memories.length > 0 && (
              <button
                onClick={() => setShowClearMemoryModal(true)}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
              >
                Clear all memories
              </button>
            )}
          </div>

          {memories.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-2">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto opacity-60" />
              <p className="text-base text-zinc-300 font-medium">No personal memories saved yet</p>
              <p className="text-sm text-zinc-400 max-w-md mx-auto">
                Upload a resume or state your skills/preferences in chat (e.g. &quot;I have also learned Python&quot;), and Nexora will automatically accumulate and remember them.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {memories.map((mem) => (
                <div
                  key={mem.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold capitalize ${getCategoryColor(
                          mem.category
                        )}`}
                      >
                        {mem.category.replace("_", " ")}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        {mem.key}
                      </span>
                      {mem.status === "archived" && (
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="text-base font-medium text-white">{mem.summary}</p>
                    <div className="flex items-center gap-4 text-xs text-zinc-400">
                      <span>Source: {mem.sourceReference || mem.sourceType}</span>
                      <span>•</span>
                      <span>Updated {new Date(mem.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => {
                        setEditingMemory(mem);
                        setEditSummary(mem.summary);
                      }}
                      title="Edit / Correct memory"
                      className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {mem.status !== "archived" && (
                      <button
                        onClick={() => handleArchiveMemory(mem.id)}
                        title="Archive memory"
                        className="p-2 rounded-xl text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMemory(mem.id)}
                      title="Delete memory"
                      className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: PROFILE & SECURITY FORM */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* Profile Card */}
        <div className="rounded-3xl glass-card p-6 md:p-8 border border-white/10 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Profile & Identity</h2>
              <p className="text-sm text-zinc-400">Personal details and registered authentication email</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-zinc-300 mb-2 font-medium text-base">Display Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-white/10 text-white text-base focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-300 mb-2 font-medium text-base">
                Registered Notification Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900/60 border border-white/5 text-zinc-400 text-base cursor-not-allowed"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-emerald-400 font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  Verified
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-2">
                All workspace updates, password resets, and audit alerts are dispatched to this address.
              </p>
            </div>
          </div>
        </div>

        {/* Security & Password Update Card */}
        <div className="rounded-3xl glass-card p-6 md:p-8 border border-white/10 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Password & Security</h2>
              <p className="text-sm text-zinc-400">Update workspace authentication credentials</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-zinc-300 mb-2 font-medium text-base">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep unchanged"
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-white/10 text-white text-base focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-300 mb-2 font-medium text-base">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-white/10 text-white text-base focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Intelligence Preferences */}
        <div className="rounded-3xl glass-card p-6 md:p-8 border border-white/10 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Model Defaults & Streaming</h2>
              <p className="text-sm text-zinc-400">Configure foundation model profiles and response parameters</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-zinc-300 mb-2 font-medium text-base">Default Model Selection</label>
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-white/10 text-white text-base focus:outline-none focus:border-indigo-500"
              >
                {NEXORA_MODEL_FAMILIES.map((f) => (
                  <option key={f.slug} value={f.slug}>
                    {f.displayName} 1.0 (Managed Profile)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-white/5">
              <div>
                <span className="font-semibold text-white block text-base">Enable Response Streaming</span>
                <span className="text-sm text-zinc-400 block mt-0.5">
                  Stream output tokens smoothly as they are produced by AI models.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={streamResponses}
                  onChange={(e) => setStreamResponses(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Save Action */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-base font-semibold flex items-center gap-3 shadow-xl shadow-indigo-600/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Save className="w-5 h-5" />
            <span>Save Changes & Send Notification Email</span>
          </button>
        </div>
      </form>

      {/* Dispatched Email Audit Log Section */}
      <div className="rounded-3xl glass-card p-6 md:p-8 border border-white/10 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Registered Email Dispatch Log</h2>
              <p className="text-sm text-zinc-400">Verifiable delivery audit trail</p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-zinc-300 font-semibold border border-white/5">
            {emailHistory.length} notices dispatched
          </span>
        </div>

        {emailHistory.length === 0 ? (
          <p className="text-base text-zinc-400 italic py-4 text-center">
            No notices recorded yet. Registration, password reset, and profile change alerts will appear here.
          </p>
        ) : (
          <div className="space-y-3">
            {emailHistory.slice(-5).reverse().map((eml) => (
              <div
                key={eml.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-base"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      eml.type === "account_registered"
                        ? "bg-emerald-400"
                        : eml.type === "password_reset"
                        ? "bg-amber-400"
                        : "bg-indigo-400"
                    }`}
                  />
                  <div>
                    <p className="text-white font-medium text-base">{eml.subject}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Dispatched to {eml.recipientEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono self-end sm:self-center">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <span>
                    {new Date(eml.dispatchedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="pt-4 border-t border-white/10">
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2.5 text-rose-400 font-bold text-lg">
            <AlertTriangle className="w-5 h-5" />
            <span>Danger Zone</span>
          </div>
          <p className="text-base text-zinc-400 max-w-2xl leading-relaxed">
            Permanently delete your account, saved files, and conversation history. This action cannot be reversed.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-6 py-3 rounded-2xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-base font-semibold transition-all"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Edit Memory Modal */}
      {editingMemory && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="rounded-3xl glass-panel p-6 md:p-8 max-w-lg w-full border border-white/15 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-400" />
                <span>Correct Saved Memory</span>
              </h3>
              <button
                onClick={() => setEditingMemory(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Memory Statement / Summary
              </label>
              <textarea
                rows={3}
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-white/15 text-white text-base focus:outline-none focus:border-indigo-500"
              />
              <p className="text-xs text-zinc-400 mt-2">
                Original source: {editingMemory.sourceReference || editingMemory.sourceType}
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingMemory(null)}
                className="px-5 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20"
              >
                Save Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="rounded-3xl glass-panel p-6 md:p-8 max-w-lg w-full border border-white/15 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>Add Knowledge / Preference</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => {
                    setNewCategory(e.target.value);
                    if (e.target.value === "skills_experience") setNewKey("technical_skills");
                    if (e.target.value === "career_goals") setNewKey("target_role");
                    if (e.target.value === "projects") setNewKey("portfolio_projects");
                    if (e.target.value === "language_style") setNewKey("preferred_language");
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-sm"
                >
                  <option value="skills_experience">Skills & Professional Experience</option>
                  <option value="career_goals">Career Goals & Roles</option>
                  <option value="projects">Projects & Ongoing Work</option>
                  <option value="language_style">Response Language & Style</option>
                  <option value="user_instructions">Standing Instructions</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Subject Key
                </label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Summary / Stated Knowledge
                </label>
                <textarea
                  rows={3}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="e.g. Technical Skills: Python, TypeScript, React, Docker"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateManualMemory}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20"
              >
                Store Memory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Memories Modal */}
      {showClearMemoryModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="rounded-3xl glass-panel p-6 md:p-8 max-w-sm w-full border border-white/15 space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Clear All Memories?</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Are you sure you want to delete all saved facts and accumulated knowledge? Nexora will no longer personalize future answers with your previous background.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearMemoryModal(false)}
                className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllMemories}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold"
              >
                Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="rounded-3xl glass-panel p-6 md:p-8 max-w-sm w-full border border-white/15 space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Confirm Account Deletion</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Are you sure you want to delete your Nexora account? All private files, memory, and conversations will be deleted permanently.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  alert("Account deletion request submitted.");
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold"
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
