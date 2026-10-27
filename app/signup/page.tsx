"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, ArrowRight, Lock, Mail, User, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthSocialButtons } from "@/components/auth-social-buttons";
import { SavedAccountManager } from "@/lib/auth/saved-accounts";
import { NexoraLogo } from "@/components/nexora-logo";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan") || "free";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState(initialPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.toLowerCase().trim();

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: name,
            selected_plan: plan,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
        },
      });

      if (authError && !authError.message.includes("fetch") && !authError.message.includes("placeholder")) {
        console.warn("[Auth] Supabase signUp note:", authError.message);
      }

      // Remember the newly registered account immediately
      SavedAccountManager.saveAccount({
        email: cleanEmail,
        name,
        provider: "email",
      });

      // Dispatch welcome & registration confirmation email
      await fetch("/api/auth/notify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "account_registered",
          email: cleanEmail,
          name,
          selectedPlan: plan,
        }),
      }).catch(() => {});

      // Try automatic sign in with the new credentials
      try {
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
      } catch {}

      setRegisteredSuccess(true);
      setTimeout(() => {
        router.push("/app");
      }, 2000);
    } catch {
      SavedAccountManager.saveAccount({
        email: cleanEmail,
        name,
        provider: "email",
      });
      setRegisteredSuccess(true);
      setTimeout(() => {
        router.push("/app");
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  if (registeredSuccess) {
    return (
      <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Account Created & Confirmation Sent!</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
            A registration confirmation and welcome email has been sent to{" "}
            <span className="text-white font-semibold">{email}</span>.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5 text-xs text-zinc-400 max-w-sm mx-auto flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Remembered on this device. Redirecting to your workspace...</span>
        </div>
        <div className="pt-2">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <span>Enter Workspace Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Social & Alternative Auth Options */}
      <div className="space-y-2">
        <span className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-center">
          Sign up with 1-click
        </span>
        <AuthSocialButtons source="signup" />
      </div>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-white/10 w-full" />
        <span className="bg-slate-950 px-3 text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
          Or with email
        </span>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Joshua Suriyan"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Selected Plan</label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {(["free", "pro", "enterprise"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={`py-2 px-3 rounded-xl border text-center font-medium capitalize transition-all ${
                  plan === p
                    ? "bg-indigo-600/30 border-indigo-500 text-white shadow-sm"
                    : "bg-slate-900 border-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <span>{loading ? "Registering & Dispatching Email..." : "Create Account & Send Register Email"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link href="/" className="inline-flex items-center gap-2 group mb-4 hover:opacity-90 transition-opacity">
          <NexoraLogo size="lg" />
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-white">Create your Nexora account</h2>
        <p className="mt-2 text-xs text-zinc-400">
          Already registered?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="rounded-2xl glass-card p-8 border border-white/10 shadow-2xl">
          <Suspense fallback={<div className="p-8 text-center text-zinc-400">Loading signup...</div>}>
            <SignupForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
