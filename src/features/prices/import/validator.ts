import { normalizePrice } from "../normalization";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { ExternalPriceInputRecord, PreviewValidationItem } from "./types";

export interface CanonicalProductRef {
  id: string;
  name: string;
  slug?: string;
  defaultUnit: string;
}

/**
 * Standard mapping dictionary from external commodity nomenclatures
 * (NBS, WFP/HDX, NEPC) to AgroMarket canonical product catalog.
 */
export const COMMODITY_ALIASES: Record<string, string> = {
  // NBS Selected Food Prices Watch
  "rice local sold loose": "Milled Parboiled Rice",
  "rice medium grained": "Milled Parboiled Rice",
  "rice imported high quality sold loose": "Milled Parboiled Rice",
  "beans brown,sold loose": "Brown Beans (Cowpea)",
  "beans brown sold loose": "Brown Beans (Cowpea)",
  "beans white,black eye.sold loose": "Brown Beans (Cowpea)",
  "maize grain white sold loose": "White Maize (Grain)",
  "maize grain yellow sold loose": "Yellow Maize (Grain)",
  "gari white,sold loose": "White Garri",
  "gari white sold loose": "White Garri",
  "tomato": "Roma Tomatoes",
  "tomatoes": "Roma Tomatoes",
  "onion bulb": "Dry Red Onions",
  "yam tuber": "White Yam (Tubers)",
  "palm oil: 1 bottle,enclosed cask": "Red Palm Oil",
  "palm oil": "Red Palm Oil",
  "catfish (fresh)": "Fresh Live African Catfish",
  "catfish (dried)": "Oven-Dried Smoked Catfish",
  "pepper red (rodo)": "Habanero Pepper (Ata Rodo)",
  "pepper (rodo)": "Habanero Pepper (Ata Rodo)",

  // WFP / HDX Nigeria Food Prices
  "rice (local)": "Milled Parboiled Rice",
  "maize (white)": "White Maize (Grain)",
  "maize (yellow)": "Yellow Maize (Grain)",
  "cowpea (brown)": "Brown Beans (Cowpea)",
  "cowpea (white)": "Brown Beans (Cowpea)",
  "gari (white)": "White Garri",
  "onions": "Dry Red Onions",
  "yam": "White Yam (Tubers)",
  "oil (palm)": "Red Palm Oil",
  "cassava (raw)": "Raw Cassava Roots",
  "soybeans": "Soybeans",

  // NEPC Indicative Export Prices
  "raw cashew nuts": "Raw Cashew Nuts",
  "rcn (outturn 48-50)": "Raw Cashew Nuts",
  "paddy rice": "Paddy Rice",
  "live broiler chicken": "Live Broiler Chicken",
  "live ram": "Live Ram (Balami / Yankasa)",
  "live goat": "Live Boer / Red Sokoto Goat",
};

/**
 * Resolves an external commodity name to an authoritative canonical product.
 */
export function resolveCanonicalProduct(
  rawName: string,
  catalog: CanonicalProductRef[]
): CanonicalProductRef | null {
  const normalized = rawName.trim().toLowerCase();

  // 1. Direct name match in catalog
  const exact = catalog.find((p) => p.name.toLowerCase() === normalized);
  if (exact) return exact;

  // 2. Alias lookup
  const aliasMatch = COMMODITY_ALIASES[normalized];
  if (aliasMatch) {
    const fromAlias = catalog.find((p) => p.name.toLowerCase() === aliasMatch.toLowerCase());
    if (fromAlias) return fromAlias;
  }

  // 3. Substring match
  const partial = catalog.find(
    (p) =>
      p.name.toLowerCase().includes(normalized) ||
      normalized.includes(p.name.toLowerCase())
  );
  if (partial) return partial;

  return null;
}

/**
 * Validates a single external price record against canonical rules,
 * conversion models, and provenance requirements.
 */
export function validateExternalPriceRecord(
  input: ExternalPriceInputRecord,
  catalog: CanonicalProductRef[],
  existingKeys: Set<string>
): PreviewValidationItem {
  const reasons: string[] = [];
  let status: PreviewValidationItem["status"] = "VALID";

  // 1. Canonical Product Resolution
  let product: CanonicalProductRef | null = null;
  if (input.canonicalProductId) {
    product = catalog.find((p) => p.id === input.canonicalProductId) || null;
  }
  if (!product) {
    product = resolveCanonicalProduct(input.rawCommodityName, catalog);
  }

  if (!product) {
    status = "REJECTED";
    reasons.push(`Unmatched commodity: "${input.rawCommodityName}" is not present in canonical catalog.`);
  }

  // 2. Amount and Currency Validation
  if (!input.price || input.price <= 0 || !Number.isFinite(input.price)) {
    status = "REJECTED";
    reasons.push(`Invalid price amount: ${input.price}. Price must be a positive finite number.`);
  }
  if (input.currency !== "NGN") {
    status = "REJECTED";
    reasons.push(`Invalid currency: "${input.currency}". AgroMarket only supports NGN.`);
  }

  // 3. Location Validation
  const validState = NIGERIAN_STATES.find(
    (s) => s.toLowerCase() === input.state.trim().toLowerCase()
  );
  if (!validState) {
    status = "REJECTED";
    reasons.push(`Invalid Nigerian state: "${input.state}".`);
  }
  if (!input.marketName || input.marketName.trim().length === 0) {
    status = "REJECTED";
    reasons.push("Market location is required.");
  }

  // 4. Provenance & Source Metadata Validation
  if (!input.publisher || input.publisher.trim().length === 0) {
    status = "REJECTED";
    reasons.push("Publisher is required for external provenance.");
  }
  if (!input.sourceUrl || !input.sourceUrl.startsWith("http")) {
    status = "REJECTED";
    reasons.push("Valid source URL is required.");
  }
  if (!input.observedAt) {
    status = "REJECTED";
    reasons.push("Observation date is required.");
  }

  // 5. Unit Normalization
  const normResult = normalizePrice(input.price, input.unit);
  let normMethod = "Direct exact unit";
  if (normResult.status === "NORMALIZED") {
    normMethod = `Standard mass/volume conversion (factor: ${normResult.conversionFactor})`;
  } else if (normResult.status === "UNAVAILABLE") {
    normMethod = "Variable/non-standard trade unit preserved without KG conversion";
  }

  // 6. Duplicate Key Check
  const obsDateOnly = input.observedAt.slice(0, 10);
  const compositeKey = `${product?.id || input.rawCommodityName}|${validState || input.state}|${input.marketName.trim()}|${input.unit.trim()}|${obsDateOnly}`;
  if (existingKeys.has(compositeKey)) {
    status = "DUPLICATE";
    reasons.push(`Duplicate record already exists for ${product?.name || input.rawCommodityName} in ${validState} (${input.marketName}) on ${obsDateOnly}.`);
  }

  // 7. Staleness Check (> 90 days for benchmark publication, or > 30 days for daily feed)
  const obsDate = new Date(input.observedAt);
  const ageDays = (Date.now() - obsDate.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays > 90) {
    if (status === "VALID") status = "STALE";
    reasons.push(`Record observed ${Math.round(ageDays)} days ago exceeds the 90-day benchmark freshness window.`);
  }

  // Determine database source_type
  let dbSourceType: PreviewValidationItem["provenance"]["sourceType"] = "GOVERNMENT_SOURCE";
  if (/wfp|hdx|feews|afex/i.test(input.publisher)) {
    dbSourceType = "PARTNER_FEED";
  } else if (/nbs|nepc|ministry|cbn/i.test(input.publisher)) {
    dbSourceType = "GOVERNMENT_SOURCE";
  }

  return {
    status,
    input,
    reasons,
    canonicalProduct: product
      ? {
          id: product.id,
          name: product.name,
          defaultUnit: product.defaultUnit,
        }
      : undefined,
    normalization: {
      normalizedPrice: normResult.normalizedPrice,
      normalizedUnit: normResult.normalizedUnit,
      status: normResult.status,
      conversionFactor: normResult.conversionFactor,
      method: normMethod,
    },
    provenance: {
      sourceType: dbSourceType,
      dataQualityLabel: "OBSERVED",
      verificationStatus: "UNVERIFIED", // External published benchmarks are not physical farm audits
      metadata: {
        publisher: input.publisher,
        source_url: input.sourceUrl,
        publication_date: input.publicationDate,
        price_classification: input.priceClassification,
        methodology: input.methodology,
        license: input.license,
        imported_at_preview: new Date().toISOString(),
      },
    },
  };
}
