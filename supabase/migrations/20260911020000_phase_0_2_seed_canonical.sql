-- ==============================================================================
-- AGROMARKET PHASE 0.2: CANONICAL REFERENCE SEED DATA
-- Strictly reference categories, canonical products, and roles.
-- ABSOLUTELY ZERO PIG/PORK PRODUCTS. ZERO FAKE USERS/ORDERS/ACTIVITY.
-- ==============================================================================

-- 1. Canonical User Roles
INSERT INTO public.roles (code, name, description)
VALUES
  ('BUYER', 'Buyer', 'Individual or wholesale consumer purchasing farm produce'),
  ('FARMER', 'Farmer', 'Agricultural producer and farm manager'),
  ('BUSINESS', 'Agribusiness', 'Commercial food processor, off-taker, or aggregator'),
  ('JOB_SEEKER', 'Agricultural Laborer / Expert', 'Farm worker, operator, agronomist seeking employment'),
  ('SERVICE_PROVIDER', 'Agro-Service Provider', 'Operator providing specialized agricultural services'),
  ('EQUIPMENT_OWNER', 'Equipment Owner / Lessor', 'Owner leasing tractors, implements, or farm machinery'),
  ('EXPERT', 'Agronomic Expert / Extensionist', 'Certified agricultural specialist providing advisory'),
  ('ADMIN', 'Platform Administrator', 'AgroMarket compliance and operations supervisor')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 2. Canonical Produce Categories (Nigerian Agro-Ecosystem)
INSERT INTO public.categories (id, name, slug, description)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Grains & Cereals', 'grains-cereals', 'Staple cereal crops including maize, rice, sorghum, and millet'),
  ('a0000000-0000-0000-0000-000000000002', 'Roots & Tubers', 'roots-tubers', 'Tropical root crops including yam, cassava, sweet potato, and cocoyam'),
  ('a0000000-0000-0000-0000-000000000003', 'Vegetables', 'vegetables', 'Fresh vegetables including tomatoes, peppers, onions, and leafy greens'),
  ('a0000000-0000-0000-0000-000000000004', 'Fruits', 'fruits', 'Fresh tropical fruits including citrus, mangoes, plantain, and pineapple'),
  ('a0000000-0000-0000-0000-000000000005', 'Legumes & Pulses', 'legumes-pulses', 'Protein-rich legumes including cowpeas (beans), groundnuts, and soybeans'),
  ('a0000000-0000-0000-0000-000000000006', 'Oil Seeds & Tree Crops', 'oil-seeds-tree-crops', 'Industrial tree crops and oil seeds including oil palm, cocoa, cashew, and sesame'),
  ('a0000000-0000-0000-0000-000000000007', 'Livestock & Poultry', 'livestock-poultry', 'Ruminants and poultry including cattle, rams, goats, broilers, layers, and turkey (strictly no swine)'),
  ('a0000000-0000-0000-0000-000000000008', 'Fishery & Aquaculture', 'fishery-aquaculture', 'Freshwater fish farming including catfish and tilapia')
ON CONFLICT (slug) DO NOTHING;

-- 3. Canonical Nigerian Agricultural Products (What produce IS)
INSERT INTO public.products (id, category_id, name, slug, scientific_name, default_unit, description)
VALUES
  -- Grains
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'White Maize (Grain)', 'white-maize', 'Zea mays', '100KG_BAG', 'Dried white maize grain for consumption, milling, and livestock feed'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Yellow Maize (Grain)', 'yellow-maize', 'Zea mays', '100KG_BAG', 'High-energy yellow maize grain suitable for poultry feed and food processing'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Paddy Rice', 'paddy-rice', 'Oryza sativa', '100KG_BAG', 'Unprocessed raw paddy rice harvested from local rice paddies'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Milled Parboiled Rice', 'milled-parboiled-rice', 'Oryza sativa', '50KG_BAG', 'Standard locally milled and destoned parboiled long-grain rice'),

  -- Roots & Tubers
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'White Yam (Tubers)', 'white-yam-tubers', 'Dioscorea rotundata', 'TUBER_100', 'Wholesale bundles of fresh white yam tubers'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'Raw Cassava Roots', 'raw-cassava-roots', 'Manihot esculenta', 'TONNE', 'Freshly harvested cassava tubers for garri, fufu, starch, and flour processing'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'White Garri', 'white-garri', 'Manihot esculenta', '50KG_BAG', 'Processed coarse fermented cassava flakes (white garri)'),

  -- Vegetables
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', 'Roma Tomatoes', 'roma-tomatoes', 'Solanum lycopersicum', 'CRATE', 'Fresh, firm Nigerian Roma tomatoes packed in standard crates or raffia baskets'),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003', 'Habanero Pepper (Ata Rodo)', 'habanero-pepper-rodo', 'Capsicum chinense', 'BAG_50KG', 'Fresh pungent hot peppers in standard mesh bags'),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000003', 'Dry Red Onions', 'dry-red-onions', 'Allium cepa', 'BAG_100KG', 'Cured, dry red bulb onions packed in standard Northern jute sacks'),

  -- Legumes & Pulses
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000005', 'Brown Beans (Cowpea)', 'brown-beans-cowpea', 'Vigna unguiculata', '100KG_BAG', 'Clean, dry Nigerian brown beans (Oloyin / Drum)'),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000005', 'Soybeans', 'soybeans', 'Glycine max', '100KG_BAG', 'Dry soybeans for vegetable oil extraction and animal feed production'),

  -- Oil Seeds & Tree Crops
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000006', 'Red Palm Oil', 'red-palm-oil', 'Elaeis guineensis', '25L_KEG', 'Pure unadulterated Nigerian red palm oil in standard 25-litre jerrycans'),
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000006', 'Raw Cashew Nuts', 'raw-cashew-nuts', 'Anacardium occidentale', 'TONNE', 'Export-grade dry raw cashew nuts (RCN) in jute bags'),

  -- Livestock & Poultry (Strictly Halal / Kosher compliant, NO PORK)
  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000007', 'Live Broiler Chicken', 'live-broiler-chicken', 'Gallus gallus domesticus', 'BIRD', 'Mature live broiler chickens (average weight 2.0kg - 2.8kg)'),
  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000007', 'Live Ram (Balami / Yankasa)', 'live-ram-balami-yankasa', 'Ovis aries', 'HEAD', 'Healthy live mature rams for direct farm purchase or festive shared purchases'),
  ('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000007', 'Live Boer / Red Sokoto Goat', 'live-goat-red-sokoto', 'Capra hircus', 'HEAD', 'Live healthy goats for direct slaughter or herd stocking'),

  -- Aquaculture
  ('b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000008', 'Fresh Live African Catfish', 'fresh-live-african-catfish', 'Clarias gariepinus', 'KG', 'Table-size live African catfish harvested directly from fish farm ponds'),
  ('b0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000008', 'Oven-Dried Smoked Catfish', 'oven-dried-smoked-catfish', 'Clarias gariepinus', 'KG', 'Hygienically processed oven-smoked catfish in vacuum or cartons')
ON CONFLICT (slug) DO NOTHING;
