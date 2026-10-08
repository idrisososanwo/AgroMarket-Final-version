-- =============================================================================
-- AgroMarket Phase 3.14: Agricultural Semantic Search & Retrieval Foundation
-- Migration: 20261008210000_phase_3_14_agricultural_semantic_search.sql
--
-- Establishes the canonical search document projection, embedding metadata,
-- and search audit indexing infrastructure:
-- 1. agricultural_search_documents: Canonical searchable documents referenced to source entities
-- 2. agricultural_search_embeddings: Pluggable embedding vectors and provider metadata
-- 3. agricultural_search_index_events: Idempotent indexing audit history
-- 4. Anti-pork invariants enforced across constraints and triggers
-- 5. Strict RLS policies and audit timestamp triggers
-- =============================================================================

-- Try enabling pgvector if available on the PostgreSQL cluster
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension not installed or permission denied, using structured vector projection fallback';
END
$$;

-- -----------------------------------------------------------------------------
-- 1. CREATE TABLE: agricultural_search_documents
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_search_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_key VARCHAR(150) NOT NULL UNIQUE,
    source_type VARCHAR(50) NOT NULL,
    source_entity_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    searchable_text TEXT NOT NULL,
    normalized_text TEXT NOT NULL,
    concept_ids UUID[] NOT NULL DEFAULT '{}',
    commodity_terms TEXT[] NOT NULL DEFAULT '{}',
    geographic_scope VARCHAR(30) NOT NULL DEFAULT 'NATIONAL',
    location_state VARCHAR(60) NULL,
    location_lga VARCHAR(60) NULL,
    source_provenance VARCHAR(50) NOT NULL DEFAULT 'EDITORIAL',
    confidence VARCHAR(30) NOT NULL DEFAULT 'HIGH',
    visibility_status VARCHAR(30) NOT NULL DEFAULT 'PUBLIC',
    publication_status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED',
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_asd_source_type CHECK (
        source_type IN (
            'KNOWLEDGE_CONTENT', 'KNOWLEDGE_CONCEPT', 'KNOWLEDGE_RELATIONSHIP',
            'PRODUCT', 'CATEGORY', 'PRODUCTION_CONTEXT', 'MARKET_CONTEXT',
            'FOOD_SECURITY_CONTEXT', 'DISEASE_BIOSECURITY_CONTEXT',
            'LOGISTICS_CONTEXT', 'PROCESSING_CONTEXT', 'AGRICULTURAL_PRACTICE'
        )
    ),
    CONSTRAINT chk_asd_visibility CHECK (
        visibility_status IN ('PUBLIC', 'AUTHENTICATED', 'ADMIN_ONLY', 'RESTRICTED')
    ),
    CONSTRAINT chk_asd_publication CHECK (
        publication_status IN ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED')
    ),
    CONSTRAINT chk_asd_provenance CHECK (
        source_provenance IN (
            'OBSERVED', 'DERIVED', 'CORRELATED', 'ESTIMATED',
            'EXTERNAL_SOURCE', 'EDITORIAL', 'SYSTEM_IMPORTED', 'INSUFFICIENT_DATA'
        )
    ),
    CONSTRAINT chk_asd_confidence CHECK (
        confidence IN ('HIGH', 'MODERATE', 'LOW', 'INSUFFICIENT_DATA')
    ),
    CONSTRAINT chk_asd_scope CHECK (
        geographic_scope IN ('NATIONAL', 'REGIONAL_CORRIDOR', 'STATE', 'LGA', 'GLOBAL')
    ),
    CONSTRAINT chk_asd_temporal CHECK (
        valid_until IS NULL OR valid_until >= valid_from
    ),
    CONSTRAINT chk_asd_anti_pork CHECK (
        lower(title || ' ' || searchable_text) !~* '\y(pork|swine|pig|bacon|ham|porcine)\y'
    )
);

-- Indexes for search documents
CREATE UNIQUE INDEX IF NOT EXISTS uq_asd_source 
    ON public.agricultural_search_documents(source_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_asd_source_type 
    ON public.agricultural_search_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_asd_visibility 
    ON public.agricultural_search_documents(visibility_status, publication_status);
CREATE INDEX IF NOT EXISTS idx_asd_state 
    ON public.agricultural_search_documents(location_state);
CREATE INDEX IF NOT EXISTS idx_asd_validity 
    ON public.agricultural_search_documents(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_asd_provenance 
    ON public.agricultural_search_documents(source_provenance);

-- Full-text search index on title and searchable_text
CREATE INDEX IF NOT EXISTS idx_asd_fts 
    ON public.agricultural_search_documents 
    USING gin(to_tsvector('english', title || ' ' || searchable_text));

-- -----------------------------------------------------------------------------
-- 2. CREATE TABLE: agricultural_search_embeddings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_search_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.agricultural_search_documents(id) ON DELETE CASCADE,
    embedding_provider VARCHAR(50) NOT NULL,
    embedding_model VARCHAR(100) NOT NULL,
    embedding_version VARCHAR(50) NOT NULL DEFAULT '1.0',
    dimensions INT NOT NULL,
    embedding_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    embedding_error TEXT NULL,
    embedding_vector JSONB NULL,
    embedded_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_ase_status CHECK (
        embedding_status IN ('PENDING', 'COMPLETED', 'FAILED', 'UNAVAILABLE')
    ),
    CONSTRAINT chk_ase_dimensions CHECK (
        dimensions > 0 AND dimensions <= 4096
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ase_doc_provider 
    ON public.agricultural_search_embeddings(document_id, embedding_provider, embedding_model);
CREATE INDEX IF NOT EXISTS idx_ase_doc_id 
    ON public.agricultural_search_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_ase_status 
    ON public.agricultural_search_embeddings(embedding_status);

-- -----------------------------------------------------------------------------
-- 3. CREATE TABLE: agricultural_search_index_events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_search_index_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    document_id UUID NULL REFERENCES public.agricultural_search_documents(id) ON DELETE SET NULL,
    source_type VARCHAR(50) NOT NULL,
    source_entity_id VARCHAR(100) NOT NULL,
    triggered_by_user_id UUID NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS',
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_asie_status CHECK (
        status IN ('SUCCESS', 'FAILED', 'SKIPPED')
    )
);

CREATE INDEX IF NOT EXISTS idx_asie_source 
    ON public.agricultural_search_index_events(source_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_asie_created_at 
    ON public.agricultural_search_index_events(created_at);

-- -----------------------------------------------------------------------------
-- 4. TRIGGERS: updated_at management
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_set_search_doc_updated_at
    BEFORE UPDATE ON public.agricultural_search_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_set_search_embed_updated_at
    BEFORE UPDATE ON public.agricultural_search_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.agricultural_search_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_search_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_search_index_events ENABLE ROW LEVEL SECURITY;

-- Search Documents RLS
CREATE POLICY "Public read published public search documents"
    ON public.agricultural_search_documents
    FOR SELECT
    TO anon, authenticated
    USING (
        visibility_status = 'PUBLIC'
        AND publication_status = 'PUBLISHED'
        AND (valid_until IS NULL OR valid_until >= NOW())
    );

CREATE POLICY "Authenticated users view authenticated search documents"
    ON public.agricultural_search_documents
    FOR SELECT
    TO authenticated
    USING (
        visibility_status IN ('PUBLIC', 'AUTHENTICATED')
        AND publication_status = 'PUBLISHED'
        AND (valid_until IS NULL OR valid_until >= NOW())
    );

CREATE POLICY "Admin full manage search documents"
    ON public.agricultural_search_documents
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Search Embeddings RLS
CREATE POLICY "Read search embeddings"
    ON public.agricultural_search_embeddings
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Admin full manage search embeddings"
    ON public.agricultural_search_embeddings
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Index Events RLS
CREATE POLICY "Admin view search index events"
    ON public.agricultural_search_index_events
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admin insert search index events"
    ON public.agricultural_search_index_events
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());
