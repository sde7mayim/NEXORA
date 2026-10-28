import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import {
  Sparkles,
  Layers,
  Search,
  FileCheck,
  ShieldCheck,
  ArrowRight,
  Database,
  Lock,
  Zap,
  Code2,
  Cpu,
  Brain,
} from "lucide-react";

export default function FeaturesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 relative overflow-hidden py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Subtle Geometric Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f60a_1px,transparent_1px),linear-gradient(to_bottom,#3b82f60a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_20%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Ambient Light Fields */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[750px] h-[340px] rounded-full pointer-events-none home-ambient-light-hero home-ambient-glow-1 blur-[80px]" />
        <div className="absolute top-[600px] left-1/2 -translate-x-1/2 w-[900px] h-[380px] rounded-full pointer-events-none home-ambient-light-workspace home-ambient-glow-2 blur-[90px]" />

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="home-hero-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-indigo-300 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Architected for Precision, Speed & Autonomy</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight">
              Engineered for Precision & Scale
            </h1>
            <p className="mt-4 text-base sm:text-xl text-zinc-300 leading-relaxed">
              Discover the core technical subsystems powering the Nexora multi-model AI platform: live sandboxed previews, persistent recall, and isolated security.
            </p>
          </div>

          <div className="space-y-12">
            {/* Feature 1: Multi-Model Routing */}
            <div className="home-card-interactive rounded-3xl p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm shadow-indigo-500/10">
                  <Layers className="w-6 h-6" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  Multi-Model Orchestration & Fallback Routing
                </h2>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Nexora abstracts foundation model APIs into an extensible routing resolver. Instead of hardcoding vendor endpoints, queries pass through intelligent profiles with automatic fallbacks.
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                  <li className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    <span><strong>Transparent Fallback:</strong> Automatically switches to standby model routes during provider rate limits.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    <span><strong>Explicit Attribution:</strong> Discloses the exact underlying model and version for every response.</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-5 font-mono text-xs text-zinc-300 space-y-2 shadow-xl">
                <div className="text-zinc-500">{"// Server-side model routing resolver"}</div>
                <div><span className="text-indigo-400">const</span> route = <span className="text-violet-400">ModelRouter</span>.resolveRoutes(<span className="text-emerald-400">&quot;nexora-core&quot;</span>, userPlan);</div>
                <div className="text-zinc-500">{"// Primary: OpenAI GPT-4o mini"}</div>
                <div className="text-zinc-500">{"// Standby: Anthropic Claude 3.5 Haiku"}</div>
                <div><span className="text-indigo-400">for await</span> (<span className="text-indigo-400">const</span> chunk <span className="text-indigo-400">of</span> stream) &#123;</div>
                <div className="pl-4">emit(chunk.textDelta, chunk.modelAttribution);</div>
                <div>&#125;</div>
              </div>
            </div>

            {/* Feature 2: Live Code Sandbox & Preview */}
            <div className="home-card-interactive rounded-3xl p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-5 font-mono text-xs text-zinc-300 space-y-2 shadow-xl order-2 lg:order-1">
                <div className="text-zinc-500">{"// Isolated sandboxed browser runtime"}</div>
                <div>&lt;<span className="text-indigo-400">iframe</span> <span className="text-violet-400">sandbox</span>=&quot;<span className="text-emerald-400">allow-scripts</span>&quot; /&gt;</div>
                <div className="text-zinc-500">{"// Injected runtime: Tailwind CSS + React 18 + Babel standalone"}</div>
                <div className="text-emerald-400">✓ Code &amp; Preview split views with live debounce</div>
                <div className="text-emerald-400">✓ Zero parent cookie / token exposure</div>
              </div>
              <div className="space-y-4 order-1 lg:order-2">
                <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/10">
                  <Code2 className="w-6 h-6" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  Live Sandboxed Code Execution
                </h2>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Turn AI-generated UI snippets into live interactive prototypes instantly. Nexora runs components in an isolated sandboxed iframe with Tailwind CSS and React 18 support.
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                  <li className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span><strong>Live Editing:</strong> Modify source directly and see live preview update with automatic debouncing.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span><strong>Safe Execution:</strong> Prevents generated code from accessing parent tokens, cookies, or storage.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 3: Document Reasoning */}
            <div className="home-card-interactive rounded-3xl p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-sm shadow-violet-500/10">
                  <FileCheck className="w-6 h-6" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  Binary Signature Document Analysis
                </h2>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Never rely on spoofable client MIME headers. Nexora inspects magic byte signatures directly to reject malicious payloads and safely extract structured text from PDFs, DOCX, CSV, TXT, and Markdown files.
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                  <li className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                    <span><strong>Magic Byte Verification:</strong> Rejects executable binaries (PE/MZ, ELF) disguised as documents.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                    <span><strong>Context Injection:</strong> Feeds extracted document slices into active multi-model discussions.</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-5 font-mono text-xs text-zinc-300 space-y-2 shadow-xl">
                <div className="text-zinc-500">{"// Binary signature header validation"}</div>
                <div><span className="text-indigo-400">const</span> check = <span className="text-violet-400">FileValidationService</span>.verifyMagicBytes(buffer);</div>
                <div><span className="text-indigo-400">if</span> (!check.isSafe) &#123;</div>
                <div className="pl-4 text-rose-400">throw new SecurityError(&quot;Untrusted executable signature detected&quot;);</div>
                <div>&#125;</div>
                <div className="text-emerald-400">✓ Verified document safe for RLS private storage bucket</div>
              </div>
            </div>

            {/* Feature 4: Web Research & SSRF Defense */}
            <div className="home-card-interactive rounded-3xl p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-5 font-mono text-xs text-zinc-300 space-y-2 shadow-xl order-2 lg:order-1">
                <div className="text-zinc-500">{"// SSRF Guardrails on web search"}</div>
                <div><span className="text-indigo-400">const</span> allowed = <span className="text-violet-400">SSRFGuard</span>.validateTarget(targetUrl);</div>
                <div className="text-zinc-500">{"// Blocks RFC 1918 private IPs, AWS/GCP metadata endpoints"}</div>
                <div><span className="text-indigo-400">const</span> evidence = <span className="text-indigo-400">await</span> crawl(targetUrl, &#123; timeoutMs: 5000 &#125;);</div>
                <div className="text-emerald-400">✓ Grounded claim with direct source citation URL</div>
              </div>
              <div className="space-y-4 order-1 lg:order-2">
                <div className="w-12 h-12 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm shadow-sky-500/10">
                  <Search className="w-6 h-6" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  Source-Grounded Live Web Research
                </h2>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Query live web sources with SSRF defense. Requests filter out intranet endpoints, extracting factual citations and verifying statements against authentic external pages.
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                  <li className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                    <span><strong>SSRF Defense:</strong> Strictly blocks private subnets and cloud metadata services.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                    <span><strong>Clickable Citations:</strong> Supplies verifiable URLs for every extracted factual statement.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 5: Persistent Personal Memory */}
            <div className="home-card-interactive rounded-3xl p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm shadow-purple-500/10">
                  <Brain className="w-6 h-6" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  Persistent Memory & Adaptive Recall
                </h2>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Never repeat your workflow guidelines. Nexora stores user preferences, project details, and professional context across conversations, injecting relevant memory into subsequent sessions.
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                  <li className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                    <span><strong>Scoped Memories:</strong> Stores explicit preferences, tech stacks, and career facts safely.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                    <span><strong>User Control:</strong> Inspect, edit, or purge any stored memory at any time.</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-5 font-mono text-xs text-zinc-300 space-y-2 shadow-xl">
                <div className="text-zinc-500">{"// User memory recall service"}</div>
                <div><span className="text-indigo-400">const</span> context = <span className="text-violet-400">MemoryService</span>.getRelevantMemory(userId, query);</div>
                <div className="text-zinc-500">{"// Injects: [Preferences, Active Projects, Tech Stacks]"}</div>
                <div className="text-purple-300">✓ Context synthesized seamlessly across model changes</div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-20 text-center">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02]"
            >
              Experience Features in Workspace
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
