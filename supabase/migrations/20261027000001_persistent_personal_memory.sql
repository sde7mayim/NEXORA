-- 20261027000001_persistent_personal_memory.sql
-- Persistent Personal Memory, Knowledge Accumulation & Revisions Schema

CREATE TABLE IF NOT EXISTS public.user_memories (
  id TEXT PRIMARY KEY DEFAULT ('mem_' || gen_random_uuid()),
  user_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'skills_experience',
    'career_goals',
    'projects',
    'preferences',
    'language_style',
    'user_instructions'
  )),
  key TEXT NOT NULL,
  structured_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('conversation', 'file', 'explicit_correction', 'manual')),
  source_reference TEXT,
  confidence TEXT NOT NULL DEFAULT 'confirmed' CHECK (confidence IN ('confirmed', 'inferred')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_memories_user_cat ON public.user_memories(user_id, category, status);
CREATE INDEX IF NOT EXISTS idx_user_memories_key ON public.user_memories(user_id, key);

-- Memory Revisions / Provenance Log
CREATE TABLE IF NOT EXISTS public.memory_revisions (
  id TEXT PRIMARY KEY DEFAULT ('rev_' || gen_random_uuid()),
  memory_id TEXT NOT NULL REFERENCES public.user_memories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB NOT NULL,
  change_reason TEXT NOT NULL,
  source_reference TEXT,
  approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_revisions_memory ON public.memory_revisions(memory_id);

-- User Memory Preferences
CREATE TABLE IF NOT EXISTS public.user_memory_preferences (
  user_id TEXT PRIMARY KEY,
  memory_enabled BOOLEAN NOT NULL DEFAULT true,
  require_confirmation BOOLEAN NOT NULL DEFAULT false,
  retention_days INTEGER,
  allowed_categories TEXT[] NOT NULL DEFAULT ARRAY[
    'skills_experience',
    'career_goals',
    'projects',
    'preferences',
    'language_style',
    'user_instructions'
  ],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security (RLS)
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memory_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own memories"
  ON public.user_memories
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claim.sub', true))
  WITH CHECK (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claim.sub', true));

CREATE POLICY "Users can view their own memory revisions"
  ON public.memory_revisions
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claim.sub', true))
  WITH CHECK (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claim.sub', true));

CREATE POLICY "Users can manage their memory preferences"
  ON public.user_memory_preferences
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claim.sub', true))
  WITH CHECK (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claim.sub', true));
