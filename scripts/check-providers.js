#!/usr/bin/env node
/**
 * NEXORA AI Provider Diagnostic Tool
 * Safely inspects configured AI providers without leaking credentials.
 * Run with: npm run ai:check
 */

const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      let key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

function maskKey(key) {
  if (!key || isPlaceholder(key)) return "NOT CONFIGURED";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "********";
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)} (${trimmed.length} chars)`;
}

function isPlaceholder(val) {
  if (!val) return true;
  const lower = val.toLowerCase().trim();
  return (
    lower.includes("...your-") ||
    lower.includes("your-key") ||
    lower.includes("your_key") ||
    lower.includes("your-hf-token") ||
    lower.startsWith("sk-placeholder") ||
    lower.startsWith("sk-ant-placeholder") ||
    lower.startsWith("hf_placeholder") ||
    lower.includes("placeholder") ||
    lower === "sk-..." ||
    lower === "sk-ant-..." ||
    lower.endsWith("your-gemini-key") ||
    lower.endsWith("your-openai-key") ||
    lower.endsWith("your-anthropic-key") ||
    lower.endsWith("your-huggingface-token")
  );
}

function runDiagnostics() {
  console.log("\n=======================================================");
  console.log("             NEXORA AI PROVIDER DIAGNOSTICS            ");
  console.log("=======================================================\n");

  const envLocalPath = path.join(process.cwd(), ".env.local");
  const envLocalExists = fs.existsSync(envLocalPath);
  console.log(`Environment file (.env.local): ${envLocalExists ? "FOUND [OK]" : "MISSING (Will check process.env)"}`);

  const localEnv = loadEnvFile(envLocalPath);
  const getEnv = (key) => process.env[key] || localEnv[key] || "";

  const geminiKey = getEnv("GEMINI_API_KEY") || getEnv("GOOGLE_API_KEY");
  const openaiKey = getEnv("OPENAI_API_KEY");
  const anthropicKey = getEnv("ANTHROPIC_API_KEY");
  const hfKey = getEnv("HF_TOKEN") || getEnv("HUGGINGFACE_API_KEY");
  const searchKey = getEnv("WEB_SEARCH_API_KEY");

  const providers = [
    {
      name: "Google Gemini",
      envVar: "GEMINI_API_KEY / GOOGLE_API_KEY",
      key: geminiKey,
      freeTierAvailable: true,
      supportedModels: ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"],
      formatValid: geminiKey && !isPlaceholder(geminiKey) ? geminiKey.length > 20 : false,
      isConfigured: Boolean(geminiKey && !isPlaceholder(geminiKey)),
    },
    {
      name: "OpenAI",
      envVar: "OPENAI_API_KEY",
      key: openaiKey,
      freeTierAvailable: false,
      supportedModels: ["gpt-4o", "gpt-4o-mini", "o3-mini"],
      formatValid: openaiKey && !isPlaceholder(openaiKey) ? openaiKey.startsWith("sk-") && openaiKey.length > 20 : false,
      isConfigured: Boolean(openaiKey && !isPlaceholder(openaiKey)),
    },
    {
      name: "Anthropic Claude",
      envVar: "ANTHROPIC_API_KEY",
      key: anthropicKey,
      freeTierAvailable: false,
      supportedModels: ["claude-3-5-sonnet", "claude-3-5-haiku", "claude-3-opus"],
      formatValid: anthropicKey && !isPlaceholder(anthropicKey) ? anthropicKey.startsWith("sk-ant-") && anthropicKey.length > 20 : false,
      isConfigured: Boolean(anthropicKey && !isPlaceholder(anthropicKey)),
    },
  ];

  console.log("\nCHAT MODEL PROVIDERS:");
  console.log("-------------------------------------------------------");

  let configuredCount = 0;
  for (const p of providers) {
    if (p.isConfigured) configuredCount++;

    const statusBadge = p.isConfigured
      ? p.formatValid
        ? "[READY]       "
        : "[WARN FORMAT] "
      : "[NOT SET]     ";

    console.log(`${statusBadge} ${p.name.padEnd(18)} Key: ${maskKey(p.key)}`);
    if (p.isConfigured) {
      console.log(`               Models: ${p.supportedModels.join(", ")}`);
    }
  }

  const hfConfigured = Boolean(hfKey && !isPlaceholder(hfKey));
  const hfFormatValid = hfConfigured ? (hfKey.startsWith("hf_") && hfKey.length >= 20) : false;
  const hfBadge = hfConfigured
    ? hfFormatValid
      ? "[READY]       "
      : "[WARN FORMAT] "
    : "[NOT SET]     ";

  console.log("-------------------------------------------------------");
  console.log("IMAGE GENERATION PROVIDER:");
  console.log(`${hfBadge} Hugging Face (FLUX) Key: ${maskKey(hfKey)}`);
  if (hfConfigured) {
    console.log("               Model: black-forest-labs/FLUX.1-schnell");
  }

  console.log("-------------------------------------------------------");
  console.log(`Web Research:   ${searchKey && !isPlaceholder(searchKey) ? `[CONFIGURED] ${maskKey(searchKey)}` : "[OPTIONAL - NOT SET]"}`);
  console.log("-------------------------------------------------------\n");

  console.log("ROUTING ASSESSMENT:");
  if (configuredCount === 0) {
    console.log("❌ ZERO AI PROVIDERS CONFIGURED.");
    console.log("   AI chat completions will return a setup guidance notice.");
    console.log("   RECOMMENDED ACTION:");
    console.log("   1. Open .env.local (or copy from .env.example)");
    console.log("   2. Add a free Google Gemini key: GEMINI_API_KEY=AIzaSy...");
    console.log("      (Generate free at https://aistudio.google.com/)");
    console.log("   3. Restart your dev server (`npm run dev`)");
  } else {
    console.log(`✅ ${configuredCount} AI provider(s) ready to serve requests.`);
    const activeNames = providers.filter((p) => p.isConfigured).map((p) => p.name);
    console.log(`   Active providers: ${activeNames.join(", ")}`);
    console.log("   Failover order is automatically configuration-aware.");
    if (!openaiKey && !anthropicKey && geminiKey) {
      console.log("   ℹ️  Running in Gemini-primary mode (optimal for zero-cost dev).");
    }
  }

  console.log("\nNOTE: Changes to .env.local require restarting Next.js (`npm run dev`).\n");
}

runDiagnostics();

