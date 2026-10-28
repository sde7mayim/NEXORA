"use client";

import { useState, useEffect } from "react";
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
  Code2,
  RefreshCw,
} from "lucide-react";
import { NEXORA_MODEL_FAMILIES } from "@/lib/ai/model-registry";
import { PLAN_CONFIGS } from "@/lib/entitlements/types";
import { formatPrice } from "@/lib/utils";
import { LiveCodePreview } from "@/components/live-code-preview";
import {
  HOMEPAGE_DEMOS,
  getNextDemoExample,
  DemoExample,
  getLastViewedDemoId,
} from "@/lib/demo/homepage-demos";
import {
  getDemoForCurrentTab,
  registerTabLease,
  getTabSessionId,
} from "@/lib/demo/cross-tab-coordinator";

export default function LandingPage() {
  const [currentDemo, setCurrentDemo] = useState<DemoExample>(HOMEPAGE_DEMOS[0]);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    // Coordinated cross-tab demo selection:
    // Genuinely new browser tabs coordinate via localStorage lease ledger to pick a unique demo.
    // Page refreshes in the same tab maintain stable continuity.
    const selected = getDemoForCurrentTab();
    setCurrentDemo(selected);
  }, []);

  const handleTryAnotherDemo = () => {
    setIsRotating(true);
    const next = getDemoForCurrentTab({ forceRotate: true });
    setCurrentDemo(next);
    setTimeout(() => setIsRotating(false), 350);
  };

  const handleSelectDemo = (demo: DemoExample) => {
    setCurrentDemo(demo);
    registerTabLease(getTabSessionId(), demo.id);
  };

  const DEMO_REACT_CODE = currentDemo.code;
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1">
        {/* ================================================================== */}
        {/* HERO SECTION                                                       */}
        {/* ================================================================== */}
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24 border-b border-white/5 bg-slate-950">
          {/* Layer 1: Subtle Geometric Grid Texture for Glass Frosting Depth */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f60a_1px,transparent_1px),linear-gradient(to_bottom,#3b82f60a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_70%,transparent_100%)] pointer-events-none" />

          {/* Layer 2: Restrained Multi-Stop Ambient Light Layers */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[280px] bg-indigo-950/20 blur-[100px] rounded-full pointer-events-none home-ambient-glow-1" />
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[760px] h-[360px] rounded-full pointer-events-none home-ambient-light-hero home-ambient-glow-1 blur-[70px]" />
          <div className="absolute top-[420px] left-1/2 -translate-x-1/2 w-[900px] h-[240px] rounded-full pointer-events-none home-ambient-light-cards home-ambient-glow-2 blur-[60px]" />
          <div className="absolute top-[680px] left-1/2 -translate-x-1/2 w-[980px] h-[480px] rounded-full pointer-events-none home-ambient-light-workspace home-ambient-glow-1 blur-[80px]" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            {/* Pill Badge with subtle entrance */}
            <div className="home-hero-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-indigo-300 mb-6 max-w-full">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
              <span>Next-Generation Multi-Model SaaS</span>
              <span className="hidden sm:inline text-zinc-500">•</span>
              <span className="hidden sm:inline text-zinc-400">OpenAI, Anthropic & Gemini Unified</span>
            </div>

            {/* Headline with slow elegant reveal & shimmer accent */}
            <h1 className="home-hero-title text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
              Your AI Workspace, <br />
              <span className="home-gradient-text">
                Reimagined.
              </span>
            </h1>

            {/* Subheading */}
            <p className="home-hero-subtitle mt-5 text-base sm:text-xl text-zinc-300 font-normal max-w-2xl mx-auto leading-relaxed">
              One workspace. Many intelligences. Unified access to OpenAI GPT-4o, Claude 3.5 Sonnet, Gemini 1.5, and Nexora Core with live code execution and persistent memory.
            </p>

            {/* CTAs */}
            <div className="home-hero-cta mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/app"
                className="shimmer-btn w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-semibold bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Start Chatting
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/features"
                className="home-btn-glass w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-medium text-zinc-200 hover:text-white flex items-center justify-center gap-2"
              >
                Explore Features
              </Link>
            </div>

            {/* Compact Feature Highlights Row with Staggered Entrance */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3.5 max-w-4xl mx-auto text-left">
              <div className="home-feature-card home-feature-item-1 p-3.5 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm shadow-indigo-500/10">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">Multi-Model Studio</div>
                  <div className="text-[11px] text-zinc-400 truncate">GPT-4o, Claude, Gemini</div>
                </div>
              </div>

              <div className="home-feature-card home-feature-item-2 p-3.5 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm shadow-emerald-500/10">
                  <Code2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">Live Code Sandbox</div>
                  <div className="text-[11px] text-zinc-400 truncate">Instant UI rendering</div>
                </div>
              </div>

              <div className="home-feature-card home-feature-item-3 p-3.5 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-sm shadow-sky-500/10">
                  <Search className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">Web Citations</div>
                  <div className="text-[11px] text-zinc-400 truncate">Live source grounding</div>
                </div>
              </div>

              <div className="home-feature-card home-feature-item-4 p-3.5 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 shadow-sm shadow-purple-500/10">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">Personal Memory</div>
                  <div className="text-[11px] text-zinc-400 truncate">Adaptive recall</div>
                </div>
              </div>
            </div>

            {/* Interactive Workspace Demonstration Preview */}
            <div className="home-preview-container mt-14 max-w-5xl mx-auto rounded-2xl p-2 shadow-2xl">
              <div className="rounded-xl bg-slate-950/75 backdrop-blur-xl border border-white/10 overflow-hidden text-left">
                {/* Mock Browser Header */}
                <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-3 text-xs text-zinc-400 font-mono">nexora.workspace/chat</span>
                    <span className="hidden md:inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                      {currentDemo.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Autonomous Demo Mode</span>
                    </div>

                    <button
                      onClick={handleTryAnotherDemo}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600/30 to-violet-600/30 hover:from-indigo-600/50 hover:to-violet-600/50 text-indigo-200 border border-indigo-500/40 shadow-sm transition-all active:scale-95"
                      title="Cycle to another demo example"
                    >
                      <RefreshCw className={"w-3 h-3 text-indigo-300 transition-transform duration-300 " + (isRotating ? "rotate-180 text-white" : "")} />
                      <span>Try Another Demo</span>
                    </button>
                  </div>
                </div>

                {/* Example Quick Switcher Pill Bar */}
                <div className="px-4 py-2 bg-slate-950/90 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
                  <span className="text-[11px] text-zinc-500 uppercase font-bold tracking-wider shrink-0 mr-1 hidden sm:inline">
                    Examples:
                  </span>
                  {HOMEPAGE_DEMOS.map((demo) => {
                    const isSelected = demo.id === currentDemo.id;
                    return (
                      <button
                        key={demo.id}
                        onClick={() => handleSelectDemo(demo)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-sm font-semibold"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                        }`}
                      >
                        {demo.title}
                      </button>
                    );
                  })}
                </div>

                {/* Mock Workspace Content */}
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                      U
                    </div>
                    <div className="rounded-xl bg-white/[0.04] backdrop-blur-sm p-3.5 text-sm sm:text-base text-zinc-200 max-w-xl border border-white/10">
                      {currentDemo.prompt}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center p-1 shadow-md shrink-0">
                      <Image src="/nexora-logo.png?v=3" alt="Nexora" width={22} height={22} className="object-contain" unoptimized />
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="rounded-xl bg-white/[0.03] backdrop-blur-md p-4 text-sm sm:text-base text-zinc-200 border border-white/10 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1 pb-1">
                          <p className="text-zinc-300 leading-relaxed text-sm">
                            {currentDemo.description}
                          </p>
                          <span className="text-[11px] text-indigo-400 font-medium">
                            {currentDemo.title}
                          </span>
                        </div>
                        <LiveCodePreview code={DEMO_REACT_CODE} language="jsx" />
                      </div>
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
            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-2">
              Transparent Intelligence Routing
            </h2>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              Curated Profiles. Proven Foundation Models.
            </h3>
            <p className="mt-4 text-zinc-300 text-base sm:text-lg leading-relaxed">
              Nexora branded profiles are managed routing profiles over official third-party APIs. We pair the right model with the right task.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {NEXORA_MODEL_FAMILIES.map((family) => (
              <div
                key={family.id}
                className="home-card-interactive rounded-2xl p-6 flex flex-col justify-between group"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform shadow-sm shadow-indigo-500/10">
                    {family.slug === "nexora-swift" && <Zap className="w-6 h-6" />}
                    {family.slug === "nexora-core" && <Cpu className="w-6 h-6" />}
                    {family.slug === "nexora-reason" && <Layers className="w-6 h-6" />}
                    {family.slug === "nexora-vision" && <Sparkles className="w-6 h-6" />}
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">{family.displayName} 1.0</h4>
                  <p className="text-sm text-zinc-300 leading-relaxed">{family.description}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-sm text-zinc-400">
                  <span>Version 1.0.0</span>
                  <span className="text-indigo-400 font-semibold">Active</span>
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
              <div className="home-card-interactive rounded-3xl p-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-sm shadow-violet-500/10">
                  <FileText className="w-7 h-7" />
                </div>
                <h4 className="text-2xl font-bold text-white">Document Reasoning</h4>
                <p className="text-base text-zinc-300 leading-relaxed">
                  Upload PDFs, DOCX, CSV, TXT, and Markdown files safely. Our pipeline validates magic byte signatures, extracts content, and injects context directly into multi-model discussions.
                </p>
                <div className="text-sm text-indigo-400 font-semibold pt-2">
                  Available on Free, Pro, and Enterprise
                </div>
              </div>

              {/* Feature 2 */}
              <div className="home-card-interactive rounded-3xl p-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm shadow-indigo-500/10">
                  <Search className="w-7 h-7" />
                </div>
                <h4 className="text-2xl font-bold text-white">Source-Grounded Research</h4>
                <p className="text-base text-zinc-300 leading-relaxed">
                  Search live web sources without hallucinations. Requests pass through our SSRF security guardrails, extracting evidence and providing verifiable citation links for every claim.
                </p>
                <div className="text-sm text-indigo-400 font-semibold pt-2">
                  Available on Free, Pro, and Enterprise
                </div>
              </div>

              {/* Feature 3 */}
              <div className="home-card-interactive rounded-3xl p-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/10">
                  <Shield className="w-7 h-7" />
                </div>
                <h4 className="text-2xl font-bold text-white">Enterprise Governance</h4>
                <p className="text-base text-zinc-300 leading-relaxed">
                  Role-based access control, PostgreSQL Row Level Security (RLS), approved model policies, token cost accounting, and cryptographic audit logs ensure complete tenant isolation.
                </p>
                <div className="text-sm text-indigo-400 font-semibold pt-2">
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
            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-2">
              Transparent SaaS Plans
            </h2>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              Fair limits. Core features on every tier.
            </h3>
            <p className="mt-4 text-zinc-300 text-base sm:text-lg">
              We never disable Chat History, File Uploads, or Web Research on lower tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free */}
            <div className="home-card-interactive rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <h4 className="text-xl font-bold text-white">{PLAN_CONFIGS.free.displayName}</h4>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold text-white">₹0</span>
                  <span className="text-zinc-400 text-sm ml-2">forever free</span>
                </div>
                <ul className="space-y-3.5 text-sm text-zinc-200">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>10 AI messages / day (100 / mo)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>3 Web research searches / mo</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>File upload (up to 5 MB per file)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Chat history with 30-day retention</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Nexora Swift & Core models</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/signup?plan=free"
                className="mt-8 w-full py-3.5 rounded-2xl text-center text-base font-semibold home-btn-glass text-white transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Pro */}
            <div className="home-card-interactive rounded-3xl p-8 border-2 border-indigo-500/60 flex flex-col justify-between relative shadow-xl shadow-indigo-500/20">
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
            <div className="home-card-interactive rounded-3xl p-8 flex flex-col justify-between">
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
