"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  MessageSquare,
  Plus,
  Layers,
  FolderOpen,
  Search,
  BarChart2,
  CreditCard,
  Settings,
  ShieldAlert,
  HelpCircle,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Building2,
  Activity,
  Award,
  BookOpen,
  Cpu,
  Code2,
} from "lucide-react";
import { getAppVersionDisplay } from "@/lib/version";
import { createClient } from "@/lib/supabase/client";
import { SavedAccountManager } from "@/lib/auth/saved-accounts";
import { NexoraLogo } from "@/components/nexora-logo";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userPlan, setUserPlan] = useState<"free" | "pro" | "enterprise">("enterprise");
  const [currentWorkspace, setCurrentWorkspace] = useState("Acme Corp AI Labs");
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [avatarInitial, setAvatarInitial] = useState<string>("U");

  useEffect(() => {
    const loadProfile = async () => {
      const applyIdentity = (email: string, rawName?: string) => {
        const clean = email.toLowerCase().trim();
        const isOwner = clean === "thzcreterz05@gmail.com";
        const finalName = isOwner ? "Joshua Suriyan" : (rawName || clean.split("@")[0]);
        setUserEmail(clean);
        setUserName(finalName);
        setAvatarInitial(finalName[0].toUpperCase());
        if (isOwner) {
          setUserPlan("enterprise");
        }
      };

      // 1. Immediately read remembered account from storage
      const remembered = SavedAccountManager.getRememberedAccount();
      if (remembered?.email) {
        applyIdentity(remembered.email, remembered.name);
      }

      // 2. Cross-reference with Supabase active session
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data.user?.email) {
          const name = data.user.user_metadata?.full_name || data.user.email.split("@")[0];
          applyIdentity(data.user.email, name);
          SavedAccountManager.saveAccount({ email: data.user.email, name });
        } else if (!remembered?.email) {
          setUserEmail("guest@nexora.ai");
          setUserName("Nexora User");
          setAvatarInitial("N");
        }
      } catch {
        if (!remembered?.email) {
          setUserEmail("guest@nexora.ai");
          setUserName("Nexora User");
          setAvatarInitial("N");
        }
      }
    };
    loadProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      SavedAccountManager.clearRememberedAccount();
      const supabase = createClient();
      await supabase.auth.signOut().catch(() => {});
    } catch {}
    router.push("/login");
  };

  const navigation = [
    { name: "New Chat", href: "/app", icon: Plus, highlight: true },
    { name: "Conversations", href: "/app/chat", icon: MessageSquare },
    { name: "Knowledge Hub", href: "/app/knowledge", icon: BookOpen },
    { name: "AI Workflows", href: "/app/workflows", icon: Cpu },
    { name: "Models Directory", href: "/app/models", icon: Layers },
    { name: "File Library", href: "/app/files", icon: FolderOpen },
    { name: "Web Research", href: "/app/research", icon: Search },
    { name: "Usage & Analytics", href: "/app/analytics", icon: BarChart2 },
    { name: "Developer Platform", href: "/app/developer", icon: Code2 },
    { name: "Diagnostics & Ops", href: "/app/diagnostics", icon: Activity },
    { name: "Quality Evaluations", href: "/app/evaluations", icon: Award },
    { name: "Enterprise Workspace", href: "/app/enterprise", icon: Building2 },
    { name: "Billing & Plans", href: "/app/billing", icon: CreditCard },
    { name: "Settings", href: "/app/settings", icon: Settings },
    { name: "Help & Support", href: "/contact", icon: HelpCircle },
  ];

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* ==================================================================== */}
      {/* DESKTOP SIDEBAR                                                      */}
      {/* ==================================================================== */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 bg-slate-950/95 p-4 justify-between">
        <div className="space-y-4">
          {/* Brand & Workspace Switcher */}
          <div className="space-y-2 pb-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group hover:opacity-90 transition-opacity">
                <NexoraLogo size="sm" />
              </Link>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {userPlan}
              </span>
            </div>

            {/* Interactive Workspace Dropdown */}
            <div className="relative">
              <button
                onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-white/5 text-xs text-left transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-medium text-white truncate">{currentWorkspace}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              </button>

              {workspaceDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 p-1.5 rounded-xl bg-slate-900 border border-white/10 shadow-xl space-y-1">
                  <button
                    onClick={() => {
                      setCurrentWorkspace("Acme Corp AI Labs");
                      setWorkspaceDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                      currentWorkspace === "Acme Corp AI Labs"
                        ? "bg-indigo-600 text-white font-medium"
                        : "text-zinc-300 hover:bg-white/5"
                    }`}
                  >
                    <span>Acme Corp AI Labs</span>
                    <span className="text-[10px] opacity-75 font-mono">Owner</span>
                  </button>
                  <button
                    onClick={() => {
                      setCurrentWorkspace("Personal Workspace");
                      setWorkspaceDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                      currentWorkspace === "Personal Workspace"
                        ? "bg-indigo-600 text-white font-medium"
                        : "text-zinc-300 hover:bg-white/5"
                    }`}
                  >
                    <span>Personal Workspace</span>
                    <span className="text-[10px] opacity-75 font-mono">Free</span>
                  </button>
                  <Link
                    href="/app/enterprise"
                    onClick={() => setWorkspaceDropdownOpen(false)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 text-indigo-400 hover:bg-indigo-500/10 font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create / Manage Workspaces</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* New Chat Primary Action */}
          <Link
            href="/app"
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </Link>

          {/* Navigation Items */}
          <nav className="space-y-1 text-xs">
            {navigation.slice(1).map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-colors ${
                    active
                      ? "bg-white/10 text-white font-semibold"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Version info */}
        <div className="pt-4 border-t border-white/5 space-y-3">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-white/5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300 text-xs font-bold shrink-0">
                {avatarInitial}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-white truncate">{userName}</span>
                <span className="text-[10px] text-zinc-500 truncate">{userEmail}</span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="text-zinc-500 hover:text-rose-400 p-1 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-[10px] text-zinc-600 text-center font-mono">
            {getAppVersionDisplay()}
          </div>
        </div>
      </aside>

      {/* ==================================================================== */}
      {/* MOBILE DRAWER & HEADER                                               */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-950">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <NexoraLogo size="xs" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Chat</span>
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-1.5 text-zinc-400 hover:text-white"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {mobileOpen && (
          <div className="md:hidden glass-panel border-b border-white/10 p-4 space-y-2 z-50">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 py-2 px-3 rounded-lg text-sm text-zinc-300 hover:text-white"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Main Workspace Stage */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
