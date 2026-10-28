"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Mail, Send, CheckCircle2, AlertCircle, Loader2, Sparkles, MessageSquare, Shield, HelpCircle } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "General Inquiry",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; email: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to deliver message. Please try again.");
      }

      setSubmittedTicket({
        id: data.ticketId || "NEX-ONLINE",
        email: formData.email,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 relative overflow-hidden py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Subtle Geometric Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f60a_1px,transparent_1px),linear-gradient(to_bottom,#3b82f60a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Ambient Light Fields */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[650px] h-[300px] rounded-full pointer-events-none home-ambient-light-hero home-ambient-glow-1 blur-[80px]" />

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="home-hero-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-indigo-300 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Direct Support & Enterprise Inquiries</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Get in Touch with Nexora
            </h1>
            <p className="mt-4 text-base sm:text-lg text-zinc-300 leading-relaxed">
              Have questions regarding team workspaces, enterprise compliance, custom token quotas, or foundation model routing? We are here to help.
            </p>
          </div>

          {/* Contact Card */}
          <div className="home-card-interactive rounded-3xl p-6 sm:p-10 shadow-2xl relative">
            {submittedTicket ? (
              <div className="text-center py-10 space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Inquiry Received</h3>
                  <p className="text-sm font-mono text-indigo-400 mt-1">Ticket Reference: {submittedTicket.id}</p>
                </div>
                <p className="text-sm text-zinc-300 max-w-md mx-auto leading-relaxed">
                  Thank you for reaching out. A confirmation has been registered for <strong className="text-white">{submittedTicket.email}</strong>. Our engineering and support team will follow up within 24 hours.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => {
                      setSubmittedTicket(null);
                      setFormData({ name: "", email: "", subject: "General Inquiry", message: "" });
                    }}
                    className="px-6 py-2.5 rounded-xl home-btn-glass text-sm font-semibold text-white transition-all"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {errorMsg && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Joshua Suriyan"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                      Work Email
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="thzcreterz05@gmail.com"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                    Topic / Subject
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  >
                    <option value="General Inquiry">General Product Inquiry</option>
                    <option value="Enterprise Workspace">Enterprise Workspace & Custom Quotas</option>
                    <option value="Billing & Subscription">Billing, Invoices & Subscriptions</option>
                    <option value="Security / Vulnerability Report">Security Architecture & Vulnerability Report</option>
                    <option value="Model Routing Partnerships">API Access & Model Routing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                    Message
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your team size, workflow requirements, or technical questions..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-base font-semibold flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Inquiry</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Direct channels */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="home-card-interactive p-4 rounded-2xl">
              <MessageSquare className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
              <div className="text-xs font-semibold text-white">Live AI Workspace</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Instant test in /app</div>
            </div>
            <div className="home-card-interactive p-4 rounded-2xl">
              <Shield className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <div className="text-xs font-semibold text-white">Security Review</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">RLS & Isolated Keys</div>
            </div>
            <div className="home-card-interactive p-4 rounded-2xl">
              <HelpCircle className="w-5 h-5 text-violet-400 mx-auto mb-2" />
              <div className="text-xs font-semibold text-white">Documentation</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Model routing guides</div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
