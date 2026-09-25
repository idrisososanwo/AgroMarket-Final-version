-- ==============================================================================
-- AGROMARKET: CLEANUP LEGACY PRE-DEPLOYMENT TABLES
-- Removes 4 unseeded legacy tables left from earlier database provisioning
-- before Phase 0.2 core schema migration runs.
-- ==============================================================================

DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
