-- ==============================================================================
-- NEXORA PLATFORM: MIGRATION 20261021000002_observability_and_evaluations.sql
-- Intelligent Orchestration Telemetry, Circuit Breakers & Quality Evaluations
-- ==============================================================================

-- 1. AI REQUEST TELEMETRY EVENTS
CREATE TABLE IF NOT EXISTS public.ai_telemetry_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    correlation_id TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    org_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
    model_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    provider_model_id TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    duration_ms INTEGER NOT NULL,
    ttft_ms INTEGER,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
    actual_cost NUMERIC(10, 6),
    retry_count INTEGER NOT NULL DEFAULT 0,
    fallback_used BOOLEAN NOT NULL DEFAULT false,
    error_category TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for fast analytics queries
CREATE INDEX IF NOT EXISTS idx_telemetry_correlation_id ON public.ai_telemetry_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_user_id ON public.ai_telemetry_events(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_org_id ON public.ai_telemetry_events(org_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON public.ai_telemetry_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_provider_model ON public.ai_telemetry_events(provider_id, model_id);

-- 2. CIRCUIT BREAKER PERSISTENCE (Optional cross-instance coordination)
CREATE TABLE IF NOT EXISTS public.circuit_breaker_states (
    provider_id TEXT PRIMARY KEY,
    state TEXT NOT NULL DEFAULT 'CLOSED' CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
    failure_count INTEGER NOT NULL DEFAULT 0,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    last_failure_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    next_attempt_allowed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. MODEL QUALITY EVALUATION RUNS
CREATE TABLE IF NOT EXISTS public.model_evaluation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id TEXT NOT NULL UNIQUE,
    suite_name TEXT NOT NULL,
    model_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    total_tests INTEGER NOT NULL,
    passed_tests INTEGER NOT NULL,
    failed_tests INTEGER NOT NULL,
    accuracy_score NUMERIC(5, 4) NOT NULL,
    avg_latency_ms NUMERIC(10, 2) NOT NULL,
    total_prompt_tokens INTEGER NOT NULL DEFAULT 0,
    total_completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_estimated_cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
    results JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_evaluation_runs_model_id ON public.model_evaluation_runs(model_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_created_at ON public.model_evaluation_runs(created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.ai_telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_breaker_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_evaluation_runs ENABLE ROW LEVEL SECURITY;

-- Telemetry Events: Users can view their own telemetry records
CREATE POLICY "Users can view own telemetry"
    ON public.ai_telemetry_events FOR SELECT
    USING (auth.uid() = user_id);

-- Telemetry Events: Org members can view their organization's telemetry records
CREATE POLICY "Org members can view org telemetry"
    ON public.ai_telemetry_events FOR SELECT
    USING (
        org_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.organisation_members
            WHERE organisation_members.org_id = ai_telemetry_events.org_id
              AND organisation_members.user_id = auth.uid()
        )
    );

-- Telemetry Events: Service role can insert telemetry
CREATE POLICY "Service role can insert telemetry"
    ON public.ai_telemetry_events FOR INSERT
    WITH CHECK (true);

-- Circuit Breaker States: Read-only for authenticated users
CREATE POLICY "Authenticated users can view circuit breaker states"
    ON public.circuit_breaker_states FOR SELECT
    TO authenticated
    USING (true);

-- Model Evaluation Runs: Read-only for authenticated users
CREATE POLICY "Authenticated users can view evaluation runs"
    ON public.model_evaluation_runs FOR SELECT
    TO authenticated
    USING (true);

-- Model Evaluation Runs: Authenticated users can insert evaluation runs
CREATE POLICY "Authenticated users can record evaluation runs"
    ON public.model_evaluation_runs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
