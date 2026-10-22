import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ShieldCheck, Lock, Key, Server, FileCheck, EyeOff } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Security & Data Protection
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-400">
            Our architectural guarantees: complete tenant isolation, server-side secrets, and rigorous input validation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Card 1: Row Level Security */}
          <div id="tenant-isolation" className="rounded-2xl glass-card p-8 border border-white/10 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Database Row Level Security (RLS)</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Every database query is constrained by PostgreSQL Row Level Security policies evaluated directly within the database engine. Users and organizations can strictly never query or mutate another tenant&apos;s data.
            </p>
          </div>

          {/* Card 2: Server-Side Secret Isolation */}
          <div className="rounded-2xl glass-card p-8 border border-white/10 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Key className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Server-Side Secret Isolation</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Third-party foundation model keys (OpenAI, Anthropic), search API tokens, and payment secrets are strictly stored in server environments and never bundled or transmitted to the client browser.
            </p>
          </div>

          {/* Card 3: SSRF Prevention */}
          <div className="rounded-2xl glass-card p-8 border border-white/10 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Server className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">SSRF Defense on Web Research</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              All web queries pass through a strict filter blocking internal IP addresses (RFC 1918), loopback interfaces (127.0.0.1, ::1), and cloud provider metadata servers (169.254.169.254).
            </p>
          </div>

          {/* Card 4: Magic Bytes Inspection */}
          <div id="encryption" className="rounded-2xl glass-card p-8 border border-white/10 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Binary Magic Bytes Inspection</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Uploaded files are checked for authentic magic byte headers (e.g. PDF headers, ZIP archives for DOCX) while immediately discarding executable binaries (PE/MZ, ELF) to prevent remote execution exploits.
            </p>
          </div>
        </div>

        {/* Responsible Disclosure */}
        <div className="rounded-2xl glass-panel p-8 border border-white/10 text-center space-y-3">
          <h3 className="text-lg font-bold text-white">Vulnerability Reporting</h3>
          <p className="text-xs text-zinc-400 max-w-xl mx-auto">
            If you identify a security issue or vulnerability within Nexora, please disclose responsibly to our security team via our contact form.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
