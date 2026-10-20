-- ==============================================================================
-- AGROMARKET MOBILE MIGRATION: SECURE STORAGE BUCKETS & RLS POLICIES
-- Additive & Non-Destructive. PREPARED FOR MOBILE INTEGRATION.
-- NOTE: Prepared for staging/development validation. NOT APPLIED TO PRODUCTION.
-- ==============================================================================

-- 1. Create produce-images bucket if it does not already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'produce-images',
  'produce-images',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Objects RLS Policies for produce-images bucket

-- Allow public read access to produce photographs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read access for produce-images'
  ) THEN
    CREATE POLICY "Public read access for produce-images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'produce-images');
  END IF;
END $$;

-- Allow authenticated farmers, businesses, and admins to upload to their own scoped directory:
-- Path must be formatted as: farmers/<user_id>/...
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated sellers can upload produce images'
  ) THEN
    CREATE POLICY "Authenticated sellers can upload produce images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'produce-images'
        AND (storage.foldername(name))[1] = 'farmers'
        AND (storage.foldername(name))[2] = auth.uid()::text
        AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role_code IN ('FARMER', 'BUSINESS', 'ADMIN')
        )
      );
  END IF;
END $$;

-- Allow sellers to update or delete only their own uploaded produce images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Sellers can manage their own produce images'
  ) THEN
    CREATE POLICY "Sellers can manage their own produce images"
      ON storage.objects FOR ALL
      TO authenticated
      USING (
        bucket_id = 'produce-images'
        AND (storage.foldername(name))[1] = 'farmers'
        AND ((storage.foldername(name))[2] = auth.uid()::text OR public.is_admin())
      )
      WITH CHECK (
        bucket_id = 'produce-images'
        AND (storage.foldername(name))[1] = 'farmers'
        AND ((storage.foldername(name))[2] = auth.uid()::text OR public.is_admin())
      );
  END IF;
END $$;
