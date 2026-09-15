-- ==============================================================================
-- Phase 1.1: Shared Purchase (Bulk Crops & Livestock Splitting)
-- ==============================================================================

-- 1. Extend public.shared_purchases
ALTER TABLE public.shared_purchases
  ADD COLUMN IF NOT EXISTS purchase_type VARCHAR(30) NOT NULL DEFAULT 'BULK_CROP'
    CHECK (purchase_type IN ('BULK_CROP', 'ANIMAL_PORTION')),
  ADD COLUMN IF NOT EXISTS allocated_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0
    CHECK (allocated_quantity >= 0),
  ADD COLUMN IF NOT EXISTS remaining_quantity NUMERIC(12, 2)
    GENERATED ALWAYS AS (total_quantity - allocated_quantity) STORED,
  ADD COLUMN IF NOT EXISTS max_share_quantity NUMERIC(12, 2)
    CHECK (max_share_quantity IS NULL OR max_share_quantity >= min_share_quantity),
  ADD COLUMN IF NOT EXISTS portion_model VARCHAR(30) DEFAULT 'FRACTIONAL'
    CHECK (portion_model IN ('FRACTIONAL', 'WEIGHT_BASED')),
  ADD COLUMN IF NOT EXISTS portion_fractions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update status constraint to full state machine
ALTER TABLE public.shared_purchases DROP CONSTRAINT IF EXISTS shared_purchases_status_check;
ALTER TABLE public.shared_purchases ADD CONSTRAINT shared_purchases_status_check
  CHECK (status IN ('DRAFT', 'OPEN', 'TARGET_REACHED', 'PAYMENT_PENDING', 'CONFIRMED', 'FULFILMENT', 'COMPLETED', 'CANCELLED', 'EXPIRED'));

-- Enforce allocated_quantity never exceeds total_quantity at DB engine level
ALTER TABLE public.shared_purchases DROP CONSTRAINT IF EXISTS chk_allocated_not_exceed_total;
ALTER TABLE public.shared_purchases ADD CONSTRAINT chk_allocated_not_exceed_total
  CHECK (allocated_quantity <= total_quantity);

-- Strict Anti-Pork / Halal database constraint on shared purchases
ALTER TABLE public.shared_purchases DROP CONSTRAINT IF EXISTS chk_no_pork_shared_purchases;
ALTER TABLE public.shared_purchases ADD CONSTRAINT chk_no_pork_shared_purchases
  CHECK (
    title !~* '\y(pork|pig|swine|bacon|ham|lard)\y' AND
    (description IS NULL OR description !~* '\y(pork|pig|swine|bacon|ham|lard)\y')
  );

-- 2. Extend public.shared_purchase_participants
ALTER TABLE public.shared_purchase_participants
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS unit VARCHAR(30) NOT NULL DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  ADD COLUMN IF NOT EXISTS portion_choice VARCHAR(50),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Update participant status constraint
ALTER TABLE public.shared_purchase_participants DROP CONSTRAINT IF EXISTS shared_purchase_participants_status_check;
ALTER TABLE public.shared_purchase_participants ADD CONSTRAINT shared_purchase_participants_status_check
  CHECK (status IN ('PLEDGED', 'PAYMENT_PENDING', 'PAID', 'CONFIRMED', 'FULFILLED', 'CANCELLED', 'REFUNDED'));

-- 3. Extend public.orders for bidirectional traceability
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shared_purchase_id UUID REFERENCES public.shared_purchases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_shared_purchase_id ON public.orders(shared_purchase_id);
CREATE INDEX IF NOT EXISTS idx_shared_purchases_listing ON public.shared_purchases(listing_id);
CREATE INDEX IF NOT EXISTS idx_shared_purchases_creator ON public.shared_purchases(created_by);
CREATE INDEX IF NOT EXISTS idx_shared_purchases_type_status ON public.shared_purchases(purchase_type, status);
CREATE INDEX IF NOT EXISTS idx_sp_participants_order ON public.shared_purchase_participants(order_id);
CREATE INDEX IF NOT EXISTS idx_sp_participants_user_status ON public.shared_purchase_participants(user_id, status);

-- 4. Atomic PostgreSQL Function for Row-Locked Allocation & Participant Order Creation
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
  v_product RECORD;
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

  -- 5. Validate requested quantity
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

  -- 6. Check available capacity
  IF (v_sp.allocated_quantity + p_requested_quantity) > v_sp.total_quantity THEN
    RAISE EXCEPTION 'Insufficient capacity remaining. Available: % %, Requested: % %.',
      (v_sp.total_quantity - v_sp.allocated_quantity), v_sp.unit, p_requested_quantity, v_sp.unit;
  END IF;

  -- 7. Lock and check listing & anti-pork produce
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

  -- 8. Calculate authoritative share amount in NGN
  v_share_amount := ROUND(p_requested_quantity * v_sp.unit_price, 2);
  IF v_share_amount <= 0 THEN
    RAISE EXCEPTION 'Calculated share amount must be greater than zero.';
  END IF;

  -- 9. Generate individual participant order
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

  -- 10. Upsert/insert participant record
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
  ON CONFLICT (shared_purchase_id, user_id) DO UPDATE SET
    order_id = EXCLUDED.order_id,
    shares_count = EXCLUDED.shares_count,
    share_amount = EXCLUDED.share_amount,
    unit = EXCLUDED.unit,
    unit_price = EXCLUDED.unit_price,
    portion_choice = EXCLUDED.portion_choice,
    portion_allocation_notes = EXCLUDED.portion_allocation_notes,
    status = 'PLEDGED',
    updated_at = timezone('utc'::text, now())
  RETURNING id INTO v_participant_id;

  -- 11. Recalculate allocated quantity and pool status
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

-- 5. Hardened RLS Policies
DROP POLICY IF EXISTS "Shared purchases viewable by all" ON public.shared_purchases;
CREATE POLICY "Shared purchases viewable by all"
  ON public.shared_purchases FOR SELECT
  TO authenticated, anon
  USING (status <> 'DRAFT' OR auth.uid() = created_by OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can create shared purchases" ON public.shared_purchases;
CREATE POLICY "Sellers and admins can create shared purchases"
  ON public.shared_purchases FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND (
      public.is_admin() OR
      EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Sellers can update their own shared purchases" ON public.shared_purchases;
CREATE POLICY "Sellers can update their own shared purchases"
  ON public.shared_purchases FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR public.is_admin())
  WITH CHECK (auth.uid() = created_by OR public.is_admin());

-- Revoke standard client deletes on shared_purchases
DROP POLICY IF EXISTS "Admins can delete shared purchases" ON public.shared_purchases;
CREATE POLICY "Admins can delete shared purchases"
  ON public.shared_purchases FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Participant RLS
DROP POLICY IF EXISTS "Participants can view shared purchase members" ON public.shared_purchase_participants;
CREATE POLICY "Participants and sellers can view members"
  ON public.shared_purchase_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.shared_purchases sp
      WHERE sp.id = shared_purchase_participants.shared_purchase_id
        AND sp.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can join shared purchase" ON public.shared_purchase_participants;
CREATE POLICY "Users can join shared purchase"
  ON public.shared_purchase_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Participants can update their pledges" ON public.shared_purchase_participants;
CREATE POLICY "Participants can update their pledges"
  ON public.shared_purchase_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
