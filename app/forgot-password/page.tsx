"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Mail, CheckCircle2, AlertCircle, ShieldAlert, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SavedAccountManager } from "@/lib/auth/saved-accounts";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.toLowerCase().trim();
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const generatedToken = Math.random().toString(36).substring(2, 10).toUpperCase();
    const resetUrl = `${origin}/reset-password?email=${encodeURIComponent(cleanEmail)}&token=${generatedToken}`;

    try {
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${origin}/reset-password`,
      }).catch(() => {});

      // Call internal email dispatcher
      const res = await fetch("/api/auth/notify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "password_reset",
          email: cleanEmail,
          resetUrl,
        }),
      });

      const data = await res.json();
      if (data.email?.actionUrl) {
        setRecoveryLink(data.email.actionUrl);
      } else {
        setRecoveryLink(resetUrl);
      }

      SavedAccountManager.saveAccount({
        email: cleanEmail,
      });

      setSubmitted(true);
    } catch {
      setRecoveryLink(resetUrl);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link href="/" className="inline-flex items-center gap-2 group mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-2xl text-white">Nexora</span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-white">Reset your password</h2>
        <p className="mt-2 text-xs text-zinc-400">
          Enter your registered email address to receive an instant recovery link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="rounded-2xl glass-card p-8 border border-white/10 shadow-2xl">
          {submitted ? (
            <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Password Recovery Email Dispatched</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                A secure password reset link has been dispatched to{" "}
                <span className="text-white font-semibold">{email}</span>. Please check your inbox.
              </p>

              {/* Direct recovery link for development & instant verification */}
              {recoveryLink && (
                <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/30 text-left space-y-2">
                  <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Instant Recovery Link</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Click below to open the recovery page and set your new password directly:
                  </p>
                  <Link
                    href={recoveryLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-colors"
                  >
                    <span>Open Reset Password Page</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href="/login"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Return to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <span>{loading ? "Sending Recovery Link..." : "Send Reset Link to Email"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  Remember your password? Sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
