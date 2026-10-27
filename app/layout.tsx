import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/lib/version";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "Nexora is a secure, enterprise-grade multi-model AI SaaS platform uniting OpenAI, Anthropic, and intelligent routing into a single workspace.",
  icons: {
    icon: [
      { url: "/favicon.png?v=3", type: "image/png" },
      { url: "/nexora-logo.png?v=3", type: "image/png" },
    ],
    shortcut: "/favicon.png?v=3",
    apple: "/nexora-logo.png?v=3",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${fontSans.variable}`}>
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
