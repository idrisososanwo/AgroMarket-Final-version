# AgroMarket Database & Migrations (Supabase)

This directory contains database migrations and local Supabase CLI configurations.

## Architecture Guidelines
- All migrations are stored chronologically in `supabase/migrations/` using UTC timestamp prefixes: `YYYYMMDDHHMMSS_<descriptive_name>.sql`.
- In Phase 0.1, only foundational Postgres extensions are initialized.
- Full domain schemas (profiles, roles, farms, products, orders, escrow, etc.) will be introduced incrementally in Phase 0.2+.

## Running Migrations Locally

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```
2. **Start Local Supabase Environment**:
   ```bash
   supabase start
   ```
3. **Apply Migrations**:
   ```bash
   supabase db reset
   # or
   supabase migration up
   ```
4. **Create a New Migration**:
   ```bash
   supabase migration new <migration_name>
   ```

## Production Deployment
- Connect your Supabase project using `supabase link --project-ref <your-project-id>`.
- Push new migrations via CI/CD using `supabase db push`.
