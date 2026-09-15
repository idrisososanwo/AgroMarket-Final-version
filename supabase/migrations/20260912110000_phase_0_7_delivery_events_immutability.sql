-- ==============================================================================
-- AgroMarket Migration: Delivery Events Immutability Enforcement
-- Migration: 20260912110000_phase_0_7_delivery_events_immutability.sql
--
-- Guarantees that public.delivery_events is strictly append-only.
-- Prevents UPDATE and DELETE operations for all users (including database roles).
-- Only trusted server-side workflows (service_role) can append events.
-- ==============================================================================

-- 1. Create immutability trigger function
CREATE OR REPLACE FUNCTION public.prevent_delivery_events_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'public.delivery_events is an append-only audit ledger: UPDATE and DELETE operations are strictly forbidden.';
END;
$$ LANGUAGE plpgsql;

-- 2. Bind trigger to BEFORE UPDATE OR DELETE on public.delivery_events
DROP TRIGGER IF EXISTS trg_prevent_delivery_events_mutation ON public.delivery_events;

CREATE TRIGGER trg_prevent_delivery_events_mutation
  BEFORE UPDATE OR DELETE ON public.delivery_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_delivery_events_mutation();

-- 3. Explicitly revoke UPDATE and DELETE privileges from public/client roles
REVOKE UPDATE, DELETE ON public.delivery_events FROM anon, authenticated;

-- 4. Explicitly revoke direct client INSERT privileges (all inserts must occur via server-side service role)
REVOKE INSERT ON public.delivery_events FROM anon, authenticated;

-- 5. Ensure authenticated users retain SELECT privileges subject to RLS
GRANT SELECT ON public.delivery_events TO authenticated;
