"use client";

import { useState } from "react";
import { CreditCard, Check, ShieldCheck, AlertCircle, Sparkles } from "lucide-react";
import { PLAN_CONFIGS } from "@/lib/entitlements/types";
import { formatPrice } from "@/lib/utils";

export default function WorkspaceBillingPage() {
  const [currentPlan, setCurrentPlan] = useState<"free" | "pro" | "enterprise">("pro");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCheckout = async (targetPlan: "pro" | "enterprise") => {
    setCheckoutLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planTier: targetPlan,
          userId: "usr_mock_123",
          userEmail: "alex@company.com",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Order creation failed");
      }

      setStatusMessage(
        `Razorpay order (${data.orderId}) initiated for ₹${data.amount / 100}. Sandbox mode verified.`
      );
    } catch (err) {
      setStatusMessage(
        `Billing note: ${(err as Error).message}. Live payments remain safely disabled until Razorpay production credentials are provided.`
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Subscription & Billing Management</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Review your subscription tier, renewal lifecycle, and payment settings.
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Active Subscription Summary */}
      <div className="rounded-2xl glass-panel p-6 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
            Current Active Plan
          </span>
          <div className="flex items-center gap-2 mt-1">
            <h2 className="text-2xl font-bold text-white">{PLAN_CONFIGS[currentPlan].displayName}</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Active
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Billing provider: <strong>Razorpay</strong> • Renews automatically on November 21, 2026
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {formatPrice(PLAN_CONFIGS[currentPlan].priceINR * 100, "INR")}
          </div>
          <span className="text-xs text-zinc-500">per month</span>
        </div>
      </div>

      {/* Available Tier Upgrades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pro Card */}
        <div className="rounded-2xl glass-card p-6 border border-white/10 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-base">Pro Individual</h3>
            <span className="font-bold text-white text-sm">₹1,999 / mo</span>
          </div>
          <p className="text-xs text-zinc-400">
            For professionals requiring daily high-volume reasoning and 365-day history.
          </p>
          <button
            onClick={() => handleCheckout("pro")}
            disabled={checkoutLoading || currentPlan === "pro"}
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-colors"
          >
            {currentPlan === "pro" ? "Current Plan" : "Upgrade to Pro"}
          </button>
        </div>

        {/* Enterprise Card */}
        <div className="rounded-2xl glass-card p-6 border border-white/10 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-base">Enterprise Team</h3>
            <span className="font-bold text-white text-sm">₹7,999 / mo</span>
          </div>
          <p className="text-xs text-zinc-400">
            Multi-seat collaboration, organization policies, and custom audit trails.
          </p>
          <button
            onClick={() => handleCheckout("enterprise")}
            disabled={checkoutLoading || currentPlan === "enterprise"}
            className="w-full py-2.5 rounded-xl text-xs font-semibold glass-card hover:bg-white/10 disabled:opacity-50 text-white transition-colors"
          >
            {currentPlan === "enterprise" ? "Current Plan" : "Upgrade to Enterprise"}
          </button>
        </div>
      </div>
    </div>
  );
}
