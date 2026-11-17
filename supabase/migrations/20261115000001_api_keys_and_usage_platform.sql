-- ==============================================================================
-- NEXORA PLATFORM: MIGRATION 20261115000001_api_keys_and_usage_platform.sql
-- Native API Key Generation, Management, Scopes, Rate Limiting & Usage Tracking
-- Hardened Security, Canonical User Identity, Dynamic FK Inspection & Idempotent Schema
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. API KEYS TABLE
-- Supports both Live (nx_live_...) and Test (nx_test_...) keys with cryptographically hashed secrets.
-- Uses TEXT for user_id to store canonical auth.uid() strings while preserving backward compatibility.
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    org_id TEXT,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    environment TEXT NOT NULL DEFAULT 'live' CHECK (environment IN ('live', 'test')),
    scopes JSONB NOT NULL DEFAULT '["models:read", "chat:write"]'::jsonb,
    rate_limit INTEGER NOT NULL DEFAULT 60,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

-- Ensure all required columns and constraints exist if table was previously created with older schema
DO $$ 
BEGIN
    -- Ensure environment column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name = 'environment') THEN
        ALTER TABLE public.api_keys ADD COLUMN environment TEXT NOT NULL DEFAULT 'live' CHECK (environment IN ('live', 'test'));
    END IF;

    -- Ensure rate_limit column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name = 'rate_limit') THEN
        ALTER TABLE public.api_keys ADD COLUMN rate_limit INTEGER NOT NULL DEFAULT 60;
    END IF;

    -- Ensure scopes column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name = 'scopes') THEN
        ALTER TABLE public.api_keys ADD COLUMN scopes JSONB NOT NULL DEFAULT '["models:read", "chat:write"]'::jsonb;
    END IF;

    -- Ensure org_id column exists and supports text workspace identifiers (e.g. 'ws-default')
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name = 'org_id') THEN
        ALTER TABLE public.api_keys ADD COLUMN org_id TEXT;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name = 'org_id' AND data_type = 'uuid') THEN
        ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_org_id_fkey;
        ALTER TABLE public.api_keys ALTER COLUMN org_id TYPE TEXT USING org_id::text;
    END IF;

    -- Ensure user_id column supports canonical text representation (UUID string or custom)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name = 'user_id' AND data_type = 'uuid') THEN
        ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_user_id_fkey;
        ALTER TABLE public.api_keys ALTER COLUMN user_id TYPE TEXT USING user_id::text;
    END IF;

    -- Ensure timestamps exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name = 'last_used_at') THEN
        ALTER TABLE public.api_keys ADD COLUMN last_used_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name = 'expires_at') THEN
        ALTER TABLE public.api_keys ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name = 'revoked_at') THEN
        ALTER TABLE public.api_keys ADD COLUMN revoked_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. API USAGE TABLE
-- Stores request metrics, token/unit counts, status, and provider telemetry.
-- Preserves usage history when a key is deleted via ON DELETE SET NULL (never silent deletion via CASCADE).
CREATE TABLE IF NOT EXISTS public.api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL,
    request_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    status INTEGER NOT NULL,
    usage_units INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure api_usage columns and foreign key behavior match the hardened specifications
DO $$ 
DECLARE
    r RECORD;
    has_fk BOOLEAN := FALSE;
BEGIN
    -- If api_usage already exists with NOT NULL api_key_id, relax it so SET NULL is allowed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'api_usage' AND column_name = 'api_key_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.api_usage ALTER COLUMN api_key_id DROP NOT NULL;
    END IF;

    -- Inspect EVERY existing foreign key on public.api_usage(api_key_id) without assuming constraint name
    FOR r IN (
        SELECT tc.constraint_name, rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.referential_constraints rc 
          ON tc.constraint_name = rc.constraint_name 
         AND tc.table_schema = rc.constraint_schema
        WHERE tc.table_schema = 'public' 
          AND tc.table_name = 'api_usage' 
          AND kcu.column_name = 'api_key_id'
          AND tc.constraint_type = 'FOREIGN KEY'
    ) LOOP
        has_fk := TRUE;
        -- If foreign key is not ON DELETE SET NULL, replace it safely
        IF r.delete_rule <> 'SET NULL' THEN
            EXECUTE format('ALTER TABLE public.api_usage DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
            EXECUTE 'ALTER TABLE public.api_usage ADD CONSTRAINT api_usage_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE SET NULL';
        END IF;
    END LOOP;

    -- If no foreign key exists at all on api_key_id, create it
    IF NOT has_fk THEN
        ALTER TABLE public.api_usage ADD CONSTRAINT api_usage_api_key_id_fkey 
            FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE SET NULL;
    END IF;

    -- Safely migrate legacy api_key_usage data to api_usage if older migration was applied
    -- Uses INNER JOIN on api_keys to guarantee usage records are accurately assigned to their true owner
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_key_usage') THEN
        INSERT INTO public.api_usage (id, api_key_id, user_id, request_id, endpoint, status, usage_units, created_at)
        SELECT 
            u.id, 
            u.key_id, 
            k.user_id, 
            'req_legacy_' || u.id::text, 
            u.endpoint, 
            u.status_code, 
            u.tokens_used, 
            u.created_at
        FROM public.api_key_usage u
        INNER JOIN public.api_keys k ON u.key_id = k.id
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 3. INDEXES FOR HIGH-PERFORMANCE VERIFICATION & AGGREGATIONS
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_env ON public.api_keys(environment);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(revoked_at, expires_at);

CREATE INDEX IF NOT EXISTS idx_api_usage_key ON public.api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON public.api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON public.api_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON public.api_usage(created_at DESC);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict user-isolation: Developers may only select, insert, update and delete their own keys.
-- Canonical identity: Uses auth.uid()::text exclusively (no unverified email claim manipulation).
-- Ownership protection: UPDATE policy includes WITH CHECK to prevent reassigning key ownership.
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- API Keys RLS Policies
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
CREATE POLICY "Users can view their own API keys"
    ON public.api_keys FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create their own API keys" ON public.api_keys;
CREATE POLICY "Users can create their own API keys"
    ON public.api_keys FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id);

-- Enforce WITH CHECK on UPDATE to strictly prevent users from reassigning key ownership
DROP POLICY IF EXISTS "Users can update/revoke their own API keys" ON public.api_keys;
CREATE POLICY "Users can update/revoke their own API keys"
    ON public.api_keys FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
CREATE POLICY "Users can delete their own API keys"
    ON public.api_keys FOR DELETE
    TO authenticated
    USING (auth.uid()::text = user_id);

-- API Usage RLS Policies
DROP POLICY IF EXISTS "Users can view their own API usage" ON public.api_usage;
CREATE POLICY "Users can view their own API usage"
    ON public.api_usage FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id);

-- Note: Server-side administrative operations using createAdminClient() run with the service_role key,
-- which bypasses RLS while enforcing programmatic multi-tenant isolation via .eq("user_id", userId).
