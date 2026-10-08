-- ==============================================================================
-- AGROMARKET PHASE 3.11: AGRICULTURAL COMMITMENT FULFILMENT, RECONCILIATION & RELIABILITY
-- Migration: Add Fulfilment Readiness, Quantity Reconciliation, Evidence & Events
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTEND SUPPLY COMMITMENTS WITH READINESS & RECONCILIATION FIELDS
-- ------------------------------------------------------------------------------

DO $$
BEGIN
  -- 1.1 Readiness Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'agricultural_supply_commitments' 
      AND column_name = 'readiness_status'
  ) THEN
    ALTER TABLE public.agricultural_supply_commitments
    ADD COLUMN readiness_status VARCHAR(40) NOT NULL DEFAULT 'NOT_READY' CHECK (
      readiness_status IN (
        'NOT_READY',
        'READY_FOR_AGGREGATION',
        'READY_FOR_PROCESSING',
        'READY_FOR_LOGISTICS',
        'IN_FULFILMENT',
        'FULFILLED',
        'PARTIALLY_FULFILLED',
        'FAILED',
        'CANCELLED'
      )
    );
  END IF;

  -- 1.2 Confirmed Quantity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'agricultural_supply_commitments' 
      AND column_name = 'confirmed_quantity'
  ) THEN
    ALTER TABLE public.agricultural_supply_commitments
    ADD COLUMN confirmed_quantity NUMERIC(14, 2) DEFAULT NULL CHECK (
      confirmed_quantity IS NULL OR confirmed_quantity >= 0
    );
  END IF;

  -- 1.3 Fulfilled Quantity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'agricultural_supply_commitments' 
      AND column_name = 'fulfilled_quantity'
  ) THEN
    ALTER TABLE public.agricultural_supply_commitments
    ADD COLUMN fulfilled_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (
      fulfilled_quantity >= 0
    );
  END IF;

  -- 1.4 Remaining Quantity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'agricultural_supply_commitments' 
      AND column_name = 'remaining_quantity'
  ) THEN
    ALTER TABLE public.agricultural_supply_commitments
    ADD COLUMN remaining_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (
      remaining_quantity >= 0
    );
  END IF;

  -- 1.5 Reconciliation Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'agricultural_supply_commitments' 
      AND column_name = 'reconciliation_status'
  ) THEN
    ALTER TABLE public.agricultural_supply_commitments
    ADD COLUMN reconciliation_status VARCHAR(40) NOT NULL DEFAULT 'PENDING' CHECK (
      reconciliation_status IN (
        'PENDING',
        'EXACT',
        'UNDER_FULFILLED',
        'OVER_FULFILLED_BLOCKED',
        'NO_FULFILMENT',
        'INSUFFICIENT_DATA'
      )
    );
  END IF;

  -- 1.6 Reconciled At & Reconciled By
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'agricultural_supply_commitments' 
      AND column_name = 'reconciled_at'
  ) THEN
    ALTER TABLE public.agricultural_supply_commitments
    ADD COLUMN reconciled_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'agricultural_supply_commitments' 
      AND column_name = 'reconciled_by'
  ) THEN
    ALTER TABLE public.agricultural_supply_commitments
    ADD COLUMN reconciled_by UUID REFERENCES public.profiles(id) DEFAULT NULL;
  END IF;

  -- 1.7 Failure Reason
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'agricultural_supply_commitments' 
      AND column_name = 'failure_reason'
  ) THEN
    ALTER TABLE public.agricultural_supply_commitments
    ADD COLUMN failure_reason VARCHAR(50) DEFAULT NULL CHECK (
      failure_reason IS NULL OR failure_reason IN (
        'SUPPLY_UNAVAILABLE',
        'QUANTITY_SHORTFALL',
        'TIMING_FAILURE',
        'PROCESSING_CONSTRAINT',
        'LOGISTICS_CONSTRAINT',
        'SECURITY_DISRUPTION',
        'QUALITY_REQUIREMENT_UNMET',
        'PARTICIPANT_WITHDRAWAL',
        'EXPIRED_COMMITMENT',
        'INSUFFICIENT_EVIDENCE',
        'OTHER'
      )
    );
  END IF;

  -- 1.8 Dispute Link
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'agricultural_supply_commitments' 
      AND column_name = 'dispute_id'
  ) THEN
    ALTER TABLE public.agricultural_supply_commitments
    ADD COLUMN dispute_id UUID REFERENCES public.disputes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Initialize remaining_quantity for existing commitments
UPDATE public.agricultural_supply_commitments
SET remaining_quantity = committed_quantity - fulfilled_quantity
WHERE remaining_quantity = 0 AND committed_quantity > fulfilled_quantity;

-- Indexes for supply commitment fulfilment queries
CREATE INDEX IF NOT EXISTS idx_agri_commit_readiness ON public.agricultural_supply_commitments(readiness_status);
CREATE INDEX IF NOT EXISTS idx_agri_commit_reconciliation ON public.agricultural_supply_commitments(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_agri_commit_dispute ON public.agricultural_supply_commitments(dispute_id);

-- ------------------------------------------------------------------------------
-- 2. COMMITMENT EVIDENCE TABLE (Provenance-Aware Fulfilment Records)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_commitment_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id UUID NOT NULL REFERENCES public.agricultural_supply_commitments(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.agricultural_coordination_opportunities(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  evidence_category VARCHAR(50) NOT NULL CHECK (
    evidence_category IN (
      'PRODUCER_CONFIRMATION',
      'QUANTITY_CONFIRMATION',
      'AVAILABILITY_CONFIRMATION',
      'AGGREGATION_CONFIRMATION',
      'PROCESSING_CONFIRMATION',
      'LOGISTICS_HANDOFF',
      'DELIVERY_CONFIRMATION'
    )
  ),
  provenance VARCHAR(40) NOT NULL CHECK (
    provenance IN (
      'SELF_REPORTED',
      'SYSTEM_DERIVED',
      'TRANSACTION_OBSERVED',
      'AUTHORIZED_REVIEW',
      'EXTERNAL_SOURCE'
    )
  ),
  quantity_observed NUMERIC(14, 2) DEFAULT NULL CHECK (
    quantity_observed IS NULL OR quantity_observed >= 0
  ),
  unit VARCHAR(30) DEFAULT NULL,
  reference_id UUID DEFAULT NULL,
  reference_type VARCHAR(50) DEFAULT NULL CHECK (
    reference_type IS NULL OR reference_type IN (
      'DELIVERY',
      'DELIVERY_EVENT',
      'PROCESSING_EVENT',
      'AGGREGATION_POOL',
      'DISPUTE',
      'MANUAL_INSPECTION'
    )
  ),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT chk_no_pork_commitment_evidence CHECK (
    (notes IS NULL OR notes !~* '\y(pork|pig|swine|bacon|ham|lard|porcine)\y')
    AND NOT (metadata::text ~* '\y(pork|pig|swine|bacon|ham|lard|porcine)\y')
  )
);

CREATE INDEX IF NOT EXISTS idx_agri_evidence_commitment ON public.agricultural_commitment_evidence(commitment_id);
CREATE INDEX IF NOT EXISTS idx_agri_evidence_opportunity ON public.agricultural_commitment_evidence(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_agri_evidence_submitter ON public.agricultural_commitment_evidence(submitted_by);
CREATE INDEX IF NOT EXISTS idx_agri_evidence_category ON public.agricultural_commitment_evidence(evidence_category);
CREATE INDEX IF NOT EXISTS idx_agri_evidence_provenance ON public.agricultural_commitment_evidence(provenance);

-- ------------------------------------------------------------------------------
-- 3. EXPAND COORDINATION EVENT TYPES CHECK CONSTRAINT
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.agricultural_coordination_events
    DROP CONSTRAINT IF EXISTS agricultural_coordination_events_event_type_check;

  ALTER TABLE public.agricultural_coordination_events
    ADD CONSTRAINT agricultural_coordination_events_event_type_check CHECK (
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
        'CONCURRENCY_BLOCKED',
        'READINESS_CHANGED',
        'EVIDENCE_SUBMITTED',
        'RECONCILIATION_COMPLETED',
        'FULFILMENT_EXCEPTION_RECORDED',
        'DISPUTE_LINKED',
        'SHORTFALL_DECLARED'
      )
    );
END $$;

-- ------------------------------------------------------------------------------
-- 4. ATOMIC FULFILMENT & RECONCILIATION FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atomic_record_commitment_fulfilment(
  p_commitment_id UUID,
  p_actor_id UUID,
  p_fulfilled_quantity NUMERIC,
  p_evidence_category VARCHAR,
  p_provenance VARCHAR,
  p_notes TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type VARCHAR DEFAULT NULL,
  p_failure_reason VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commitment RECORD;
  v_opportunity RECORD;
  v_new_fulfilled NUMERIC(14, 2);
  v_remaining NUMERIC(14, 2);
  v_reconciliation_status VARCHAR(40);
  v_new_commitment_status VARCHAR(40);
  v_new_readiness_status VARCHAR(40);
  v_new_opp_fulfilled NUMERIC(14, 2);
  v_evidence_id UUID;
  v_event_id UUID;
BEGIN
  -- Anti-Pork Invariant Verification
  IF p_notes IS NOT NULL AND p_notes ~* '\y(pork|pig|swine|bacon|ham|lard|porcine)\y' THEN
    RAISE EXCEPTION 'PROHIBITED_COMMODITY: Fulfilment notes contain prohibited items';
  END IF;

  -- 1. Lock and fetch supply commitment
  SELECT * INTO v_commitment
  FROM public.agricultural_supply_commitments
  WHERE id = p_commitment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COMMITMENT_NOT_FOUND: Commitment with ID % does not exist', p_commitment_id;
  END IF;

  -- Validate commitment status allows fulfilment
  IF v_commitment.status NOT IN ('ACCEPTED', 'CONFIRMED', 'FULFILMENT_PENDING', 'PARTIALLY_FULFILLED') THEN
    RAISE EXCEPTION 'INVALID_COMMITMENT_STATE: Commitment status % does not allow fulfilment', v_commitment.status;
  END IF;

  -- 2. Lock and fetch coordination opportunity
  SELECT * INTO v_opportunity
  FROM public.agricultural_coordination_opportunities
  WHERE id = v_commitment.opportunity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OPPORTUNITY_NOT_FOUND: Opportunity with ID % does not exist', v_commitment.opportunity_id;
  END IF;

  -- 3. Quantity Accounting & Mathematical Safeguards
  IF p_fulfilled_quantity < 0 THEN
    RAISE EXCEPTION 'NEGATIVE_QUANTITY: Fulfilled quantity cannot be negative';
  END IF;

  v_new_fulfilled := COALESCE(v_commitment.fulfilled_quantity, 0) + p_fulfilled_quantity;

  -- Check for over-fulfilment exceeding committed quantity
  IF v_new_fulfilled > v_commitment.committed_quantity THEN
    -- Log concurrency/accounting block
    INSERT INTO public.agricultural_coordination_events (
      opportunity_id,
      commitment_id,
      actor_id,
      event_type,
      title,
      details
    ) VALUES (
      v_commitment.opportunity_id,
      v_commitment.id,
      p_actor_id,
      'CONCURRENCY_BLOCKED',
      'Fulfilment exceeds committed quantity',
      jsonb_build_object(
        'attempted_quantity', p_fulfilled_quantity,
        'current_fulfilled', v_commitment.fulfilled_quantity,
        'committed_quantity', v_commitment.committed_quantity
      )
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', 'OVER_FULFILLED_BLOCKED',
      'message', 'Fulfilment would exceed committed quantity'
    );
  END IF;

  v_remaining := v_commitment.committed_quantity - v_new_fulfilled;

  -- 4. Derive Statuses based on reconciliation
  IF v_remaining = 0 THEN
    v_reconciliation_status := 'EXACT';
    v_new_commitment_status := 'FULFILLED';
    v_new_readiness_status := 'FULFILLED';
  ELSIF v_new_fulfilled > 0 AND p_failure_reason IS NOT NULL THEN
    v_reconciliation_status := 'UNDER_FULFILLED';
    v_new_commitment_status := 'FAILED';
    v_new_readiness_status := 'PARTIALLY_FULFILLED';
  ELSIF v_new_fulfilled > 0 THEN
    v_reconciliation_status := 'UNDER_FULFILLED';
    v_new_commitment_status := 'PARTIALLY_FULFILLED';
    v_new_readiness_status := 'IN_FULFILMENT';
  ELSIF p_failure_reason IS NOT NULL THEN
    v_reconciliation_status := 'NO_FULFILMENT';
    v_new_commitment_status := 'FAILED';
    v_new_readiness_status := 'FAILED';
  ELSE
    v_reconciliation_status := 'PENDING';
    v_new_commitment_status := v_commitment.status;
    v_new_readiness_status := v_commitment.readiness_status;
  END IF;

  -- 5. Update Commitment
  UPDATE public.agricultural_supply_commitments
  SET
    fulfilled_quantity = v_new_fulfilled,
    remaining_quantity = v_remaining,
    status = v_new_commitment_status,
    readiness_status = v_new_readiness_status,
    reconciliation_status = v_reconciliation_status,
    reconciled_at = timezone('utc'::text, now()),
    reconciled_by = p_actor_id,
    failure_reason = COALESCE(p_failure_reason, failure_reason),
    updated_at = timezone('utc'::text, now())
  WHERE id = v_commitment.id;

  -- 6. Update Opportunity Fulfilled Quantity & Status
  v_new_opp_fulfilled := COALESCE(v_opportunity.fulfilled_quantity, 0) + p_fulfilled_quantity;
  
  UPDATE public.agricultural_coordination_opportunities
  SET
    fulfilled_quantity = v_new_opp_fulfilled,
    status = CASE
      WHEN v_new_opp_fulfilled >= required_quantity THEN 'COMPLETED'
      WHEN status IN ('OPEN', 'COORDINATING', 'PARTIALLY_COMMITTED', 'FULLY_COMMITTED') AND v_new_opp_fulfilled > 0 THEN 'IN_FULFILMENT'
      ELSE status
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = v_opportunity.id;

  -- 7. Insert Evidence
  INSERT INTO public.agricultural_commitment_evidence (
    commitment_id,
    opportunity_id,
    submitted_by,
    evidence_category,
    provenance,
    quantity_observed,
    unit,
    reference_id,
    reference_type,
    notes,
    metadata
  ) VALUES (
    v_commitment.id,
    v_opportunity.id,
    p_actor_id,
    p_evidence_category,
    p_provenance,
    p_fulfilled_quantity,
    v_commitment.unit,
    p_reference_id,
    p_reference_type,
    p_notes,
    jsonb_build_object('recorded_by_rpc', true)
  )
  RETURNING id INTO v_evidence_id;

  -- 8. Append Immutable Event
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
    p_actor_id,
    'FULFILMENT_RECORDED',
    format('Fulfilment of %s %s recorded', p_fulfilled_quantity, v_commitment.unit),
    jsonb_build_object(
      'fulfilled_quantity', p_fulfilled_quantity,
      'total_fulfilled', v_new_fulfilled,
      'remaining_quantity', v_remaining,
      'reconciliation_status', v_reconciliation_status,
      'evidence_id', v_evidence_id,
      'evidence_category', p_evidence_category,
      'provenance', p_provenance,
      'failure_reason', p_failure_reason
    )
  )
  RETURNING id INTO v_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'commitment_id', v_commitment.id,
    'opportunity_id', v_opportunity.id,
    'fulfilled_quantity', v_new_fulfilled,
    'remaining_quantity', v_remaining,
    'reconciliation_status', v_reconciliation_status,
    'commitment_status', v_new_commitment_status,
    'readiness_status', v_new_readiness_status,
    'evidence_id', v_evidence_id,
    'event_id', v_event_id
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. RLS POLICIES FOR COMMITMENT EVIDENCE
-- ------------------------------------------------------------------------------
ALTER TABLE public.agricultural_commitment_evidence ENABLE ROW LEVEL SECURITY;

-- Select Policy: Submitter, Opportunity creator, Commitment participant or Admin can view evidence
CREATE POLICY "agricultural_commitment_evidence_select_policy"
  ON public.agricultural_commitment_evidence
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agricultural_coordination_opportunities aco
      WHERE aco.id = agricultural_commitment_evidence.opportunity_id
        AND aco.creator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.agricultural_supply_commitments sc
      WHERE sc.id = agricultural_commitment_evidence.commitment_id
        AND sc.participant_id = auth.uid()
    )
  );

-- Insert Policy: Submitter must be authenticated and submitted_by = auth.uid() or admin
CREATE POLICY "agricultural_commitment_evidence_insert_policy"
  ON public.agricultural_commitment_evidence
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = submitted_by
    OR public.is_admin()
  );

-- Grant execute on atomic function
GRANT EXECUTE ON FUNCTION public.atomic_record_commitment_fulfilment TO authenticated;
