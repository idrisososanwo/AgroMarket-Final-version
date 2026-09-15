-- AgroMarket Migration 00: Base Database Extensions
-- This migration initializes required PostgreSQL extensions for UUID generation and cryptographic utilities.
-- Business tables will be defined in subsequent migrations starting in Phase 0.2.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Comment on database setup
COMMENT ON SCHEMA public IS 'AgroMarket Core Schema';
