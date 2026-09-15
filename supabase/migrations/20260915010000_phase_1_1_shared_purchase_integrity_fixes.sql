-- ==============================================================================
-- Phase 1.1: Shared Purchase Integrity Fixes
-- ==============================================================================

-- 1. Unique constraint on shared_purchase_participants.order_id
-- Guarantees strict 1:1 participant to order integrity at DB level
ALTER TABLE public.shared_purchase_participants
  DROP CONSTRAINT IF EXISTS uq_sp_participants_order_id;
ALTER TABLE public.shared_purchase_participants
  ADD CONSTRAINT uq_sp_participants_order_id UNIQUE (order_id);

-- 2. Atomic Stock Reservation RPC
-- Locks public.inventory FOR UPDATE and checks availability before incrementing
CREATE OR REPLACE FUNCTION public.reserve_shared_purchase_stock(
  p_listing_id UUID,
  p_quantity NUMERIC(12, 2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inv RECORD;
  v_available NUMERIC(12, 2);
  v_new_reserved NUMERIC(12, 2);
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Requested reservation quantity must be greater than zero.';
  END IF;

  -- Lock inventory row FOR UPDATE
  SELECT id, quantity_on_hand, quantity_reserved, (quantity_on_hand - quantity_reserved) AS quantity_available
  INTO v_inv
  FROM public.inventory
  WHERE listing_id = p_listing_id
  FOR UPDATE;

  IF v_inv IS NULL THEN
    RAISE EXCEPTION 'Inventory record not found for listing.';
  END IF;

  v_available := v_inv.quantity_available;
  IF v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient available inventory. Available: %, Requested: %.', v_available, p_quantity;
  END IF;

  v_new_reserved := v_inv.quantity_reserved + p_quantity;

  UPDATE public.inventory
  SET quantity_reserved = v_new_reserved,
      updated_at = timezone('utc'::text, now())
  WHERE listing_id = p_listing_id;

  RETURN jsonb_build_object(
    'success', true,
    'previous_reserved', v_inv.quantity_reserved,
    'new_reserved', v_new_reserved,
    'quantity_available', (v_inv.quantity_on_hand - v_new_reserved)
  );
END;
$$;

-- 3. Atomic Stock Release RPC
CREATE OR REPLACE FUNCTION public.release_shared_purchase_stock(
  p_listing_id UUID,
  p_quantity NUMERIC(12, 2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inv RECORD;
  v_new_reserved NUMERIC(12, 2);
BEGIN
  SELECT id, quantity_on_hand, quantity_reserved
  INTO v_inv
  FROM public.inventory
  WHERE listing_id = p_listing_id
  FOR UPDATE;

  IF v_inv IS NOT NULL THEN
    v_new_reserved := GREATEST(0, v_inv.quantity_reserved - p_quantity);
    UPDATE public.inventory
    SET quantity_reserved = v_new_reserved,
        updated_at = timezone('utc'::text, now())
    WHERE listing_id = p_listing_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. Updated allocate_shared_purchase_participant Function
-- Fixes duplicate participant join allocation inflation and order orphanage
CREATE OR REPLACE FUNCTION public.allocate_shared_purchase_participant(
  p_shared_purchase_id UUID,
  p_user_id UUID,
  p_requested_quantity NUMERIC(12, 2),
  p_portion_choice VARCHAR(50) DEFAULT NULL,
  p_delivery_address TEXT DEFAULT '',
  p_delivery_state VARCHAR(50) DEFAULT '',
  p_delivery_lga VARCHAR(50) DEFAULT '',
  p_contact_phone VARCHAR(20) DEFAULT '',
  p_delivery_notes TEXT DEFAULT NULL,
  p_portion_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_user UUID;
  v_sp RECORD;
  v_listing RECORD;
  v_existing_participant RECORD;
  v_order_id UUID;
  v_order_number VARCHAR(50);
  v_share_amount NUMERIC(14, 2);
  v_participant_id UUID;
  v_new_allocated NUMERIC(12, 2);
  v_new_status VARCHAR(30);
  v_is_target_reached BOOLEAN := false;
BEGIN
  -- 1. Authorization check
  v_auth_user := auth.uid();
  IF v_auth_user IS NOT NULL AND v_auth_user <> p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: cannot allocate participation for another user.';
  END IF;

  -- 2. Lock Shared Purchase row FOR UPDATE (Strict Concurrency Barrier)
  SELECT *
  INTO v_sp
  FROM public.shared_purchases
  WHERE id = p_shared_purchase_id
  FOR UPDATE;

  IF v_sp IS NULL THEN
    RAISE EXCEPTION 'Shared purchase pool not found.';
  END IF;

  -- 3. Validate status
  IF v_sp.status <> 'OPEN' THEN
    RAISE EXCEPTION 'Shared purchase pool is not open for commitments (current status: %).', v_sp.status;
  END IF;

  -- 4. Validate deadline
  IF v_sp.deadline <= timezone('utc'::text, now()) THEN
    RAISE EXCEPTION 'Shared purchase pool has expired (closing date was %).', v_sp.deadline;
  END IF;

  -- 5. Duplicate Join & Existing Participant Check (CRITICAL FIX)
  SELECT *
  INTO v_existing_participant
  FROM public.shared_purchase_participants
  WHERE shared_purchase_id = p_shared_purchase_id
    AND user_id = p_user_id
  FOR UPDATE;

  IF v_existing_participant IS NOT NULL THEN
    IF v_existing_participant.status IN ('PLEDGED', 'PAYMENT_PENDING') THEN
      RAISE EXCEPTION 'User already has an active pledge in this pool. Cancel or pay for your existing pledge.';
    ELSIF v_existing_participant.status IN ('PAID', 'CONFIRMED', 'FULFILLED') THEN
      RAISE EXCEPTION 'User is already a confirmed participant in this pool.';
    END IF;
    -- If status is 'CANCELLED' or 'REFUNDED', previous quantity was already released.
    -- Proceed to reuse the participant slot without double-counting.
  END IF;

  -- 6. Validate requested quantity
  IF p_requested_quantity <= 0 THEN
    RAISE EXCEPTION 'Requested quantity must be greater than zero.';
  END IF;

  IF p_requested_quantity < v_sp.min_share_quantity THEN
    RAISE EXCEPTION 'Requested quantity (%) is below the minimum allowed share of % %.',
      p_requested_quantity, v_sp.min_share_quantity, v_sp.unit;
  END IF;

  IF v_sp.max_share_quantity IS NOT NULL AND p_requested_quantity > v_sp.max_share_quantity THEN
    RAISE EXCEPTION 'Requested quantity (%) exceeds the maximum allowed share of % %.',
      p_requested_quantity, v_sp.max_share_quantity, v_sp.unit;
  END IF;

  -- 7. Check available capacity
  IF (v_sp.allocated_quantity + p_requested_quantity) > v_sp.total_quantity THEN
    RAISE EXCEPTION 'Insufficient capacity remaining. Available: % %, Requested: % %.',
      (v_sp.total_quantity - v_sp.allocated_quantity), v_sp.unit, p_requested_quantity, v_sp.unit;
  END IF;

  -- 8. Lock and check listing & anti-pork produce
  SELECT l.*, p.name AS product_name
  INTO v_listing
  FROM public.listings l
  JOIN public.products p ON p.id = l.product_id
  WHERE l.id = v_sp.listing_id
  FOR UPDATE;

  IF v_listing IS NULL THEN
    RAISE EXCEPTION 'Underlying listing not found.';
  END IF;

  IF v_listing.title ~* '\y(pork|pig|swine|bacon|ham|lard)\y' OR
     v_listing.product_name ~* '\y(pork|pig|swine|bacon|ham|lard)\y' THEN
    RAISE EXCEPTION 'Prohibited produce item detected. AgroMarket strictly forbids pork/pig products.';
  END IF;

  -- 9. Calculate authoritative share amount in NGN
  v_share_amount := ROUND(p_requested_quantity * v_sp.unit_price, 2);
  IF v_share_amount <= 0 THEN
    RAISE EXCEPTION 'Calculated share amount must be greater than zero.';
  END IF;

  -- 10. Generate individual participant order
  v_order_number := 'AGRO-SP-' || to_char(timezone('utc'::text, now()), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 6));

  INSERT INTO public.orders (
    order_number,
    buyer_id,
    status,
    currency,
    subtotal_amount,
    delivery_fee_amount,
    discount_amount,
    total_amount,
    delivery_address,
    delivery_state,
    delivery_lga,
    contact_phone,
    delivery_notes,
    shared_purchase_id
  ) VALUES (
    v_order_number,
    p_user_id,
    'PENDING',
    'NGN',
    v_share_amount,
    0,
    0,
    v_share_amount,
    COALESCE(NULLIF(p_delivery_address, ''), v_sp.pickup_hub_location),
    COALESCE(NULLIF(p_delivery_state, ''), v_sp.hub_state),
    COALESCE(NULLIF(p_delivery_lga, ''), v_sp.hub_lga),
    p_contact_phone,
    p_delivery_notes,
    p_shared_purchase_id
  )
  RETURNING id INTO v_order_id;

  -- Insert order item snapshot
  INSERT INTO public.order_items (
    order_id,
    listing_id,
    seller_id,
    product_id,
    product_name_snapshot,
    unit_price_snapshot,
    quantity,
    unit_snapshot,
    total_price,
    status
  ) VALUES (
    v_order_id,
    v_listing.id,
    v_listing.seller_id,
    v_listing.product_id,
    v_sp.title || ' (Shared Portion)',
    v_sp.unit_price,
    p_requested_quantity,
    v_sp.unit,
    v_share_amount,
    'PENDING'
  );

  -- 11. Insert new participant or reactivate previously cancelled participant
  IF v_existing_participant IS NOT NULL THEN
    UPDATE public.shared_purchase_participants
    SET order_id = v_order_id,
        shares_count = p_requested_quantity,
        share_amount = v_share_amount,
        unit = v_sp.unit,
        unit_price = v_sp.unit_price,
        portion_choice = p_portion_choice,
        portion_allocation_notes = p_portion_notes,
        status = 'PLEDGED',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_existing_participant.id
    RETURNING id INTO v_participant_id;
  ELSE
    INSERT INTO public.shared_purchase_participants (
      shared_purchase_id,
      user_id,
      order_id,
      shares_count,
      share_amount,
      unit,
      unit_price,
      portion_choice,
      portion_allocation_notes,
      status
    ) VALUES (
      p_shared_purchase_id,
      p_user_id,
      v_order_id,
      p_requested_quantity,
      v_share_amount,
      v_sp.unit,
      v_sp.unit_price,
      p_portion_choice,
      p_portion_notes,
      'PLEDGED'
    )
    RETURNING id INTO v_participant_id;
  END IF;

  -- 12. Recalculate allocated quantity and pool status
  v_new_allocated := v_sp.allocated_quantity + p_requested_quantity;
  IF v_new_allocated >= v_sp.total_quantity THEN
    v_new_status := 'TARGET_REACHED';
    v_is_target_reached := true;
  ELSE
    v_new_status := v_sp.status;
  END IF;

  UPDATE public.shared_purchases
  SET
    allocated_quantity = v_new_allocated,
    status = v_new_status,
    current_participants = (
      SELECT COUNT(*)
      FROM public.shared_purchase_participants
      WHERE shared_purchase_id = p_shared_purchase_id
        AND status NOT IN ('CANCELLED', 'REFUNDED')
    ),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_shared_purchase_id;

  RETURN jsonb_build_object(
    'participant_id', v_participant_id,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'share_amount', v_share_amount,
    'allocated_quantity', v_new_allocated,
    'remaining_quantity', (v_sp.total_quantity - v_new_allocated),
    'is_target_reached', v_is_target_reached
  );
END;
$$;

-- 5. Stale Unpaid Pledge Expiration Function
CREATE OR REPLACE FUNCTION public.expire_stale_shared_purchase_pledges(
  p_shared_purchase_id UUID DEFAULT NULL,
  p_ttl_minutes INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_part RECORD;
  v_sp RECORD;
  v_has_payment BOOLEAN;
  v_expired_count INT := 0;
  v_reclaimed_qty NUMERIC(12, 2) := 0;
  v_new_allocated NUMERIC(12, 2);
  v_new_status VARCHAR(30);
BEGIN
  v_cutoff := timezone('utc'::text, now()) - (p_ttl_minutes || ' minutes')::INTERVAL;

  -- Loop through active unpaid participants created or updated before cutoff
  FOR v_part IN
    SELECT p.id, p.shared_purchase_id, p.order_id, p.shares_count, p.user_id, p.status
    FROM public.shared_purchase_participants p
    WHERE (p_shared_purchase_id IS NULL OR p.shared_purchase_id = p_shared_purchase_id)
      AND p.status IN ('PLEDGED', 'PAYMENT_PENDING')
      AND p.updated_at <= v_cutoff
    FOR UPDATE
  LOOP
    -- Verify no successful payment exists for this order
    IF v_part.order_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.payments
        WHERE order_id = v_part.order_id
          AND status IN ('SUCCESSFUL', 'PAID')
      ) INTO v_has_payment;
    ELSE
      v_has_payment := false;
    END IF;

    -- If no successful payment, expire the pledge
    IF NOT v_has_payment THEN
      -- 1. Mark participant as CANCELLED with note
      UPDATE public.shared_purchase_participants
      SET status = 'CANCELLED',
          portion_allocation_notes = COALESCE(portion_allocation_notes, '') || ' [EXPIRED_STALE_PLEDGE]',
          updated_at = timezone('utc'::text, now())
      WHERE id = v_part.id;

      -- 2. Cancel order
      IF v_part.order_id IS NOT NULL THEN
        UPDATE public.orders
        SET status = 'CANCELLED',
            updated_at = timezone('utc'::text, now())
        WHERE id = v_part.order_id
          AND status = 'PENDING';
      END IF;

      -- 3. Lock pool and deduct allocated quantity
      SELECT * INTO v_sp
      FROM public.shared_purchases
      WHERE id = v_part.shared_purchase_id
      FOR UPDATE;

      IF v_sp IS NOT NULL THEN
        v_new_allocated := GREATEST(0, v_sp.allocated_quantity - v_part.shares_count);
        -- If pool was TARGET_REACHED, reopen to OPEN if capacity remains
        IF v_new_allocated < v_sp.total_quantity AND v_sp.status IN ('TARGET_REACHED', 'OPEN') THEN
          v_new_status := 'OPEN';
        ELSE
          v_new_status := v_sp.status;
        END IF;

        UPDATE public.shared_purchases
        SET allocated_quantity = v_new_allocated,
            status = v_new_status,
            current_participants = (
              SELECT COUNT(*)
              FROM public.shared_purchase_participants
              WHERE shared_purchase_id = v_part.shared_purchase_id
                AND status NOT IN ('CANCELLED', 'REFUNDED')
            ),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_part.shared_purchase_id;

        v_reclaimed_qty := v_reclaimed_qty + v_part.shares_count;
        v_expired_count := v_expired_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'expired_count', v_expired_count,
    'reclaimed_quantity', v_reclaimed_qty
  );
END;
$$;
