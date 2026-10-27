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
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getAppVersionDisplay } from "@/lib/version";
import { createClient } from "@/lib/supabase/client";
import { SavedAccountManager } from "@/lib/auth/saved-accounts";
import { NexoraLogo } from "@/components/nexora-logo";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userPlan, setUserPlan] = useState<"free" | "pro" | "family" | "enterprise">("enterprise");
  const [currentWorkspace, setCurrentWorkspace] = useState("Acme Corp AI Labs");
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [avatarInitial, setAvatarInitial] = useState<string>("U");

  const isOwner =
    userEmail.toLowerCase().trim() === "thzcreterz05@gmail.com" ||
    userEmail.toLowerCase().trim() === "sde7mayim@gmail.com";

  useEffect(() => {
    const loadProfile = async () => {
      const applyIdentity = (email: string, rawName?: string) => {
        const clean = email.toLowerCase().trim();
        const isOwnerAccount = clean === "thzcreterz05@gmail.com" || clean === "sde7mayim@gmail.com";
        const finalName = rawName || clean.split("@")[0];
        setUserEmail(clean);
        setUserName(finalName);
        setAvatarInitial(finalName[0].toUpperCase());
        if (isOwnerAccount) {
          setUserPlan("enterprise");
        }
      };

      // 1. Immediately read remembered account from storage
      const remembered = SavedAccountManager.getRememberedAccount();
      const activeLoginEmail = remembered?.email ? remembered.email.toLowerCase().trim() : null;

      if (activeLoginEmail) {
        applyIdentity(activeLoginEmail, remembered?.name);
      }

      // 2. Cross-reference with Supabase active session
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const supaEmail = data.user?.email ? data.user.email.toLowerCase().trim() : null;

        if (activeLoginEmail) {
          // If Supabase has an old lingering session from a previous different account, sign it out
          if (supaEmail && supaEmail !== activeLoginEmail) {
            console.log(`[Auth] Stale Supabase session (${supaEmail}) differs from active user (${activeLoginEmail}). Signing out.`);
            await supabase.auth.signOut().catch(() => {});
          }
          applyIdentity(activeLoginEmail, remembered?.name);
        } else if (supaEmail) {
          const name = data.user?.user_metadata?.full_name || supaEmail.split("@")[0];
          applyIdentity(supaEmail, name);
          SavedAccountManager.saveAccount({ email: supaEmail, name });
        } else {
          setUserEmail("guest@nexora.ai");
          setUserName("Nexora User");
          setAvatarInitial("N");
        }
      } catch {
        if (activeLoginEmail) {
          applyIdentity(activeLoginEmail, remembered?.name);
        } else {
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
    { name: "Chat", href: "/app", icon: MessageSquare },
    { name: "Models", href: "/app/models", icon: Layers },
    { name: "Files", href: "/app/files", icon: FolderOpen },
    { name: "Web Research", href: "/app/research", icon: Search },
    { name: "Billing & Plans", href: "/app/billing", icon: CreditCard },
    { name: "Settings", href: "/app/settings", icon: Settings },
    ...(isOwner
      ? [{ name: "Admin Console", href: "/app/admin", icon: ShieldCheck, badge: "Owner" }]
      : []),
  ];

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* ==================================================================== */}
      {/* DESKTOP SIDEBAR                                                      */}
      {/* ==================================================================== */}
      <aside
        className={`hidden md:flex flex-col transition-all duration-200 border-r border-white/5 bg-slate-950/95 p-3.5 justify-between ${
          sidebarCollapsed ? "w-18" : "w-64"
        }`}
      >
        <div className="space-y-4">
          {/* Brand & Collapse Control */}
          <div className="space-y-2 pb-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group hover:opacity-90 transition-opacity">
                <NexoraLogo size="sm" showText={!sidebarCollapsed} />
              </Link>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-label="Toggle sidebar collapse"
              >
                {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            </div>

            {!sidebarCollapsed && (
              <div className="flex items-center justify-between px-1 pt-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-zinc-300 capitalize">{userPlan} Workspace</span>
                </div>
                {isOwner && (
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-md border border-indigo-500/25">
                    Owner
                  </span>
                )}
              </div>
            )}
          </div>

          {/* New Chat Primary Action */}
          <Link
            href="/app"
            title="New Conversation"
            className="shimmer-btn w-full py-3 px-3.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>New Conversation</span>}
          </Link>

          {/* Clean Streamlined Navigation Items */}
          <nav className="space-y-1.5 text-sm">
            {navigation.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={item.name}
                  className={`flex items-center ${
                    sidebarCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-3 py-2.5"
                  } rounded-xl font-medium transition-all duration-150 ${
                    active
                      ? "bg-indigo-600/15 text-white font-semibold shadow-sm border border-indigo-500/30"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </div>
                  {!sidebarCollapsed && (item as any).badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {(item as any).badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Version info */}
        <div className="pt-4 border-t border-white/5 space-y-3">
          <div className={`flex items-center ${sidebarCollapsed ? "justify-center p-2" : "justify-between p-2.5"} rounded-xl bg-slate-900/60 border border-white/5`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/35 flex items-center justify-center text-indigo-300 text-sm font-bold shrink-0">
                {avatarInitial}
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-white truncate">{userName}</span>
                  <span className="text-xs text-zinc-400 truncate">{userEmail}</span>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="text-zinc-400 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="text-[11px] text-zinc-500 text-center font-mono">
              {getAppVersionDisplay()}
            </div>
          )}
        </div>
      </aside>

      {/* ==================================================================== */}
      {/* MOBILE DRAWER & HEADER                                               */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-950/90 backdrop-blur-md z-30 shrink-0">
          <Link href="/app" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <NexoraLogo size="xs" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/app"
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation menu"
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Accessible Mobile Drawer Overlay */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
              aria-hidden="true"
            />

            {/* Slide-over Drawer Panel */}
            <div className="relative w-72 max-w-[80vw] bg-slate-950 border-r border-white/10 p-4 flex flex-col justify-between shadow-2xl z-50 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <NexoraLogo size="sm" />
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 px-1 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-zinc-300 capitalize">{userPlan} Workspace</span>
                  {isOwner && (
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/15 px-1.5 py-0.2 rounded border border-indigo-500/25">
                      Owner
                    </span>
                  )}
                </div>

                <Link
                  href="/app"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Conversation</span>
                </Link>

                <nav className="space-y-1 text-sm pt-1">
                  {navigation.map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-colors ${
                          active
                            ? "bg-indigo-600/20 text-white font-semibold border border-indigo-500/30"
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.name}</span>
                        </div>
                        {(item as any).badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {(item as any).badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Mobile Drawer User Footer */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/35 flex items-center justify-center text-indigo-300 text-xs font-bold shrink-0">
                      {avatarInitial}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white truncate">{userName}</span>
                      <span className="text-[11px] text-zinc-400 truncate">{userEmail}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    title="Sign out"
                    className="text-zinc-400 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-[10px] text-zinc-500 text-center font-mono">
                  {getAppVersionDisplay()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace Stage */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
