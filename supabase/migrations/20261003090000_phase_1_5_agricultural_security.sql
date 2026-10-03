-- ==============================================================================
-- AGROMARKET PHASE 1.5: FOOD SECURITY & PHYSICAL AGRICULTURAL SECURITY FOUNDATION
-- Schema, RLS, Indexes, Triggers, and Safe Public Reporter Profile Views
-- ==============================================================================

-- 1. Create agricultural_security_incidents table
CREATE TABLE IF NOT EXISTS public.agricultural_security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  incident_type VARCHAR(50) NOT NULL CHECK (
    incident_type IN (
      'FARM_ATTACK',
      'KIDNAPPING_SECURITY_THREAT',
      'FARM_ACCESS_DISRUPTION',
      'LOGISTICS_CORRIDOR_INCIDENT',
      'THEFT_OR_ROBBERY',
      'MOVEMENT_RESTRICTION',
      'AGRICULTURAL_MARKET_DISRUPTION',
      'OTHER_AGRICULTURAL_SECURITY_EVENT'
    )
  ),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')
  ),
  severity VARCHAR(20) NOT NULL DEFAULT 'MODERATE' CHECK (
    severity IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')
  ),
  description TEXT NOT NULL,
  occurred_at TIMESTAMPTZ,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  published_at TIMESTAMPTZ,
  -- Source attribution (Mandatory for publication)
  source_name VARCHAR(150) NOT NULL,
  source_type VARCHAR(50) NOT NULL CHECK (
    source_type IN ('OFFICIAL', 'NEWS', 'PARTNER', 'EXPERT', 'COMMUNITY_REPORT', 'OTHER')
  ),
  source_url TEXT,
  source_publication_date TIMESTAMPTZ,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'REPORTED' CHECK (
    verification_status IN ('UNVERIFIED', 'REPORTED', 'VERIFIED', 'OFFICIAL', 'CORRECTED', 'ARCHIVED')
  ),
  -- Location safety: Nigerian state/LGA scope (strictly no exact GPS coordinates or farm addresses)
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  location_scope VARCHAR(50) NOT NULL DEFAULT 'GENERAL_AREA' CHECK (
    location_scope IN ('STATE', 'LGA', 'REGION_CORRIDOR', 'GENERAL_AREA')
  ),
  -- Food security and supply chain impacts
  affected_commodities TEXT[] NOT NULL DEFAULT '{}',
  affected_categories TEXT[] NOT NULL DEFAULT '{}',
  movement_impact TEXT,
  food_security_impact TEXT,
  editorial_notes TEXT,
  -- Editorial audit tracking
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  archived_at TIMESTAMPTZ
);

-- Trigger for updated_at
CREATE TRIGGER set_agricultural_security_incidents_updated_at
  BEFORE UPDATE ON public.agricultural_security_incidents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Indexes for discovery, state filtering, incident types, and severity
CREATE INDEX IF NOT EXISTS idx_security_incidents_slug ON public.agricultural_security_incidents(slug);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status_published ON public.agricultural_security_incidents(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_incidents_type ON public.agricultural_security_incidents(incident_type, status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_state ON public.agricultural_security_incidents(state, status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON public.agricultural_security_incidents(severity, status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_verification ON public.agricultural_security_incidents(verification_status, status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_created_by ON public.agricultural_security_incidents(created_by);

-- 3. Row Level Security (RLS)
ALTER TABLE public.agricultural_security_incidents ENABLE ROW LEVEL SECURITY;

-- Public users (anon & authenticated) can only read PUBLISHED incidents
CREATE POLICY "Public users can view published security incidents"
  ON public.agricultural_security_incidents
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'PUBLISHED'
    OR public.is_admin()
    OR (auth.uid() IS NOT NULL AND auth.uid() = created_by)
  );

-- Admins have full access to manage all incidents
CREATE POLICY "Admins can manage all security incidents"
  ON public.agricultural_security_incidents
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Experts can create incident drafts authored by themselves (must start as DRAFT or REPORTED, cannot self-verify as OFFICIAL/VERIFIED without admin)
CREATE POLICY "Experts can create security incident drafts"
  ON public.agricultural_security_incidents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role_code IN ('EXPERT', 'ADMIN')
      )
    )
  );

-- Experts can update their own drafts
CREATE POLICY "Experts can update own security incident drafts"
  ON public.agricultural_security_incidents
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role_code IN ('EXPERT', 'ADMIN')
      )
    )
  )
  WITH CHECK (
    auth.uid() = created_by
  );

-- 4. Table grants
GRANT SELECT ON TABLE public.agricultural_security_incidents TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.agricultural_security_incidents TO authenticated;

-- 5. Safe Public Reporter/Editor Profile View (Security Barrier)
-- Exposes strictly non-PII fields: id, full_name, avatar_url, is_verified.
-- Excludes phone, email, and private physical locations.
CREATE OR REPLACE VIEW public.security_incident_reporters
WITH (security_barrier = true) AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.is_verified,
  p.state
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.agricultural_security_incidents i
  WHERE i.created_by = p.id
    AND i.status = 'PUBLISHED'
);

GRANT SELECT ON public.security_incident_reporters TO anon, authenticated;
