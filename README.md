# Nexora — Multi-Model AI SaaS Platform
> **Tagline:** One workspace. Many intelligences.  
> **Application Version:** `0.1.0-dev`

Nexora is a secure, scalable, multi-model AI Software-as-a-Service platform unifying OpenAI and Anthropic models, document reasoning, and source-grounded web research into a single workspace.

---

## Key Features

- **Multi-Model Orchestration:** Switch between Nexora-branded routing profiles (Swift, Core, Reason, Vision) and direct foundation models with full transparency and attribution.
- **Resilient Route Fallback:** Automatic secondary route switching during transient provider downtime or rate limits.
- **Central Entitlement Engine:** Atomic quota reservations preventing overspending across Free, Pro, and Enterprise tiers.
- **Secure Document Context:** Binary magic bytes inspection rejecting executables (PE/MZ, ELF) and parsing PDF, DOCX, CSV, TXT, and Markdown files safely.
- **SSRF-Guarded Web Research:** Live web search with IP filtering (RFC 1918 & metadata protection) yielding verified citations.
- **Cryptographic Billing & Idempotency:** Razorpay webhook handler verifying raw HMAC-SHA256 signatures with replay protection.
- **Enterprise Governance:** Multi-seat organizations with role-based access control (Owner, Admin, Member), model approval policies, and audit logging.
- **PostgreSQL Row Level Security:** Multi-tenant isolation at the database layer.

---

## Quickstart & Local Development

### 1. Prerequisites
- Node.js `v20+` or `v24+` (Installed: `v24.18.0`)
- npm `v10+` (Installed: `v11.16.0`)

### 2. Environment Setup
Copy the environment template and populate your local credentials:
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Run Test Suite
```bash
npm run test        # Runs Vitest unit & integration test suite (23 tests)
npm run type-check  # Validates TypeScript strict mode
npm run lint        # Validates ESLint rules
npm run build       # Tests Next.js production build
```

---

## Directory Structure

```
├── app/
│   ├── api/             # Server API routes (chat, models, files, research, billing)
│   ├── app/             # Authenticated workspace application (chat, files, models, analytics, etc.)
│   ├── (public pages)   # Landing (/), Pricing, Features, Models, Security, Contact, Auth
│   ├── globals.css      # Custom design tokens, glassmorphism, theme
│   └── layout.tsx       # Root layout
├── components/          # Reusable UI components (Navbar, Footer, etc.)
├── lib/
│   ├── ai/              # Model registry, OpenAI & Anthropic adapters, router
│   ├── entitlements/    # Quota check engine and atomic reservations
│   ├── files/           # File validation (magic bytes) and text extraction
│   ├── research/        # SSRF-guarded web search service
│   ├── billing/         # Razorpay SDK adapter and HMAC signature validator
│   ├── enterprise/      # RBAC, invitation tokens, and policy security
│   ├── supabase/        # Browser, server, and service-role clients
│   └── version.ts       # Application version source of truth (0.1.0)
├── supabase/
│   └── migrations/      # Versioned PostgreSQL migrations with RLS policies
├── tests/
│   └── unit/            # Vitest automated test suite
├── docs/                # Architecture, security, and implementation documentation
└── package.json         # Package configuration (v0.1.0)
```

---

## License
Proprietary software. All rights reserved.
