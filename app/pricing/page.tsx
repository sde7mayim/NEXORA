import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Check, X, Sparkles, HelpCircle, ArrowRight, ShieldCheck, Users } from "lucide-react";
import { PLAN_CONFIGS } from "@/lib/entitlements/types";
import { formatPrice } from "@/lib/utils";

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 relative overflow-hidden py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Subtle Geometric Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f60a_1px,transparent_1px),linear-gradient(to_bottom,#3b82f60a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_25%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Ambient Light Fields */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[750px] h-[340px] rounded-full pointer-events-none home-ambient-light-hero home-ambient-glow-1 blur-[80px]" />
        <div className="absolute top-[480px] left-1/2 -translate-x-1/2 w-[900px] h-[360px] rounded-full pointer-events-none home-ambient-light-workspace home-ambient-glow-2 blur-[90px]" />

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="home-hero-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-indigo-300 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Transparent Pricing • No Feature Lockout</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight">
              Fair, Transparent Plans
            </h1>
            <p className="mt-4 text-base sm:text-xl text-zinc-300 leading-relaxed">
              Every plan includes persistent memory, document analysis, and source-grounded web research. Upgrade for higher model bandwidth and team collaboration.
            </p>
          </div>

          {/* Plan Cards Grid (4 Tiers: Free, Pro, Family, Enterprise) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
            {/* 1. FREE */}
            <div className="home-card-interactive rounded-3xl p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">{PLAN_CONFIGS.free.displayName}</h2>
                </div>
                <p className="mt-2 text-xs text-zinc-400 min-h-[36px]">
                  Essential multi-model AI exploration for individual developers.
                </p>
                <div className="mt-5 mb-6">
                  <span className="text-4xl font-extrabold text-white">₹0</span>
                  <span className="text-zinc-500 text-xs ml-2">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-zinc-200">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>10 messages / day</strong> (100 / month)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>3 Web research searches</strong> / month</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>File upload enabled</strong> (5 MB per file)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Chat history</strong> (30-day retention)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Nexora Swift & Core profiles</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-zinc-500">
                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Claude 3.5 Sonnet & Reason profiles</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-zinc-500">
                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Workspace multi-seat sharing</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/signup?plan=free"
                className="mt-8 w-full py-3 rounded-xl text-center text-sm font-semibold home-btn-glass text-white transition-all"
              >
                Get Started Free
              </Link>
            </div>

            {/* 2. PRO */}
            <div className="home-card-interactive rounded-3xl p-6 sm:p-7 border-2 border-indigo-500/70 flex flex-col justify-between relative shadow-2xl shadow-indigo-500/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                Most Popular
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">{PLAN_CONFIGS.pro.displayName}</h2>
                </div>
                <p className="mt-2 text-xs text-zinc-300 min-h-[36px]">
                  High-capacity intelligence for daily creators and power developers.
                </p>
                <div className="mt-5 mb-6">
                  <span className="text-4xl font-extrabold text-white">
                    {formatPrice(PLAN_CONFIGS.pro.priceINR * 100, "INR")}
                  </span>
                  <span className="text-zinc-400 text-xs ml-2">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-zinc-200">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span><strong>100 messages / day</strong> (2,000 / month)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span><strong>100 Web research searches</strong> / mo</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span><strong>25 MB file uploads</strong> (1 GB storage)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span><strong>Extended 365-day</strong> chat history</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>All models: GPT-4o, Claude 3.5 Sonnet & Reason</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>Priority fallback routing speed</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-zinc-500">
                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Multi-seat member invitations</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/signup?plan=pro"
                className="mt-8 w-full py-3 rounded-xl text-center text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01]"
              >
                Upgrade to Pro
              </Link>
            </div>

            {/* 3. FAMILY */}
            <div className="home-card-interactive rounded-3xl p-6 sm:p-7 flex flex-col justify-between relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900 border border-indigo-400/40 text-[10px] font-semibold text-indigo-300">
                Shared Workspace
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">{PLAN_CONFIGS.family.displayName}</h2>
                </div>
                <p className="mt-2 text-xs text-zinc-400 min-h-[36px]">
                  Shared AI pool for households, small teams, and student groups.
                </p>
                <div className="mt-5 mb-6">
                  <span className="text-4xl font-extrabold text-white">
                    {formatPrice(PLAN_CONFIGS.family.priceINR * 100, "INR")}
                  </span>
                  <span className="text-zinc-500 text-xs ml-2">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-zinc-200">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span><strong>Up to 5 family members</strong> included</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span><strong>300 messages / day</strong> (6,000 / month shared)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span><strong>200 Web research searches</strong> / mo</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span><strong>Private isolated chats</strong> per member</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span><strong>50 MB file uploads</strong> (5 GB shared storage)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>All models: GPT-4o, Claude 3.5 Sonnet</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/signup?plan=family"
                className="mt-8 w-full py-3 rounded-xl text-center text-sm font-semibold home-btn-glass text-white transition-all"
              >
                Join Family Plan
              </Link>
            </div>

            {/* 4. ENTERPRISE */}
            <div className="home-card-interactive rounded-3xl p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">{PLAN_CONFIGS.enterprise.displayName}</h2>
                </div>
                <p className="mt-2 text-xs text-zinc-400 min-h-[36px]">
                  Custom governance, organizational RBAC, and volume quotas.
                </p>
                <div className="mt-5 mb-6">
                  <span className="text-4xl font-extrabold text-white">Custom</span>
                  <span className="text-zinc-500 text-xs ml-2">multi-seat</span>
                </div>
                <ul className="space-y-3 text-xs text-zinc-200">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <span><strong>Custom pooled quotas</strong> & spend caps</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <span><strong>Role-Based Access Control (RBAC)</strong></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <span><strong>100 MB file uploads</strong> & retention rules</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <span><strong>Cryptographic audit logs</strong> & telemetry</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <span>Model routing approval policies</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <span>Dedicated SLA & engineering contact</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/contact?topic=enterprise"
                className="mt-8 w-full py-3 rounded-xl text-center text-sm font-semibold home-btn-glass text-white transition-all"
              >
                Contact Enterprise
              </Link>
            </div>
          </div>

          {/* Feature Comparison Matrix */}
          <div className="mt-16">
            <div className="text-center mb-10">
              <h3 className="text-2xl sm:text-3xl font-bold text-white">Detailed Feature Matrix</h3>
              <p className="text-sm text-zinc-400 mt-2">Transparent entitlement breakdown across all tiers</p>
            </div>

            <div className="home-card-interactive rounded-3xl p-6 sm:p-8 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-400">
                    <th className="py-4 font-semibold">Capability</th>
                    <th className="py-4 font-semibold text-center">Free Starter</th>
                    <th className="py-4 font-semibold text-center text-indigo-400">Pro Individual</th>
                    <th className="py-4 font-semibold text-center text-sky-400">Family Workspace</th>
                    <th className="py-4 font-semibold text-center text-violet-400">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-zinc-200">
                  <tr>
                    <td className="py-3.5 font-medium text-white">Monthly AI Messages</td>
                    <td className="py-3.5 text-center">100 / mo</td>
                    <td className="py-3.5 text-center font-bold text-indigo-300">2,000 / mo</td>
                    <td className="py-3.5 text-center">6,000 / mo (shared)</td>
                    <td className="py-3.5 text-center">Custom Quota</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-white">Web Research Searches</td>
                    <td className="py-3.5 text-center">3 / mo</td>
                    <td className="py-3.5 text-center font-bold text-indigo-300">100 / mo</td>
                    <td className="py-3.5 text-center">200 / mo</td>
                    <td className="py-3.5 text-center">Custom Quota</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-white">Max File Size</td>
                    <td className="py-3.5 text-center">5 MB</td>
                    <td className="py-3.5 text-center font-bold text-indigo-300">25 MB</td>
                    <td className="py-3.5 text-center">50 MB</td>
                    <td className="py-3.5 text-center">100 MB</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-white">Storage Capacity</td>
                    <td className="py-3.5 text-center">50 MB</td>
                    <td className="py-3.5 text-center font-bold text-indigo-300">1 GB</td>
                    <td className="py-3.5 text-center">5 GB</td>
                    <td className="py-3.5 text-center">Unlimited Pool</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-white">Chat Retention</td>
                    <td className="py-3.5 text-center">30 Days</td>
                    <td className="py-3.5 text-center font-bold text-indigo-300">365 Days</td>
                    <td className="py-3.5 text-center">365 Days</td>
                    <td className="py-3.5 text-center">Custom / Forever</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-white">Models Included</td>
                    <td className="py-3.5 text-center">Swift & Core</td>
                    <td className="py-3.5 text-center font-bold text-indigo-300">All Foundation Models</td>
                    <td className="py-3.5 text-center">All Foundation Models</td>
                    <td className="py-3.5 text-center">All + Custom Routes</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-white">Live Code Preview & Sandbox</td>
                    <td className="py-3.5 text-center text-emerald-400">Included</td>
                    <td className="py-3.5 text-center text-emerald-400">Included</td>
                    <td className="py-3.5 text-center text-emerald-400">Included</td>
                    <td className="py-3.5 text-center text-emerald-400">Included</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-white">Persistent Memory & Knowledge</td>
                    <td className="py-3.5 text-center text-emerald-400">Included</td>
                    <td className="py-3.5 text-center text-emerald-400">Included</td>
                    <td className="py-3.5 text-center text-emerald-400">Isolated per User</td>
                    <td className="py-3.5 text-center text-emerald-400">Enterprise Collections</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
