/**
 * AgroMarket Authentic Product Photography Directory & Resolution Engine
 *
 * Real, verified agricultural photographs for Nigerian farm produce,
 * agricultural equipment, and agronomic services.
 * Prioritizes seller-uploaded images > canonical produce photographs >
 * category-specific fallbacks > clean neutral agricultural fallback.
 */

export interface ResolvedProductImage {
  src: string;
  alt: string;
  isFallback: boolean;
  categoryLabel?: string;
}

// Canonical produce photography directory (Royalty-free authentic photographs)
export const CANONICAL_PRODUCE_PHOTOGRAPHY: Record<
  string,
  { url: string; defaultAlt: string }
> = {
  // Grains & Cereals
  "white-maize": {
    url: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Fresh harvested white maize cobs and grain",
  },
  "yellow-maize": {
    url: "https://images.unsplash.com/photo-1543257580-7269da773bf5?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Harvested yellow maize grain and corn cobs",
  },
  "paddy-rice": {
    url: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Raw harvested paddy rice grain",
  },
  "milled-parboiled-rice": {
    url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Locally milled and parboiled long-grain rice",
  },

  // Roots & Tubers
  "white-yam-tubers": {
    url: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Harvested farm white yam tubers",
  },
  "raw-cassava-roots": {
    url: "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Freshly harvested cassava root tubers",
  },
  "white-garri": {
    url: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Fermented processed coarse white garri flakes",
  },

  // Vegetables
  "roma-tomatoes": {
    url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Fresh ripe Nigerian Roma tomatoes in crate",
  },
  "habanero-pepper-rodo": {
    url: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Fresh hot Nigerian habanero pepper (ata rodo)",
  },
  "dry-red-onions": {
    url: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Dry cured Northern Nigerian red bulb onions",
  },

  // Legumes & Pulses
  "brown-beans-cowpea": {
    url: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Clean dry Nigerian brown beans (cowpea)",
  },
  "soybeans": {
    url: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "High-protein dry soybeans",
  },

  // Oil Seeds & Tree Crops
  "red-palm-oil": {
    url: "https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Pure Nigerian red palm oil",
  },
  "raw-cashew-nuts": {
    url: "https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Export-grade dry raw cashew nuts in sacks",
  },
  "cocoa": {
    url: "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Dried agricultural cocoa beans",
  },

  // Livestock & Poultry
  "live-broiler-chicken": {
    url: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Farm-raised healthy broiler chickens",
  },
  "live-ram-balami-yankasa": {
    url: "https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Healthy mature farm ram",
  },
  "live-goat-red-sokoto": {
    url: "https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Healthy farm goat",
  },
  "cattle": {
    url: "https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Healthy farm cattle",
  },

  // Aquaculture
  "fresh-live-african-catfish": {
    url: "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Fresh table-size live African catfish",
  },
  "oven-dried-smoked-catfish": {
    url: "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Hygienically processed oven-smoked catfish",
  },

  // Fruits
  "plantain": {
    url: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Fresh harvested farm plantains",
  },
  "orange": {
    url: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Fresh citrus farm oranges",
  },
};

// Category fallback photography
export const CATEGORY_PHOTOGRAPHY: Record<
  string,
  { url: string; defaultAlt: string }
> = {
  "grains-cereals": {
    url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Grains & cereals produce",
  },
  "roots-tubers": {
    url: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Roots and tubers produce",
  },
  "vegetables": {
    url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Fresh agricultural vegetables produce",
  },
  "fruits": {
    url: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Fresh harvested fruits produce",
  },
  "legumes-pulses": {
    url: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Legumes and pulses produce",
  },
  "oil-seeds-tree-crops": {
    url: "https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Oil seeds and tree crops produce",
  },
  "livestock-poultry": {
    url: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Farm livestock and poultry",
  },
  "fishery-aquaculture": {
    url: "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Fresh fish and aquaculture produce",
  },
};

// Farm equipment photography
export const EQUIPMENT_PHOTOGRAPHY: Record<
  string,
  { url: string; defaultAlt: string }
> = {
  TRACTOR: {
    url: "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Agricultural tractor in farm field",
  },
  HARVESTER: {
    url: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Commercial combine harvester in grain field",
  },
  BOOM_SPRAYER: {
    url: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Agricultural boom sprayer and equipment",
  },
  PLANTER: {
    url: "https://images.unsplash.com/photo-1530267981375-f0de937f5f13?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Precision farm planter and seeding machinery",
  },
  TILLER: {
    url: "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Rotary tiller and land preparation equipment",
  },
  IRRIGATION_PUMP: {
    url: "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "High-output farm irrigation pumping equipment",
  },
  DEFAULT: {
    url: "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Modern agricultural equipment and machinery",
  },
};

// Agricultural services photography
export const SERVICE_PHOTOGRAPHY: Record<
  string,
  { url: string; defaultAlt: string }
> = {
  AGRONOMY_ADVISORY: {
    url: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Agronomist inspecting crop health in field",
  },
  LAND_PREPARATION: {
    url: "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Mechanized plowing and land preparation service",
  },
  SOIL_TESTING: {
    url: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Professional soil analysis and nutrient testing",
  },
  PEST_CONTROL_SPRAYING: {
    url: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Precision crop protection spraying service",
  },
  VETERINARY: {
    url: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Veterinary health inspection and vaccination service",
  },
  DEFAULT: {
    url: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80",
    defaultAlt: "Professional agricultural field service",
  },
};

// Safe general fallback photograph (Lush agricultural farmland harvest)
export const GENERAL_AGRICULTURAL_FALLBACK = {
  url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80",
  defaultAlt: "Nigerian agricultural farmland and harvest",
};

/**
 * Normalizes text to slug-compatible string for keyword matching.
 */
function normalizeKeyword(text?: string | null): string {
  if (!text) return "";
  return text.toLowerCase().trim().replace(/[^a-z0-9]/g, "-");
}

/**
 * Resolves the optimal product photograph adhering strictly to the priority:
 * 1. Valid listing-specific uploaded image.
 * 2. Valid canonical product photograph based on product slug/name.
 * 3. Relevant real category-specific fallback photograph.
 * 4. Clean neutral agricultural photograph.
 */
export function resolveProductImage(params: {
  uploadedUrl?: string | null;
  productSlug?: string | null;
  productName?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  title?: string | null;
}): ResolvedProductImage {
  const { uploadedUrl, productSlug, productName, categorySlug, categoryName, title } = params;

  // 1. Valid listing-specific uploaded image
  if (uploadedUrl && typeof uploadedUrl === "string" && uploadedUrl.trim().length > 10) {
    const trimmed = uploadedUrl.trim();
    if (!trimmed.startsWith("data:") || trimmed.length > 50) {
      return {
        src: trimmed,
        alt: title || productName || "Listing photograph",
        isFallback: false,
      };
    }
  }

  // 2. Canonical product photograph based on slug or name
  const prodSlug = normalizeKeyword(productSlug);
  if (prodSlug && CANONICAL_PRODUCE_PHOTOGRAPHY[prodSlug]) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY[prodSlug];
    return {
      src: entry.url,
      alt: title || productName || entry.defaultAlt,
      isFallback: true,
      categoryLabel: categoryName || undefined,
    };
  }

  // Check name/title keywords against canonical dictionary
  const combinedText = `${productName || ""} ${title || ""} ${productSlug || ""}`.toLowerCase();

  if (combinedText.includes("maize") || combinedText.includes("corn")) {
    const entry = combinedText.includes("yellow")
      ? CANONICAL_PRODUCE_PHOTOGRAPHY["yellow-maize"]
      : CANONICAL_PRODUCE_PHOTOGRAPHY["white-maize"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Grains" };
  }

  if (combinedText.includes("rice") || combinedText.includes("paddy")) {
    const entry = combinedText.includes("paddy")
      ? CANONICAL_PRODUCE_PHOTOGRAPHY["paddy-rice"]
      : CANONICAL_PRODUCE_PHOTOGRAPHY["milled-parboiled-rice"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Grains" };
  }

  if (combinedText.includes("yam")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["white-yam-tubers"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Tubers" };
  }

  if (combinedText.includes("cassava")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["raw-cassava-roots"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Tubers" };
  }

  if (combinedText.includes("garri")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["white-garri"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Tubers" };
  }

  if (combinedText.includes("tomato")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["roma-tomatoes"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Vegetables" };
  }

  if (combinedText.includes("pepper") || combinedText.includes("rodo") || combinedText.includes("chili")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["habanero-pepper-rodo"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Vegetables" };
  }

  if (combinedText.includes("onion")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["dry-red-onions"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Vegetables" };
  }

  if (combinedText.includes("bean") || combinedText.includes("cowpea")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["brown-beans-cowpea"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Legumes" };
  }

  if (combinedText.includes("soya") || combinedText.includes("soybean")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["soybeans"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Legumes" };
  }

  if (combinedText.includes("fish") || combinedText.includes("catfish") || combinedText.includes("tilapia")) {
    const entry = combinedText.includes("smoked")
      ? CANONICAL_PRODUCE_PHOTOGRAPHY["oven-dried-smoked-catfish"]
      : CANONICAL_PRODUCE_PHOTOGRAPHY["fresh-live-african-catfish"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Aquaculture" };
  }

  if (combinedText.includes("chicken") || combinedText.includes("poultry") || combinedText.includes("broiler") || combinedText.includes("egg")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["live-broiler-chicken"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Livestock" };
  }

  if (combinedText.includes("ram") || combinedText.includes("sheep")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["live-ram-balami-yankasa"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Livestock" };
  }

  if (combinedText.includes("goat")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["live-goat-red-sokoto"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Livestock" };
  }

  if (combinedText.includes("cattle") || combinedText.includes("cow") || combinedText.includes("bull")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["cattle"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Livestock" };
  }

  if (combinedText.includes("plantain") || combinedText.includes("banana")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["plantain"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Fruits" };
  }

  if (combinedText.includes("orange") || combinedText.includes("citrus")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["orange"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Fruits" };
  }

  if (combinedText.includes("palm oil")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["red-palm-oil"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Oil Seeds" };
  }

  if (combinedText.includes("cashew")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["raw-cashew-nuts"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Tree Crops" };
  }

  if (combinedText.includes("cocoa")) {
    const entry = CANONICAL_PRODUCE_PHOTOGRAPHY["cocoa"];
    return { src: entry.url, alt: title || entry.defaultAlt, isFallback: true, categoryLabel: categoryName || "Cash Crops" };
  }

  // 3. Category-specific fallback photograph
  const catSlug = normalizeKeyword(categorySlug);
  if (catSlug && CATEGORY_PHOTOGRAPHY[catSlug]) {
    const entry = CATEGORY_PHOTOGRAPHY[catSlug];
    return {
      src: entry.url,
      alt: title || entry.defaultAlt,
      isFallback: true,
      categoryLabel: categoryName || undefined,
    };
  }

  // Check category name keywords
  const catNameLower = (categoryName || "").trim().toLowerCase();
  if (catNameLower.length >= 3) {
    for (const [key, entry] of Object.entries(CATEGORY_PHOTOGRAPHY)) {
      const cleanKey = key.replace(/-/g, " ");
      if (catNameLower.includes(cleanKey) || cleanKey.includes(catNameLower)) {
        return {
          src: entry.url,
          alt: title || entry.defaultAlt,
          isFallback: true,
          categoryLabel: categoryName || undefined,
        };
      }
    }
  }

  // 4. Safe general agricultural fallback
  return {
    src: GENERAL_AGRICULTURAL_FALLBACK.url,
    alt: title || productName || GENERAL_AGRICULTURAL_FALLBACK.defaultAlt,
    isFallback: true,
    categoryLabel: categoryName || undefined,
  };
}

/**
 * Resolves equipment photography based on category or name.
 */
export function resolveEquipmentImage(params: {
  uploadedUrl?: string | null;
  category?: string | null;
  name?: string | null;
}): ResolvedProductImage {
  const { uploadedUrl, category, name } = params;

  if (uploadedUrl && uploadedUrl.trim().length > 10) {
    return {
      src: uploadedUrl.trim(),
      alt: name || "Agricultural equipment",
      isFallback: false,
    };
  }

  const catUpper = (category || "").toUpperCase();
  const entry = EQUIPMENT_PHOTOGRAPHY[catUpper] || EQUIPMENT_PHOTOGRAPHY.DEFAULT;

  return {
    src: entry.url,
    alt: name || entry.defaultAlt,
    isFallback: true,
  };
}

/**
 * Resolves service photography based on category or title.
 */
export function resolveServiceImage(params: {
  uploadedUrl?: string | null;
  category?: string | null;
  title?: string | null;
}): ResolvedProductImage {
  const { uploadedUrl, category, title } = params;

  if (uploadedUrl && uploadedUrl.trim().length > 10) {
    return {
      src: uploadedUrl.trim(),
      alt: title || "Agricultural service",
      isFallback: false,
    };
  }

  const catUpper = (category || "").toUpperCase();
  const entry = SERVICE_PHOTOGRAPHY[catUpper] || SERVICE_PHOTOGRAPHY.DEFAULT;

  return {
    src: entry.url,
    alt: title || entry.defaultAlt,
    isFallback: true,
  };
}
