-- ==============================================================================
-- AGROMARKET PHASE 2.0: AGRICULTURAL ECOSYSTEM & VALUE-CHAIN COORDINATION
-- Schema, RLS, Anti-Pork Constraints, Immutability Triggers, and Grants
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ECOSYSTEM ACTORS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ecosystem_actors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_profile_id UUID REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  actor_type VARCHAR(50) NOT NULL CHECK (
    actor_type IN (
      'FARMER',
      'AGGREGATOR',
      'PROCESSOR',
      'PACKAGING_PROVIDER',
      'LOGISTICS_PROVIDER',
      'COLD_CHAIN_PROVIDER',
      'VETERINARY_PROVIDER',
      'INPUT_SUPPLIER',
      'EQUIPMENT_PROVIDER',
      'WHOLESALER',
      'RETAILER',
      'RESTAURANT',
      'HOTEL',
      'FOOD_PROCESSOR',
      'INSTITUTIONAL_BUYER',
      'COOPERATIVE',
      'MARKET_OPERATOR'
    )
  ),
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50) NOT NULL,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED' CHECK (
    verification_status IN ('UNVERIFIED', 'SELF_DECLARED', 'VERIFIED', 'OFFICIAL')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_ecosystem_actors CHECK (
    display_name !~* '\y(pork|pig|swine|bacon|ham|lard)\y'
    AND (description IS NULL OR description !~* '\y(pork|pig|swine|bacon|ham|lard)\y')
  )
);

CREATE TRIGGER set_ecosystem_actors_updated_at
  BEFORE UPDATE ON public.ecosystem_actors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_ecosystem_actors_user ON public.ecosystem_actors(user_id);
CREATE INDEX IF NOT EXISTS idx_ecosystem_actors_type ON public.ecosystem_actors(actor_type, is_active);
CREATE INDEX IF NOT EXISTS idx_ecosystem_actors_state ON public.ecosystem_actors(state, lga);
CREATE INDEX IF NOT EXISTS idx_ecosystem_actors_verification ON public.ecosystem_actors(verification_status);

-- ------------------------------------------------------------------------------
-- 2. PRODUCTION UNITS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.production_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_profile_id UUID REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  unit_type VARCHAR(50) NOT NULL CHECK (
    unit_type IN (
      'FARM',
      'RANCH',
      'POULTRY_FARM',
      'FISH_FARM',
      'DAIRY_OPERATION',
      'GREENHOUSE',
      'APIARY',
      'SNAIL_FARM',
      'OTHER_PERMITTED_PRODUCTION_UNIT'
    )
  ),
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50) NOT NULL,
  general_area VARCHAR(150),
  commodities TEXT[] NOT NULL DEFAULT '{}',
  capacity_value NUMERIC(14, 2),
  capacity_unit VARCHAR(50),
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'INACTIVE', 'FALLOW', 'MAINTENANCE', 'DECOMMISSIONED')
  ),
  verification_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED' CHECK (
    verification_status IN ('UNVERIFIED', 'SELF_DECLARED', 'VERIFIED', 'INSPECTED')
  ),
  is_public BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_production_units CHECK (
    name !~* '\y(pork|pig|swine|bacon|ham|lard)\y'
  )
);

CREATE TRIGGER set_production_units_updated_at
  BEFORE UPDATE ON public.production_units
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_production_units_owner ON public.production_units(owner_id);
CREATE INDEX IF NOT EXISTS idx_production_units_type ON public.production_units(unit_type, status);
CREATE INDEX IF NOT EXISTS idx_production_units_state ON public.production_units(state, lga);

-- ------------------------------------------------------------------------------
-- 3. PRODUCTION OUTPUTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.production_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_unit_id UUID REFERENCES public.production_units(id) ON DELETE SET NULL,
  producer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commodity_name VARCHAR(150) NOT NULL,
  output_type VARCHAR(50) NOT NULL CHECK (
    output_type IN (
      'RAW_HARVEST',
      'LIVE_ANIMALS',
      'CARCASS',
      'RAW_MILK',
      'RAW_TUBERS',
      'GRAIN',
      'EGGS',
      'HONEY',
      'FISH_CATCH',
      'BYPRODUCT',
      'OTHER_PERMITTED_OUTPUT'
    )
  ),
  batch_number VARCHAR(100),
  quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(30) NOT NULL,
  harvest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quality_grade VARCHAR(30) NOT NULL DEFAULT 'STANDARD' CHECK (
    quality_grade IN ('STANDARD', 'PREMIUM', 'GRADE_A', 'GRADE_B', 'COMMERCIAL')
  ),
  status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE' CHECK (
    status IN ('AVAILABLE', 'ALLOCATED', 'IN_TRANSIT', 'PROCESSED', 'DEPLETED')
  ),
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50) NOT NULL,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_production_outputs CHECK (
    commodity_name !~* '\y(pork|pig|swine|bacon|ham|lard)\y'
    AND (notes IS NULL OR notes !~* '\y(pork|pig|swine|bacon|ham|lard)\y')
  )
);

CREATE TRIGGER set_production_outputs_updated_at
  BEFORE UPDATE ON public.production_outputs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_production_outputs_producer ON public.production_outputs(producer_id);
CREATE INDEX IF NOT EXISTS idx_production_outputs_unit ON public.production_outputs(production_unit_id);
CREATE INDEX IF NOT EXISTS idx_production_outputs_status ON public.production_outputs(status, commodity_name);
CREATE INDEX IF NOT EXISTS idx_production_outputs_state ON public.production_outputs(state, lga);

-- ------------------------------------------------------------------------------
-- 4. AGGREGATION POOLS & CONTRIBUTIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aggregation_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  commodity VARCHAR(150) NOT NULL,
  target_quantity NUMERIC(14, 2) NOT NULL CHECK (target_quantity > 0),
  current_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  unit VARCHAR(30) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50) NOT NULL,
  collection_center_name VARCHAR(150),
  expected_availability_date DATE NOT NULL,
  target_buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_processor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (
    status IN ('OPEN', 'AGGREGATING', 'FULFILLED', 'DISPATCHED', 'CANCELLED', 'CLOSED')
  ),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_aggregation_pools CHECK (
    title !~* '\y(pork|pig|swine|bacon|ham|lard)\y'
    AND commodity !~* '\y(pork|pig|swine|bacon|ham|lard)\y'
    AND (notes IS NULL OR notes !~* '\y(pork|pig|swine|bacon|ham|lard)\y')
  )
);

CREATE TRIGGER set_aggregation_pools_updated_at
  BEFORE UPDATE ON public.aggregation_pools
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_aggregation_pools_aggregator ON public.aggregation_pools(aggregator_id);
CREATE INDEX IF NOT EXISTS idx_aggregation_pools_status ON public.aggregation_pools(status, commodity);
CREATE INDEX IF NOT EXISTS idx_aggregation_pools_state ON public.aggregation_pools(state, lga);

CREATE TABLE IF NOT EXISTS public.aggregation_pool_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.aggregation_pools(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  production_output_id UUID REFERENCES public.production_outputs(id) ON DELETE SET NULL,
  quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'COMMITTED' CHECK (
    status IN ('COMMITTED', 'DELIVERED', 'INSPECTED', 'REJECTED', 'SETTLED')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_pool_contributions CHECK (
    notes IS NULL OR notes !~* '\y(pork|pig|swine|bacon|ham|lard)\y'
  )
);

CREATE TRIGGER set_aggregation_pool_contributions_updated_at
  BEFORE UPDATE ON public.aggregation_pool_contributions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_pool_contributions_pool ON public.aggregation_pool_contributions(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_contributions_supplier ON public.aggregation_pool_contributions(supplier_id);

-- ------------------------------------------------------------------------------
-- 5. PROCESSING FACILITIES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.processing_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_profile_id UUID REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  facility_type VARCHAR(50) NOT NULL CHECK (
    facility_type IN (
      'POULTRY_PROCESSOR',
      'ABATTOIR',
      'FISH_PROCESSOR',
      'DAIRY_PROCESSOR',
      'CROP_PROCESSOR',
      'GRAIN_MILL',
      'FEED_MILL',
      'COLD_STORAGE_PROCESSING',
      'PACKAGING_FACILITY',
      'OTHER_PERMITTED_PROCESSOR'
    )
  ),
  services_offered TEXT[] NOT NULL DEFAULT '{}',
  processing_capacity_value NUMERIC(14, 2),
  processing_capacity_unit VARCHAR(50),
  minimum_batch_size NUMERIC(14, 2),
  supported_commodities TEXT[] NOT NULL DEFAULT '{}',
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50) NOT NULL,
  general_location VARCHAR(150),
  verification_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED' CHECK (
    verification_status IN ('UNVERIFIED', 'SELF_DECLARED', 'VERIFIED', 'INSPECTED')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_processing_facilities CHECK (
    name !~* '\y(pork|pig|swine|bacon|ham|lard)\y'
  )
);

CREATE TRIGGER set_processing_facilities_updated_at
  BEFORE UPDATE ON public.processing_facilities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_processing_facilities_operator ON public.processing_facilities(operator_id);
CREATE INDEX IF NOT EXISTS idx_processing_facilities_type ON public.processing_facilities(facility_type, is_active);
CREATE INDEX IF NOT EXISTS idx_processing_facilities_state ON public.processing_facilities(state, lga);

-- ------------------------------------------------------------------------------
-- 6. PROCESSING EVENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.processing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES public.processing_facilities(id) ON DELETE SET NULL,
  processor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  process_type VARCHAR(50) NOT NULL CHECK (
    process_type IN (
      'SLAUGHTER_AND_DRESS',
      'PORTIONING',
      'MILLING',
      'DRYING',
      'FERMENTATION',
      'PASTEURIZATION',
      'EXTRACTION',
      'PACKAGING_PROCESSING',
      'CLEANING_AND_GRADING',
      'OTHER_PERMITTED_PROCESS'
    )
  ),
  input_description TEXT NOT NULL,
  input_quantity NUMERIC(14, 2) NOT NULL CHECK (input_quantity > 0),
  input_unit VARCHAR(30) NOT NULL,
  input_source_output_id UUID REFERENCES public.production_outputs(id) ON DELETE SET NULL,
  output_description TEXT NOT NULL,
  output_quantity NUMERIC(14, 2) NOT NULL CHECK (output_quantity >= 0),
  output_unit VARCHAR(30) NOT NULL,
  yield_percentage NUMERIC(5, 2),
  batch_reference VARCHAR(100),
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED' CHECK (
    status IN ('IN_PROGRESS', 'COMPLETED', 'HALTED', 'REJECTED')
  ),
  resulting_output_id UUID REFERENCES public.production_outputs(id) ON DELETE SET NULL,
  resulting_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_processing_events CHECK (
    input_description !~* '\y(pork|pig|swine|bacon|ham|lard)\y'
    AND output_description !~* '\y(pork|pig|swine|bacon|ham|lard)\y'
    AND (notes IS NULL OR notes !~* '\y(pork|pig|swine|bacon|ham|lard)\y')
  )
);

CREATE TRIGGER set_processing_events_updated_at
  BEFORE UPDATE ON public.processing_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_processing_events_processor ON public.processing_events(processor_id);
CREATE INDEX IF NOT EXISTS idx_processing_events_facility ON public.processing_events(facility_id);
CREATE INDEX IF NOT EXISTS idx_processing_events_status ON public.processing_events(status);

-- ------------------------------------------------------------------------------
-- 7. VALUE-CHAIN EVENTS (Append-Only Event Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.value_chain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL CHECK (
    event_type IN (
      'PRODUCED',
      'HARVESTED',
      'AGGREGATED',
      'TRANSPORTED',
      'RECEIVED',
      'PROCESSED',
      'INSPECTED',
      'PACKAGED',
      'STORED',
      'DISPATCHED',
      'DELIVERED'
    )
  ),
  entity_type VARCHAR(50) NOT NULL CHECK (
    entity_type IN (
      'PRODUCTION_OUTPUT',
      'AGGREGATION_POOL',
      'PROCESSING_EVENT',
      'B2B_DEMAND',
      'MARKETPLACE_LISTING'
    )
  ),
  entity_id UUID NOT NULL,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  event_title VARCHAR(150) NOT NULL,
  event_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_value_chain_events CHECK (
    event_title !~* '\y(pork|pig|swine|bacon|ham|lard)\y'
  )
);

-- Value-Chain Event Immutability Trigger
CREATE OR REPLACE FUNCTION public.prevent_value_chain_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Value-chain events are strictly immutable. Updates are forbidden.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Value-chain events are strictly append-only. Only system administrators may purge events.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_value_chain_event_immutability
  BEFORE UPDATE OR DELETE ON public.value_chain_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_value_chain_event_mutation();

CREATE INDEX IF NOT EXISTS idx_vc_events_entity ON public.value_chain_events(entity_type, entity_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_vc_events_actor ON public.value_chain_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_vc_events_type ON public.value_chain_events(event_type, occurred_at DESC);

-- ------------------------------------------------------------------------------
-- 8. B2B DEMAND
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.b2b_demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_profile_id UUID REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  title VARCHAR(150) NOT NULL,
  commodity_or_product VARCHAR(150) NOT NULL,
  quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(30) NOT NULL,
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_price_per_unit NUMERIC(14, 2),
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50) NOT NULL,
  desired_delivery_date DATE NOT NULL,
  frequency VARCHAR(30) NOT NULL DEFAULT 'ONE_TIME' CHECK (
    frequency IN ('ONE_TIME', 'DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY')
  ),
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'MATCHED', 'PARTIALLY_MATCHED', 'FULFILLED', 'EXPIRED', 'CANCELLED')
  ),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_b2b_demands CHECK (
    title !~* '\y(pork|pig|swine|bacon|ham|lard)\y'
    AND commodity_or_product !~* '\y(pork|pig|swine|bacon|ham|lard)\y'
    AND (notes IS NULL OR notes !~* '\y(pork|pig|swine|bacon|ham|lard)\y')
  )
);

CREATE TRIGGER set_b2b_demands_updated_at
  BEFORE UPDATE ON public.b2b_demands
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_b2b_demands_buyer ON public.b2b_demands(buyer_id);
CREATE INDEX IF NOT EXISTS idx_b2b_demands_status ON public.b2b_demands(status, commodity_or_product);
CREATE INDEX IF NOT EXISTS idx_b2b_demands_state ON public.b2b_demands(state, lga);
CREATE INDEX IF NOT EXISTS idx_b2b_demands_delivery ON public.b2b_demands(desired_delivery_date);

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 9.1 Ecosystem Actors
ALTER TABLE public.ecosystem_actors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public users can view active ecosystem actors"
  ON public.ecosystem_actors FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR public.is_admin() OR (auth.uid() IS NOT NULL AND auth.uid() = user_id));

CREATE POLICY "Users can create their own ecosystem actor record"
  ON public.ecosystem_actors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ecosystem actor record"
  ON public.ecosystem_actors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own ecosystem actor record"
  ON public.ecosystem_actors FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 9.2 Production Units
ALTER TABLE public.production_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public users can view public production units"
  ON public.production_units FOR SELECT
  TO anon, authenticated
  USING (is_public = true OR public.is_admin() OR (auth.uid() IS NOT NULL AND auth.uid() = owner_id));

CREATE POLICY "Users can create their own production units"
  ON public.production_units FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own production units"
  ON public.production_units FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR public.is_admin())
  WITH CHECK (auth.uid() = owner_id OR public.is_admin());

CREATE POLICY "Users can delete their own production units"
  ON public.production_units FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id OR public.is_admin());

-- 9.3 Production Outputs
ALTER TABLE public.production_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public users can view available production outputs"
  ON public.production_outputs FOR SELECT
  TO anon, authenticated
  USING (status IN ('AVAILABLE', 'ALLOCATED', 'PROCESSED') OR public.is_admin() OR (auth.uid() IS NOT NULL AND auth.uid() = producer_id));

CREATE POLICY "Producers can register production outputs"
  ON public.production_outputs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = producer_id);

CREATE POLICY "Producers can update their own production outputs"
  ON public.production_outputs FOR UPDATE
  TO authenticated
  USING (auth.uid() = producer_id OR public.is_admin())
  WITH CHECK (auth.uid() = producer_id OR public.is_admin());

CREATE POLICY "Producers can delete their own unallocated production outputs"
  ON public.production_outputs FOR DELETE
  TO authenticated
  USING ((auth.uid() = producer_id AND status = 'AVAILABLE') OR public.is_admin());

-- 9.4 Aggregation Pools
ALTER TABLE public.aggregation_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public users can view aggregation pools"
  ON public.aggregation_pools FOR SELECT
  TO anon, authenticated
  USING (status IN ('OPEN', 'AGGREGATING', 'FULFILLED') OR public.is_admin() OR (auth.uid() IS NOT NULL AND auth.uid() = aggregator_id));

CREATE POLICY "Aggregators can create aggregation pools"
  ON public.aggregation_pools FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = aggregator_id);

CREATE POLICY "Aggregators can update their own aggregation pools"
  ON public.aggregation_pools FOR UPDATE
  TO authenticated
  USING (auth.uid() = aggregator_id OR public.is_admin())
  WITH CHECK (auth.uid() = aggregator_id OR public.is_admin());

CREATE POLICY "Aggregators can delete their own open aggregation pools"
  ON public.aggregation_pools FOR DELETE
  TO authenticated
  USING ((auth.uid() = aggregator_id AND status = 'OPEN') OR public.is_admin());

-- 9.5 Aggregation Pool Contributions
ALTER TABLE public.aggregation_pool_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pool participants and aggregators can view contributions"
  ON public.aggregation_pool_contributions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = supplier_id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.aggregation_pools ap
      WHERE ap.id = pool_id AND ap.aggregator_id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can contribute to open aggregation pools"
  ON public.aggregation_pool_contributions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = supplier_id
    AND EXISTS (
      SELECT 1 FROM public.aggregation_pools ap
      WHERE ap.id = pool_id AND ap.status IN ('OPEN', 'AGGREGATING')
    )
  );

CREATE POLICY "Suppliers and aggregators can update contributions"
  ON public.aggregation_pool_contributions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = supplier_id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.aggregation_pools ap
      WHERE ap.id = pool_id AND ap.aggregator_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = supplier_id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.aggregation_pools ap
      WHERE ap.id = pool_id AND ap.aggregator_id = auth.uid()
    )
  );

-- 9.6 Processing Facilities
ALTER TABLE public.processing_facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public users can view active processing facilities"
  ON public.processing_facilities FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR public.is_admin() OR (auth.uid() IS NOT NULL AND auth.uid() = operator_id));

CREATE POLICY "Operators can register processing facilities"
  ON public.processing_facilities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = operator_id);

CREATE POLICY "Operators can update their own processing facilities"
  ON public.processing_facilities FOR UPDATE
  TO authenticated
  USING (auth.uid() = operator_id OR public.is_admin())
  WITH CHECK (auth.uid() = operator_id OR public.is_admin());

CREATE POLICY "Operators can delete their own processing facilities"
  ON public.processing_facilities FOR DELETE
  TO authenticated
  USING (auth.uid() = operator_id OR public.is_admin());

-- 9.7 Processing Events
ALTER TABLE public.processing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Processors and public can view processing events"
  ON public.processing_events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Processors can log processing events"
  ON public.processing_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = processor_id);

CREATE POLICY "Processors can update active processing events"
  ON public.processing_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = processor_id OR public.is_admin())
  WITH CHECK (auth.uid() = processor_id OR public.is_admin());

-- 9.8 Value-Chain Events
ALTER TABLE public.value_chain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view value-chain events"
  ON public.value_chain_events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can append value-chain events"
  ON public.value_chain_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- 9.9 B2B Demands
ALTER TABLE public.b2b_demands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public users can view active B2B demands"
  ON public.b2b_demands FOR SELECT
  TO anon, authenticated
  USING (status IN ('ACTIVE', 'MATCHED', 'PARTIALLY_MATCHED') OR public.is_admin() OR (auth.uid() IS NOT NULL AND auth.uid() = buyer_id));

CREATE POLICY "Buyers can submit B2B demands"
  ON public.b2b_demands FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update their own B2B demands"
  ON public.b2b_demands FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id OR public.is_admin())
  WITH CHECK (auth.uid() = buyer_id OR public.is_admin());

CREATE POLICY "Buyers can delete their own B2B demands"
  ON public.b2b_demands FOR DELETE
  TO authenticated
  USING (auth.uid() = buyer_id OR public.is_admin());

-- ==============================================================================
-- 10. TABLE GRANTS
-- ==============================================================================
GRANT SELECT ON TABLE public.ecosystem_actors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.ecosystem_actors TO authenticated;

GRANT SELECT ON TABLE public.production_units TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.production_units TO authenticated;

GRANT SELECT ON TABLE public.production_outputs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.production_outputs TO authenticated;

GRANT SELECT ON TABLE public.aggregation_pools TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.aggregation_pools TO authenticated;

GRANT SELECT ON TABLE public.aggregation_pool_contributions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.aggregation_pool_contributions TO authenticated;

GRANT SELECT ON TABLE public.processing_facilities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.processing_facilities TO authenticated;

GRANT SELECT ON TABLE public.processing_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.processing_events TO authenticated;

GRANT SELECT ON TABLE public.value_chain_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.value_chain_events TO authenticated;

GRANT SELECT ON TABLE public.b2b_demands TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.b2b_demands TO authenticated;
