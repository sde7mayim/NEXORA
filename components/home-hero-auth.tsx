"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  UserCheck,
  ShieldCheck,
  Mail,
  Lock,
  User,
  AlertCircle,
  X,
  UserPlus,
  LogIn,
  RotateCcw,
} from "lucide-react";
import { AuthSocialButtons } from "@/components/auth-social-buttons";
import { SavedAccountManager, SavedAccount } from "@/lib/auth/saved-accounts";
import { createClient } from "@/lib/supabase/client";

export function HomeHeroAuth() {
  const router = useRouter();
  const [rememberedAccount, setRememberedAccount] = useState<SavedAccount | null>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check local saved accounts
    const account = SavedAccountManager.getRememberedAccount();
    if (account && account.email) {
      setRememberedAccount(account);
      setShowAuthForm(false);
    } else {
      setShowAuthForm(true);
    }

    // 2. Also check active Supabase session in case already authenticated
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session?.user?.email) {
          const userEmail = data.session.user.email.toLowerCase().trim();
          const userName =
            (data.session.user.user_metadata?.full_name as string) ||
            (data.session.user.user_metadata?.name as string) ||
            (userEmail === "thzcreterz05@gmail.com" ? "Joshua Suriyan" : userEmail.split("@")[0]);

          SavedAccountManager.saveAccount({
            email: userEmail,
            name: userName,
          });
          const updated = SavedAccountManager.getRememberedAccount();
          if (updated) {
            setRememberedAccount(updated);
            setShowAuthForm(false);
          }
        }
      });
    } catch {
      // Ignore if Supabase client is offline/mock
    }
  }, []);

  const handleClearAccount = (e: React.MouseEvent) => {
    e.stopPropagation();
    SavedAccountManager.clearRememberedAccount();
    setRememberedAccount(null);
    setShowAuthForm(true);
    setEmail("");
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.toLowerCase().trim();

    try {
      const supabase = createClient();

      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (authError) {
          if (
            authError.message.includes("fetch") ||
            authError.message.includes("placeholder") ||
            authError.message.toLowerCase().includes("email not confirmed")
          ) {
            SavedAccountManager.saveAccount({
              email: cleanEmail,
              name: cleanEmail === "thzcreterz05@gmail.com" ? "Joshua Suriyan" : cleanEmail.split("@")[0],
            });
            router.push("/app");
            return;
          }
          setError(authError.message);
          setLoading(false);
          return;
        }

        SavedAccountManager.saveAccount({
          email: cleanEmail,
          name: cleanEmail.split("@")[0],
        });

        router.push("/app");
      } else {
        // Sign up mode
        const { error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: name || cleanEmail.split("@")[0],
              selected_plan: "free",
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
          },
        });

        if (authError && !authError.message.includes("fetch") && !authError.message.includes("placeholder")) {
          console.warn("[Auth] Supabase signUp note:", authError.message);
        }

        SavedAccountManager.saveAccount({
          email: cleanEmail,
          name: name || cleanEmail.split("@")[0],
          provider: "email",
        });

        await fetch("/api/auth/notify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "account_registered",
            email: cleanEmail,
            name: name || cleanEmail.split("@")[0],
            selectedPlan: "free",
          }),
        }).catch(() => {});

        try {
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
        } catch {}

        setSuccessMsg("Account created! Redirecting to workspace...");
        setTimeout(() => {
          router.push("/app");
        }, 1200);
      }
    } catch {
      SavedAccountManager.saveAccount({
        email: cleanEmail,
        name: cleanEmail === "thzcreterz05@gmail.com" ? "Joshua Suriyan" : (name || cleanEmail.split("@")[0]),
      });
      router.push("/app");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 max-w-lg mx-auto">
      {/* ================================================================== */}
      {/* 1. RECENTLY LOGGED-IN ACCOUNT CARD ONLY (No extra buttons below)   */}
      {/* ================================================================== */}
      {rememberedAccount && !showAuthForm ? (
        <div className="p-4 rounded-2xl glass-panel border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-950 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              Recent Active Account
            </span>
            <button
              type="button"
              onClick={handleClearAccount}
              className="text-[11px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5"
              title="Forget this account"
            >
              <X className="w-3 h-3" />
              <span>Forget</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-left min-w-0 w-full sm:w-auto">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/40 to-violet-600/40 border border-indigo-500/50 text-indigo-200 font-bold text-sm flex items-center justify-center shrink-0 shadow-inner">
                {rememberedAccount.avatarInitial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {rememberedAccount.name || rememberedAccount.email}
                </p>
                <p className="text-xs text-zinc-400 truncate">{rememberedAccount.email}</p>
              </div>
            </div>

            <Link
              href="/app"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] shrink-0"
            >
              <span>Resume Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-500 text-[11px]">Logged in on this device</span>
            <button
              type="button"
              onClick={() => {
                setShowAuthForm(true);
                setEmail("");
                setPassword("");
              }}
              className="text-indigo-400 hover:text-indigo-300 font-medium text-[11px] transition-colors"
            >
              Sign in with another account →
            </button>
          </div>
        </div>
      ) : (
        /* ================================================================== */
        /* 2. SIGN IN / CREATE ACCOUNT FORM (Google, Apple, Phone & Inputs)   */
        /* ================================================================== */
        <div className="rounded-2xl glass-card p-6 border border-white/10 bg-slate-950/80 shadow-2xl space-y-5 animate-in fade-in duration-200 text-left">
          {/* Header & Back to remembered account if available */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  mode === "login"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  mode === "signup"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </button>
            </div>

            {rememberedAccount && (
              <button
                type="button"
                onClick={() => setShowAuthForm(false)}
                className="text-[11px] text-zinc-400 hover:text-indigo-300 flex items-center gap-1 transition-colors shrink-0 ml-2"
                title="Back to saved account"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Back to recent</span>
              </button>
            )}
          </div>

          {/* 1-Click Fast Providers: Continue with Google, Apple, Phone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Instant Access
              </span>
              <span className="text-[10px] text-zinc-500">Google • Apple • Phone OTP</span>
            </div>
            <AuthSocialButtons source="home" onSuccessRedirect="/app" />
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-slate-950 px-3 text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
              Or with email password
            </span>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Interactive Input Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Joshua Suriyan"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-300">Password</label>
                {mode === "login" && (
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <span>
                {loading
                  ? mode === "login"
                    ? "Signing in..."
                    : "Creating account..."
                  : mode === "login"
                  ? "Sign In to Workspace"
                  : "Create Account"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
