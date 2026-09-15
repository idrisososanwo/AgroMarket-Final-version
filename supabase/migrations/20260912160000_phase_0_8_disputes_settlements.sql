-- ==============================================================================
-- AgroMarket Migration: Phase 0.8 Disputes, Refunds, Settlements & Holds
-- Migration: 20260912160000_phase_0_8_disputes_settlements.sql
--
-- Implements:
-- 1. Purge of legacy STELLAR_XLM from payments check constraint
-- 2. Extended public.disputes for structured multi-seller disputes
-- 3. public.dispute_evidence for metadata and file attachments
-- 4. public.refunds for idempotent server-authoritative refunds
-- 5. public.settlements for multi-seller accounting and fulfilment holds
-- 6. Hardened RLS policies ensuring buyer/seller/admin isolation
-- ==============================================================================

-- 1. Purge STELLAR_XLM from payments provider check constraint
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_provider_check;

ALTER TABLE public.payments ADD CONSTRAINT payments_provider_check
  CHECK (provider IN ('PAYSTACK', 'FLUTTERWAVE', 'MONNIFY', 'BANK_TRANSFER', 'ESCROW_WALLET'));

-- 2. Extend public.disputes
ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_status_check;
ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_dispute_type_check;

ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS disputed_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (disputed_amount >= 0),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  ADD COLUMN IF NOT EXISTS resolution_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(14, 2) DEFAULT 0.00 CHECK (refund_amount >= 0),
  ADD COLUMN IF NOT EXISTS seller_response TEXT,
  ADD COLUMN IF NOT EXISTS seller_responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

ALTER TABLE public.disputes ADD CONSTRAINT disputes_status_check
  CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CLOSED', 'CANCELLED', 'ESCROW_FROZEN'));

ALTER TABLE public.disputes ADD CONSTRAINT disputes_dispute_type_check
  CHECK (dispute_type IN ('ORDER', 'PAYMENT', 'DELIVERY', 'SERVICE', 'EQUIPMENT_RENTAL', 'ITEM_NOT_RECEIVED', 'WRONG_ITEM', 'DAMAGED_ITEM', 'QUALITY_ISSUE', 'MISSING_QUANTITY', 'DELIVERY_FAILURE', 'OTHER'));

ALTER TABLE public.disputes ADD CONSTRAINT disputes_resolution_type_check
  CHECK (resolution_type IS NULL OR resolution_type IN ('BUYER_REFUND', 'SELLER_SETTLEMENT', 'PARTIAL_REFUND', 'NO_ACTION', 'REPLACEMENT'));

-- 3. Create public.dispute_evidence
CREATE TABLE IF NOT EXISTS public.dispute_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evidence_type VARCHAR(50) NOT NULL CHECK (evidence_type IN ('PHOTO', 'VIDEO', 'DOCUMENT', 'DELIVERY_PROOF', 'CHAT_REFERENCE', 'OTHER')),
  file_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

-- 4. Create public.refunds
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES public.disputes(id) ON DELETE SET NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  reason TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED')),
  provider VARCHAR(50) NOT NULL,
  provider_refund_reference VARCHAR(150) UNIQUE,
  idempotency_key VARCHAR(150) NOT NULL UNIQUE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- 5. Create public.settlements (Multi-Seller Accounting & Holds)
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ELIGIBLE', 'PROCESSING', 'SETTLED', 'FAILED', 'CANCELLED')),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  gross_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (gross_amount >= 0),
  platform_fee NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (platform_fee >= 0),
  logistics_adjustment NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (logistics_adjustment >= 0),
  refund_deduction NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (refund_deduction >= 0),
  dispute_adjustment NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (dispute_adjustment >= 0),
  net_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (net_amount >= 0),
  hold_reason VARCHAR(100),
  hold_expires_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_settlement_order_seller UNIQUE (order_id, seller_id)
);

CREATE TRIGGER set_settlements_updated_at
  BEFORE UPDATE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- 6. High-Performance Query Indexes
CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON public.disputes(related_order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_seller_id ON public.disputes(seller_id);
CREATE INDEX IF NOT EXISTS idx_disputes_opened_by ON public.disputes(opened_by);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);

CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id ON public.dispute_evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_seller_id ON public.refunds(seller_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order_item_id ON public.refunds(order_item_id);
CREATE INDEX IF NOT EXISTS idx_refunds_buyer_id ON public.refunds(buyer_id);
CREATE INDEX IF NOT EXISTS idx_refunds_idempotency_key ON public.refunds(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_settlements_order_id ON public.settlements(order_id);
CREATE INDEX IF NOT EXISTS idx_settlements_seller_id ON public.settlements(seller_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON public.settlements(status);

-- 7. Row Level Security Policies

-- Disputes:
DROP POLICY IF EXISTS "Complainants and admins view disputes" ON public.disputes;
DROP POLICY IF EXISTS "Participants and admins view disputes" ON public.disputes;

CREATE POLICY "Participants and admins view disputes"
  ON public.disputes FOR SELECT
  TO authenticated
  USING (
    opened_by = auth.uid()
    OR seller_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users can open disputes" ON public.disputes;
CREATE POLICY "Users can open disputes"
  ON public.disputes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = opened_by);

-- Dispute Evidence:
CREATE POLICY "Evidence viewable by dispute participants and admins"
  ON public.dispute_evidence FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.id = dispute_evidence.dispute_id
      AND (d.opened_by = auth.uid() OR d.seller_id = auth.uid())
    )
  );

CREATE POLICY "Participants can upload evidence"
  ON public.dispute_evidence FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.id = dispute_evidence.dispute_id
      AND (d.opened_by = auth.uid() OR d.seller_id = auth.uid() OR public.is_admin())
    )
  );

-- Settlements:
-- Strict Seller Isolation: A seller CANNOT see other sellers' settlement records
CREATE POLICY "Sellers view own settlements"
  ON public.settlements FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid() OR public.is_admin());

-- Refunds:
CREATE POLICY "Buyers and sellers view relevant refunds"
  ON public.refunds FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin());
