import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  Sparkles,
  ArrowRight,
  Shield,
  Search,
  FileText,
  Cpu,
  Layers,
  Zap,
  CheckCircle2,
  Lock,
  ChevronRight,
} from "lucide-react";
import { NEXORA_MODEL_FAMILIES } from "@/lib/ai/model-registry";
import { PLAN_CONFIGS } from "@/lib/entitlements/types";
import { formatPrice } from "@/lib/utils";
import { HomeHeroAuth } from "@/components/home-hero-auth";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* ================================================================== */}
        {/* HERO SECTION                                                       */}
        {/* ================================================================== */}
        <section className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-28 border-b border-white/5 bg-slate-950">
          {/* Official Nexora Hero Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-right-bottom opacity-75 pointer-events-none mix-blend-screen"
            style={{ backgroundImage: "url('/hero-bg.jpg')" }}
          />
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-purple-800/10 blur-[130px] rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card text-xs font-medium text-indigo-300 border border-indigo-500/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>Next-Generation Multi-Model SaaS</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400">OpenAI, Anthropic & Gemini Unified</span>
            </div>

            {/* Headline matching official NEXORA brand design */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
              Smarter AI. <br />
              <span className="bg-gradient-to-r from-sky-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                Greater possibilities.
              </span>
            </h1>

            {/* Subheading */}
            <p className="mt-5 text-lg sm:text-2xl text-zinc-300 font-medium max-w-2xl mx-auto">
              One workspace. Many intelligences.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 shadow-xl shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Start for Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/features"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-medium glass-card text-zinc-200 hover:text-white hover:bg-white/5 border border-white/10 transition-colors flex items-center justify-center gap-2"
              >
                Explore Features
              </Link>
            </div>

            {/* Fast 1-Click Social/Phone Auth & Resume Workspace Banner */}
            <HomeHeroAuth />

            {/* Interactive Workspace Preview */}
            <div className="mt-16 max-w-5xl mx-auto rounded-2xl glass-panel p-2 shadow-2xl border border-white/10">
              <div className="rounded-xl bg-slate-950/90 border border-white/5 overflow-hidden text-left">
                {/* Mock Browser Header */}
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-3 text-xs text-zinc-400 font-mono">nexora.workspace/chat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                      Nexora Core 1.0 (GPT-4o mini)
                    </span>
                  </div>
                </div>

                {/* Mock Workspace Content */}
                <div className="p-6 space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">
                      U
                    </div>
                    <div className="rounded-xl bg-zinc-900/70 p-3.5 text-sm text-zinc-200 max-w-xl border border-white/5">
                      Synthesize our uploaded quarterly report (PDF) with current web research on cloud infrastructure trends.
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center p-1 shadow-md">
                      <Image src="/logo.png" alt="Nexora" width={24} height={24} className="object-contain" />
                    </div>
                    <div className="rounded-xl glass-card p-4 text-sm text-zinc-200 max-w-2xl space-y-3 border border-indigo-500/20">
                      <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium">
                        <Search className="w-3.5 h-3.5" />
                        <span>Retrieved 3 real web sources & processed attached PDF</span>
                      </div>
                      <p className="text-zinc-300 leading-relaxed">
                        Based on your financial disclosures and verified web market trends:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-zinc-400 text-xs">
                        <li>Cloud computing margins expanded by 14% year-over-year [Document Context].</li>
                        <li>Industry enterprise infrastructure is converging on multi-model routing architectures [Source 1: IDC Cloud Report].</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* NEXORA BRANDED PROFILES SECTION                                     */}
        {/* ================================================================== */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">
              Transparent Intelligence Routing
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Curated Profiles. Proven Foundation Models.
            </h3>
            <p className="mt-4 text-zinc-400 text-sm sm:text-base">
              Nexora branded profiles are managed routing profiles over official third-party APIs. We pair the right model with the right task.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {NEXORA_MODEL_FAMILIES.map((family) => (
              <div
                key={family.id}
                className="rounded-2xl glass-card p-6 flex flex-col justify-between hover:border-indigo-500/40 transition-colors group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-105 transition-transform">
                    {family.slug === "nexora-swift" && <Zap className="w-5 h-5" />}
                    {family.slug === "nexora-core" && <Cpu className="w-5 h-5" />}
                    {family.slug === "nexora-reason" && <Layers className="w-5 h-5" />}
                    {family.slug === "nexora-vision" && <Sparkles className="w-5 h-5" />}
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{family.displayName} 1.0</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">{family.description}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
                  <span>Version 1.0.0</span>
                  <span className="text-indigo-400 font-medium">Active</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================== */}
        {/* CORE CAPABILITIES OVERVIEW                                         */}
        {/* ================================================================== */}
        <section className="py-20 border-t border-white/5 bg-slate-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="rounded-2xl glass-card p-8 border border-white/5 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-white">Document Reasoning</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Upload PDFs, DOCX, CSV, TXT, and Markdown files safely. Our pipeline validates magic byte signatures, extracts content, and injects context directly into multi-model discussions.
                </p>
                <div className="text-xs text-indigo-400 font-medium pt-2">
                  Available on Free, Pro, and Enterprise
                </div>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl glass-card p-8 border border-white/5 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-white">Source-Grounded Research</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Search live web sources without hallucinations. Requests pass through our SSRF security guardrails, extracting evidence and providing verifiable citation links for every claim.
                </p>
                <div className="text-xs text-indigo-400 font-medium pt-2">
                  Available on Free, Pro, and Enterprise
                </div>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl glass-card p-8 border border-white/5 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Shield className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-white">Enterprise Governance</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Role-based access control, PostgreSQL Row Level Security (RLS), approved model policies, token cost accounting, and cryptographic audit logs ensure complete tenant isolation.
                </p>
                <div className="text-xs text-indigo-400 font-medium pt-2">
                  Multi-seat organizations & compliance
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* PRICING OVERVIEW SECTION                                            */}
        {/* ================================================================== */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">
              Transparent SaaS Plans
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Fair limits. Core features on every tier.
            </h3>
            <p className="mt-4 text-zinc-400 text-sm">
              We never disable Chat History, File Uploads, or Web Research on lower tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free */}
            <div className="rounded-2xl glass-card p-8 border border-white/10 flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-bold text-white">{PLAN_CONFIGS.free.displayName}</h4>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold text-white">₹0</span>
                  <span className="text-zinc-400 text-xs ml-2">forever free</span>
                </div>
                <ul className="space-y-3 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>10 AI messages / day (100 / mo)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>3 Web research searches / mo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>File upload (up to 5 MB per file)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Chat history with 30-day retention</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Nexora Swift & Core models</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/signup?plan=free"
                className="mt-8 w-full py-2.5 rounded-xl text-center text-sm font-semibold glass-card hover:bg-white/10 text-white transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl glass-panel p-8 border-2 border-indigo-500/50 flex flex-col justify-between relative shadow-xl shadow-indigo-500/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                Most Popular
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">{PLAN_CONFIGS.pro.displayName}</h4>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold text-white">
                    {formatPrice(PLAN_CONFIGS.pro.priceINR * 100, "INR")}
                  </span>
                  <span className="text-zinc-400 text-xs ml-2">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>100 AI messages / day (2,000 / mo)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>100 Web research searches / mo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>File upload (up to 25 MB, 1 GB storage)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Extended 365-day chat history</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>All models: GPT-4o, Claude 3.5 Sonnet & Reason</span>
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

            {/* Enterprise */}
            <div className="rounded-2xl glass-card p-8 border border-white/10 flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-bold text-white">{PLAN_CONFIGS.enterprise.displayName}</h4>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold text-white">
                    {formatPrice(PLAN_CONFIGS.enterprise.priceINR * 100, "INR")}
                  </span>
                  <span className="text-zinc-400 text-xs ml-2">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                    <span>Custom organization-wide AI quotas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                    <span>Multi-seat collaboration & member RBAC</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                    <span>100 MB file uploads & organization retention</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                    <span>Model approval policies & spend limits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                    <span>Cryptographic audit event logs</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/signup?plan=enterprise"
                className="mt-8 w-full py-2.5 rounded-xl text-center text-sm font-semibold glass-card hover:bg-white/10 text-white transition-colors"
              >
                Contact Enterprise
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* FAQ SECTION                                                        */}
        {/* ================================================================== */}
        <section className="py-20 border-t border-white/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-2xl sm:text-3xl font-bold text-white">Frequently Asked Questions</h3>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl glass-card p-5 border border-white/5">
                <h5 className="font-semibold text-white text-sm">
                  What makes Nexora different from ChatGPT or Claude?
                </h5>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                  Instead of confining you to a single AI ecosystem, Nexora orchestrates OpenAI and Anthropic models side-by-side in one unified workspace with consistent chat memory, document analysis, and source-grounded web research.
                </p>
              </div>

              <div className="rounded-xl glass-card p-5 border border-white/5">
                <h5 className="font-semibold text-white text-sm">
                  Does Nexora train its own models?
                </h5>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                  No. We are fully transparent: Nexora Swift, Core, Reason, and Vision are intelligent routing profiles over official foundation-model provider APIs (OpenAI and Anthropic). We do not claim to train underlying foundation weights.
                </p>
              </div>

              <div className="rounded-xl glass-card p-5 border border-white/5">
                <h5 className="font-semibold text-white text-sm">
                  How does Nexora handle my data and files?
                </h5>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                  Files are validated for magic byte integrity and stored in private storage buckets. Data access is strictly isolated using PostgreSQL Row Level Security (RLS) so that no other user or organization can ever view your files or conversation history.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
