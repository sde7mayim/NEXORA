import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { ShieldCheck, Lock, Key, Server, FileCheck, EyeOff, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 relative overflow-hidden py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Subtle Geometric Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f60a_1px,transparent_1px),linear-gradient(to_bottom,#3b82f60a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_20%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Ambient Light Fields */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[750px] h-[340px] rounded-full pointer-events-none home-ambient-light-hero home-ambient-glow-1 blur-[80px]" />
        <div className="absolute top-[520px] left-1/2 -translate-x-1/2 w-[900px] h-[360px] rounded-full pointer-events-none home-ambient-light-workspace home-ambient-glow-2 blur-[90px]" />

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="home-hero-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-indigo-300 mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Architectural Defenses &amp; Strict Tenant Boundaries</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight">
              Security &amp; Data Protection
            </h1>
            <p className="mt-4 text-base sm:text-xl text-zinc-300 leading-relaxed">
              Nexora is built with rigorous defense-in-depth: database row level isolation, isolated server credentials, and safe client sandboxing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Card 1: Row Level Security */}
            <div id="tenant-isolation" className="home-card-interactive rounded-3xl p-8 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm shadow-indigo-500/10">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">Database Row Level Security (RLS)</h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                Every database query executes under PostgreSQL Row Level Security policies evaluated directly within the database engine. Tenants can never access, query, or mutate another organization&apos;s conversations, files, or persistent memories.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs text-indigo-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Enforced at the PostgreSQL kernel level</span>
              </div>
            </div>

            {/* Card 2: Server-Side Secret Isolation */}
            <div className="home-card-interactive rounded-3xl p-8 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-sm shadow-violet-500/10">
                <Key className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">Server-Side Secret Isolation</h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                Third-party foundation model keys (OpenAI, Anthropic), search API tokens, and payment credentials are exclusively resolved within secure server environments and never bundled or transmitted into client bundles.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs text-indigo-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero token leakage into browser memory</span>
              </div>
            </div>

            {/* Card 3: SSRF Prevention */}
            <div className="home-card-interactive rounded-3xl p-8 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/10">
                <Server className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">SSRF Defense on Web Research</h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                All outbound web research calls undergo strict IP and DNS validation to block private subnets (RFC 1918), loopback interfaces (127.0.0.1, ::1), and cloud provider metadata servers (169.254.169.254).
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs text-indigo-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Metadata protection and intranet isolation</span>
              </div>
            </div>

            {/* Card 4: Magic Bytes Inspection */}
            <div id="encryption" className="home-card-interactive rounded-3xl p-8 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm shadow-amber-500/10">
                <FileCheck className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">Binary Magic Bytes Signature Check</h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                Uploaded files are checked for authentic binary signatures (e.g. PDF magic numbers, ZIP structures for DOCX) while automatically dropping executable binaries (PE/MZ, ELF) to prevent remote execution exploits.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs text-indigo-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Real signature inspection over spoofable MIME types</span>
              </div>
            </div>
          </div>

          {/* Responsible Disclosure Banner */}
          <div className="home-card-interactive rounded-3xl p-8 sm:p-10 text-center space-y-4">
            <h3 className="text-xl sm:text-2xl font-bold text-white">Responsible Security Disclosure</h3>
            <p className="text-sm text-zinc-300 max-w-2xl mx-auto leading-relaxed">
              If you identify an architectural flaw or vulnerability, we invite you to report it responsibly directly to our engineering security team.
            </p>
            <div className="pt-2">
              <Link
                href="/contact?topic=security"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl home-btn-glass text-sm font-semibold text-white transition-all"
              >
                Report Security Finding
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
