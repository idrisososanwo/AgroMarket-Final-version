-- ==============================================================================
-- AGROMARKET PHASE 1.3: ATOMIC EQUIPMENT RENTAL OPERATIONS & DATABASE ENFORCEMENT
-- Enforces transactional concurrency safety, canonical state machines, and
-- least-privilege table permissions for equipment rentals.
--
-- Security Invariants:
-- 1. Direct INSERT and UPDATE on public.equipment_rentals revoked from anon/authenticated.
-- 2. Strict SELECT RLS policy preserved (renters, owners, admins only).
-- 3. Atomic booking creation via create_equipment_rental_booking() with FOR UPDATE equipment lock.
-- 4. Atomic rental approval via approve_equipment_rental() with identical lock order (equipment first, rental second).
-- 5. Authorized lifecycle transitions via transition_equipment_rental_status() enforcing role permissions.
-- ==============================================================================

-- 1. Least-Privilege Table Grants & Mutation Lockdown
-- Revoke direct client mutations so PostgREST clients cannot bypass the state machine or inject rates.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.equipment_rentals FROM anon, authenticated;

-- Ensure authenticated users can still select rentals they participate in or administer
GRANT SELECT ON TABLE public.equipment_rentals TO authenticated;

-- Drop legacy permissive insert/update policies if present
DROP POLICY IF EXISTS "Renters can initiate rental" ON public.equipment_rentals;
DROP POLICY IF EXISTS "Renters and owners can update rentals" ON public.equipment_rentals;

-- Ensure Admin full access policy exists for direct management if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'equipment_rentals'
      AND policyname = 'Admins manage all equipment rentals'
  ) THEN
    CREATE POLICY "Admins manage all equipment rentals"
      ON public.equipment_rentals
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;


-- ==============================================================================
-- 2. ATOMIC BOOKING CREATION RPC
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_equipment_rental_booking(
  p_equipment_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_handover_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_equipment RECORD;
  v_conflict_count INT;
  v_total_days INT;
  v_total_rental_amount NUMERIC(14, 2);
  v_deposit_amount NUMERIC(14, 2);
  v_rental_id UUID;
BEGIN
  -- 1. Authentication check
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required to book equipment.');
  END IF;

  -- 2. Date validation
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Start date and end date are required.');
  END IF;

  IF p_end_date < p_start_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'End date must be on or after start date.');
  END IF;

  IF p_start_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Start date cannot be in the past.');
  END IF;

  -- 3. Lock the relevant equipment row FIRST to serialize concurrent bookings
  SELECT
    id,
    owner_id,
    status,
    is_available,
    daily_rental_rate,
    caution_deposit,
    currency
  INTO v_equipment
  FROM public.equipment
  WHERE id = p_equipment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'The requested equipment does not exist.');
  END IF;

  -- 4. Verify equipment is active and available
  IF v_equipment.status != 'ACTIVE' OR NOT v_equipment.is_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'This equipment is currently unavailable for rental.');
  END IF;

  -- 5. Block self-rental
  IF v_equipment.owner_id = v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot rent your own equipment.');
  END IF;

  -- 6. Check for conflicting APPROVED or ACTIVE rentals
  -- Overlap condition: existing.start_date <= requested.end_date AND existing.end_date >= requested.start_date
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.equipment_rentals
  WHERE equipment_id = p_equipment_id
    AND status IN ('APPROVED', 'ACTIVE')
    AND start_date <= p_end_date
    AND end_date >= p_start_date;

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This equipment is already booked or approved for the selected dates.');
  END IF;

  -- 7. Calculate server-authoritative duration and financials
  v_total_days := (p_end_date - p_start_date) + 1;
  v_total_rental_amount := ROUND((v_equipment.daily_rental_rate * v_total_days), 2);
  v_deposit_amount := ROUND(v_equipment.caution_deposit, 2);

  -- 8. Insert authoritative rental record
  INSERT INTO public.equipment_rentals (
    equipment_id,
    renter_id,
    owner_id,
    start_date,
    end_date,
    total_days,
    daily_rate,
    total_rental_amount,
    deposit_amount,
    currency,
    status,
    handover_notes
  ) VALUES (
    p_equipment_id,
    v_caller_id,
    v_equipment.owner_id,
    p_start_date,
    p_end_date,
    v_total_days,
    v_equipment.daily_rental_rate,
    v_total_rental_amount,
    v_deposit_amount,
    COALESCE(v_equipment.currency, 'NGN'),
    'REQUESTED',
    p_handover_notes
  ) RETURNING id INTO v_rental_id;

  RETURN jsonb_build_object(
    'success', true,
    'rental_id', v_rental_id
  );
END;
$$;


-- ==============================================================================
-- 2. ATOMIC RENTAL APPROVAL RPC
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.approve_equipment_rental(
  p_rental_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN := public.is_admin();
  v_equipment_id UUID;
  v_equipment RECORD;
  v_rental RECORD;
  v_conflict_count INT;
BEGIN
  -- 1. Authentication check
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  -- Resolve parent equipment_id
  SELECT equipment_id INTO v_equipment_id
  FROM public.equipment_rentals
  WHERE id = p_rental_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rental record not found.');
  END IF;

  -- 2. LOCK ORDER: Lock equipment row FIRST
  SELECT id, owner_id INTO v_equipment
  FROM public.equipment
  WHERE id = v_equipment_id
  FOR UPDATE;

  -- 3. LOCK ORDER: Lock rental row SECOND
  SELECT * INTO v_rental
  FROM public.equipment_rentals
  WHERE id = p_rental_id
  FOR UPDATE;

  -- 4. Authorization: Caller must be owner or admin
  IF v_rental.owner_id != v_caller_id AND NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. Only the equipment owner or an administrator can approve rentals.');
  END IF;

  -- 5. State verification: Current status must be REQUESTED
  IF v_rental.status != 'REQUESTED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rental cannot be approved because it is not in REQUESTED status.');
  END IF;

  -- 6. Schedule conflict verification against APPROVED or ACTIVE rentals
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.equipment_rentals
  WHERE equipment_id = v_rental.equipment_id
    AND id != p_rental_id
    AND status IN ('APPROVED', 'ACTIVE')
    AND start_date <= v_rental.end_date
    AND end_date >= v_rental.start_date;

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot approve rental: date range conflicts with an existing approved or active rental.');
  END IF;

  -- 7. Update status to APPROVED
  UPDATE public.equipment_rentals
  SET status = 'APPROVED',
      handover_notes = COALESCE(p_notes, handover_notes),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_rental_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'APPROVED'
  );
END;
$$;


-- ==============================================================================
-- 3. AUTHORIZED RENTAL LIFECYCLE TRANSITION RPC
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.transition_equipment_rental_status(
  p_rental_id UUID,
  p_target_status VARCHAR,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN := public.is_admin();
  v_equipment_id UUID;
  v_rental RECORD;
  v_current_status VARCHAR;
  v_is_owner BOOLEAN;
  v_is_renter BOOLEAN;
  v_authorized BOOLEAN := false;
BEGIN
  -- 1. Authentication check
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  -- Route APPROVED transition directly to atomic approval logic
  IF p_target_status = 'APPROVED' THEN
    RETURN public.approve_equipment_rental(p_rental_id, p_notes);
  END IF;

  -- Resolve parent equipment_id
  SELECT equipment_id INTO v_equipment_id
  FROM public.equipment_rentals
  WHERE id = p_rental_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rental record not found.');
  END IF;

  -- LOCK ORDER: Lock equipment row first, rental row second
  PERFORM 1 FROM public.equipment WHERE id = v_equipment_id FOR UPDATE;

  SELECT * INTO v_rental
  FROM public.equipment_rentals
  WHERE id = p_rental_id
  FOR UPDATE;

  v_current_status := v_rental.status;
  v_is_owner := (v_rental.owner_id = v_caller_id);
  v_is_renter := (v_rental.renter_id = v_caller_id);

  -- 2. Verify actor participation
  IF NOT v_is_owner AND NOT v_is_renter AND NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. You are not a party to this rental agreement.');
  END IF;

  -- 3. Transition validity and role authorization
  IF v_is_admin THEN
    -- Admin can execute any structurally valid transition
    IF (v_current_status = 'REQUESTED' AND p_target_status IN ('CANCELLED')) OR
       (v_current_status = 'APPROVED' AND p_target_status IN ('ACTIVE', 'CANCELLED', 'DISPUTED')) OR
       (v_current_status = 'ACTIVE' AND p_target_status IN ('RETURNED', 'DISPUTED')) OR
       (v_current_status = 'RETURNED' AND p_target_status IN ('COMPLETED', 'DISPUTED')) OR
       (v_current_status = 'DISPUTED' AND p_target_status IN ('COMPLETED', 'CANCELLED')) THEN
      v_authorized := true;
    END IF;
  ELSE
    -- Owner authorization
    IF v_is_owner THEN
      IF (v_current_status = 'REQUESTED' AND p_target_status = 'CANCELLED') OR
         (v_current_status = 'APPROVED' AND p_target_status IN ('ACTIVE', 'CANCELLED', 'DISPUTED')) OR
         (v_current_status = 'ACTIVE' AND p_target_status IN ('RETURNED', 'DISPUTED')) OR
         (v_current_status = 'RETURNED' AND p_target_status IN ('COMPLETED', 'DISPUTED')) THEN
        v_authorized := true;
      END IF;
    END IF;

    -- Renter authorization
    IF v_is_renter THEN
      IF (v_current_status = 'REQUESTED' AND p_target_status = 'CANCELLED') OR
         (v_current_status = 'APPROVED' AND p_target_status IN ('CANCELLED', 'DISPUTED')) OR
         (v_current_status = 'ACTIVE' AND p_target_status = 'DISPUTED') OR
         (v_current_status = 'RETURNED' AND p_target_status = 'DISPUTED') THEN
        v_authorized := true;
      END IF;
    END IF;
  END IF;

  IF NOT v_authorized THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Unauthorized or invalid transition from %s to %s.', v_current_status, p_target_status)
    );
  END IF;

  -- 4. Apply status update and appropriate notes
  IF p_target_status IN ('ACTIVE') AND p_notes IS NOT NULL THEN
    UPDATE public.equipment_rentals
    SET status = p_target_status,
        handover_notes = p_notes,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_rental_id;
  ELSIF p_target_status IN ('RETURNED', 'COMPLETED') AND p_notes IS NOT NULL THEN
    UPDATE public.equipment_rentals
    SET status = p_target_status,
        return_notes = p_notes,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_rental_id;
  ELSE
    UPDATE public.equipment_rentals
    SET status = p_target_status,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_rental_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', p_target_status
  );
END;
$$;


-- ==============================================================================
-- 4. SECURITY & PERMISSION BOUNDARIES
-- ==============================================================================

-- Revoke execute from public and anon
REVOKE ALL ON FUNCTION public.create_equipment_rental_booking(UUID, DATE, DATE, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_equipment_rental(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_equipment_rental_status(UUID, VARCHAR, TEXT) FROM PUBLIC;

-- Grant execution to authenticated users only
GRANT EXECUTE ON FUNCTION public.create_equipment_rental_booking(UUID, DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_equipment_rental(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_equipment_rental_status(UUID, VARCHAR, TEXT) TO authenticated;
