import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
            Placeholder — Requires Qualified Legal Review Before Commercial Launch
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-4">Privacy Policy</h1>
          <p className="mt-2 text-xs text-zinc-500">Effective Date: October 2026</p>
        </div>

        <div className="rounded-2xl glass-card p-8 border border-white/10 space-y-6 text-sm text-zinc-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">1. Information We Collect</h2>
            <p>
              Nexora collects account registration details (email address and full name), conversation history, uploaded document metadata, and usage event counters necessary to enforce plan quotas and provide conversational persistence.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. AI Foundation Model Processing</h2>
            <p>
              When you prompt Nexora or submit document context, requests are dispatched via official server-side APIs to OpenAI or Anthropic in accordance with your chosen routing profile. Nexora does not use your private conversational prompts to train proprietary foundation model weights.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">3. Data Retention and Deletion</h2>
            <p>
              Conversation history and file storage are retained according to your plan tier (30 days for Free Starter, 365 days for Pro, and customizable for Enterprise). You may permanently delete your conversations and account at any time via your user settings.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
