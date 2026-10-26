"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, UserCheck, ShieldCheck } from "lucide-react";
import { AuthSocialButtons } from "@/components/auth-social-buttons";
import { SavedAccountManager, SavedAccount } from "@/lib/auth/saved-accounts";

export function HomeHeroAuth() {
  const [rememberedAccount, setRememberedAccount] = useState<SavedAccount | null>(null);

  useEffect(() => {
    const account = SavedAccountManager.getRememberedAccount();
    if (account && account.email) {
      setRememberedAccount(account);
    }
  }, []);

  return (
    <div className="mt-8 max-w-lg mx-auto space-y-4">
      {/* If previously signed in, show 1-click resume workspace pill */}
      {rememberedAccount ? (
        <div className="p-3.5 rounded-2xl glass-panel border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2.5 text-left min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
              {rememberedAccount.avatarInitial}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-indigo-400 block tracking-wider">
                Previously Signed In
              </span>
              <p className="text-xs font-semibold text-white truncate">
                {rememberedAccount.name || rememberedAccount.email}
              </p>
            </div>
          </div>

          <Link
            href="/app"
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all shrink-0"
          >
            <span>Resume Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : null}

      {/* Instant 1-Click Fast Auth Bar */}
      <div className="rounded-2xl glass-card p-4 border border-white/10 bg-slate-950/60 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Fast Access:
          </span>
          <span className="text-[10px] text-zinc-500">Google • Apple • Phone OTP</span>
        </div>
        <AuthSocialButtons source="home" onSuccessRedirect="/app" />
      </div>
    </div>
  );
}
