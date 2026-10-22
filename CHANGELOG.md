# Changelog

All notable changes to the Nexora platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.4.0] - 2026-10-21

### Added
- **Team Collaboration & Enterprise Workspaces (`lib/workspaces/workspace-service.ts` & `app/app/layout.tsx`):** Complete multi-user workspace management with 4 server-enforced roles (`owner`, `admin`, `member`, `viewer`), single-use expiring invitation tokens with SHA-256 storage, acceptance/revocation API, last-owner demotion/removal protection, private-by-default conversation sharing, and interactive desktop Workspace Switcher dropdown with active role badge.
- **Nexora Knowledge Hub (`lib/knowledge/knowledge-service.ts` & `/app/knowledge`):** Grounded RAG system with personal & workspace collections, document chunking with section/page tracking, deterministic 32-dimensional normalized vector embeddings and hybrid cosine/lexical retrieval, grounded citations, document preview authorization re-checks, and SSRF-safe URL ingestion via `WebResearchService`.
- **AI Workflows & Multi-Step Agents (`lib/workflows/` & `/app/workflows`):** Structured workflow authoring and execution engine supporting user input, model generation via ModelRouter, knowledge retrieval, conditional branching, data transformation, human approval checkpoints, run state persistence, and visual Workflow Builder with architecture templates.
- **Nexora Developer Platform (`lib/developer/` & `/app/developer`):** Versioned public API endpoints (`GET /api/v1/models`, `POST /api/v1/chat/completions`) with OpenAI compatibility, cryptographic API key generation with SHA-256 storage, scoped entitlements (`models:read`, `chat:write`, `knowledge:read`, `workflows:run`), developer portal with cURL/TypeScript code generation, and live interactive API Test Console & Header Inspector.
- **Enterprise Governance & SSO (`lib/audit/`, `lib/enterprise/sso.ts`, `/app/enterprise`):** Centralized compliance audit logging with search and 1-click CSV export, workspace spending caps and model whitelisting enforced in ModelRouter, SAML 2.0 / OIDC identity federation with issuer, audience, and clock skew validation, and live Inbound Assertion Validation Simulator.
- **Database Migration (`20261021000003_enterprise_knowledge_workflows.sql`):** Normalized schema tables for conversation shares, collections, documents, chunks, workflows, runs, API keys, usage, audit logs, and SSO configurations with Row Level Security (RLS).
- **Unit Test Coverage Expansion:** Added comprehensive unit test suites covering workspace policies & spending limits (`tests/unit/workspaces.test.ts`), semantic vector embeddings & cosine similarity (`tests/unit/knowledge.test.ts`), multi-step workflows & approval gates (`tests/unit/workflows.test.ts`), developer API authorization & scoping (`tests/unit/developer-api.test.ts`), and governance SSO assertion validation (`tests/unit/governance-sso.test.ts`). Total test suite expanded to 15 files and 67 passing tests.

### Changed
- Bumped application Semantic Version to `0.4.0-dev` across `package.json`, `lib/version.ts`, footer, and test assertions.
- Updated `AppLayout` sidebar navigation with links for Knowledge Hub, AI Workflows, Developer Platform, and Enterprise Governance.
- Connected ModelRouter and ModelOrchestrator to workspace policies for tenant model allowlist and spending cap enforcement.

---

## [0.3.0] - 2026-10-21

### Added
- **Intelligent Model Orchestrator (`lib/ai/orchestrator.ts`):** Central server-side orchestration pipeline with deterministic capability validation, quota and spend limits checking, circuit-breaker-aware route resolution, fallback execution, and streaming performance instrumentation.
- **Provider Circuit Breaker (`lib/ai/circuit-breaker.ts`):** High-reliability state machine (`CLOSED`, `OPEN`, `HALF_OPEN`) tracking consecutive failure thresholds, automatic fast-fallback when a provider is tripped, recovery cooldowns, and manual operator overrides.
- **Structured Server-Side Telemetry (`lib/telemetry/logger.ts`):** Cryptographic correlation IDs (`req_...`), privacy-safe actor hashing (`usr_...`), sensitive credential redaction (API keys, Bearer tokens, card numbers), circular in-memory buffer, and live metric aggregation (latency, TTFT, cost).
- **AI Quality Evaluation Framework (`lib/evaluations/`):** Repeatable benchmark evaluation engine with version-controlled test cases (`nexora-bench-v1.0`), deterministic assertions for coding, reasoning, JSON schema validity, summarization, and instruction following, and simulation fixtures.
- **Admin Diagnostics & Ops Dashboard (`/app/diagnostics`):** Real-time operational control center displaying aggregate latency, TTFT, request volume, live provider circuit breaker statuses with 1-click manual resets, and redacted audit trace logs.
- **AI Quality Evaluation Workbench (`/app/evaluations`):** Interactive benchmarking suite allowing administrators to run repeatable test suites against Nexora models and inspect task-by-task accuracy, latency, and tokens.
- **PostgreSQL Migration (`20261021000002_observability_and_evaluations.sql`):** Durable persistence for telemetry events, circuit breaker states, and model evaluation runs with Row Level Security (RLS) policies and query-optimized indexes.
- **Unit Test Coverage:** Added unit test suites for circuit breaker (`tests/unit/circuit-breaker.test.ts`), structured telemetry (`tests/unit/telemetry.test.ts`), and AI evaluations (`tests/unit/evaluations.test.ts`). Total test suite expanded to 10 files and 46 passing tests.

### Changed
- Bumped application Semantic Version to `0.3.0-dev` across `package.json`, `lib/version.ts`, footer, and test assertions.
- Updated `/api/chat` route handler to execute via `ModelOrchestrator.orchestrateStream` with correlation metadata headers (`x-correlation-id`, `x-selected-model`, `x-selected-provider`).
- Added Diagnostics & Ops and Quality Evaluations to sidebar navigation in `AppLayout`.

---

## [0.2.0] - 2026-10-21

### Added
- **Persistent Multi-Conversation Management:** Client and server-side synchronized conversation store (`lib/chat/conversation-store.ts`) and API route (`/api/conversations`). Supports new chat creation, list filtering/search, inline title renaming, quick pin toggling, and permanent deletion.
- **Collapsible History Drawer:** Left-hand history drawer in the chat workspace allowing seamless switching between past multi-model conversations without loss of state.
- **Rich Markdown & Code Highlighting (`MarkdownRenderer`):** Automatic markdown parsing for headings, lists, quotes, and syntax code blocks with language badges and 1-click **Copy Code** action.
- **Model Details & Version History Modal (`ModelDetailsModal`):** Interactive inspection dialog exposing immutable version numbers, configured primary/fallback route candidates, verified capabilities, context window bounds, and underlying provider disclosures.
- **Model Capability Pre-Flight Engine:** Server and client capability checks rejecting incompatible requests (e.g. vision or file inputs on text-only profiles like `nexora-swift`) with clear explanations before triggering provider APIs.
- **Automated Test Expansion:** Added unit test suites for conversation store persistence (`tests/unit/conversations.test.ts`) and model capability verification (`tests/unit/model-capabilities.test.ts`). All 34 tests passing cleanly.

### Changed
- Bumped application Semantic Version to `0.2.0-dev` across `package.json`, `lib/version.ts`, footer, and test assertions.
- Updated `/api/chat` route handler to execute capability pre-flight checks before atomic quota reservation.

---

## [0.1.0] - 2026-10-21

### Added
- Initial baseline multi-model AI SaaS platform with Next.js 14+ App Router, TypeScript strict mode, and Tailwind CSS.
- Provider-independent AI model registry with verified external foundation models (`openai:gpt-4o-mini`, `openai:gpt-4o`, `anthropic:claude-3-5-haiku`, `anthropic:claude-3-5-sonnet`).
- Immutable Nexora-branded routing profiles: `Nexora Swift 1.0`, `Nexora Core 1.0`, `Nexora Reason 1.0`, `Nexora Vision 1.0`.
- Central entitlement engine with atomic quota reservations (Free, Pro, Enterprise).
- Binary magic bytes file validation pipeline rejecting malicious executables (PE/MZ, ELF) and parsing PDF, DOCX, CSV, TXT, and Markdown.
- SSRF-guarded web research service with private IP/loopback filtering and verified source citations.
- Cryptographically verified Razorpay billing integration with raw HMAC-SHA256 signature checking and idempotent webhook processing.
- Multi-user Enterprise workspaces with RBAC (Owner, Admin, Member), model approval policies, and spend ceilings.
- Public marketing suite (Landing, Pricing, Features, Models, Security, Contact, Auth).
- PostgreSQL schema migration `20261021000001_initial_schema.sql` covering 20+ tables with Row Level Security (RLS) policies.
