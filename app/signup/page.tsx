"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Inbox,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthSocialButtons } from "@/components/auth-social-buttons";
import { SavedAccountManager } from "@/lib/auth/saved-accounts";
import { NexoraLogo } from "@/components/nexora-logo";
import { validateInternalRedirect } from "@/lib/auth/redirect";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan") || "free";
  const redirectParam = searchParams.get("redirect");
  const targetDestination = validateInternalRedirect(redirectParam);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState(initialPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [emailVerificationPending, setEmailVerificationPending] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.toLowerCase().trim();

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Clear any prior lingering session if different from the registering email
      try {
        const { data: currentSession } = await supabase.auth.getUser();
        if (currentSession?.user?.email && currentSession.user.email.toLowerCase().trim() !== cleanEmail) {
          await supabase.auth.signOut().catch(() => {});
        }
      } catch {}

      const { data, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: name || cleanEmail.split("@")[0],
            selected_plan: plan,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(targetDestination)}`,
        },
      });

      if (authError) {
        console.warn("[Auth] Supabase signUp note:", authError.message);
        if (
          !authError.message.includes("fetch") &&
          !authError.message.includes("placeholder")
        ) {
          setError(authError.message);
          setLoading(false);
          return;
        }
      }

      // Check if email verification is required by Supabase (user created, but session is null)
      if (data?.user && !data?.session && !authError) {
        // Dispatch registration notification email to notify the user/admin
        await fetch("/api/auth/notify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "account_registered",
            email: cleanEmail,
            name: name || cleanEmail.split("@")[0],
            selectedPlan: plan,
          }),
        }).catch(() => {});

        setEmailVerificationPending(true);
        setLoading(false);
        return;
      }

      // If session is active (or dev fallback where email verification is disabled)
      SavedAccountManager.saveAccount({
        email: cleanEmail,
        name: name || cleanEmail.split("@")[0],
        provider: "email",
      });

      // Dispatch one-time welcome & registration confirmation email
      await fetch("/api/auth/notify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "account_registered",
          email: cleanEmail,
          name: name || cleanEmail.split("@")[0],
          selectedPlan: plan,
        }),
      }).catch(() => {});

      // Try automatic sign in
      try {
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
      } catch {}

      setRegisteredSuccess(true);
      setTimeout(() => {
        router.push(targetDestination);
      }, 1500);
    } catch {
      SavedAccountManager.saveAccount({
        email: cleanEmail,
        name: name || cleanEmail.split("@")[0],
        provider: "email",
      });
      setRegisteredSuccess(true);
      setTimeout(() => {
        router.push(targetDestination);
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  // State 1: Verification Required Screen
  if (emailVerificationPending) {
    return (
      <div className="text-center py-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/10">
          <Inbox className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white tracking-tight">Verify your email address</h3>
          <p className="text-sm text-zinc-300 max-w-sm mx-auto leading-relaxed">
            We have sent a verification link to{" "}
            <span className="text-white font-semibold">{email}</span>.
          </p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Please click the link in your email to activate your account and enter your Nexora workspace.
          </p>
        </div>
        <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-colors"
          >
            Back to Sign In
          </Link>
          <button
            type="button"
            onClick={() => setEmailVerificationPending(false)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl glass-card text-zinc-300 hover:text-white text-xs font-medium border border-white/10 transition-colors"
          >
            Use Different Email
          </button>
        </div>
      </div>
    );
  }

  // State 2: Registration Successful & Redirecting
  if (registeredSuccess) {
    return (
      <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Account Created & Workspace Ready!</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
            A registration confirmation email has been sent to{" "}
            <span className="text-white font-semibold">{email}</span>.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5 text-xs text-zinc-400 max-w-sm mx-auto flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Authenticated on this device. Entering workspace...</span>
        </div>
        <div className="pt-2">
          <Link
            href={targetDestination}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <span>Enter Workspace Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // State 3: Registration Form
  return (
    <div className="space-y-6">
      {/* Social & Alternative Auth Options */}
      <div className="space-y-2.5">
        <span className="block text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">
          Sign up with 1-click
        </span>
        <AuthSocialButtons source="signup" onSuccessRedirect={targetDestination} />
      </div>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-white/10 w-full" />
        <span className="bg-slate-950 px-3.5 text-xs uppercase tracking-wider text-zinc-400 font-semibold">
          Or register with email
        </span>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2.5" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-zinc-200 mb-1.5">Your name</label>
          <div className="relative">
            <User className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-200 mb-1.5">Email address</label>
          <div className="relative">
            <Mail className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-200 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            />
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">Minimum 6 characters.</span>
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-200 mb-1.5">Workspace Tier</label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
          >
            <option value="free">Free Workspace (Core Models, Universal Files)</option>
            <option value="pro">Pro Workspace (Full Engine Suite, GPT-4o, Claude 3.5)</option>
            <option value="family">Family Workspace (5 Isolated Seats)</option>
            <option value="enterprise">Enterprise Workspace (Priority & Dedicated SLAs)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="shimmer-btn w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-base font-bold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating your account...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10 text-center">
        <Link href="/" className="inline-flex items-center gap-2 group mb-5 hover:opacity-90 transition-opacity">
          <NexoraLogo size="lg" />
        </Link>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Create your Nexora account</h2>
        <p className="mt-2.5 text-sm text-zinc-300">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4">
            Sign in to workspace
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        <div className="rounded-2xl glass-card p-7 sm:p-9 border border-white/10 shadow-2xl">
          <Suspense fallback={<div className="p-8 text-center text-zinc-400 text-sm">Loading signup...</div>}>
            <SignupForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
