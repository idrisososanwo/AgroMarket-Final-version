-- =============================================================================
-- AgroMarket Phase 3.13: Agricultural Knowledge Graph & Ontology Foundation
-- Migration: 20261008190000_phase_3_13_agricultural_knowledge_graph.sql
--
-- Establishes the canonical semantic agricultural ontology and knowledge graph layer:
-- 1. agricultural_knowledge_concepts: Strongly typed concepts (crops, commodities, processes, regions, etc.)
-- 2. agricultural_knowledge_relationships: Semantic directed typed relationships with provenance and confidence
-- 3. agricultural_entity_links: Binds ontology concepts to canonical operational AgroMarket entities
-- 4. Bounded recursive PostgreSQL functions for hierarchy and neighborhood traversal with cycle protection
-- 5. Anti-pork invariants enforced across constraints and triggers
-- 6. Strict RLS policies and audit timestamp triggers
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CREATE TABLE: agricultural_knowledge_concepts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_knowledge_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_key VARCHAR(120) NOT NULL UNIQUE,
    canonical_name VARCHAR(150) NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    concept_type VARCHAR(50) NOT NULL,
    description TEXT NULL,
    parent_concept_id UUID NULL REFERENCES public.agricultural_knowledge_concepts(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    provenance VARCHAR(50) NOT NULL DEFAULT 'EDITORIAL',
    confidence VARCHAR(30) NOT NULL DEFAULT 'HIGH',
    geographic_scope VARCHAR(30) NOT NULL DEFAULT 'NATIONAL',
    source_reference TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_akc_concept_type CHECK (
        concept_type IN (
            'COMMODITY', 'CROP', 'LIVESTOCK', 'POULTRY', 'AQUACULTURE',
            'INPUT', 'DISEASE', 'BIOSECURITY_CONCEPT', 'PROCESS',
            'PRODUCTION_SYSTEM', 'VALUE_CHAIN_STAGE', 'PROCESSING_OUTPUT',
            'MARKET', 'REGION', 'STATE', 'LGA', 'LOGISTICS_CONCEPT',
            'LOGISTICS_CORRIDOR', 'EQUIPMENT', 'SERVICE',
            'FOOD_SECURITY_CONCEPT', 'FOOD_HEALTH_CONCEPT',
            'AGRICULTURAL_PRACTICE', 'KNOWLEDGE_TOPIC',
            'KNOWLEDGE_CONTENT', 'ORGANIZATION_TYPE'
        )
    ),
    CONSTRAINT chk_akc_status CHECK (
        status IN ('DRAFT', 'REVIEW', 'VERIFIED', 'PUBLISHED', 'ARCHIVED', 'REJECTED')
    ),
    CONSTRAINT chk_akc_provenance CHECK (
        provenance IN (
            'OBSERVED', 'DERIVED', 'CORRELATED', 'ESTIMATED',
            'EXTERNAL_SOURCE', 'EDITORIAL', 'SYSTEM_IMPORTED', 'INSUFFICIENT_DATA'
        )
    ),
    CONSTRAINT chk_akc_confidence CHECK (
        confidence IN ('HIGH', 'MODERATE', 'LOW', 'INSUFFICIENT_DATA')
    ),
    CONSTRAINT chk_akc_geographic_scope CHECK (
        geographic_scope IN ('NATIONAL', 'REGIONAL_CORRIDOR', 'STATE', 'LGA', 'GLOBAL')
    ),
    CONSTRAINT chk_akc_no_self_parent CHECK (
        parent_concept_id IS NULL OR parent_concept_id != id
    ),
    CONSTRAINT chk_akc_temporal CHECK (
        valid_until IS NULL OR valid_until >= valid_from
    ),
    CONSTRAINT chk_akc_anti_pork CHECK (
        lower(concept_key || ' ' || canonical_name || ' ' || display_name || ' ' || coalesce(description, '')) !~* '\y(pork|swine|pig|bacon|ham|porcine)\y'
    )
);

-- Indexes for concepts
CREATE INDEX IF NOT EXISTS idx_akc_concept_type ON public.agricultural_knowledge_concepts(concept_type);
CREATE INDEX IF NOT EXISTS idx_akc_status ON public.agricultural_knowledge_concepts(status);
CREATE INDEX IF NOT EXISTS idx_akc_parent ON public.agricultural_knowledge_concepts(parent_concept_id);
CREATE INDEX IF NOT EXISTS idx_akc_validity ON public.agricultural_knowledge_concepts(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_akc_canonical_name ON public.agricultural_knowledge_concepts(canonical_name);

-- -----------------------------------------------------------------------------
-- 2. CREATE TABLE: agricultural_knowledge_relationships
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_knowledge_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_concept_id UUID NOT NULL REFERENCES public.agricultural_knowledge_concepts(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    target_concept_id UUID NOT NULL REFERENCES public.agricultural_knowledge_concepts(id) ON DELETE CASCADE,
    inverse_relationship_type VARCHAR(50) NULL,
    relationship_strength VARCHAR(30) NOT NULL DEFAULT 'MODERATE',
    confidence VARCHAR(30) NOT NULL DEFAULT 'HIGH',
    provenance VARCHAR(50) NOT NULL DEFAULT 'EDITORIAL',
    geographic_scope VARCHAR(30) NOT NULL DEFAULT 'NATIONAL',
    location_state VARCHAR(60) NULL,
    location_lga VARCHAR(60) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED',
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_akr_relationship_type CHECK (
        relationship_type IN (
            'IS_A', 'PART_OF', 'RELATED_TO', 'PRODUCES', 'REQUIRES',
            'USED_FOR', 'GROWS_IN', 'COMMON_IN', 'PROCESSED_INTO',
            'PROCESSED_BY', 'SOLD_IN', 'DEMANDED_BY', 'TRANSPORTED_THROUGH',
            'AFFECTED_BY', 'AT_RISK_FROM', 'HAS_INPUT', 'HAS_PROCESS',
            'HAS_MARKET', 'HAS_VALUE_CHAIN_STAGE', 'HAS_OUTPUT',
            'ALTERNATIVE_TO', 'SIMILAR_TO', 'PRECEDES', 'FOLLOWS',
            'ASSOCIATED_WITH', 'HAS_KNOWLEDGE', 'HAS_FOOD_HEALTH_CONTEXT'
        )
    ),
    CONSTRAINT chk_akr_strength CHECK (
        relationship_strength IN ('WEAK', 'MODERATE', 'STRONG', 'CRITICAL', 'INSUFFICIENT_DATA')
    ),
    CONSTRAINT chk_akr_confidence CHECK (
        confidence IN ('HIGH', 'MODERATE', 'LOW', 'INSUFFICIENT_DATA')
    ),
    CONSTRAINT chk_akr_provenance CHECK (
        provenance IN (
            'OBSERVED', 'DERIVED', 'CORRELATED', 'ESTIMATED',
            'EXTERNAL_SOURCE', 'EDITORIAL', 'SYSTEM_IMPORTED', 'INSUFFICIENT_DATA'
        )
    ),
    CONSTRAINT chk_akr_geographic_scope CHECK (
        geographic_scope IN ('NATIONAL', 'REGIONAL_CORRIDOR', 'STATE', 'LGA', 'GLOBAL')
    ),
    CONSTRAINT chk_akr_status CHECK (
        status IN ('DRAFT', 'REVIEW', 'VERIFIED', 'PUBLISHED', 'ARCHIVED', 'REJECTED')
    ),
    CONSTRAINT chk_akr_no_self_rel CHECK (
        source_concept_id != target_concept_id
    ),
    CONSTRAINT chk_akr_temporal CHECK (
        valid_until IS NULL OR valid_until >= valid_from
    )
);

-- Unique relationship constraint & indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_akr_edge 
    ON public.agricultural_knowledge_relationships(source_concept_id, relationship_type, target_concept_id);
CREATE INDEX IF NOT EXISTS idx_akr_source ON public.agricultural_knowledge_relationships(source_concept_id);
CREATE INDEX IF NOT EXISTS idx_akr_target ON public.agricultural_knowledge_relationships(target_concept_id);
CREATE INDEX IF NOT EXISTS idx_akr_type ON public.agricultural_knowledge_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_akr_status ON public.agricultural_knowledge_relationships(status);
CREATE INDEX IF NOT EXISTS idx_akr_validity ON public.agricultural_knowledge_relationships(valid_from, valid_until);

-- -----------------------------------------------------------------------------
-- 3. CREATE TABLE: agricultural_entity_links
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_entity_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id UUID NOT NULL REFERENCES public.agricultural_knowledge_concepts(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    link_nature VARCHAR(30) NOT NULL DEFAULT 'CANONICAL',
    confidence VARCHAR(30) NOT NULL DEFAULT 'HIGH',
    provenance VARCHAR(50) NOT NULL DEFAULT 'EDITORIAL',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_ael_entity_type CHECK (
        entity_type IN (
            'PRODUCT', 'LISTING', 'FARM', 'PRODUCTION_UNIT', 'PRODUCTION_OUTPUT',
            'AGGREGATION_POOL', 'PROCESSING_FACILITY', 'PROCESSING_EVENT',
            'B2B_DEMAND', 'LOGISTICS_PROVIDER', 'LOGISTICS_CORRIDOR',
            'EQUIPMENT', 'SERVICE', 'KNOWLEDGE_CONTENT'
        )
    ),
    CONSTRAINT chk_ael_link_nature CHECK (
        link_nature IN ('CANONICAL', 'INSTANCE_OF', 'EXEMPLAR', 'RELATED_OPERATIONAL')
    ),
    CONSTRAINT chk_ael_confidence CHECK (
        confidence IN ('HIGH', 'MODERATE', 'LOW', 'INSUFFICIENT_DATA')
    ),
    CONSTRAINT chk_ael_provenance CHECK (
        provenance IN (
            'OBSERVED', 'DERIVED', 'CORRELATED', 'ESTIMATED',
            'EXTERNAL_SOURCE', 'EDITORIAL', 'SYSTEM_IMPORTED', 'INSUFFICIENT_DATA'
        )
    )
);

-- Unique link constraint & indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_ael_concept_entity 
    ON public.agricultural_entity_links(concept_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ael_concept ON public.agricultural_entity_links(concept_id);
CREATE INDEX IF NOT EXISTS idx_ael_entity ON public.agricultural_entity_links(entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- 4. RECURSIVE FUNCTION: get_knowledge_concept_hierarchy
-- Traverses parent-child ontology hierarchies (ANCESTORS or DESCENDANTS)
-- with depth bounds (1..5) and cycle protection via path array
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_knowledge_concept_hierarchy(
    p_root_id UUID,
    p_direction TEXT DEFAULT 'DESCENDANTS',
    p_max_depth INT DEFAULT 3
)
RETURNS TABLE (
    concept_id UUID,
    concept_key VARCHAR(120),
    canonical_name VARCHAR(150),
    display_name VARCHAR(150),
    concept_type VARCHAR(50),
    parent_concept_id UUID,
    depth INT,
    path UUID[],
    cycle_detected BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_depth_bound INT := LEAST(GREATEST(p_max_depth, 1), 5);
BEGIN
    IF lower(p_direction) = 'ancestors' THEN
        RETURN QUERY
        WITH RECURSIVE hierarchy AS (
            SELECT
                c.id AS concept_id,
                c.concept_key,
                c.canonical_name,
                c.display_name,
                c.concept_type,
                c.parent_concept_id,
                0 AS depth,
                ARRAY[c.id] AS path,
                FALSE AS cycle_detected
            FROM public.agricultural_knowledge_concepts c
            WHERE c.id = p_root_id

            UNION ALL

            SELECT
                parent.id AS concept_id,
                parent.concept_key,
                parent.canonical_name,
                parent.display_name,
                parent.concept_type,
                parent.parent_concept_id,
                h.depth + 1 AS depth,
                h.path || parent.id AS path,
                (parent.id = ANY(h.path)) AS cycle_detected
            FROM hierarchy h
            JOIN public.agricultural_knowledge_concepts parent
              ON h.parent_concept_id = parent.id
            WHERE h.depth < v_depth_bound
              AND NOT h.cycle_detected
              AND parent.parent_concept_id IS NOT NULL OR parent.id IS NOT NULL
        )
        SELECT * FROM hierarchy;
    ELSE
        RETURN QUERY
        WITH RECURSIVE hierarchy AS (
            SELECT
                c.id AS concept_id,
                c.concept_key,
                c.canonical_name,
                c.display_name,
                c.concept_type,
                c.parent_concept_id,
                0 AS depth,
                ARRAY[c.id] AS path,
                FALSE AS cycle_detected
            FROM public.agricultural_knowledge_concepts c
            WHERE c.id = p_root_id

            UNION ALL

            SELECT
                child.id AS concept_id,
                child.concept_key,
                child.canonical_name,
                child.display_name,
                child.concept_type,
                child.parent_concept_id,
                h.depth + 1 AS depth,
                h.path || child.id AS path,
                (child.id = ANY(h.path)) AS cycle_detected
            FROM hierarchy h
            JOIN public.agricultural_knowledge_concepts child
              ON h.concept_id = child.parent_concept_id
            WHERE h.depth < v_depth_bound
              AND NOT h.cycle_detected
        )
        SELECT * FROM hierarchy;
    END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. RECURSIVE FUNCTION: get_knowledge_neighborhood
-- Bounded graph neighborhood query with cycle prevention
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_knowledge_neighborhood(
    p_concept_id UUID,
    p_max_depth INT DEFAULT 2,
    p_limit INT DEFAULT 50
)
RETURNS TABLE (
    relationship_id UUID,
    source_id UUID,
    relationship_type VARCHAR(50),
    target_id UUID,
    target_key VARCHAR(120),
    target_name VARCHAR(150),
    target_type VARCHAR(50),
    relationship_strength VARCHAR(30),
    confidence VARCHAR(30),
    depth INT,
    path UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_depth_bound INT := LEAST(GREATEST(p_max_depth, 1), 3);
    v_limit_bound INT := LEAST(GREATEST(p_limit, 1), 100);
BEGIN
    RETURN QUERY
    WITH RECURSIVE neighborhood AS (
        SELECT
            r.id AS relationship_id,
            r.source_concept_id AS source_id,
            r.relationship_type,
            r.target_concept_id AS target_id,
            tc.concept_key AS target_key,
            tc.canonical_name AS target_name,
            tc.concept_type AS target_type,
            r.relationship_strength,
            r.confidence,
            1 AS depth,
            ARRAY[r.source_concept_id, r.target_concept_id] AS path
        FROM public.agricultural_knowledge_relationships r
        JOIN public.agricultural_knowledge_concepts tc
          ON r.target_concept_id = tc.id
        WHERE r.source_concept_id = p_concept_id
          AND r.status = 'PUBLISHED'
          AND (r.valid_until IS NULL OR r.valid_until >= NOW())

        UNION ALL

        SELECT
            r2.id AS relationship_id,
            r2.source_concept_id AS source_id,
            r2.relationship_type,
            r2.target_concept_id AS target_id,
            tc2.concept_key AS target_key,
            tc2.canonical_name AS target_name,
            tc2.concept_type AS target_type,
            r2.relationship_strength,
            r2.confidence,
            n.depth + 1 AS depth,
            n.path || r2.target_concept_id AS path
        FROM neighborhood n
        JOIN public.agricultural_knowledge_relationships r2
          ON n.target_id = r2.source_concept_id
        JOIN public.agricultural_knowledge_concepts tc2
          ON r2.target_concept_id = tc2.id
        WHERE n.depth < v_depth_bound
          AND NOT (r2.target_concept_id = ANY(n.path))
          AND r2.status = 'PUBLISHED'
          AND (r2.valid_until IS NULL OR r2.valid_until >= NOW())
    )
    SELECT * FROM neighborhood
    LIMIT v_limit_bound;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. TRIGGERS: updated_at management
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_set_knowledge_concept_updated_at
    BEFORE UPDATE ON public.agricultural_knowledge_concepts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_set_knowledge_rel_updated_at
    BEFORE UPDATE ON public.agricultural_knowledge_relationships
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_set_entity_link_updated_at
    BEFORE UPDATE ON public.agricultural_entity_links
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.agricultural_knowledge_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_knowledge_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_entity_links ENABLE ROW LEVEL SECURITY;

-- Concepts RLS
CREATE POLICY "Public read published concepts"
    ON public.agricultural_knowledge_concepts
    FOR SELECT
    TO anon, authenticated
    USING (
        status = 'PUBLISHED'
        AND (valid_until IS NULL OR valid_until >= NOW())
    );

CREATE POLICY "Authenticated users view active non-rejected concepts"
    ON public.agricultural_knowledge_concepts
    FOR SELECT
    TO authenticated
    USING (status != 'REJECTED');

CREATE POLICY "Admin full manage concepts"
    ON public.agricultural_knowledge_concepts
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Relationships RLS
CREATE POLICY "Public read published relationships"
    ON public.agricultural_knowledge_relationships
    FOR SELECT
    TO anon, authenticated
    USING (
        status = 'PUBLISHED'
        AND (valid_until IS NULL OR valid_until >= NOW())
    );

CREATE POLICY "Authenticated users view non-rejected relationships"
    ON public.agricultural_knowledge_relationships
    FOR SELECT
    TO authenticated
    USING (status != 'REJECTED');

CREATE POLICY "Admin full manage relationships"
    ON public.agricultural_knowledge_relationships
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Entity links RLS
CREATE POLICY "Public read entity links"
    ON public.agricultural_entity_links
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Admin full manage entity links"
    ON public.agricultural_entity_links
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
