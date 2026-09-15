-- ==============================================================================
-- AgroMarket Migration: Phase 0.6 Payments & Payment Verification Foundation
-- Migration: 20260911050000_phase_0_6_payments.sql
--
-- Extends public.payments, establishes payment_webhook_events for guaranteed
-- idempotency, and adds optimized query indexes and RLS policies.
-- ==============================================================================

-- 1. Extend check constraint on public.payments.status to support standard states
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('INITIALIZED', 'INITIATED', 'PENDING', 'SUCCESSFUL', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'));

-- 2. Webhook Idempotency & Event Journaling Table
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,
  event_id VARCHAR(150) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payment_reference VARCHAR(150),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'PROCESSED'
    CHECK (status IN ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED')),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_payment_webhook_provider_event UNIQUE (provider, event_id)
);

-- 3. Performance & Idempotency Indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_provider_status
  ON public.payments(order_id, provider, status);

CREATE INDEX IF NOT EXISTS idx_payments_created_at
  ON public.payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_reference
  ON public.payment_webhook_events(payment_reference);

CREATE INDEX IF NOT EXISTS idx_webhook_events_created
  ON public.payment_webhook_events(created_at DESC);

-- 4. Row Level Security for payment_webhook_events
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- Webhook events can be viewed by ADMIN users for reconciliation
DROP POLICY IF EXISTS "Admins can view payment webhook events" ON public.payment_webhook_events;
CREATE POLICY "Admins can view payment webhook events"
  ON public.payment_webhook_events FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Webhook events are inserted strictly by service_role (webhooks run with service credentials)
-- Default deny applies to client insertion.

-- 5. Hardened RLS Policy on Payments
-- Ensure buyers can view only their own payments
DROP POLICY IF EXISTS "Buyers can view their payments" ON public.payments;
CREATE POLICY "Buyers can view their payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR public.is_admin());

-- Disallow arbitrary client updates on payments status
-- Status updates must be executed server-side via trusted service role / server actions
DROP POLICY IF EXISTS "Clients cannot update payment status" ON public.payments;
-- (No public UPDATE policy defined; update access is restricted to service_role / backend RPC)
