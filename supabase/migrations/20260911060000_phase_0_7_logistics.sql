-- ==============================================================================
-- AgroMarket Migration: Phase 0.7 Logistics & Delivery Coordination
-- Migration: 20260911060000_phase_0_7_logistics.sql
--
-- Extends public.logistics_providers, public.deliveries, and public.delivery_events
-- to support asset-light 3PL coordination, multi-seller consignments, quotes,
-- and append-only event tracking.
-- ==============================================================================

-- 1. Extend logistics_providers with user profile reference and updated_at
ALTER TABLE public.logistics_providers
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

CREATE TRIGGER set_logistics_providers_updated_at
  BEFORE UPDATE ON public.logistics_providers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Extend public.deliveries
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;

ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_status_check
  CHECK (status IN (
    'PENDING',
    'QUOTED',
    'ASSIGNED',
    'PICKUP_SCHEDULED',
    'PICKED_UP',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'DELIVERY_FAILED',
    'PENDING_PICKUP',
    'FAILED',
    'RETURNED'
  ));

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (delivery_fee >= 0),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  ADD COLUMN IF NOT EXISTS quote_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS quote_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS external_tracking_reference VARCHAR(150),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- 3. Extend public.delivery_events
ALTER TABLE public.delivery_events
  ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 4. High-Performance Query Indexes
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id
  ON public.deliveries(order_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_seller_id
  ON public.deliveries(seller_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_provider_id
  ON public.deliveries(provider_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_status
  ON public.deliveries(status);

CREATE INDEX IF NOT EXISTS idx_deliveries_tracking_number
  ON public.deliveries(tracking_number);

CREATE INDEX IF NOT EXISTS idx_delivery_events_delivery_id
  ON public.delivery_events(delivery_id);

CREATE INDEX IF NOT EXISTS idx_delivery_events_occurred_at
  ON public.delivery_events(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_logistics_providers_profile_id
  ON public.logistics_providers(profile_id);

-- 5. Hardened Row Level Security (RLS) Policies

-- Deliveries SELECT:
-- 1. Buyer who owns the order
-- 2. Seller who owns the consignment
-- 3. Assigned logistics provider representative (profile_id = auth.uid())
-- 4. Platform Admin
DROP POLICY IF EXISTS "Order participants can view delivery" ON public.deliveries;
DROP POLICY IF EXISTS "Participants and assigned providers view delivery" ON public.deliveries;

CREATE POLICY "Participants and assigned providers view delivery"
  ON public.deliveries FOR SELECT
  TO authenticated
  USING (
    seller_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deliveries.order_id AND o.buyer_id = auth.uid()
    )
    OR (
      provider_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.logistics_providers lp
        WHERE lp.id = deliveries.provider_id AND lp.profile_id = auth.uid()
      )
    )
  );

-- Delivery Events SELECT:
DROP POLICY IF EXISTS "Delivery events viewable if delivery is accessible" ON public.delivery_events;
CREATE POLICY "Delivery events viewable if delivery is accessible"
  ON public.delivery_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = delivery_events.delivery_id AND (
        d.seller_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = d.order_id AND o.buyer_id = auth.uid())
        OR (
          d.provider_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.logistics_providers lp
            WHERE lp.id = d.provider_id AND lp.profile_id = auth.uid()
          )
        )
      )
    )
  );

-- Seed initial Nigerian 3PL logistics provider for development/testing if none exists
INSERT INTO public.logistics_providers (
  name,
  company_rc,
  contact_person,
  phone,
  email,
  coverage_states,
  fleet_types,
  is_verified,
  is_active
)
SELECT
  'Kano-Lagos Agro Express Logistics',
  'RC-1849201',
  'Musa Danladi',
  '+2348031234567',
  'dispatch@agroexpress.ng',
  ARRAY['Lagos', 'Kano', 'Kaduna', 'Oyo', 'Ogun', 'Plateau', 'FCT', 'Benue', 'Enugu'],
  ARRAY['Light Truck', 'Heavy Truck', 'Refrigerated Van', 'Motorcycle'],
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.logistics_providers WHERE name = 'Kano-Lagos Agro Express Logistics'
);
