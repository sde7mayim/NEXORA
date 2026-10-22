import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Check, X, Sparkles, HelpCircle } from "lucide-react";
import { PLAN_CONFIGS } from "@/lib/entitlements/types";
import { formatPrice } from "@/lib/utils";

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Simple, Transparent Plans
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-400">
            Every plan includes chat history, file uploads, and web research. Upgrade when you need higher limits, advanced reasoning models, or multi-seat collaboration.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {/* FREE */}
          <div className="rounded-2xl glass-card p-8 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Free Starter</h2>
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                Essential multi-model AI for personal exploration.
              </p>
              <div className="mt-6 mb-8">
                <span className="text-4xl font-extrabold text-white">₹0</span>
                <span className="text-zinc-500 text-xs ml-2">/ month</span>
              </div>
              <ul className="space-y-3.5 text-xs text-zinc-300">
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
                  <span><strong>File uploads enabled</strong> (5 MB max per file)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Persistent chat history</strong> (30-day retention)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Nexora Swift & Core models (GPT-4o mini)</span>
                </li>
                <li className="flex items-start gap-2.5 text-zinc-500">
                  <X className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Claude 3.5 Sonnet & GPT-4o Flagship</span>
                </li>
                <li className="flex items-start gap-2.5 text-zinc-500">
                  <X className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Team collaboration & workspace RBAC</span>
                </li>
              </ul>
            </div>
            <Link
              href="/signup?plan=free"
              className="mt-8 w-full py-2.5 rounded-xl text-center text-sm font-semibold glass-card hover:bg-white/10 text-white transition-colors"
            >
              Get Started Free
            </Link>
          </div>

          {/* PRO */}
          <div className="rounded-2xl glass-panel p-8 border-2 border-indigo-500/60 flex flex-col justify-between relative shadow-xl shadow-indigo-500/10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
              Most Popular
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Pro Individual</h2>
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                High-volume intelligence for power users and professionals.
              </p>
              <div className="mt-6 mb-8">
                <span className="text-4xl font-extrabold text-white">
                  {formatPrice(PLAN_CONFIGS.pro.priceINR * 100, "INR")}
                </span>
                <span className="text-zinc-500 text-xs ml-2">/ month</span>
              </div>
              <ul className="space-y-3.5 text-xs text-zinc-300">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>100 messages / day</strong> (2,000 / month)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>100 Web research searches</strong> / month</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>25 MB file uploads</strong> (1 GB total storage)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Extended 365-day chat history</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>All models unlocked:</strong> Claude 3.5 Sonnet, GPT-4o, Nexora Reason</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Token cost tracking and usage analytics</span>
                </li>
                <li className="flex items-start gap-2.5 text-zinc-500">
                  <X className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Multi-user workspaces & member RBAC</span>
                </li>
              </ul>
            </div>
            <Link
              href="/signup?plan=pro"
              className="mt-8 w-full py-2.5 rounded-xl text-center text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg transition-colors"
            >
              Upgrade to Pro
            </Link>
          </div>

          {/* ENTERPRISE */}
          <div className="rounded-2xl glass-card p-8 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Enterprise Team</h2>
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                Advanced governance, policies, and multi-user administration.
              </p>
              <div className="mt-6 mb-8">
                <span className="text-4xl font-extrabold text-white">
                  {formatPrice(PLAN_CONFIGS.enterprise.priceINR * 100, "INR")}
                </span>
                <span className="text-zinc-500 text-xs ml-2">/ month baseline</span>
              </div>
              <ul className="space-y-3.5 text-xs text-zinc-300">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <span><strong>Customizable AI limits</strong> across organization</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <span><strong>Multi-seat team workspace</strong> with Owner, Admin, Member roles</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <span><strong>100 MB file uploads</strong> & custom retention policies</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <span><strong>Approved model policies</strong> & spending limit caps</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <span><strong>Tamper-evident audit logs</strong> & tenant isolation</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <span>Custom invoice billing & support channel</span>
                </li>
              </ul>
            </div>
            <Link
              href="/signup?plan=enterprise"
              className="mt-8 w-full py-2.5 rounded-xl text-center text-sm font-semibold glass-card hover:bg-white/10 text-white transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>

        {/* Feature Comparison Matrix */}
        <div className="rounded-2xl glass-panel p-8 border border-white/5">
          <h3 className="text-xl font-bold text-white mb-6">Detailed Plan Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300 border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Feature</th>
                  <th className="py-3 px-4">Free</th>
                  <th className="py-3 px-4 text-indigo-400">Pro</th>
                  <th className="py-3 px-4 text-violet-400">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-3 px-4 font-medium text-white">Daily AI Messages</td>
                  <td className="py-3 px-4">10 / day</td>
                  <td className="py-3 px-4">100 / day</td>
                  <td className="py-3 px-4">Configurable</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-white">Monthly AI Messages</td>
                  <td className="py-3 px-4">100 / month</td>
                  <td className="py-3 px-4">2,000 / month</td>
                  <td className="py-3 px-4">Configurable</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-white">Web Research Searches</td>
                  <td className="py-3 px-4">3 / month</td>
                  <td className="py-3 px-4">100 / month</td>
                  <td className="py-3 px-4">Configurable</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-white">Chat History Retention</td>
                  <td className="py-3 px-4">30 days</td>
                  <td className="py-3 px-4">365 days</td>
                  <td className="py-3 px-4">Custom Org Policy</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-white">Max File Size</td>
                  <td className="py-3 px-4">5 MB</td>
                  <td className="py-3 px-4">25 MB</td>
                  <td className="py-3 px-4">100 MB</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-white">Storage Allowance</td>
                  <td className="py-3 px-4">50 MB</td>
                  <td className="py-3 px-4">1 GB</td>
                  <td className="py-3 px-4">10 GB+</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-white">Model Access</td>
                  <td className="py-3 px-4">Swift, Core</td>
                  <td className="py-3 px-4">Swift, Core, Reason, Vision, Sonnet, GPT-4o</td>
                  <td className="py-3 px-4">All models + Admin Approval</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-white">Team Management</td>
                  <td className="py-3 px-4">Single user</td>
                  <td className="py-3 px-4">Single user</td>
                  <td className="py-3 px-4">Multi-seat RBAC</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
