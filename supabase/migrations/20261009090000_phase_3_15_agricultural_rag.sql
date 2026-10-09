-- ==============================================================================
-- AGROMARKET PHASE 3.15: EVIDENCE-GROUNDED AGRICULTURAL INTELLIGENCE & RAG
-- Schema for RAG Queries, Evidence Grounding Audits, and Citation Validation
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.agricultural_rag_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  question_category VARCHAR(50) NOT NULL CHECK (
    question_category IN (
      'CROP_PRODUCTION',
      'MARKET_OBSERVATION',
      'SUPPLY_CHAIN_RELATIONSHIP',
      'REGIONAL_FOOD_SECURITY',
      'LOGISTICS_CONSTRAINT',
      'DISEASE_BIOSECURITY',
      'AGRICULTURAL_PROCESSING',
      'HISTORICAL_COMPARISON',
      'RECOMMENDATION_EXPLANATION',
      'GENERAL_AGRONOMIC'
    )
  ),
  retrieval_mode VARCHAR(50) NOT NULL CHECK (
    retrieval_mode IN ('LEXICAL', 'ONTOLOGY_EXPANDED', 'HYBRID', 'SEMANTIC')
  ),
  generation_mode VARCHAR(50) NOT NULL CHECK (
    generation_mode IN ('EVIDENCE_GROUNDED_SYNTHESIS', 'EVIDENCE_ONLY_FALLBACK')
  ),
  evidence_count INT NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  provider VARCHAR(50) NOT NULL DEFAULT 'NONE',
  model VARCHAR(100) NOT NULL DEFAULT 'none',
  citation_count INT NOT NULL DEFAULT 0 CHECK (citation_count >= 0),
  has_conflicts BOOLEAN NOT NULL DEFAULT false,
  needs_professional_review BOOLEAN NOT NULL DEFAULT false,
  insufficient_evidence BOOLEAN NOT NULL DEFAULT false,
  confidence VARCHAR(20) NOT NULL CHECK (
    confidence IN ('HIGH', 'MODERATE', 'LOW', 'INSUFFICIENT_DATA')
  ),
  status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED' CHECK (
    status IN ('COMPLETED', 'FAILED', 'REJECTED_SAFETY', 'INSUFFICIENT_EVIDENCE')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Policy Check Constraint
  CONSTRAINT chk_no_pork_rag_queries CHECK (
    question_text !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

-- Indexes for audit, performance, and monitoring
CREATE INDEX IF NOT EXISTS idx_rag_queries_user ON public.agricultural_rag_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_queries_category ON public.agricultural_rag_queries(question_category);
CREATE INDEX IF NOT EXISTS idx_rag_queries_mode ON public.agricultural_rag_queries(generation_mode);
CREATE INDEX IF NOT EXISTS idx_rag_queries_status ON public.agricultural_rag_queries(status);
CREATE INDEX IF NOT EXISTS idx_rag_queries_confidence ON public.agricultural_rag_queries(confidence);
CREATE INDEX IF NOT EXISTS idx_rag_queries_created ON public.agricultural_rag_queries(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.agricultural_rag_queries ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own queries; admins can view all
CREATE POLICY select_own_rag_queries ON public.agricultural_rag_queries
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_code IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- RLS Policy: Authenticated users can insert their own queries; anon can insert null user_id
CREATE POLICY insert_rag_queries ON public.agricultural_rag_queries
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL OR auth.uid() = user_id
  );

-- Grants
GRANT SELECT, INSERT ON TABLE public.agricultural_rag_queries TO anon, authenticated;
