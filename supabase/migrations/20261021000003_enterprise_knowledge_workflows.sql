-- ==============================================================================
-- NEXORA PLATFORM: MIGRATION 20261021000003_enterprise_knowledge_workflows.sql
-- Workspaces, Knowledge Hub, AI Workflows, Developer Platform & SSO Governance
-- ==============================================================================

-- 1. CONVERSATION SHARING & WORKSPACE EXTENSIONS
CREATE TABLE IF NOT EXISTS public.conversation_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    shared_with_org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'comment', 'edit')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(conversation_id, shared_with_user_id, shared_with_org_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_shares_conversation ON public.conversation_shares(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_shares_user ON public.conversation_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_conv_shares_org ON public.conversation_shares(shared_with_org_id);

-- 2. KNOWLEDGE HUB: COLLECTIONS, DOCUMENTS, CHUNKS
CREATE TABLE IF NOT EXISTS public.knowledge_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_workspace_shared BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES public.knowledge_collections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('file', 'url', 'text')),
    source_uri TEXT,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'indexed' CHECK (status IN ('pending', 'processing', 'indexed', 'failed')),
    chunk_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    section_title TEXT,
    page_number INTEGER,
    token_count INTEGER NOT NULL DEFAULT 0,
    embedding JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc ON public.knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_collections_user_org ON public.knowledge_collections(user_id, org_id);

-- 3. AI WORKFLOWS & AGENTS
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'disabled', 'archived')),
    version INTEGER NOT NULL DEFAULT 1,
    definition JSONB NOT NULL DEFAULT '{"steps":[]}'::jsonb,
    tool_allowlist JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.workflow_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'paused_approval', 'cancelled')),
    current_step_id TEXT,
    input_data JSONB DEFAULT '{}'::jsonb,
    output_data JSONB DEFAULT '{}'::jsonb,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.workflow_step_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    step_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'awaiting_approval', 'skipped')),
    input_payload JSONB,
    output_payload JSONB,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON public.workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_runs_run ON public.workflow_step_runs(run_id);

-- 4. DEVELOPER PLATFORM & API KEYS
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    scopes JSONB NOT NULL DEFAULT '["models:read", "chat:write"]'::jsonb,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.api_key_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON public.api_key_usage(key_id);

-- 5. ENTERPRISE GOVERNANCE, AUDIT LOGGING & SSO
CREATE TABLE IF NOT EXISTS public.workspace_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_email TEXT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.sso_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE UNIQUE,
    protocol TEXT NOT NULL DEFAULT 'saml' CHECK (protocol IN ('saml', 'oidc')),
    idp_issuer TEXT NOT NULL,
    sso_login_url TEXT NOT NULL,
    certificate_pem TEXT,
    client_id TEXT,
    client_secret_encrypted TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_workspace_audit_org_created ON public.workspace_audit_logs(org_id, created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.conversation_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_configurations ENABLE ROW LEVEL SECURITY;

-- Knowledge Collections: User owns or is in the organization
CREATE POLICY "Users view own or shared collections"
    ON public.knowledge_collections FOR SELECT
    USING (
        auth.uid() = user_id OR
        (org_id IS NOT NULL AND is_workspace_shared = true AND EXISTS (
            SELECT 1 FROM public.organisation_members
            WHERE organisation_members.org_id = knowledge_collections.org_id
              AND organisation_members.user_id = auth.uid()
        ))
    );

-- Workflows: User owns or is in the organization
CREATE POLICY "Users view own or workspace workflows"
    ON public.workflows FOR SELECT
    USING (
        auth.uid() = user_id OR
        (org_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.organisation_members
            WHERE organisation_members.org_id = workflows.org_id
              AND organisation_members.user_id = auth.uid()
        ))
    );

-- API Keys: User owns keys or is an admin of the workspace
CREATE POLICY "Users manage own API keys"
    ON public.api_keys FOR ALL
    USING (auth.uid() = user_id);

-- Audit Logs: Org owners and admins can view audit logs
CREATE POLICY "Admins view org audit logs"
    ON public.workspace_audit_logs FOR SELECT
    USING (
        org_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.organisation_members
            WHERE organisation_members.org_id = workspace_audit_logs.org_id
              AND organisation_members.user_id = auth.uid()
              AND organisation_members.role IN ('owner', 'admin')
        )
    );
