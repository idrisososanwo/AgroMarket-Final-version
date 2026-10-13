-- ==============================================================================
-- AGROMARKET V1: ABANDONED ORDER INVENTORY RESERVATION CLEANUP & SAFE RELEASE
-- Migration: 20261013140000_abandoned_order_inventory_cleanup.sql
--
-- INVARIANTS:
-- 1. Never release stock from a paid order (PAID, PROCESSING, COMPLETED).
-- 2. Never release stock from an order more than once (idempotent state transition).
-- 3. Row-level FOR UPDATE locking on orders and inventory rows during release.
-- 4. Conservative payment handling: Skip orders with recent in-flight payments (< 15 min).
-- 5. Prevent negative reservations and stock inflation via GREATEST(0, ...).
-- 6. Append-only audit logging and cancellation reason recording.
-- ==============================================================================

-- 1. Add cancellation_reason column to public.orders if not present
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255);

-- 2. Atomic Single-Order Inventory Release Function
CREATE OR REPLACE FUNCTION public.release_order_inventory(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'ABANDONED_CHECKOUT_TIMEOUT'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_successful_payments INT;
  v_active_payments INT;
  v_released_items_count INT := 0;
  v_inv_reserved NUMERIC(12, 2);
  v_inv_on_hand NUMERIC(12, 2);
BEGIN
  -- 1. Lock the order row exclusively
  SELECT id, order_number, buyer_id, status, total_amount
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ORDER_NOT_FOUND',
      'message', 'Order not found.'
    );
  END IF;

  -- 2. Guard: Never release stock from already paid, processing, or completed orders
  IF v_order.status IN ('PAID', 'PROCESSING', 'PARTIALLY_FULFILLED', 'COMPLETED') THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ORDER_ALREADY_PAID',
      'order_id', v_order.id,
      'current_status', v_order.status,
      'message', 'Cannot release inventory for an order that is already paid or completed.'
    );
  END IF;

  -- 3. Guard: Idempotency check - if already cancelled, do not release twice
  IF v_order.status = 'CANCELLED' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ORDER_ALREADY_CANCELLED',
      'order_id', v_order.id,
      'current_status', v_order.status,
      'message', 'Order is already cancelled; reservation was previously released.'
    );
  END IF;

  -- 4. Guard: Only PENDING orders are eligible for automated or timeout release
  IF v_order.status != 'PENDING' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVALID_ORDER_STATUS',
      'order_id', v_order.id,
      'current_status', v_order.status,
      'message', format('Order has status "%s", which cannot be released by this operation.', v_order.status)
    );
  END IF;

  -- 5. Guard: Check payment records
  -- If any payment succeeded, order MUST NOT be cancelled
  SELECT COUNT(*)
  INTO v_successful_payments
  FROM public.payments
  WHERE order_id = p_order_id AND status = 'SUCCESSFUL';

  IF v_successful_payments > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PAYMENT_SUCCESSFUL',
      'order_id', v_order.id,
      'message', 'Order has confirmed successful payment. Cancellation aborted.'
    );
  END IF;

  -- If any payment is actively in-flight (updated within the last 15 minutes), handle conservatively
  SELECT COUNT(*)
  INTO v_active_payments
  FROM public.payments
  WHERE order_id = p_order_id
    AND status IN ('INITIALIZED', 'PENDING')
    AND updated_at > (timezone('utc'::text, now()) - INTERVAL '15 minutes');

  IF v_active_payments > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PAYMENT_IN_FLIGHT',
      'order_id', v_order.id,
      'message', 'Order has an active payment transaction currently in flight. Cancellation deferred.'
    );
  END IF;

  -- 6. Transition Order to CANCELLED atomically
  UPDATE public.orders
  SET status = 'CANCELLED',
      cancellation_reason = p_reason,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_order_id AND status = 'PENDING';

  -- 7. Transition Order Items to CANCELLED
  UPDATE public.order_items
  SET status = 'CANCELLED'
  WHERE order_id = p_order_id AND status = 'PENDING';

  -- 8. Row-locked inventory reservation release
  FOR v_item IN
    SELECT listing_id, quantity
    FROM public.order_items
    WHERE order_id = p_order_id
  LOOP
    -- Lock inventory row
    SELECT quantity_reserved, quantity_on_hand
    INTO v_inv_reserved, v_inv_on_hand
    FROM public.inventory
    WHERE listing_id = v_item.listing_id
    FOR UPDATE;

    IF FOUND THEN
      -- Decrement quantity_reserved safely; prevent negative reserved and stock inflation
      UPDATE public.inventory
      SET quantity_reserved = GREATEST(0, quantity_reserved - v_item.quantity),
          updated_at = timezone('utc'::text, now())
      WHERE listing_id = v_item.listing_id;

      v_released_items_count := v_released_items_count + 1;
    END IF;
  END LOOP;

  -- 9. Append immutable audit log
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    v_order.buyer_id,
    'ORDER_RESERVATION_RELEASED',
    'order',
    p_order_id::text,
    jsonb_build_object(
      'order_number', v_order.order_number,
      'previous_status', 'PENDING',
      'new_status', 'CANCELLED',
      'reason', p_reason,
      'items_released_count', v_released_items_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'code', 'RESERVATION_RELEASED',
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'items_released', v_released_items_count,
    'reason', p_reason
  );
END;
$$;

-- 3. Batch Cleanup Function for Expired / Abandoned Pending Orders
CREATE OR REPLACE FUNCTION public.cleanup_abandoned_pending_orders(
  p_timeout_minutes INT DEFAULT 60,
  p_batch_limit INT DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_candidate_id UUID;
  v_result jsonb;
  v_processed_count INT := 0;
  v_cancelled_count INT := 0;
  v_skipped_count INT := 0;
  v_results_array jsonb := '[]'::jsonb;
BEGIN
  -- Query eligible candidate orders:
  -- 1. Status is PENDING
  -- 2. Created more than p_timeout_minutes ago
  -- 3. No successful payment or recently updated in-flight payment (< 15 min)
  FOR v_candidate_id IN
    SELECT o.id
    FROM public.orders o
    WHERE o.status = 'PENDING'
      AND o.created_at < (timezone('utc'::text, now()) - (p_timeout_minutes || ' minutes')::interval)
      AND NOT EXISTS (
        SELECT 1 FROM public.payments p
        WHERE p.order_id = o.id
          AND (
            p.status = 'SUCCESSFUL'
            OR (p.status IN ('INITIALIZED', 'PENDING') AND p.updated_at > timezone('utc'::text, now()) - INTERVAL '15 minutes')
          )
      )
    ORDER BY o.created_at ASC
    LIMIT p_batch_limit
  LOOP
    v_processed_count := v_processed_count + 1;
    v_result := public.release_order_inventory(v_candidate_id, 'ABANDONED_CHECKOUT_TIMEOUT');

    IF (v_result->>'success')::boolean IS TRUE THEN
      v_cancelled_count := v_cancelled_count + 1;
    ELSE
      v_skipped_count := v_skipped_count + 1;
    END IF;

    v_results_array := v_results_array || jsonb_build_array(v_result);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed_count', v_processed_count,
    'cancelled_count', v_cancelled_count,
    'skipped_count', v_skipped_count,
    'timeout_minutes', p_timeout_minutes,
    'details', v_results_array
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.release_order_inventory(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_abandoned_pending_orders(INT, INT) TO service_role;
