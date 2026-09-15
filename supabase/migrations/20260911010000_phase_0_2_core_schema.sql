-- ==============================================================================
-- AGROMARKET PHASE 0.2: COMPLETE FOUNDATIONAL DATABASE SCHEMA
-- Unified Relational Architecture for Nigerian Agricultural Ecosystem
-- ==============================================================================

-- Trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role_code = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 1. CORE IDENTITY, ACCESS & PROFILES
-- ==============================================================================

-- Canonical Roles Catalog
CREATE TABLE public.roles (
  code VARCHAR(30) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles are viewable by all authenticated users"
  ON public.roles FOR SELECT
  TO authenticated, anon
  USING (true);

-- User Profiles (Extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  avatar_url TEXT,
  location_address TEXT,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50) NOT NULL,
  bio TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User Roles (Multi-Role Support)
CREATE TABLE public.user_roles (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_code VARCHAR(30) NOT NULL REFERENCES public.roles(code) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  assigned_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (user_id, role_code)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- Notice: Insertion and updates on user_roles are prohibited for ordinary users!
-- Only service_role or verified ADMIN users can assign roles.
CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Business Profiles (Agribusinesses, Processors, Cooperatives)
CREATE TABLE public.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name VARCHAR(150) NOT NULL,
  rc_number VARCHAR(50),
  business_type VARCHAR(50) NOT NULL, -- CORPORATE, COOPERATIVE, SOLE_PROPRIETORSHIP, OFF_TAKER
  tax_id VARCHAR(50),
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50) NOT NULL,
  office_address TEXT NOT NULL,
  website TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business profiles are viewable by all"
  ON public.business_profiles FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can insert their own business profile"
  ON public.business_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business profile"
  ON public.business_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Verification Records (NIN, BVN, CAC, Inspections)
CREATE TABLE public.verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL, -- NIN, BVN, CAC, FARM_INSPECTION, AGRO_CERTIFICATE
  document_reference VARCHAR(100),
  document_urls TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewer_id UUID REFERENCES public.profiles(id),
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_verification_records_updated_at
  BEFORE UPDATE ON public.verification_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verification records"
  ON public.verification_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can submit their own verification records"
  ON public.verification_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can review verifications"
  ON public.verification_records FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- ==============================================================================
-- 2. FARM & FARMER DOMAIN
-- ==============================================================================

CREATE TABLE public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  size NUMERIC(10, 2) NOT NULL CHECK (size > 0),
  size_unit VARCHAR(20) NOT NULL DEFAULT 'HECTARES' CHECK (size_unit IN ('HECTARES', 'ACRES', 'PLOTS', 'SQUARE_METERS')),
  production_type VARCHAR(50) NOT NULL DEFAULT 'CROPS' CHECK (production_type IN ('CROPS', 'LIVESTOCK', 'MIXED', 'AQUACULTURE', 'HORTICULTURE')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_farms_updated_at
  BEFORE UPDATE ON public.farms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public farms are viewable by all"
  ON public.farms FOR SELECT
  TO authenticated, anon
  USING (is_public = true OR auth.uid() = farmer_id OR public.is_admin());

CREATE POLICY "Farmers can manage their own farms"
  ON public.farms FOR ALL
  TO authenticated
  USING (auth.uid() = farmer_id)
  WITH CHECK (auth.uid() = farmer_id);

-- ==============================================================================
-- 3. PRODUCT CATALOG, LISTINGS & INVENTORY
-- ==============================================================================

-- Categories (Strictly no pig/pork)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_category CHECK (name !~* '\y(pork|pig|swine|bacon|ham|lard)\y' AND slug !~* '\y(pork|pig|swine|bacon|ham|lard)\y')
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are readable by everyone"
  ON public.categories FOR SELECT
  TO authenticated, anon
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Only admins manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Canonical Products (What a product IS; strictly no pig/pork)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name VARCHAR(150) NOT NULL UNIQUE,
  slug VARCHAR(150) NOT NULL UNIQUE,
  scientific_name VARCHAR(150),
  description TEXT,
  default_unit VARCHAR(30) NOT NULL DEFAULT 'KG',
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_product CHECK (name !~* '\y(pork|pig|swine|bacon|ham|lard)\y' AND slug !~* '\y(pork|pig|swine|bacon|ham|lard)\y')
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are readable by everyone"
  ON public.products FOR SELECT
  TO authenticated, anon
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Only admins manage canonical products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Farm Products Association
CREATE TABLE public.farm_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variety VARCHAR(100),
  estimated_annual_yield NUMERIC(12, 2),
  yield_unit VARCHAR(30) NOT NULL DEFAULT 'KG',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(farm_id, product_id)
);

ALTER TABLE public.farm_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm products viewable if farm is readable"
  ON public.farm_products FOR SELECT
  TO authenticated, anon
  USING (EXISTS (
    SELECT 1 FROM public.farms f
    WHERE f.id = farm_products.farm_id AND (f.is_public = true OR f.farmer_id = auth.uid())
  ));

CREATE POLICY "Farmers can manage their farm products"
  ON public.farm_products FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.farms f WHERE f.id = farm_products.farm_id AND f.farmer_id = auth.uid()
  ));

-- Listings (What a seller is offering)
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  price_per_unit NUMERIC(14, 2) NOT NULL CHECK (price_per_unit > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  unit VARCHAR(30) NOT NULL,
  minimum_order_quantity NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (minimum_order_quantity > 0),
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50) NOT NULL,
  pickup_address TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'OUT_OF_STOCK', 'ARCHIVED')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active listings are viewable by all"
  ON public.listings FOR SELECT
  TO authenticated, anon
  USING (status = 'ACTIVE' OR auth.uid() = seller_id OR public.is_admin());

CREATE POLICY "Sellers can manage their own listings"
  ON public.listings FOR ALL
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Inventory (Safe stock management with non-negative constraints)
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL UNIQUE REFERENCES public.listings(id) ON DELETE CASCADE,
  quantity_on_hand NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  quantity_reserved NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  quantity_available NUMERIC(12, 2) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_quantity_available_non_negative CHECK (quantity_on_hand >= quantity_reserved)
);

CREATE TRIGGER set_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory is viewable by listing seller and buyers"
  ON public.inventory FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Sellers can update their own inventory"
  ON public.inventory FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.listings l WHERE l.id = inventory.listing_id AND l.seller_id = auth.uid()
  ));

-- ==============================================================================
-- 4. CART DOMAIN (Multi-Seller Supported)
-- ==============================================================================

CREATE TABLE public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own cart"
  ON public.carts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(cart_id, listing_id)
);

CREATE TRIGGER set_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cart items"
  ON public.cart_items FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()
  ));

-- ==============================================================================
-- 5. ORDERS & MULTI-SELLER CHECKOUT
-- ==============================================================================

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) NOT NULL UNIQUE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PAID', 'PROCESSING', 'PARTIALLY_FULFILLED', 'COMPLETED', 'CANCELLED', 'DISPUTED')),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  subtotal_amount NUMERIC(14, 2) NOT NULL CHECK (subtotal_amount >= 0),
  delivery_fee_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee_amount >= 0),
  discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
  delivery_address TEXT NOT NULL,
  delivery_state VARCHAR(50) NOT NULL,
  delivery_lga VARCHAR(50) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  delivery_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name_snapshot VARCHAR(150) NOT NULL,
  unit_price_snapshot NUMERIC(14, 2) NOT NULL CHECK (unit_price_snapshot > 0),
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  unit_snapshot VARCHAR(30) NOT NULL,
  total_price NUMERIC(14, 2) NOT NULL CHECK (total_price >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'REFUNDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR public.is_admin() OR EXISTS (
    SELECT 1 FROM public.order_items oi WHERE oi.order_id = orders.id AND oi.seller_id = auth.uid()
  ));

CREATE POLICY "Buyers can insert orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants can view order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    seller_id = auth.uid() OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.buyer_id = auth.uid())
  );

-- ==============================================================================
-- 6. PAYMENTS (Nigerian Fiat First, Stellar-Ready)
-- ==============================================================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  provider VARCHAR(50) NOT NULL DEFAULT 'PAYSTACK'
    CHECK (provider IN ('PAYSTACK', 'FLUTTERWAVE', 'MONNIFY', 'BANK_TRANSFER', 'ESCROW_WALLET', 'STELLAR_XLM')),
  provider_reference VARCHAR(150) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'INITIALIZED'
    CHECK (status IN ('INITIALIZED', 'PENDING', 'SUCCESSFUL', 'FAILED', 'REFUNDED')),
  payment_method VARCHAR(50) NOT NULL DEFAULT 'CARD'
    CHECK (payment_method IN ('CARD', 'BANK_TRANSFER', 'USSD', 'WALLET', 'CRYPTO')),
  channel_metadata JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR public.is_admin());

-- Notice: Payment status cannot be altered directly by clients; strictly service_role or admin
CREATE POLICY "Payments insertable by buyer or service role"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id OR public.is_admin());

-- ==============================================================================
-- 7. LOGISTICS (Asset-Light 3rd Party Fleet Integration)
-- ==============================================================================

CREATE TABLE public.logistics_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  company_rc VARCHAR(50),
  contact_person VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  coverage_states TEXT[] NOT NULL DEFAULT '{}',
  fleet_types TEXT[] NOT NULL DEFAULT '{}',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.logistics_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active logistics providers viewable by authenticated users"
  ON public.logistics_providers FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins manage logistics providers"
  ON public.logistics_providers FOR ALL
  TO authenticated
  USING (public.is_admin());

CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  provider_id UUID REFERENCES public.logistics_providers(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  pickup_address TEXT NOT NULL,
  pickup_state VARCHAR(50) NOT NULL,
  pickup_lga VARCHAR(50) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_state VARCHAR(50) NOT NULL,
  delivery_lga VARCHAR(50) NOT NULL,
  recipient_name VARCHAR(100) NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PICKUP'
    CHECK (status IN ('PENDING_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED')),
  tracking_number VARCHAR(100) UNIQUE,
  proof_of_delivery_url TEXT,
  estimated_delivery_date TIMESTAMPTZ,
  actual_delivery_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order participants can view delivery"
  ON public.deliveries FOR SELECT
  TO authenticated
  USING (
    seller_id = auth.uid() OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = deliveries.order_id AND o.buyer_id = auth.uid())
  );

CREATE TABLE public.delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  location_name VARCHAR(150),
  description TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Delivery events viewable if delivery is accessible"
  ON public.delivery_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.deliveries d
    WHERE d.id = delivery_events.delivery_id AND (
      d.seller_id = auth.uid() OR public.is_admin() OR
      EXISTS (SELECT 1 FROM public.orders o WHERE o.id = d.order_id AND o.buyer_id = auth.uid())
    )
  ));

-- ==============================================================================
-- 8. SHARED PURCHASE (Bulk-Splitting for Crops & Animals)
-- ==============================================================================

CREATE TABLE public.shared_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  produce_type VARCHAR(30) NOT NULL DEFAULT 'CROP' CHECK (produce_type IN ('CROP', 'ANIMAL_PRODUCT')),
  total_quantity NUMERIC(12, 2) NOT NULL CHECK (total_quantity > 0),
  unit VARCHAR(30) NOT NULL,
  unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price > 0),
  total_price NUMERIC(14, 2) NOT NULL CHECK (total_price > 0),
  target_participants INT NOT NULL CHECK (target_participants >= 2),
  current_participants INT NOT NULL DEFAULT 1 CHECK (current_participants >= 1),
  min_share_quantity NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (min_share_quantity > 0),
  deadline TIMESTAMPTZ NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'FUNDED', 'ALLOCATED', 'DISPATCHED', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
  pickup_hub_location TEXT NOT NULL,
  hub_state VARCHAR(50) NOT NULL,
  hub_lga VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_shared_purchases_updated_at
  BEFORE UPDATE ON public.shared_purchases
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.shared_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shared purchases viewable by all"
  ON public.shared_purchases FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create shared purchases"
  ON public.shared_purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE TABLE public.shared_purchase_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_purchase_id UUID NOT NULL REFERENCES public.shared_purchases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  shares_count NUMERIC(12, 2) NOT NULL CHECK (shares_count > 0),
  share_amount NUMERIC(14, 2) NOT NULL CHECK (share_amount > 0),
  payment_id UUID REFERENCES public.payments(id),
  status VARCHAR(30) NOT NULL DEFAULT 'PLEDGED' CHECK (status IN ('PLEDGED', 'PAID', 'REFUNDED')),
  portion_allocation_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(shared_purchase_id, user_id)
);

ALTER TABLE public.shared_purchase_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view shared purchase members"
  ON public.shared_purchase_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join shared purchase"
  ON public.shared_purchase_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 9. AGRICULTURAL JOBS
-- ==============================================================================

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL
    CHECK (category IN ('AGRONOMIST', 'FARM_MANAGER', 'HARVEST_CREW', 'MACHINE_OPERATOR', 'CASUAL_LABOUR', 'EXTENSION_OFFICER', 'VETERINARY', 'OTHER')),
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50) NOT NULL,
  location_details TEXT,
  employment_type VARCHAR(30) NOT NULL DEFAULT 'FULL_TIME'
    CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'SEASONAL', 'INTERNSHIP')),
  compensation_type VARCHAR(30) NOT NULL DEFAULT 'MONTHLY'
    CHECK (compensation_type IN ('HOURLY', 'DAILY', 'MONTHLY', 'PIECE_RATE')),
  compensation_amount NUMERIC(14, 2) NOT NULL CHECK (compensation_amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  requirements TEXT,
  deadline TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active jobs viewable by all"
  ON public.jobs FOR SELECT
  TO authenticated, anon
  USING (status = 'ACTIVE' OR auth.uid() = employer_id OR public.is_admin());

CREATE POLICY "Employers can manage their jobs"
  ON public.jobs FOR ALL
  TO authenticated
  USING (auth.uid() = employer_id)
  WITH CHECK (auth.uid() = employer_id);

CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_note TEXT,
  resume_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'HIRED')),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(job_id, applicant_id)
);

CREATE TRIGGER set_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants and employers can view applications"
  ON public.job_applications FOR SELECT
  TO authenticated
  USING (
    applicant_id = auth.uid() OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_applications.job_id AND j.employer_id = auth.uid())
  );

CREATE POLICY "Applicants can submit applications"
  ON public.job_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = applicant_id);

-- ==============================================================================
-- 10. AGRICULTURAL SERVICES
-- ==============================================================================

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  service_category VARCHAR(50) NOT NULL
    CHECK (service_category IN ('TRACTOR_OPERATOR', 'SOIL_TESTING', 'DRONE_SPRAYING', 'VETERINARY', 'LAND_CLEARING', 'IRRIGATION', 'AG_CONSULTING', 'PROCESSING', 'OTHER')),
  coverage_states TEXT[] NOT NULL DEFAULT '{}',
  pricing_model VARCHAR(30) NOT NULL DEFAULT 'FIXED'
    CHECK (pricing_model IN ('FIXED', 'PER_HECTARE', 'PER_HOUR', 'QUOTE_BASED')),
  base_rate NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (base_rate >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services viewable by all"
  ON public.services FOR SELECT
  TO authenticated, anon
  USING (is_available = true OR auth.uid() = provider_id OR public.is_admin());

CREATE POLICY "Providers manage their services"
  ON public.services FOR ALL
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  details TEXT NOT NULL,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50) NOT NULL,
  location_address TEXT NOT NULL,
  proposed_date DATE NOT NULL,
  quoted_amount NUMERIC(14, 2) CHECK (quoted_amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'QUOTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view their service requests"
  ON public.service_requests FOR SELECT
  TO authenticated
  USING (client_id = auth.uid() OR provider_id = auth.uid() OR public.is_admin());

CREATE POLICY "Clients can request services"
  ON public.service_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients and providers can update request"
  ON public.service_requests FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid() OR provider_id = auth.uid() OR public.is_admin());

-- ==============================================================================
-- 11. FARM EQUIPMENT RENTALS
-- ==============================================================================

CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL
    CHECK (category IN ('TRACTOR', 'HARVESTER', 'PLANTER', 'BOOM_SPRAYER', 'TILLER', 'IRRIGATION_PUMP', 'THRESHER', 'GENERATOR', 'OTHER')),
  make_model VARCHAR(100),
  year_manufactured INT,
  description TEXT,
  location_state VARCHAR(50) NOT NULL,
  location_lga VARCHAR(50) NOT NULL,
  daily_rental_rate NUMERIC(14, 2) NOT NULL CHECK (daily_rental_rate > 0),
  caution_deposit NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (caution_deposit >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  operator_included BOOLEAN NOT NULL DEFAULT false,
  condition VARCHAR(30) NOT NULL DEFAULT 'GOOD' CHECK (condition IN ('EXCELLENT', 'GOOD', 'FAIR')),
  is_available BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UNDER_MAINTENANCE', 'RENTED', 'DECOMMISSIONED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Available equipment viewable by all"
  ON public.equipment FOR SELECT
  TO authenticated, anon
  USING (status = 'ACTIVE' OR auth.uid() = owner_id OR public.is_admin());

CREATE POLICY "Owners manage their equipment"
  ON public.equipment FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.equipment_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE RESTRICT,
  renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INT NOT NULL CHECK (total_days > 0),
  daily_rate NUMERIC(14, 2) NOT NULL CHECK (daily_rate > 0),
  total_rental_amount NUMERIC(14, 2) NOT NULL CHECK (total_rental_amount > 0),
  deposit_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  status VARCHAR(30) NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED', 'APPROVED', 'ACTIVE', 'RETURNED', 'COMPLETED', 'CANCELLED', 'DISPUTED')),
  handover_notes TEXT,
  return_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_rental_dates CHECK (end_date >= start_date)
);

CREATE TRIGGER set_equipment_rentals_updated_at
  BEFORE UPDATE ON public.equipment_rentals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.equipment_rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Renters and owners view rentals"
  ON public.equipment_rentals FOR SELECT
  TO authenticated
  USING (renter_id = auth.uid() OR owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "Renters can initiate rental"
  ON public.equipment_rentals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Renters and owners can update rentals"
  ON public.equipment_rentals FOR UPDATE
  TO authenticated
  USING (renter_id = auth.uid() OR owner_id = auth.uid() OR public.is_admin());

-- ==============================================================================
-- 12. MARKET INTELLIGENCE & COMMODITY PRICES
-- ==============================================================================

CREATE TABLE public.price_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  market_name VARCHAR(150) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  price NUMERIC(14, 2) NOT NULL CHECK (price > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  unit VARCHAR(30) NOT NULL,
  source_type VARCHAR(50) NOT NULL DEFAULT 'COMMUNITY'
    CHECK (source_type IN ('OFFICIAL_MONITOR', 'ENUMERATOR', 'COMMUNITY', 'COOPERATIVE')),
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED'
    CHECK (verification_status IN ('UNVERIFIED', 'VERIFIED', 'REJECTED')),
  observed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.price_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price observations viewable by all"
  ON public.price_observations FOR SELECT
  TO authenticated, anon
  USING (verification_status = 'VERIFIED' OR auth.uid() = reported_by OR public.is_admin());

CREATE POLICY "Authenticated users can report prices"
  ON public.price_observations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

CREATE TABLE public.demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  region_state VARCHAR(50) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  predicted_demand_volume NUMERIC(14, 2) NOT NULL CHECK (predicted_demand_volume >= 0),
  volume_unit VARCHAR(30) NOT NULL DEFAULT 'TONNE',
  confidence_score NUMERIC(3, 2) CHECK (confidence_score BETWEEN 0.0 AND 1.0),
  model_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.demand_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demand forecasts viewable by authenticated users"
  ON public.demand_forecasts FOR SELECT
  TO authenticated
  USING (true);

-- ==============================================================================
-- 13. SMART BASKET & CONSUMER PREFERENCES
-- ==============================================================================

CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  dietary_preferences TEXT[] NOT NULL DEFAULT '{}',
  family_size INT DEFAULT 4 CHECK (family_size > 0),
  budget_target_monthly NUMERIC(14, 2) CHECK (budget_target_monthly >= 0),
  preferred_staples TEXT[] NOT NULL DEFAULT '{}',
  state VARCHAR(50),
  lga VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own preferences"
  ON public.user_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.basket_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  recommended_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_total_cost NUMERIC(14, 2) NOT NULL CHECK (estimated_total_cost >= 0),
  estimated_savings NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (estimated_savings >= 0),
  rationale TEXT NOT NULL,
  is_accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.basket_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own basket recommendations"
  ON public.basket_recommendations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 14. AI SERVICE LAYER (Audit & History)
-- ==============================================================================

CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  capability VARCHAR(50) NOT NULL DEFAULT 'FARMER_AI'
    CHECK (capability IN ('FARMER_AI', 'SMART_BASKET', 'FOOD_HEALTH', 'AGRONOMY')),
  title VARCHAR(150) NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own AI conversations"
  ON public.ai_conversations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('USER', 'ASSISTANT', 'SYSTEM')),
  content TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  safety_flags JSONB DEFAULT '{}'::jsonb,
  disclaimer_acknowledged BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their conversation messages"
  ON public.ai_messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations c WHERE c.id = ai_messages.conversation_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users insert into their conversations"
  ON public.ai_messages FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_conversations c WHERE c.id = ai_messages.conversation_id AND c.user_id = auth.uid()
  ));

-- ==============================================================================
-- 15. AGRICULTURAL KNOWLEDGE & EXTENSION
-- ==============================================================================

CREATE TABLE public.knowledge_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  content_type VARCHAR(50) NOT NULL DEFAULT 'GAP_TUTORIAL'
    CHECK (content_type IN ('EXPERT_GUIDE', 'GOVERNMENT_UPDATE', 'NEWS', 'GAP_TUTORIAL', 'EVENT')),
  target_crops TEXT[] NOT NULL DEFAULT '{}',
  agro_ecological_zones TEXT[] NOT NULL DEFAULT '{}',
  body_markdown TEXT NOT NULL,
  summary TEXT,
  cover_image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_knowledge_content_updated_at
  BEFORE UPDATE ON public.knowledge_content
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.knowledge_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published knowledge content viewable by all"
  ON public.knowledge_content FOR SELECT
  TO authenticated, anon
  USING (is_published = true OR auth.uid() = author_id OR public.is_admin());

CREATE POLICY "Admins and experts can publish content"
  ON public.knowledge_content FOR ALL
  TO authenticated
  USING (auth.uid() = author_id OR public.is_admin());

-- ==============================================================================
-- 16. REVIEWS & TRUST (Relational Non-Polymorphic)
-- ==============================================================================

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_verified_transaction BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by all"
  ON public.reviews FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- ==============================================================================
-- 17. DISPUTES & MEDIATION
-- ==============================================================================

CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dispute_type VARCHAR(50) NOT NULL
    CHECK (dispute_type IN ('ORDER', 'PAYMENT', 'DELIVERY', 'SERVICE', 'EQUIPMENT_RENTAL')),
  related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  related_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  related_delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
  reason VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'ESCROW_FROZEN', 'RESOLVED', 'REJECTED')),
  assigned_admin_id UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Complainants and admins view disputes"
  ON public.disputes FOR SELECT
  TO authenticated
  USING (opened_by = auth.uid() OR public.is_admin());

CREATE POLICY "Users can open disputes"
  ON public.disputes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = opened_by);

CREATE POLICY "Only admins resolve disputes"
  ON public.disputes FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- ==============================================================================
-- 18. MULTI-CHANNEL NOTIFICATIONS
-- ==============================================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(30) NOT NULL DEFAULT 'IN_APP'
    CHECK (channel IN ('IN_APP', 'SMS', 'WHATSAPP', 'EMAIL', 'PUSH')),
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view and manage their notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 19. ADMIN & AUDIT TRAIL (Append-Only Immutable Ledger)
-- ==============================================================================

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45),
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Notice: No UPDATE or DELETE policy is defined on audit_logs!
-- Audit history is immutable and append-only.

-- ==============================================================================
-- INDEXES FOR HIGH-TRAFFIC & RELATIONAL LOOKUPS
-- ==============================================================================

CREATE INDEX idx_profiles_state_lga ON public.profiles(state, lga);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_farms_farmer ON public.farms(farmer_id);
CREATE INDEX idx_farms_state_lga ON public.farms(state, lga);
CREATE INDEX idx_listings_seller ON public.listings(seller_id);
CREATE INDEX idx_listings_product ON public.listings(product_id);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_state_lga ON public.listings(state, lga);
CREATE INDEX idx_cart_items_cart ON public.cart_items(cart_id);
CREATE INDEX idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_seller ON public.order_items(seller_id);
CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_payments_reference ON public.payments(provider_reference);
CREATE INDEX idx_deliveries_order ON public.deliveries(order_id);
CREATE INDEX idx_deliveries_tracking ON public.deliveries(tracking_number);
CREATE INDEX idx_shared_purchases_status ON public.shared_purchases(status);
CREATE INDEX idx_jobs_state_lga ON public.jobs(state, lga);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_services_category ON public.services(service_category);
CREATE INDEX idx_equipment_category ON public.equipment(category);
CREATE INDEX idx_price_observations_product ON public.price_observations(product_id, observed_at);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
