-- ==============================================================================
-- AGROMARKET PHASE 0.5 MIGRATION: CART & ORDER FOUNDATION
-- RLS policies, indexes, and atomic order creation stored procedure
-- ==============================================================================

-- 1. RLS Policies for Order Items and Orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_items' AND policyname = 'Buyers can insert order items'
  ) THEN
    CREATE POLICY "Buyers can insert order items"
      ON public.order_items FOR INSERT
      TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_items.order_id AND o.buyer_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' AND policyname = 'Authorized users can update orders'
  ) THEN
    CREATE POLICY "Authorized users can update orders"
      ON public.orders FOR UPDATE
      TO authenticated
      USING (
        auth.uid() = buyer_id OR 
        public.is_admin() OR 
        EXISTS (
          SELECT 1 FROM public.order_items oi 
          WHERE oi.order_id = orders.id AND oi.seller_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_items' AND policyname = 'Authorized users can update order items'
  ) THEN
    CREATE POLICY "Authorized users can update order items"
      ON public.order_items FOR UPDATE
      TO authenticated
      USING (
        seller_id = auth.uid() OR 
        public.is_admin() OR 
        EXISTS (
          SELECT 1 FROM public.orders o 
          WHERE o.id = order_items.order_id AND o.buyer_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_listing_id ON public.cart_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_created ON public.orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_order ON public.order_items(seller_id, order_id);

-- 3. Atomic Order Creation & Inventory Reservation Function
CREATE OR REPLACE FUNCTION public.create_order_from_cart(
  p_delivery_address TEXT,
  p_delivery_state VARCHAR(50),
  p_delivery_lga VARCHAR(50),
  p_contact_phone VARCHAR(20),
  p_delivery_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_buyer_id UUID;
  v_cart_id UUID;
  v_order_id UUID;
  v_order_number VARCHAR(50);
  v_subtotal NUMERIC(14, 2) := 0;
  v_item_total NUMERIC(14, 2);
  v_cart_item RECORD;
  v_listing RECORD;
  v_inventory RECORD;
  v_item_count INT := 0;
BEGIN
  -- 1. Get authenticated user ID
  v_buyer_id := auth.uid();
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to place an order.';
  END IF;

  -- 2. Fetch and lock user's cart
  SELECT id INTO v_cart_id
  FROM public.carts
  WHERE user_id = v_buyer_id
  FOR UPDATE;

  IF v_cart_id IS NULL THEN
    RAISE EXCEPTION 'Active shopping cart not found for user.';
  END IF;

  -- 3. Verify cart is not empty
  SELECT COUNT(*) INTO v_item_count
  FROM public.cart_items
  WHERE cart_id = v_cart_id;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Shopping cart is empty. Cannot create order.';
  END IF;

  -- 4. Calculate subtotal & validate each item with FOR UPDATE locks on inventory & listings
  FOR v_cart_item IN
    SELECT ci.id AS cart_item_id, ci.listing_id, ci.quantity
    FROM public.cart_items ci
    WHERE ci.cart_id = v_cart_id
    FOR UPDATE
  LOOP
    -- Lock listing
    SELECT l.id, l.seller_id, l.product_id, l.title, l.price_per_unit, l.unit, l.minimum_order_quantity, l.status, p.name AS product_name
    INTO v_listing
    FROM public.listings l
    JOIN public.products p ON p.id = l.product_id
    WHERE l.id = v_cart_item.listing_id
    FOR UPDATE;

    IF v_listing IS NULL THEN
      RAISE EXCEPTION 'Listing % not found in marketplace.', v_cart_item.listing_id;
    END IF;

    IF v_listing.status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'Produce listing "%" is no longer active (status: %).', v_listing.title, v_listing.status;
    END IF;

    IF v_cart_item.quantity < v_listing.minimum_order_quantity THEN
      RAISE EXCEPTION 'Quantity for "%" (%) is below the minimum order quantity of %.', v_listing.title, v_cart_item.quantity, v_listing.minimum_order_quantity;
    END IF;

    -- Lock inventory
    SELECT inv.quantity_on_hand, inv.quantity_reserved, (inv.quantity_on_hand - inv.quantity_reserved) AS quantity_available
    INTO v_inventory
    FROM public.inventory inv
    WHERE inv.listing_id = v_cart_item.listing_id
    FOR UPDATE;

    IF v_inventory IS NULL THEN
      RAISE EXCEPTION 'Inventory record missing for listing "%".', v_listing.title;
    END IF;

    IF v_inventory.quantity_available < v_cart_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for "%". Requested: %, Available: %.', v_listing.title, v_cart_item.quantity, v_inventory.quantity_available;
    END IF;

    v_item_total := ROUND(v_listing.price_per_unit * v_cart_item.quantity, 2);
    v_subtotal := v_subtotal + v_item_total;
  END LOOP;

  -- 5. Generate unique order number
  v_order_number := 'AGRO-' || to_char(timezone('utc'::text, now()), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 6));

  -- 6. Insert Order
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
    delivery_notes
  ) VALUES (
    v_order_number,
    v_buyer_id,
    'PENDING',
    'NGN',
    v_subtotal,
    0,
    0,
    v_subtotal,
    p_delivery_address,
    p_delivery_state,
    p_delivery_lga,
    p_contact_phone,
    p_delivery_notes
  )
  RETURNING id INTO v_order_id;

  -- 7. Insert Order Items & Update Inventory Reservations
  FOR v_cart_item IN
    SELECT ci.listing_id, ci.quantity
    FROM public.cart_items ci
    WHERE ci.cart_id = v_cart_id
  LOOP
    SELECT l.id, l.seller_id, l.product_id, l.title, l.price_per_unit, l.unit, p.name AS product_name
    INTO v_listing
    FROM public.listings l
    JOIN public.products p ON p.id = l.product_id
    WHERE l.id = v_cart_item.listing_id;

    v_item_total := ROUND(v_listing.price_per_unit * v_cart_item.quantity, 2);

    -- Insert snapshot item
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
      v_listing.product_name,
      v_listing.price_per_unit,
      v_cart_item.quantity,
      v_listing.unit,
      v_item_total,
      'PENDING'
    );

    -- Increment quantity_reserved atomically
    UPDATE public.inventory
    SET quantity_reserved = quantity_reserved + v_cart_item.quantity,
        updated_at = timezone('utc'::text, now())
    WHERE listing_id = v_cart_item.listing_id;
  END LOOP;

  -- 8. Clear user's cart
  DELETE FROM public.cart_items
  WHERE cart_id = v_cart_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'total', v_subtotal
  );
END;
$$;
