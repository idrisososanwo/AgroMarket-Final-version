-- ==============================================================================
-- AGROMARKET PHASE 1.4: KNOWLEDGE & AGRICULTURAL INFORMATION
-- Schema, RLS, Indexes, and Safe Author Profile Views for:
-- 1. Agricultural News
-- 2. Expert Advice
-- 3. Government Updates
-- 4. Agricultural Training
-- 5. Agricultural Events
-- 6. Food & Health Information
-- ==============================================================================

-- 1. Create knowledge_articles table
CREATE TABLE IF NOT EXISTS public.knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(30) NOT NULL CHECK (content_type IN ('NEWS', 'EXPERT_ADVICE', 'GOVERNMENT_UPDATE', 'TRAINING', 'EVENT', 'FOOD_HEALTH')),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  excerpt TEXT,
  body TEXT NOT NULL,
  cover_image_url TEXT,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source_name VARCHAR(150),
  source_url TEXT,
  source_type VARCHAR(50) CHECK (source_type IS NULL OR source_type IN ('GOVERNMENT_AGENCY', 'RESEARCH_INSTITUTE', 'EXTENSION_SERVICE', 'EXPERT_PANEL', 'ACADEMIC', 'INDUSTRY', 'INTERNAL')),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  state VARCHAR(50),
  lga VARCHAR(50),
  tags TEXT[] NOT NULL DEFAULT '{}',
  topic VARCHAR(100),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  -- Training & Events metadata
  event_start_date TIMESTAMPTZ,
  event_end_date TIMESTAMPTZ,
  venue TEXT,
  is_online BOOLEAN NOT NULL DEFAULT false,
  organizer VARCHAR(150),
  registration_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger for updated_at
CREATE TRIGGER set_knowledge_articles_updated_at
  BEFORE UPDATE ON public.knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Indexes for discovery, filtering, and full-text search
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_slug ON public.knowledge_articles(slug);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_status_published ON public.knowledge_articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_content_type ON public.knowledge_articles(content_type, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_topic ON public.knowledge_articles(topic, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_state ON public.knowledge_articles(state, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_author_id ON public.knowledge_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_event_dates ON public.knowledge_articles(event_start_date);

-- 3. Row Level Security (RLS)
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

-- Anonymous and authenticated users can only view PUBLISHED articles,
-- or their own drafts if author, or all if admin.
CREATE POLICY "Public users can view published knowledge articles"
  ON public.knowledge_articles
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'PUBLISHED'
    OR public.is_admin()
    OR (auth.uid() IS NOT NULL AND auth.uid() = author_id)
  );

-- Admins have full access to insert, update, delete
CREATE POLICY "Admins can manage all knowledge articles"
  ON public.knowledge_articles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Experts can create knowledge drafts authored by themselves
CREATE POLICY "Experts can create knowledge articles"
  ON public.knowledge_articles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role_code IN ('EXPERT', 'ADMIN')
      )
    )
  );

-- Experts can update their own drafts
CREATE POLICY "Experts can update own knowledge drafts"
  ON public.knowledge_articles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = author_id
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role_code IN ('EXPERT', 'ADMIN')
      )
    )
  )
  WITH CHECK (
    auth.uid() = author_id
  );

-- 4. Table grants
GRANT SELECT ON TABLE public.knowledge_articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.knowledge_articles TO authenticated;

-- 5. Safe Public Author Profile View (Security Barrier)
-- Exposes strictly non-PII fields: id, full_name, avatar_url, is_verified, state, lga.
-- Strictly excludes phone, email, and location_address.
CREATE OR REPLACE VIEW public.knowledge_author_profiles
WITH (security_barrier = true) AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.is_verified,
  p.state,
  p.lga
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.knowledge_articles k
  WHERE k.author_id = p.id
    AND k.status = 'PUBLISHED'
);

GRANT SELECT ON public.knowledge_author_profiles TO anon, authenticated;
