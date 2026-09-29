-- ==============================================================================
-- AGROMARKET PHASE 1.3: FARM EQUIPMENT RENTAL FOUNDATION
-- Establishes safe public equipment owner profile view with security barrier,
-- exposes strictly whitelisted non-PII fields to anonymous and authenticated users,
-- and adds high-performance relational lookups for equipment discovery and rentals.
--
-- Row Level Security (RLS) remains 100% active and enforced across all tables.
-- ==============================================================================

-- 1. Safe Public Equipment Owner Profile Representation
-- Exposes ONLY explicitly safe public fields (id, full_name, avatar_url, is_verified, state, lga).
-- Strictly EXCLUDES phone, email, location_address, and other private profile fields.
-- Restricts rows to owners who currently have at least one ACTIVE equipment listing.
-- Uses security_barrier = true to prevent optimizer-level condition leakage.
CREATE OR REPLACE VIEW public.equipment_owner_profiles
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
  SELECT 1 FROM public.equipment e
  WHERE e.owner_id = p.id
    AND e.status = 'ACTIVE'
);

-- Grant SELECT on safe equipment owner profiles view to anon and authenticated
GRANT SELECT ON public.equipment_owner_profiles TO anon, authenticated;

-- 2. High-Performance Relational Indexes for Equipment & Rentals
-- Targets foreign keys, status filters, location queries, and rental schedules.

-- Equipment Lookups & Sorting
CREATE INDEX IF NOT EXISTS idx_equipment_owner_id ON public.equipment(owner_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON public.equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_location ON public.equipment(location_state, location_lga);

-- Equipment Rentals Lookups & Schedule Tracking
CREATE INDEX IF NOT EXISTS idx_equipment_rentals_equipment_id ON public.equipment_rentals(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rentals_renter_id ON public.equipment_rentals(renter_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rentals_owner_id ON public.equipment_rentals(owner_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rentals_status ON public.equipment_rentals(status);
CREATE INDEX IF NOT EXISTS idx_equipment_rentals_dates ON public.equipment_rentals(equipment_id, start_date, end_date);
