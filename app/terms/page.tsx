import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
            Placeholder — Requires Qualified Legal Review Before Commercial Launch
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-4">Terms of Service</h1>
          <p className="mt-2 text-xs text-zinc-500">Effective Date: October 2026</p>
        </div>

        <div className="rounded-2xl glass-card p-8 border border-white/10 space-y-6 text-sm text-zinc-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">1. Service Description</h2>
            <p>
              Nexora provides a unified interface and routing mechanism to access artificial intelligence services, document analysis, and web search citations. Services are provided on an &quot;as is&quot; and &quot;as available&quot; basis.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. Acceptable Use Policy</h2>
            <p>
              Users agree not to utilize Nexora for generating malicious software, conducting automated attacks, infringing intellectual property, or attempting to bypass server rate limits, quotas, or Row Level Security policies.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">3. Third-Party Foundation Models</h2>
            <p>
              Nexora-branded model families (Swift, Core, Reason, Vision) route prompts to third-party providers including OpenAI and Anthropic. Availability is subject to third-party API operational status.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
