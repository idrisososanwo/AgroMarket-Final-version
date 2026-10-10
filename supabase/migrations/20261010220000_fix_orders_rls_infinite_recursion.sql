-- ==============================================================================
-- AGROMARKET MIGRATION: FIX ORDERS & ORDER_ITEMS RLS INFINITE RECURSION
-- Breaks circular dependency between orders and order_items RLS policies
-- using SECURITY DEFINER lookup functions.
-- ==============================================================================

-- 1. Helper function: verify if a user is a seller for any item in an order
-- SECURITY DEFINER bypasses RLS on order_items when called by orders policy
CREATE OR REPLACE FUNCTION public.is_order_seller(p_order_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items
    WHERE order_id = p_order_id AND seller_id = p_user_id
  );
$$;

-- 2. Helper function: verify if a user is the buyer of an order
-- SECURITY DEFINER bypasses RLS on orders when called by order_items policy
CREATE OR REPLACE FUNCTION public.is_order_buyer(p_order_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id AND buyer_id = p_user_id
  );
$$;

-- Grant execution to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.is_order_seller(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_order_buyer(UUID, UUID) TO authenticated, service_role;

-- 3. Replace circular policies on public.orders
DROP POLICY IF EXISTS "Buyers can view their own orders" ON public.orders;
CREATE POLICY "Buyers can view their own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = buyer_id 
    OR public.is_admin() 
    OR public.is_order_seller(id, auth.uid())
  );

DROP POLICY IF EXISTS "Authorized users can update orders" ON public.orders;
CREATE POLICY "Authorized users can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = buyer_id 
    OR public.is_admin() 
    OR public.is_order_seller(id, auth.uid())
  );

-- 4. Replace circular policies on public.order_items
DROP POLICY IF EXISTS "Participants can view order items" ON public.order_items;
CREATE POLICY "Participants can view order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    seller_id = auth.uid() 
    OR public.is_admin() 
    OR public.is_order_buyer(order_id, auth.uid())
  );

DROP POLICY IF EXISTS "Buyers can insert order items" ON public.order_items;
CREATE POLICY "Buyers can insert order items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_order_buyer(order_id, auth.uid())
  );

DROP POLICY IF EXISTS "Authorized users can update order items" ON public.order_items;
CREATE POLICY "Authorized users can update order items"
  ON public.order_items FOR UPDATE
  TO authenticated
  USING (
    seller_id = auth.uid() 
    OR public.is_admin() 
    OR public.is_order_buyer(order_id, auth.uid())
  );
