-- ==============================================================================
-- AGROMARKET PHASE 3.16: AGRICULTURAL INTELLIGENCE NOTIFICATIONS & ALERT DELIVERY
-- Schema for Alert Definitions, Publication States, Governed Notifications,
-- Multi-Channel Delivery Tracking, Idempotency, RLS, and Anti-Pork Constraints
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AGRICULTURAL INTELLIGENCE ALERTS (Alert Definition & Publication State)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_intelligence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(60) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'INFO'
    CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  title VARCHAR(200) NOT NULL,
  summary TEXT NOT NULL,
  source_entity_type VARCHAR(60) NOT NULL,
  source_reference TEXT NOT NULL,
  source_provenance VARCHAR(40) NOT NULL DEFAULT 'OBSERVED'
    CHECK (source_provenance IN (
      'OBSERVED', 'DERIVED', 'CORRELATED', 'ESTIMATED',
      'EXTERNAL_SOURCE', 'EDITORIAL', 'SYSTEM_IMPORTED', 'INSUFFICIENT_DATA'
    )),
  confidence_level VARCHAR(20) NOT NULL DEFAULT 'MODERATE'
    CHECK (confidence_level IN ('HIGH', 'MODERATE', 'LOW', 'INSUFFICIENT_DATA')),
  confidence_score NUMERIC(4, 3) CHECK (confidence_score BETWEEN 0.000 AND 1.000),
  valid_from TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_historical BOOLEAN NOT NULL DEFAULT false,
  has_conflicts BOOLEAN NOT NULL DEFAULT false,
  conflict_explanation TEXT,
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  target_states TEXT[] NOT NULL DEFAULT '{}',
  target_lgas TEXT[] NOT NULL DEFAULT '{}',
  target_commodities TEXT[] NOT NULL DEFAULT '{}',
  publication_status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED'
    CHECK (publication_status IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'WITHHELD', 'EXPIRED')),
  requires_human_review BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  deduplication_key TEXT UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant on alerts
  CONSTRAINT chk_no_pork_intel_alerts CHECK (
    NOT (title || ' ' || summary ~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

-- ------------------------------------------------------------------------------
-- 2. EXTEND NOTIFICATIONS TABLE (User Receipt State & Idempotency)
-- ------------------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS alert_id UUID REFERENCES public.agricultural_intelligence_alerts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotency_key
  ON public.notifications(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Anti-pork check constraint on notifications table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_no_pork_notifications'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT chk_no_pork_notifications CHECK (
        NOT (title || ' ' || body ~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
      );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. NOTIFICATION DELIVERIES (Channel Delivery State & Retry Tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES public.agricultural_intelligence_alerts(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel VARCHAR(30) NOT NULL DEFAULT 'IN_APP'
    CHECK (channel IN ('IN_APP', 'SMS', 'WHATSAPP', 'EMAIL', 'PUSH')),
  delivery_status VARCHAR(30) NOT NULL DEFAULT 'DELIVERED'
    CHECK (delivery_status IN ('QUEUED', 'ATTEMPTED', 'ACCEPTED', 'DELIVERED', 'FAILED', 'UNAVAILABLE')),
  attempt_count INT NOT NULL DEFAULT 1,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  delivered_at TIMESTAMPTZ,
  error_code VARCHAR(50),
  error_message TEXT,
  provider_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT uq_notification_delivery_channel UNIQUE (notification_id, channel)
);

-- ------------------------------------------------------------------------------
-- 4. PERFORMANCE & AUDIT INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_intel_alerts_pub
  ON public.agricultural_intelligence_alerts(publication_status, expires_at);
CREATE INDEX IF NOT EXISTS idx_intel_alerts_category
  ON public.agricultural_intelligence_alerts(category);
CREATE INDEX IF NOT EXISTS idx_intel_alerts_created
  ON public.agricultural_intelligence_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_alert_id
  ON public.notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_deliveries_user
  ON public.notification_deliveries(user_id, delivery_status);
CREATE INDEX IF NOT EXISTS idx_notif_deliveries_channel
  ON public.notification_deliveries(channel, delivery_status);

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.agricultural_intelligence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Alerts: Authenticated users can view published, non-expired alerts; admins can view all
DROP POLICY IF EXISTS "Users view published alerts" ON public.agricultural_intelligence_alerts;
CREATE POLICY "Users view published alerts"
  ON public.agricultural_intelligence_alerts FOR SELECT
  TO authenticated
  USING (
    (publication_status = 'PUBLISHED' AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now())))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins manage alerts" ON public.agricultural_intelligence_alerts;
CREATE POLICY "Admins manage alerts"
  ON public.agricultural_intelligence_alerts FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Deliveries: Users view their own delivery attempts; admins can view all
DROP POLICY IF EXISTS "Users view their own delivery attempts" ON public.notification_deliveries;
CREATE POLICY "Users view their own delivery attempts"
  ON public.notification_deliveries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage delivery attempts" ON public.notification_deliveries;
CREATE POLICY "Admins manage delivery attempts"
  ON public.notification_deliveries FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
