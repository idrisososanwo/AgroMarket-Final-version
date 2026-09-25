-- ==============================================================================
-- AGROMARKET: PRODUCTION LEAST-PRIVILEGE POSTGRESQL GRANTS & SELLER PRIVACY
-- Hardens schema against PII leakage, restricts table writes, and establishes
-- public.marketplace_seller_profiles view for anonymous marketplace discovery.
--
-- Row Level Security (RLS) remains 100% active and enforced across all 42 tables.
-- ==============================================================================

-- 1. Schema Access & Blanket Privilege Revocation
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- 2. Harden is_admin() Search Path
-- Hardens SECURITY DEFINER helper against search path hijacking
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role_code = 'ADMIN'
  );
END;
$$;

-- 3. Safe Public Seller Identity Mechanism
-- Exposes ONLY explicitly public display fields (id, full_name, avatar_url, is_verified, state, lga).
-- Strictly EXCLUDES phone, email, location_address, and other private fields.
-- Restricts rows to sellers who have at least one ACTIVE marketplace listing.
-- Uses security_barrier = true to prevent optimizer-level condition leakage.
CREATE OR REPLACE VIEW public.marketplace_seller_profiles
WITH (security_barrier = true) AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.is_verified,
  p.state,
  p.lga
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.listings l
  WHERE l.seller_id = p.id
    AND l.status = 'ACTIVE'
);

-- Grant SELECT on public-safe seller profile view to anon and authenticated
GRANT SELECT ON public.marketplace_seller_profiles TO anon, authenticated;

-- 4. Harden public.profiles RLS: Strip anon role from SELECT policy
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;

CREATE POLICY "Profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 5. Public Read-Only / Marketplace Discovery Tables (anon)
-- Grant SELECT ONLY on genuinely public discovery and catalog tables/views.
-- Notice: public.profiles is strictly EXCLUDED. Anon has NO direct table access to profiles.
GRANT SELECT ON TABLE
  public.categories,
  public.products,
  public.listings,
  public.inventory,
  public.farms,
  public.farm_products,
  public.reviews,
  public.roles,
  public.shared_purchases,
  public.price_observations,
  public.demand_forecasts,
  public.equipment,
  public.services,
  public.jobs,
  public.knowledge_content
TO anon;

-- 6. Granular Authenticated Table Grants (NO blanket write permissions)
-- All mutations remain subject to RLS and domain authorization logic.

-- 6A. User-owned content management (Scoped to owner by existing RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.ai_conversations,
  public.cart_items,
  public.carts,
  public.equipment,
  public.farm_products,
  public.farms,
  public.inventory,
  public.jobs,
  public.knowledge_content,
  public.listings,
  public.services,
  public.shared_purchases,
  public.user_preferences
TO authenticated;

-- 6B. User Profile & Interaction Tables (Insert/Update own records; no client DELETE)
GRANT SELECT, INSERT, UPDATE ON TABLE
  public.profiles,
  public.business_profiles,
  public.basket_recommendations,
  public.equipment_rentals,
  public.service_requests
TO authenticated;

-- 6C. Append-only User Data (Insert allowed; no client UPDATE or DELETE)
GRANT SELECT, INSERT ON TABLE
  public.ai_messages,
  public.dispute_evidence,
  public.job_applications,
  public.price_observations,
  public.reviews,
  public.verification_records
TO authenticated;

-- 6D. Notifications (Users view, mark read, delete; inserted by system/backend)
GRANT SELECT, UPDATE, DELETE ON TABLE
  public.notifications
TO authenticated;

-- 6E. Disputes (Users open; parties view; updates restricted to admin by RLS)
GRANT SELECT, INSERT, UPDATE ON TABLE
  public.disputes
TO authenticated;

-- 6F. Read-Only State-Machine, Financial & Admin Tables (Strictly READ-ONLY for authenticated)
-- Direct client INSERT, UPDATE, DELETE are forbidden.
-- Mutations are strictly server-authoritative via verified RPCs or service_role webhooks.
GRANT SELECT ON TABLE
  public.orders,
  public.order_items,
  public.payments,
  public.payment_webhook_events,
  public.settlements,
  public.refunds,
  public.deliveries,
  public.delivery_events,
  public.shared_purchase_participants,
  public.audit_logs,
  public.logistics_providers,
  public.roles,
  public.categories,
  public.products,
  public.demand_forecasts,
  public.user_roles
TO authenticated;

-- 7. Sequence Privileges
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 8. Service Role Full Privileges
-- Required for background webhooks (Paystack/Flutterwave), admin automation, and server-side operations.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 9. Explicit Routine Execution Privileges (Strict Confinement)
-- Only client-facing routines with verified authorization checks are granted to authenticated:
-- - is_admin(): Evaluated in RLS policies for authenticated and anon (returns boolean, no data leak)
-- - create_order_from_cart(): Authenticated checkout RPC (verifies auth.uid(), locks cart/inventory)
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_order_from_cart(TEXT, VARCHAR, VARCHAR, VARCHAR, TEXT) TO authenticated;

-- Low-level stock reservation, release, participant allocation, and pledge sweeps
-- are strictly restricted to service_role (server actions / background workers):
GRANT EXECUTE ON FUNCTION public.reserve_shared_purchase_stock(UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_shared_purchase_stock(UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.allocate_shared_purchase_participant(UUID, UUID, NUMERIC, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_shared_purchase_pledges(UUID, INT) TO service_role;

-- 10. Future Schema Default Privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;
