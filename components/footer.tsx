import Link from "next/link";
import { Sparkles, Shield, Cpu, Github } from "lucide-react";
import { getAppVersionDisplay, APP_TAGLINE } from "@/lib/version";

export function Footer() {
  const versionDisplay = getAppVersionDisplay();

  return (
    <footer className="border-t border-white/5 bg-slate-950/80 text-zinc-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-white">Nexora</span>
            </Link>
            <p className="text-sm text-zinc-400 max-w-sm">{APP_TAGLINE}</p>
            <p className="text-xs text-zinc-500">
              Unified multi-model SaaS orchestrating industry-leading foundation models into a single,
              secure, high-performance workspace.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono bg-zinc-900 border border-zinc-800 text-indigo-400">
                {versionDisplay}
              </span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-zinc-200 text-xs uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/features" className="hover:text-white transition-colors">
                  Features Overview
                </Link>
              </li>
              <li>
                <Link href="/models" className="hover:text-white transition-colors">
                  Model Directory
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/app" className="hover:text-white transition-colors">
                  Launch Workspace
                </Link>
              </li>
            </ul>
          </div>

          {/* Security & Governance */}
          <div>
            <h4 className="font-semibold text-zinc-200 text-xs uppercase tracking-wider mb-3">
              Security
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/security" className="hover:text-white transition-colors">
                  Security Overview
                </Link>
              </li>
              <li>
                <Link href="/security#tenant-isolation" className="hover:text-white transition-colors">
                  Tenant Isolation
                </Link>
              </li>
              <li>
                <Link href="/security#encryption" className="hover:text-white transition-colors">
                  Data Encryption
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Report Vulnerability
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="font-semibold text-zinc-200 text-xs uppercase tracking-wider mb-3">
              Legal
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} Nexora AI. All rights reserved.</p>
          <p className="text-zinc-600">
            Nexora routing profiles route to third-party model providers through official APIs.
          </p>
        </div>
      </div>
    </footer>
  );
}
