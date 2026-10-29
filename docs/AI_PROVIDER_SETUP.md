# Nexora AI Provider Configuration & Cross-Device Setup Guide

This guide ensures reliable setup and operation of AI model providers across all development and production environments (office machines, personal laptops, staging, and production).

---

## 1. Quick Start Checklist for Any Development Machine

When setting up Nexora on a new laptop or machine:

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Create your local environment file**:
   ```bash
   cp .env.example .env.local
   ```

3. **Configure at least ONE AI provider key** in `.env.local`:
   - **Recommended for local dev**: Google Gemini (Free tier available at [Google AI Studio](https://aistudio.google.com/))
     ```bash
     GEMINI_API_KEY=AIzaSy...your_gemini_key
     ```
   - **Optional**: OpenAI (Requires active prepaid billing credits at [OpenAI Platform](https://platform.openai.com/))
     ```bash
     OPENAI_API_KEY=sk-proj-...your_openai_key
     ```
   - **Optional**: Anthropic Claude (Requires credits at [Anthropic Console](https://console.anthropic.com/))
     ```bash
     ANTHROPIC_API_KEY=sk-ant-api03-...your_anthropic_key
     ```

4. **Verify your configuration with the diagnostic tool**:
   ```bash
   npm run ai:check
   ```

5. **Start your development server**:
   ```bash
   npm run dev
   ```

> ⚠️ **Important**: Next.js loads environment variables once upon server startup. If you add or edit keys in `.env.local`, you **must restart the Next.js process** (`Ctrl+C` then `npm run dev`) for the changes to take effect.

---

## 2. Supported AI Providers & Models

Nexora provides intelligent routing, capability matching, and transparent failover across three top AI providers:

| Provider | Supported Models | Free Tier? | Best For |
| :--- | :--- | :--- | :--- |
| **Google Gemini** | `gemini-3.5-flash`<br>`gemini-3.5-flash-lite`<br>`gemini-3.1-pro-preview` | **Yes** (Free RPM/RPD on AI Studio) | Default local development, cost-free testing, high speed |
| **OpenAI** | `gpt-4o`<br>`gpt-4o-mini`<br>`o3-mini` | No (Requires credit balance) | Complex coding tasks, function calling |
| **Anthropic** | `claude-3-5-sonnet`<br>`claude-3-5-haiku`<br>`claude-3-opus` | No (Requires credit balance) | Nuanced analysis, creative writing, architecture |

### Provider Key Aliases
- Google Gemini accepts either `GEMINI_API_KEY` or `GOOGLE_API_KEY`.
- OpenAI uses `OPENAI_API_KEY`.
- Anthropic uses `ANTHROPIC_API_KEY`.

---

## 3. Intelligent Configuration-Aware Model Routing

Nexora never attempts providers that are not configured on the active machine:

### A. Nexora Branded Profiles (`nexora-core`, `nexora-swift`, etc.)
- Branded profiles dynamically prioritize routes based on configured providers.
- If only Gemini is configured, Nexora Core and Nexora Swift will automatically route through `gemini-1.5-flash` or `gemini-1.5-pro`.
- If OpenAI and Gemini are both configured, Nexora routes to the primary model with graceful failover to Gemini if OpenAI encounters quota exhaustion (429) or transient errors.
- Unconfigured providers are **completely omitted from fallback cascades**. You will never see Anthropic errors if Anthropic is not configured.

### B. Direct Foundation Models
- Direct models (`openai:gpt-4o`, `anthropic:claude-3-5-sonnet`, `gemini:gemini-1.5-flash`) allow targeting specific models.
- If a user selects a direct model whose provider key is missing, Nexora validates configuration upfront, prevents wasteful network requests, and displays a friendly notice pointing to `.env.local`.

---

## 4. Troubleshooting Common Provider Errors

### 1. "Anthropic API key is not configured"
- **Cause in previous versions**: A cascading fallback loop attempted all registered providers regardless of whether keys were set.
- **Resolution**: Nexora now checks configured providers upfront and never falls back to an unconfigured provider. Ensure `npm run ai:check` shows your desired provider as `[READY]`.

### 2. OpenAI Error: Quota Exceeded (HTTP 429)
- **Error message**: `You exceeded your current quota, please check your plan and billing details.`
- **Cause**: OpenAI accounts require prepaid credits. Having an API key does not mean you have an active balance.
- **Resolution**:
  1. Add credits at [OpenAI Billing](https://platform.openai.com/settings/organization/billing/).
  2. Or configure `GEMINI_API_KEY` in `.env.local` to use Gemini free tier.

### 3. Google Gemini Error: 404 Model Not Found
- **Cause in previous versions**: Outdated or non-existent model IDs (e.g. `gemini-3.5-flash`).
- **Resolution**: Fixed in Nexora 0.4.0. Verified official model IDs (`gemini-1.5-flash`, `gemini-1.5-pro`) are used.

### 4. Authentication Error (HTTP 401)
- **Cause**: Invalid, expired, or revoked API key.
- **Resolution**: Check that there are no accidental spaces or line breaks when pasting your key into `.env.local`. Run `npm run ai:check` to inspect key formatting and length.

---

## 5. Security & Zero Secret Leaking Principle

- **Server-Side Only**: All AI provider clients (`OpenAIAdapter`, `AnthropicAdapter`, `GeminiAdapter`) and `ProviderStatusService` execute exclusively on the Next.js server runtime.
- **Zero Secrets in Client Payloads**: API responses and client-facing endpoints only return safe status flags (e.g. `isConfigured: true`, `state: "available"`). Raw keys and authorization headers are never exposed in browser network requests or bundle artifacts.
- **No Git Commits**: `.env.local` is listed in `.gitignore` and must never be committed to source control.

