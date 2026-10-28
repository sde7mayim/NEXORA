"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles, Menu, X, ArrowRight } from "lucide-react";

import { NexoraLogo } from "@/components/nexora-logo";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group hover:opacity-90 transition-opacity">
          <NexoraLogo size="md" />
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-[16px] font-medium text-zinc-300">
          <Link href="/features" className="hover:text-white transition-colors">
            Features
          </Link>
          <Link href="/models" className="hover:text-white transition-colors">
            Models
          </Link>
          <Link href="/pricing" className="hover:text-white transition-colors">
            Pricing
          </Link>
          <Link href="/security" className="hover:text-white transition-colors">
            Security
          </Link>
          <Link href="/contact" className="hover:text-white transition-colors">
            Contact
          </Link>
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-[16px] font-medium text-zinc-300 hover:text-white transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Chatting
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-zinc-400 hover:text-white focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-b border-white/10 px-4 pt-3 pb-6 space-y-3">
          <Link
            href="/features"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-zinc-300 hover:text-white"
          >
            Features
          </Link>
          <Link
            href="/models"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-zinc-300 hover:text-white"
          >
            Models
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-zinc-300 hover:text-white"
          >
            Pricing
          </Link>
          <Link
            href="/security"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-zinc-300 hover:text-white"
          >
            Security
          </Link>
          <Link
            href="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-zinc-300 hover:text-white"
          >
            Contact
          </Link>
          <div className="pt-4 border-t border-white/10 flex flex-col gap-2.5">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2 text-sm font-medium text-zinc-200"
            >
              Sign in
            </Link>
            <Link
              href="/app"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white shadow-lg"
            >
              Start Chatting
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
