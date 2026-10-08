-- ==============================================================================
-- AGROMARKET PHASE 3.10: MULTI-PARTY AGRICULTURAL COORDINATION & SUPPLY COMMITMENTS
-- Schema, State Machines, Concurrency Safeguards, RLS, and Anti-Pork Constraints
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. COORDINATION OPPORTUNITIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_coordination_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  b2b_demand_id UUID REFERENCES public.b2b_demands(id) ON DELETE SET NULL,
  title VARCHAR(180) NOT NULL,
  commodity VARCHAR(120) NOT NULL,
  required_quantity NUMERIC(14, 2) NOT NULL CHECK (required_quantity > 0),
  unit VARCHAR(30) NOT NULL,
  canonical_quantity_kg NUMERIC(14, 2) NOT NULL CHECK (canonical_quantity_kg > 0),
  accepted_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (accepted_quantity >= 0),
  fulfilled_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (fulfilled_quantity >= 0),
  target_state VARCHAR(50) NOT NULL,
  target_lga VARCHAR(50) NOT NULL,
  delivery_window_start DATE NOT NULL,
  delivery_window_end DATE NOT NULL CHECK (delivery_window_end >= delivery_window_start),
  quality_grade VARCHAR(40) NOT NULL DEFAULT 'STANDARD',
  processing_required BOOLEAN NOT NULL DEFAULT false,
  processing_facility_id UUID REFERENCES public.processing_facilities(id) ON DELETE SET NULL,
  logistics_required BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(40) NOT NULL DEFAULT 'OPEN' CHECK (
    status IN (
      'DRAFT',
      'OPEN',
      'COORDINATING',
      'PARTIALLY_COMMITTED',
      'FULLY_COMMITTED',
      'IN_FULFILMENT',
      'COMPLETED',
      'CANCELLED',
      'EXPIRED',
      'CONSTRAINED'
    )
  ),
  coverage_status VARCHAR(40) NOT NULL DEFAULT 'NO_COVERAGE' CHECK (
    coverage_status IN (
      'NO_COVERAGE',
      'PARTIALLY_COVERED',
      'FULLY_COVERED',
      'OVER_COMMITTED_BLOCKED',
      'INSUFFICIENT_DATA'
    )
  ),
  governance_decision VARCHAR(40) NOT NULL DEFAULT 'ALLOW' CHECK (
    governance_decision IN (
      'ALLOW',
      'ALLOW_WITH_REVIEW',
      'REQUIRE_HUMAN_APPROVAL',
      'REQUIRE_PROFESSIONAL_REVIEW',
      'REQUIRE_AUTHORITY_REVIEW',
      'DENY',
      'INSUFFICIENT_DATA'
    )
  ),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT chk_no_pork_coordination_opportunities CHECK (
    title !~* '\y(pork|pig|swine|bacon|ham|lard|porcine)\y'
    AND commodity !~* '\y(pork|pig|swine|bacon|ham|lard|porcine)\y'
    AND (notes IS NULL OR notes !~* '\y(pork|pig|swine|bacon|ham|lard|porcine)\y')
    AND NOT (metadata::text ~* '\y(pork|pig|swine|bacon|ham|lard|porcine)\y')
  )
);

CREATE TRIGGER set_agricultural_coordination_opportunities_updated_at
  BEFORE UPDATE ON public.agricultural_coordination_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_agri_coord_creator ON public.agricultural_coordination_opportunities(creator_id);
CREATE INDEX IF NOT EXISTS idx_agri_coord_commodity ON public.agricultural_coordination_opportunities(commodity);
CREATE INDEX IF NOT EXISTS idx_agri_coord_status ON public.agricultural_coordination_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_agri_coord_state ON public.agricultural_coordination_opportunities(target_state, target_lga);
CREATE INDEX IF NOT EXISTS idx_agri_coord_window ON public.agricultural_coordination_opportunities(delivery_window_start, delivery_window_end);

-- ------------------------------------------------------------------------------
-- 2. COORDINATION REQUIREMENTS TABLE (Detailed Specifications)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_coordination_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.agricultural_coordination_opportunities(id) ON DELETE CASCADE,
  requirement_type VARCHAR(50) NOT NULL CHECK (
    requirement_type IN (
      'COMMODITY_SPECIFICATION',
      'QUALITY_GRADE',
      'MAX_MOISTURE_CONTENT',
      'PACKAGING_TYPE',
      'SANITARY_INSPECTION',
      'HALAL_CERTIFICATION',
      'PROCESSING_SPECIFICATION',
      'COLD_CHAIN_REQUIRED',
      'MINIMUM_LOT_SIZE',
      'DELIVERY_WINDOW'
    )
  ),
  title VARCHAR(150) NOT NULL,
  description TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT chk_no_pork_coordination_requirements CHECK (
    title !~* '\y(pork|pig|swine|bacon|ham|lard|porcine)\y'
    AND (description IS NULL OR description !~* '\y(pork|pig|swine|bacon|ham|lard|porcine)\y')
  )
);

CREATE TRIGGER set_agricultural_coordination_requirements_updated_at
  BEFORE UPDATE ON public.agricultural_coordination_requirements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_agri_coord_req_opp ON public.agricultural_coordination_requirements(opportunity_id);

-- ------------------------------------------------------------------------------
-- 3. COORDINATION PARTICIPANTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_coordination_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.agricultural_coordination_opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_role VARCHAR(50) NOT NULL CHECK (
    actor_role IN (
      'BUYER',
      'COORDINATOR',
      'FARMER',
      'PRODUCER',
      'AGGREGATOR',
      'PROCESSOR',
      'LOGISTICS_PROVIDER',
      'EQUIPMENT_OWNER',
      'SERVICE_PROVIDER'
    )
  ),
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('PENDING', 'ACTIVE', 'INACTIVE', 'WITHDRAWN', 'REMOVED')
  ),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT uq_agri_coord_participant UNIQUE (opportunity_id, user_id, actor_role)
);

CREATE TRIGGER set_agricultural_coordination_participants_updated_at
  BEFORE UPDATE ON public.agricultural_coordination_participants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_agri_coord_part_opp ON public.agricultural_coordination_participants(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_agri_coord_part_user ON public.agricultural_coordination_participants(user_id);

-- ------------------------------------------------------------------------------
-- 4. SUPPLY COMMITMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_supply_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.agricultural_coordination_opportunities(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  production_output_id UUID REFERENCES public.production_outputs(id) ON DELETE SET NULL,
  commodity VARCHAR(120) NOT NULL,
  committed_quantity NUMERIC(14, 2) NOT NULL CHECK (committed_quantity > 0),
  unit VARCHAR(30) NOT NULL,
  canonical_quantity_kg NUMERIC(14, 2) NOT NULL CHECK (canonical_quantity_kg > 0),
  quality_grade VARCHAR(40) NOT NULL DEFAULT 'STANDARD',
  availability_date DATE NOT NULL,
  location_state VARCHAR(50) NOT NULL,
  location_lga VARCHAR(50) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'PROPOSED' CHECK (
    status IN (
      'PROPOSED',
      'OFFERED',
      'ACCEPTED',
      'CONFIRMED',
      'FULFILMENT_PENDING',
      'FULFILLED',
      'WITHDRAWN',
      'REJECTED',
      'EXPIRED',
      'CANCELLED',
      'FAILED'
    )
  ),
  rejection_reason TEXT,
  notes TEXT,
  governance_decision VARCHAR(40) NOT NULL DEFAULT 'ALLOW' CHECK (
    governance_decision IN (
      'ALLOW',
      'ALLOW_WITH_REVIEW',
      'REQUIRE_HUMAN_APPROVAL',
      'REQUIRE_PROFESSIONAL_REVIEW',
      'REQUIRE_AUTHORITY_REVIEW',
      'DENY',
      'INSUFFICIENT_DATA'
    )
  ),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT chk_no_pork_supply_commitments CHECK (
    commodity !~* '\y(pork|pig|swine|bacon|ham|lard|porcine)\y'
    AND (notes IS NULL OR notes !~* '\y(pork|pig|swine|bacon|ham|lard|porcine)\y')
    AND (rejection_reason IS NULL OR rejection_reason !~* '\y(pork|pig|swine|bacon|ham|lard|porcine)\y')
    AND NOT (metadata::text ~* '\y(pork|pig|swine|bacon|ham|lard|porcine)\y')
  )
);

CREATE TRIGGER set_agricultural_supply_commitments_updated_at
  BEFORE UPDATE ON public.agricultural_supply_commitments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_agri_commit_opp ON public.agricultural_supply_commitments(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_agri_commit_participant ON public.agricultural_supply_commitments(participant_id);
CREATE INDEX IF NOT EXISTS idx_agri_commit_status ON public.agricultural_supply_commitments(status);
CREATE INDEX IF NOT EXISTS idx_agri_commit_availability ON public.agricultural_supply_commitments(availability_date);

-- ------------------------------------------------------------------------------
-- 5. COORDINATION EVENTS TABLE (Append-Only Immutable Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_coordination_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.agricultural_coordination_opportunities(id) ON DELETE CASCADE,
  commitment_id UUID REFERENCES public.agricultural_supply_commitments(id) ON DELETE SET NULL,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  event_type VARCHAR(60) NOT NULL CHECK (
    event_type IN (
      'OPPORTUNITY_CREATED',
      'OPPORTUNITY_UPDATED',
      'OPPORTUNITY_STATUS_CHANGED',
      'REQUIREMENT_ADDED',
      'PARTICIPANT_JOINED',
      'PARTICIPANT_WITHDRAWN',
      'COMMITMENT_PROPOSED',
      'COMMITMENT_OFFERED',
      'COMMITMENT_ACCEPTED',
      'COMMITMENT_CONFIRMED',
      'COMMITMENT_REJECTED',
      'COMMITMENT_WITHDRAWN',
      'COMMITMENT_FULFILLED',
      'FULFILMENT_RECORDED',
      'GOVERNANCE_BLOCKED',
      'CONCURRENCY_BLOCKED'
    )
  ),
  title VARCHAR(180) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT chk_no_pork_coordination_events CHECK (
    title !~* '\y(pork|pig|swine|bacon|ham|lard|porcine)\y'
    AND NOT (details::text ~* '\y(pork|pig|swine|bacon|ham|lard|porcine)\y')
  )
);

-- Immutability enforcement trigger on coordination events
CREATE OR REPLACE FUNCTION public.prevent_coordination_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Coordination events are strictly immutable. Updates are forbidden.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Coordination events are strictly append-only. Only system administrators may purge events.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_coordination_event_immutability
  BEFORE UPDATE OR DELETE ON public.agricultural_coordination_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_coordination_event_mutation();

CREATE INDEX IF NOT EXISTS idx_agri_coord_events_opp ON public.agricultural_coordination_events(opportunity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_agri_coord_events_commit ON public.agricultural_coordination_events(commitment_id);
CREATE INDEX IF NOT EXISTS idx_agri_coord_events_actor ON public.agricultural_coordination_events(actor_id);

-- ------------------------------------------------------------------------------
-- 6. ATOMIC COMMITMENT ACCEPTANCE FUNCTION (Concurrency Safeguard)
-- Uses SELECT ... FOR UPDATE to eliminate race conditions and prevent overcommitment
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atomic_accept_supply_commitment(
  p_commitment_id UUID,
  p_coordinator_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_commitment RECORD;
  v_opportunity RECORD;
  v_new_accepted NUMERIC(14, 2);
  v_new_coverage NUMERIC(5, 2);
  v_new_opp_status VARCHAR(40);
  v_new_coverage_status VARCHAR(40);
BEGIN
  -- 1. Lock and fetch commitment record
  SELECT * INTO v_commitment
  FROM public.agricultural_supply_commitments
  WHERE id = p_commitment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commitment not found.');
  END IF;

  IF v_commitment.status NOT IN ('PROPOSED', 'OFFERED') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Invalid commitment state for acceptance: %s', v_commitment.status)
    );
  END IF;

  -- 2. Lock and fetch opportunity record
  SELECT * INTO v_opportunity
  FROM public.agricultural_coordination_opportunities
  WHERE id = v_commitment.opportunity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parent coordination opportunity not found.');
  END IF;

  -- 3. Authorization check: Must be opportunity creator or admin
  IF v_opportunity.creator_id != p_coordinator_id AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only opportunity coordinator or admin may accept commitments.');
  END IF;

  -- 4. Check opportunity active state
  IF v_opportunity.status IN ('CANCELLED', 'EXPIRED', 'COMPLETED') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Cannot accept commitment on an inactive opportunity (%s).', v_opportunity.status)
    );
  END IF;

  -- 5. Safe quantity accounting: Compare in canonical KG
  v_new_accepted := v_opportunity.accepted_quantity + v_commitment.canonical_quantity_kg;

  IF v_new_accepted > v_opportunity.canonical_quantity_kg THEN
    -- Over-commitment detected: Block deterministically
    RETURN jsonb_build_object(
      'success', false,
      'error', format(
        'Overcommitment prevented: accepting %s kg would result in %s kg, exceeding required %s kg.',
        v_commitment.canonical_quantity_kg,
        v_new_accepted,
        v_opportunity.canonical_quantity_kg
      ),
      'code', 'OVERCOMMITMENT_BLOCKED'
    );
  END IF;

  -- 6. Transition commitment state to ACCEPTED
  UPDATE public.agricultural_supply_commitments
  SET status = 'ACCEPTED',
      updated_at = timezone('utc'::text, now())
  WHERE id = p_commitment_id;

  -- 7. Calculate new opportunity state & coverage
  IF v_new_accepted >= v_opportunity.canonical_quantity_kg THEN
    v_new_opp_status := 'FULLY_COMMITTED';
    v_new_coverage_status := 'FULLY_COVERED';
  ELSE
    v_new_opp_status := 'PARTIALLY_COMMITTED';
    v_new_coverage_status := 'PARTIALLY_COVERED';
  END IF;

  UPDATE public.agricultural_coordination_opportunities
  SET accepted_quantity = v_new_accepted,
      status = v_new_opp_status,
      coverage_status = v_new_coverage_status,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_opportunity.id;

  -- 8. Record immutable coordination event
  INSERT INTO public.agricultural_coordination_events (
    opportunity_id,
    commitment_id,
    actor_id,
    event_type,
    title,
    details
  ) VALUES (
    v_opportunity.id,
    v_commitment.id,
    p_coordinator_id,
    'COMMITMENT_ACCEPTED',
    format('Supply commitment accepted (%s %s)', v_commitment.committed_quantity, v_commitment.unit),
    jsonb_build_object(
      'accepted_kg', v_commitment.canonical_quantity_kg,
      'new_total_accepted_kg', v_new_accepted,
      'required_kg', v_opportunity.canonical_quantity_kg,
      'opportunity_status', v_new_opp_status
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'commitment_id', p_commitment_id,
    'accepted_quantity_kg', v_new_accepted,
    'opportunity_status', v_new_opp_status,
    'coverage_status', v_new_coverage_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.agricultural_coordination_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_coordination_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_coordination_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_supply_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_coordination_events ENABLE ROW LEVEL SECURITY;

-- 7.1 Opportunities RLS
-- Anyone authenticated can view active opportunities (excluding draft)
CREATE POLICY "Authenticated users can view open coordination opportunities"
  ON public.agricultural_coordination_opportunities FOR SELECT
  TO authenticated
  USING (status != 'DRAFT' OR creator_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can create coordination opportunities"
  ON public.agricultural_coordination_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid() OR public.is_admin());

CREATE POLICY "Coordinators or admins can update coordination opportunities"
  ON public.agricultural_coordination_opportunities FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid() OR public.is_admin())
  WITH CHECK (creator_id = auth.uid() OR public.is_admin());

-- 7.2 Requirements RLS
CREATE POLICY "Authenticated users can view coordination requirements"
  ON public.agricultural_coordination_requirements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agricultural_coordination_opportunities o
      WHERE o.id = opportunity_id
      AND (o.status != 'DRAFT' OR o.creator_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Coordinators or admins can manage requirements"
  ON public.agricultural_coordination_requirements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agricultural_coordination_opportunities o
      WHERE o.id = opportunity_id
      AND (o.creator_id = auth.uid() OR public.is_admin())
    )
  );

-- 7.3 Participants RLS
CREATE POLICY "Participants and coordinators can view participation records"
  ON public.agricultural_coordination_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.agricultural_coordination_opportunities o
      WHERE o.id = opportunity_id
      AND (o.creator_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Users can join coordination as participants"
  ON public.agricultural_coordination_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Participants or coordinators can update participation status"
  ON public.agricultural_coordination_participants FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.agricultural_coordination_opportunities o
      WHERE o.id = opportunity_id
      AND (o.creator_id = auth.uid() OR public.is_admin())
    )
  );

-- 7.4 Supply Commitments RLS (Privacy: Farmers see their own, coordinators see all for opportunity)
CREATE POLICY "Users can view relevant supply commitments"
  ON public.agricultural_supply_commitments FOR SELECT
  TO authenticated
  USING (
    participant_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.agricultural_coordination_opportunities o
      WHERE o.id = opportunity_id
      AND (o.creator_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Producers can offer supply commitments"
  ON public.agricultural_supply_commitments FOR INSERT
  TO authenticated
  WITH CHECK (participant_id = auth.uid() OR public.is_admin());

CREATE POLICY "Commitment owners or coordinators can update commitments"
  ON public.agricultural_supply_commitments FOR UPDATE
  TO authenticated
  USING (
    participant_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.agricultural_coordination_opportunities o
      WHERE o.id = opportunity_id
      AND (o.creator_id = auth.uid() OR public.is_admin())
    )
  );

-- 7.5 Events RLS
CREATE POLICY "Authenticated users can view coordination events"
  ON public.agricultural_coordination_events FOR SELECT
  TO authenticated
  USING (
    actor_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.agricultural_coordination_opportunities o
      WHERE o.id = opportunity_id
      AND (o.creator_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Authenticated users can append coordination events"
  ON public.agricultural_coordination_events FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. GRANTS
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.agricultural_coordination_opportunities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agricultural_coordination_requirements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.agricultural_coordination_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.agricultural_supply_commitments TO authenticated;
GRANT SELECT, INSERT ON public.agricultural_coordination_events TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_accept_supply_commitment(UUID, UUID) TO authenticated;
