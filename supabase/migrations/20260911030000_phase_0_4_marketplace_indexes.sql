-- ==============================================================================
-- AGROMARKET PHASE 0.4: MARKETPLACE INDEXES & INVENTORY POLICIES
-- Adds high-performance catalog discovery indexes and seller inventory policies
-- ==============================================================================

-- 1. Discovery & Sorting Performance Indexes
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price_per_unit);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);

-- 2. Inventory Policies for Sellers
-- Allow sellers to insert inventory records for their owned listings
CREATE POLICY "Sellers can insert inventory for their listings"
  ON public.inventory FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = inventory.listing_id AND l.seller_id = auth.uid()
  ));

-- Allow sellers to delete inventory records when archiving or removing their listings
CREATE POLICY "Sellers can delete inventory for their listings"
  ON public.inventory FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = inventory.listing_id AND l.seller_id = auth.uid()
  ));
