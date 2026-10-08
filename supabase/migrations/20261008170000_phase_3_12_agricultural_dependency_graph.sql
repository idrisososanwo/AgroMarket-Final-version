-- =============================================================================
-- AgroMarket Phase 3.12: Agricultural Dependency Graph & Network Intelligence
-- Migration: 20261008170000_phase_3_12_agricultural_dependency_graph.sql
--
-- Introduces a strongly-typed agricultural dependency graph layer:
-- 1. agricultural_dependency_relationships: Directed, typed edges between canonical entities
-- 2. agricultural_dependency_assessments: Concentration, bottleneck, and cascade assessments
-- 3. Bounded recursive graph traversal function with cycle detection
-- 4. Anti-pork invariants enforced across constraints and triggers
-- 5. Row-level security for administrative and authenticated read/write
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CREATE TABLE: agricultural_dependency_relationships
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_dependency_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_node_type TEXT NOT NULL,
    source_node_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    target_node_type TEXT NOT NULL,
    target_node_id TEXT NOT NULL,
    relationship_nature TEXT NOT NULL DEFAULT 'DEPENDENCY',
    dependency_strength TEXT NOT NULL DEFAULT 'INSUFFICIENT_DATA',
    confidence TEXT NOT NULL DEFAULT 'MODERATE',
    provenance TEXT NOT NULL DEFAULT 'DERIVED',
    commodity TEXT NULL,
    geographic_scope TEXT NOT NULL DEFAULT 'STATE',
    location_state TEXT NULL,
    location_lga TEXT NULL,
    flow_share NUMERIC(5, 2) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_dep_rel_nature CHECK (
        relationship_nature IN ('DEPENDENCY', 'ASSOCIATION')
    ),
    CONSTRAINT chk_dep_rel_strength CHECK (
        dependency_strength IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'INSUFFICIENT_DATA')
    ),
    CONSTRAINT chk_dep_rel_confidence CHECK (
        confidence IN ('HIGH', 'MODERATE', 'LOW', 'INSUFFICIENT_DATA')
    ),
    CONSTRAINT chk_dep_rel_provenance CHECK (
        provenance IN ('OBSERVED', 'DERIVED', 'CORRELATED', 'ESTIMATED', 'EXTERNAL_SOURCE', 'INSUFFICIENT_DATA')
    ),
    CONSTRAINT chk_dep_rel_scope CHECK (
        geographic_scope IN ('NATIONAL', 'REGIONAL_CORRIDOR', 'STATE', 'LGA')
    ),
    CONSTRAINT chk_dep_rel_flow_share CHECK (
        flow_share IS NULL OR (flow_share >= 0.00 AND flow_share <= 100.00)
    ),
    CONSTRAINT chk_dep_rel_anti_pork CHECK (
        commodity IS NULL OR (lower(commodity) !~* '\y(pork|swine|pig|bacon|ham|porcine)\y')
    )
);

-- -----------------------------------------------------------------------------
-- 2. CREATE TABLE: agricultural_dependency_assessments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_dependency_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    assessment_type TEXT NOT NULL,
    classification TEXT NOT NULL DEFAULT 'NORMAL',
    concentration_ratio NUMERIC(5, 2) NULL,
    dominant_entity_type TEXT NULL,
    dominant_entity_id TEXT NULL,
    dominant_entity_label TEXT NULL,
    affected_commodity TEXT NULL,
    location_state TEXT NULL,
    location_lga TEXT NULL,
    risk_summary TEXT NOT NULL,
    confidence TEXT NOT NULL DEFAULT 'MODERATE',
    provenance TEXT NOT NULL DEFAULT 'DERIVED',
    cascade_depth INTEGER NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_dep_assess_class CHECK (
        classification IN ('NORMAL', 'CONCENTRATED', 'HIGH_DEPENDENCY', 'CRITICAL_DEPENDENCY', 'INSUFFICIENT_DATA')
    ),
    CONSTRAINT chk_dep_assess_confidence CHECK (
        confidence IN ('HIGH', 'MODERATE', 'LOW', 'INSUFFICIENT_DATA')
    ),
    CONSTRAINT chk_dep_assess_provenance CHECK (
        provenance IN ('OBSERVED', 'DERIVED', 'CORRELATED', 'ESTIMATED', 'EXTERNAL_SOURCE', 'INSUFFICIENT_DATA')
    ),
    CONSTRAINT chk_dep_assess_ratio CHECK (
        concentration_ratio IS NULL OR (concentration_ratio >= 0.00 AND concentration_ratio <= 100.00)
    ),
    CONSTRAINT chk_dep_assess_depth CHECK (
        cascade_depth >= 1 AND cascade_depth <= 10
    ),
    CONSTRAINT chk_dep_assess_anti_pork CHECK (
        affected_commodity IS NULL OR (lower(affected_commodity) !~* '\y(pork|swine|pig|bacon|ham|porcine)\y')
    )
);

-- -----------------------------------------------------------------------------
-- 3. INDEXES FOR HIGH-PERFORMANCE TRAVERSAL & FILTERING
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_dep_rel_source
    ON public.agricultural_dependency_relationships(source_node_type, source_node_id);

CREATE INDEX IF NOT EXISTS idx_dep_rel_target
    ON public.agricultural_dependency_relationships(target_node_type, target_node_id);

CREATE INDEX IF NOT EXISTS idx_dep_rel_type
    ON public.agricultural_dependency_relationships(relationship_type);

CREATE INDEX IF NOT EXISTS idx_dep_rel_commodity
    ON public.agricultural_dependency_relationships(commodity)
    WHERE commodity IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dep_rel_state
    ON public.agricultural_dependency_relationships(location_state)
    WHERE location_state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dep_rel_active_window
    ON public.agricultural_dependency_relationships(is_active, valid_from, valid_until);

CREATE INDEX IF NOT EXISTS idx_dep_assess_entity
    ON public.agricultural_dependency_assessments(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_dep_assess_type_class
    ON public.agricultural_dependency_assessments(assessment_type, classification);

-- -----------------------------------------------------------------------------
-- 4. BOUNDED RECURSIVE GRAPH TRAVERSAL FUNCTION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_agricultural_dependency_cascade(
    p_root_type TEXT,
    p_root_id TEXT,
    p_max_depth INT DEFAULT 4
)
RETURNS TABLE (
    depth INT,
    source_node_type TEXT,
    source_node_id TEXT,
    relationship_type TEXT,
    target_node_type TEXT,
    target_node_id TEXT,
    relationship_nature TEXT,
    dependency_strength TEXT,
    confidence TEXT,
    provenance TEXT,
    commodity TEXT,
    flow_share NUMERIC,
    path TEXT[]
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    -- Clamp maximum depth to prevent unconstrained recursion
    IF p_max_depth > 5 THEN
        p_max_depth := 5;
    END IF;
    IF p_max_depth < 1 THEN
        p_max_depth := 1;
    END IF;

    RETURN QUERY
    WITH RECURSIVE traversal AS (
        -- Base Case: Outgoing edges from root node
        SELECT
            1 AS depth,
            r.source_node_type,
            r.source_node_id,
            r.relationship_type,
            r.target_node_type,
            r.target_node_id,
            r.relationship_nature,
            r.dependency_strength,
            r.confidence,
            r.provenance,
            r.commodity,
            r.flow_share,
            ARRAY[r.source_node_id, r.target_node_id]::TEXT[] AS path
        FROM public.agricultural_dependency_relationships r
        WHERE r.source_node_type = p_root_type
          AND r.source_node_id = p_root_id
          AND r.is_active = TRUE
          AND (r.valid_until IS NULL OR r.valid_until > NOW())

        UNION ALL

        -- Recursive Step: Next-hop edges with cycle protection and depth limit
        SELECT
            t.depth + 1,
            next_edge.source_node_type,
            next_edge.source_node_id,
            next_edge.relationship_type,
            next_edge.target_node_type,
            next_edge.target_node_id,
            next_edge.relationship_nature,
            next_edge.dependency_strength,
            next_edge.confidence,
            next_edge.provenance,
            next_edge.commodity,
            next_edge.flow_share,
            t.path || next_edge.target_node_id
        FROM public.agricultural_dependency_relationships next_edge
        JOIN traversal t
          ON next_edge.source_node_type = t.target_node_type
         AND next_edge.source_node_id = t.target_node_id
        WHERE t.depth < p_max_depth
          AND next_edge.is_active = TRUE
          AND (next_edge.valid_until IS NULL OR next_edge.valid_until > NOW())
          -- Cycle Prevention: Ensure target has not already appeared in current path
          AND NOT (next_edge.target_node_id = ANY(t.path))
    )
    SELECT * FROM traversal
    LIMIT 100; -- Hard circuit breaker on returned cascade edges
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.agricultural_dependency_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_dependency_assessments ENABLE ROW LEVEL SECURITY;

-- Allow public read of active dependency relationships (safe network transparency)
CREATE POLICY "Allow public read active dependency relationships"
    ON public.agricultural_dependency_relationships
    FOR SELECT
    USING (is_active = TRUE);

-- Allow authenticated users to view all dependency relationships
CREATE POLICY "Allow authenticated read dependency relationships"
    ON public.agricultural_dependency_relationships
    FOR SELECT
    TO authenticated
    USING (TRUE);

-- Platform administrators manage dependency relationships
CREATE POLICY "Allow admin write dependency relationships"
    ON public.agricultural_dependency_relationships
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Allow authenticated users to read dependency assessments
CREATE POLICY "Allow authenticated read dependency assessments"
    ON public.agricultural_dependency_assessments
    FOR SELECT
    TO authenticated
    USING (TRUE);

-- Platform administrators manage dependency assessments
CREATE POLICY "Allow admin write dependency assessments"
    ON public.agricultural_dependency_assessments
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 6. AUDIT TRIGGER FOR UPDATED_AT
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_dependency_relationship_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_dependency_relationship_updated_at
    BEFORE UPDATE ON public.agricultural_dependency_relationships
    FOR EACH ROW
    EXECUTE FUNCTION public.set_dependency_relationship_updated_at();
