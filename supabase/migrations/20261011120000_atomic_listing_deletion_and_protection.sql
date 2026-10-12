-- ==============================================================================
-- AgroMarket: Atomic Listing Deletion, Safe Archival & Historical Order Protection
-- Migration: 20261011120000_atomic_listing_deletion_and_protection.sql
-- ==============================================================================

-- Create atomic RPC function to delete or archive a listing safely
CREATE OR REPLACE FUNCTION public.delete_or_archive_listing(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_listing RECORD;
  v_order_count INT := 0;
  v_shared_count INT := 0;
BEGIN
  -- 1. Ensure caller is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 2. Fetch and lock the listing, verifying seller ownership
  SELECT id, seller_id, title, status INTO v_listing
  FROM public.listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF v_listing IS NULL THEN
    RAISE EXCEPTION 'Produce listing not found.';
  END IF;

  IF v_listing.seller_id <> v_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this listing.';
  END IF;

  -- 3. Check historical order items (ON DELETE RESTRICT)
  SELECT COUNT(*) INTO v_order_count
  FROM public.order_items
  WHERE listing_id = p_listing_id;

  -- 4. Check active/historical shared purchases (ON DELETE RESTRICT)
  SELECT COUNT(*) INTO v_shared_count
  FROM public.shared_purchases
  WHERE listing_id = p_listing_id;

  -- 5. Decision: If historical orders or shared purchases exist, archive safely
  IF v_order_count > 0 OR v_shared_count > 0 THEN
    -- Transition listing status to ARCHIVED
    UPDATE public.listings
    SET status = 'ARCHIVED',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_listing_id;

    -- Zero-out inventory on hand to prevent reservation
    UPDATE public.inventory
    SET quantity_on_hand = 0,
        updated_at = timezone('utc'::text, now())
    WHERE listing_id = p_listing_id;

    -- Clean up cart items so buyers do not have stale active cart references
    DELETE FROM public.cart_items
    WHERE listing_id = p_listing_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'ARCHIVED',
      'message', 'Produce listing has historical orders and was safely archived. It is delisted from the public marketplace while preserving all customer invoices and receipts.'
    );
  ELSE
    -- Completely unreferenced by orders or shared pools: Safe to hard delete
    DELETE FROM public.cart_items WHERE listing_id = p_listing_id;
    DELETE FROM public.listings WHERE id = p_listing_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'DELETED',
      'message', 'Produce listing and inventory were permanently removed.'
    );
  END IF;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_or_archive_listing(UUID) TO authenticated;
