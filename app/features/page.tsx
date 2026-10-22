import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import {
  Sparkles,
  Layers,
  Search,
  FileCheck,
  ShieldAlert,
  ArrowRight,
  Database,
  Lock,
  Zap,
} from "lucide-react";

export default function FeaturesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Engineered for Precision & Scale
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-400">
            Discover the technical capabilities powering the Nexora multi-model AI platform.
          </p>
        </div>

        <div className="space-y-16">
          {/* Feature Block 1: Multi-Model Routing */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Layers className="w-6 h-6" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Multi-Model Orchestration & Transparent Routing
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Nexora abstracts foundation model APIs into an extensible adapter pattern. Instead of hardcoding vendor endpoints, queries pass through our server-side routing resolver.
              </p>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span><strong>Automatic Fallback:</strong> Seamlessly switches to eligible secondary routes during transient provider rate limits.</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span><strong>Full Attribution:</strong> Explicitly shows the underlying foundation model used for every token generated.</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl glass-panel p-6 border border-white/5 space-y-3 font-mono text-xs">
              <div className="text-zinc-500">{"// Server-side routing resolution"}</div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-zinc-300 space-y-1">
                <div><span className="text-indigo-400">const</span> route = <span className="text-violet-400">ModelRouter</span>.resolveRoutes(<span className="text-emerald-400">&quot;nexora-core&quot;</span>, userPlan);</div>
                <div><span className="text-zinc-500">{"// Primary: OpenAI GPT-4o mini"}</span></div>
                <div><span className="text-zinc-500">{"// Fallback: Anthropic Claude 3.5 Haiku"}</span></div>
                <div><span className="text-indigo-400">for await</span> (<span className="text-indigo-400">const</span> chunk <span className="text-indigo-400">of</span> stream) &#123;</div>
                <div className="pl-4">emit(chunk.textDelta, chunk.modelAttribution);</div>
                <div>&#125;</div>
              </div>
            </div>
          </div>

          {/* Feature Block 2: Document Processing */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="order-2 lg:order-1 rounded-2xl glass-panel p-6 border border-white/5 space-y-3 font-mono text-xs">
              <div className="text-zinc-500">{"// Magic bytes security verification"}</div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-zinc-300 space-y-1">
                <div><span className="text-indigo-400">const</span> magicCheck = <span className="text-violet-400">FileProcessingService</span>.validateMagicBytes(buffer, fileName);</div>
                <div><span className="text-indigo-400">if</span> (!magicCheck.valid) &#123;</div>
                <div className="pl-4 text-rose-400">throw new SecurityError(magicCheck.error);</div>
                <div>&#125;</div>
                <div><span className="text-zinc-500">{"// Safe text extraction & private storage"}</span></div>
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <FileCheck className="w-6 h-6" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Secure Document-Assisted Context
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Never trust client-supplied MIME types. Nexora inspects raw file binary signatures to reject malicious executables and parses PDF, DOCX, CSV, TXT, and Markdown files safely.
              </p>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span><strong>Private Storage:</strong> Uploads are kept in private buckets protected by Row Level Security.</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span><strong>Context Injection:</strong> Injects validated document extracts into multi-model prompts.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature Block 3: SSRF-Protected Web Research */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Search className="w-6 h-6" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                SSRF-Guarded Web Research & Source Grounding
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Connect live queries with real web sources without compromising server security. Our search engine prevents Server-Side Request Forgery by blocking local, loopback, and metadata network ranges.
              </p>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span><strong>Citations:</strong> Every claim links back to verifiable search URLs.</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span><strong>Zero Hallucination:</strong> Models synthesize facts grounded in fresh search evidence.</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl glass-panel p-6 border border-white/5 space-y-3 font-mono text-xs">
              <div className="text-zinc-500">{"// SSRF protection policy"}</div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-zinc-300 space-y-1">
                <div><span className="text-indigo-400">if</span> (!<span className="text-violet-400">WebResearchService</span>.isUrlSafe(sourceUrl)) &#123;</div>
                <div className="pl-4 text-rose-400">blockRequest(<span className="text-amber-300">&quot;Private IP prohibited&quot;</span>);</div>
                <div>&#125;</div>
                <div><span className="text-zinc-500">{"// Returns citations with verified HTTPS links"}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 p-10 rounded-2xl glass-panel border border-white/10 text-center space-y-4">
          <h3 className="text-2xl font-bold text-white">Ready to experience multi-model AI?</h3>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            Get started today on our Free Starter plan or upgrade to Pro for uncapped foundation models.
          </p>
          <div className="pt-2">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all"
            >
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
