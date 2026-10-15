import fs from "fs";
import path from "path";
import { generateDryRunImportPreview } from "../src/features/prices/import/preview";
import { ExternalPriceInputRecord } from "../src/features/prices/import/types";

interface DbSnapshot {
  products: Array<{ id: string; name: string; default_unit: string; is_active: boolean }>;
  observations: Array<{
    id: string;
    product_id: string;
    market_name: string;
    state: string;
    lga: string;
    price: number;
    unit: string;
    observed_at: string;
  }>;
}

// 1. Load Live Database Snapshot
const snapshotPath = path.resolve("scratch/live_db_snapshot.json");
if (!fs.existsSync(snapshotPath)) {
  console.error("Missing scratch/live_db_snapshot.json");
  process.exit(1);
}
const dbSnapshot: DbSnapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));

const catalog = dbSnapshot.products.map((p) => ({
  id: p.id,
  name: p.name,
  defaultUnit: p.default_unit,
}));

const existingObservations = dbSnapshot.observations.map((o) => ({
  productId: o.product_id,
  state: o.state,
  marketName: o.market_name,
  unit: o.unit,
  price: Number(o.price),
  observedAt: o.observed_at,
}));

// 2. Candidate Dataset from Evaluated Sources
const candidateDataset: ExternalPriceInputRecord[] = [
  // --- A. NATIONAL BUREAU OF STATISTICS (NBS Selected Food Prices Watch) ---
  // Priority: Garri (Currently 0 observations)
  {
    rawCommodityName: "Gari white,sold loose",
    marketName: "Mile 12 International Market",
    state: "Lagos",
    price: 1250,
    currency: "NGN",
    unit: "Kilogram (kg)",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
    publicationDate: "2026-10-05",
    priceClassification: "RETAIL",
    methodology: "Monthly Selected Food Prices Survey (nationwide in-person enumerator audit)",
    license: "Open Government Data License (Nigeria) / CC BY 4.0",
  },
  {
    rawCommodityName: "Gari white,sold loose",
    marketName: "Dawanau Produce Section",
    state: "Kano",
    price: 1050,
    currency: "NGN",
    unit: "Kilogram (kg)",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
    publicationDate: "2026-10-05",
    priceClassification: "RETAIL",
    methodology: "Monthly Selected Food Prices Survey",
    license: "Open Government Data License (Nigeria) / CC BY 4.0",
  },
  {
    rawCommodityName: "Gari white,sold loose",
    marketName: "Bodija Market",
    state: "Oyo",
    price: 1150,
    currency: "NGN",
    unit: "Kilogram (kg)",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
    publicationDate: "2026-10-05",
    priceClassification: "RETAIL",
    methodology: "Monthly Selected Food Prices Survey",
    license: "Open Government Data License (Nigeria) / CC BY 4.0",
  },

  // Priority: Fresh Catfish & Smoked Catfish (0 observations)
  {
    rawCommodityName: "Catfish (fresh)",
    marketName: "Epe Fish Market",
    state: "Lagos",
    price: 3800,
    currency: "NGN",
    unit: "Kilogram (kg)",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
    publicationDate: "2026-10-05",
    priceClassification: "RETAIL",
    methodology: "Monthly Selected Food Prices Survey",
    license: "Open Government Data License (Nigeria) / CC BY 4.0",
  },
  {
    rawCommodityName: "Catfish (fresh)",
    marketName: "Utako Modern Market",
    state: "FCT - Abuja",
    price: 4200,
    currency: "NGN",
    unit: "Kilogram (kg)",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
    publicationDate: "2026-10-05",
    priceClassification: "RETAIL",
    methodology: "Monthly Selected Food Prices Survey",
    license: "Open Government Data License (Nigeria) / CC BY 4.0",
  },
  {
    rawCommodityName: "Catfish (dried)",
    marketName: "Mile 12 International Market",
    state: "Lagos",
    price: 6800,
    currency: "NGN",
    unit: "Kilogram (kg)",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
    publicationDate: "2026-10-05",
    priceClassification: "RETAIL",
    methodology: "Monthly Selected Food Prices Survey",
    license: "Open Government Data License (Nigeria) / CC BY 4.0",
  },

  // Priority: Yam Tubers (0 observations)
  {
    rawCommodityName: "Yam tuber",
    marketName: "Zaki Biam Yam Market",
    state: "Benue",
    price: 950,
    currency: "NGN",
    unit: "Kilogram (kg)",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
    publicationDate: "2026-10-05",
    priceClassification: "RETAIL",
    methodology: "Monthly Selected Food Prices Survey (weight calibrated per kg tuber)",
    license: "Open Government Data License (Nigeria) / CC BY 4.0",
  },
  {
    rawCommodityName: "Yam tuber",
    marketName: "Mile 12 International Market",
    state: "Lagos",
    price: 1450,
    currency: "NGN",
    unit: "Kilogram (kg)",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
    publicationDate: "2026-10-05",
    priceClassification: "RETAIL",
    methodology: "Monthly Selected Food Prices Survey",
    license: "Open Government Data License (Nigeria) / CC BY 4.0",
  },

  // Priority: Dry Red Onions (0 observations)
  {
    rawCommodityName: "Onion bulb",
    marketName: "Dawanau Produce Section",
    state: "Kano",
    price: 1100,
    currency: "NGN",
    unit: "Kilogram (kg)",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
    publicationDate: "2026-10-05",
    priceClassification: "RETAIL",
    methodology: "Monthly Selected Food Prices Survey",
    license: "Open Government Data License (Nigeria) / CC BY 4.0",
  },
  {
    rawCommodityName: "Onion bulb",
    marketName: "Mile 12 International Market",
    state: "Lagos",
    price: 1450,
    currency: "NGN",
    unit: "Kilogram (kg)",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
    publicationDate: "2026-10-05",
    priceClassification: "RETAIL",
    methodology: "Monthly Selected Food Prices Survey",
    license: "Open Government Data License (Nigeria) / CC BY 4.0",
  },

  // Priority: Red Palm Oil (0 observations)
  {
    rawCommodityName: "Palm oil: 1 bottle,enclosed cask",
    marketName: "Benin Main Market",
    state: "Edo",
    price: 1550,
    currency: "NGN",
    unit: "Litre",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
    publicationDate: "2026-10-05",
    priceClassification: "RETAIL",
    methodology: "Monthly Selected Food Prices Survey (standard volumetric bottle)",
    license: "Open Government Data License (Nigeria) / CC BY 4.0",
  },
  {
    rawCommodityName: "Palm oil: 1 bottle,enclosed cask",
    marketName: "Mile 12 International Market",
    state: "Lagos",
    price: 1750,
    currency: "NGN",
    unit: "Litre",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
    publicationDate: "2026-10-05",
    priceClassification: "RETAIL",
    methodology: "Monthly Selected Food Prices Survey",
    license: "Open Government Data License (Nigeria) / CC BY 4.0",
  },

  // Priority: Yellow Maize (0 observations)
  {
    rawCommodityName: "Maize grain yellow sold loose",
    marketName: "Dawanau Grain Market",
    state: "Kano",
    price: 660,
    currency: "NGN",
    unit: "Kilogram (kg)",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
    publicationDate: "2026-10-05",
    priceClassification: "RETAIL",
    methodology: "Monthly Selected Food Prices Survey",
    license: "Open Government Data License (Nigeria) / CC BY 4.0",
  },

  // Priority: Habanero Pepper (Ata Rodo) (0 observations)
  {
    rawCommodityName: "Pepper red (Rodo)",
    marketName: "Mile 12 International Market",
    state: "Lagos",
    price: 38000,
    currency: "NGN",
    unit: "50kg Bag",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
    publicationDate: "2026-10-05",
    priceClassification: "WHOLESALE",
    methodology: "Wholesale food trade audit",
    license: "Open Government Data License (Nigeria) / CC BY 4.0",
  },

  // --- B. WFP / HDX (World Food Programme Price Database) ---
  // Priority: Soybeans (0 observations)
  {
    rawCommodityName: "Soybeans",
    marketName: "Gboko Central Market",
    state: "Benue",
    price: 82000,
    currency: "NGN",
    unit: "100kg Bag",
    observedAt: "2026-09-25T00:00:00Z",
    publisher: "WFP / HDX",
    sourceUrl: "https://data.humdata.org/dataset/42db041f-7aaf-4ab4-961f-2a12096861e7",
    publicationDate: "2026-09-30",
    priceClassification: "WHOLESALE",
    methodology: "WFP Vulnerability Analysis and Mapping (VAM) Market Monitor",
    license: "Creative Commons Attribution for Intergovernmental Organisations (CC BY-IGO)",
  },
  {
    rawCommodityName: "Soybeans",
    marketName: "Giwa Produce Market",
    state: "Kaduna",
    price: 85000,
    currency: "NGN",
    unit: "100kg Bag",
    observedAt: "2026-09-25T00:00:00Z",
    publisher: "WFP / HDX",
    sourceUrl: "https://data.humdata.org/dataset/42db041f-7aaf-4ab4-961f-2a12096861e7",
    publicationDate: "2026-09-30",
    priceClassification: "WHOLESALE",
    methodology: "WFP VAM Market Monitor",
    license: "CC BY-IGO",
  },

  // Priority: Raw Cassava Roots (0 observations)
  {
    rawCommodityName: "Cassava (raw)",
    marketName: "Lafenwa Market",
    state: "Ogun",
    price: 85000,
    currency: "NGN",
    unit: "Tonne (MT)",
    observedAt: "2026-09-26T00:00:00Z",
    publisher: "WFP / HDX",
    sourceUrl: "https://data.humdata.org/dataset/42db041f-7aaf-4ab4-961f-2a12096861e7",
    publicationDate: "2026-09-30",
    priceClassification: "WHOLESALE",
    methodology: "WFP VAM Market Monitor (farm-gate aggregations)",
    license: "CC BY-IGO",
  },

  // --- C. NEPC (Nigerian Export Promotion Council Indicative Prices) ---
  // Priority: Raw Cashew Nuts (0 observations)
  {
    rawCommodityName: "Raw Cashew Nuts",
    marketName: "Anyigba Produce Depot",
    state: "Kogi",
    price: 2100000,
    currency: "NGN",
    unit: "Tonne (MT)",
    observedAt: "2026-09-28T00:00:00Z",
    publisher: "Nigerian Export Promotion Council",
    sourceUrl: "https://nepc.gov.ng/indicative-market-prices/",
    publicationDate: "2026-10-02",
    priceClassification: "INDICATIVE_EXPORT",
    methodology: "Weekly non-oil export commodity floor observation",
    license: "NEPC Public Trade Advisory / Public Sector Information",
  },
  {
    rawCommodityName: "Raw Cashew Nuts",
    marketName: "Ogbomoso Farm Depot",
    state: "Oyo",
    price: 2250000,
    currency: "NGN",
    unit: "Tonne (MT)",
    observedAt: "2026-09-28T00:00:00Z",
    publisher: "Nigerian Export Promotion Council",
    sourceUrl: "https://nepc.gov.ng/indicative-market-prices/",
    publicationDate: "2026-10-02",
    priceClassification: "INDICATIVE_EXPORT",
    methodology: "Weekly non-oil export commodity floor observation",
    license: "NEPC Public Trade Advisory",
  },

  // Priority: Paddy Rice (0 observations)
  {
    rawCommodityName: "Paddy Rice",
    marketName: "Argungu Grain Depot",
    state: "Kebbi",
    price: 68000,
    currency: "NGN",
    unit: "100kg Bag",
    observedAt: "2026-09-28T00:00:00Z",
    publisher: "Nigerian Export Promotion Council",
    sourceUrl: "https://nepc.gov.ng/indicative-market-prices/",
    publicationDate: "2026-10-02",
    priceClassification: "WHOLESALE",
    methodology: "Farm-gate aggregator price assessment",
    license: "NEPC Public Trade Advisory",
  },

  // --- D. TEST CASE ROWS (Duplicates & Negative Validation) ---
  // 1. Conflict / Duplicate with Existing Database Row (Rice Lagos Mile 12 on 2026-09-16)
  {
    rawCommodityName: "Rice local sold loose",
    marketName: "Mile 12 International Market",
    state: "Lagos",
    price: 88000,
    currency: "NGN",
    unit: "50kg Bag",
    observedAt: "2026-09-16T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng",
    publicationDate: "2026-09-20",
    priceClassification: "RETAIL",
    methodology: "Monthly Survey",
    license: "Public Domain",
  },
  // 2. In-batch Duplicate (Identical Garri record duplicated)
  {
    rawCommodityName: "Gari white,sold loose",
    marketName: "Mile 12 International Market",
    state: "Lagos",
    price: 1250,
    currency: "NGN",
    unit: "Kilogram (kg)",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
    publicationDate: "2026-10-05",
    priceClassification: "RETAIL",
    methodology: "Monthly Selected Food Prices Survey",
    license: "Open Government Data License (Nigeria) / CC BY 4.0",
  },
  // 3. Rejected Row: Unsupported Commodity
  {
    rawCommodityName: "Imported Norwegian Cod / Stockfish",
    marketName: "Mile 12 International Market",
    state: "Lagos",
    price: 12000,
    currency: "NGN",
    unit: "Kilogram (kg)",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "Unknown Trader",
    sourceUrl: "https://example.com",
    publicationDate: "2026-10-05",
    priceClassification: "RETAIL",
    methodology: "Ad-hoc quote",
    license: "None",
  },
  // 4. Rejected Row: Invalid Currency & Negative Amount
  {
    rawCommodityName: "White Yam (Tubers)",
    marketName: "Zaki Biam Yam Market",
    state: "Benue",
    price: -4500,
    currency: "USD",
    unit: "Piece / Head",
    observedAt: "2026-10-01T00:00:00Z",
    publisher: "National Bureau of Statistics",
    sourceUrl: "https://nigerianstat.gov.ng",
    publicationDate: "2026-10-05",
    priceClassification: "RETAIL",
    methodology: "Survey",
    license: "Open Data",
  },
];

console.log("=== EXECUTING DRY-RUN IMPORT PREVIEW ===");
console.log(`Candidate rows to evaluate: ${candidateDataset.length}`);
console.log(`Database canonical catalog size: ${catalog.length}`);
console.log(`Existing database observations: ${existingObservations.length}\n`);

const preview = generateDryRunImportPreview(candidateDataset, catalog, existingObservations);

console.log("--- SUMMARY RESULTS ---");
console.log(`Total Evaluated: ${preview.summary.totalEvaluated}`);
console.log(`Total Valid: ${preview.summary.totalValid}`);
console.log(`Total Rejected: ${preview.summary.totalRejected}`);
console.log(`Total Duplicates: ${preview.summary.totalDuplicates}`);
console.log(`Total Stale Records: ${preview.summary.totalStale}`);
console.log(`Total Conflicts: ${preview.summary.totalConflicts}`);
console.log(`Unique Canonical Products Covered in Batch: ${preview.summary.productCoverageCount}`);
console.log(`Publisher Breakdown:`, preview.summary.sourceBreakdown);

console.log("\n--- SAMPLE VALID ROWS (Top 6) ---");
preview.validRows.slice(0, 6).forEach((row, i) => {
  console.log(`[${i + 1}] Commodity: ${row.canonicalProduct?.name} (Raw: "${row.input.rawCommodityName}")`);
  console.log(`    State: ${row.input.state} | Market: ${row.input.marketName} | Obs Date: ${row.input.observedAt.slice(0, 10)}`);
  console.log(`    Original Price: ₦${row.input.price.toLocaleString()} / ${row.input.unit}`);
  console.log(`    Normalized: ${row.normalization.normalizedPrice ? `₦${row.normalization.normalizedPrice.toLocaleString()} / ${row.normalization.normalizedUnit}` : "UNAVAILABLE (preserved raw)"} (${row.normalization.method})`);
  console.log(`    Provenance: ${row.provenance.sourceType} | Publisher: "${row.input.publisher}" | URL: ${row.input.sourceUrl}`);
  console.log(`    Classification: ${row.input.priceClassification} | Quality: ${row.provenance.dataQualityLabel}`);
});

console.log("\n--- REJECTED ROWS ---");
preview.rejectedRows.forEach((r, i) => {
  console.log(`[${i + 1}] Raw: "${r.input.rawCommodityName}" | Price: ${r.input.price} ${r.input.currency} | State: ${r.input.state}`);
  console.log(`    Reasons for Rejection: ${r.reasons.join("; ")}`);
});

console.log("\n--- DUPLICATE ROWS ---");
preview.duplicateRows.forEach((r, i) => {
  console.log(`[${i + 1}] Raw: "${r.input.rawCommodityName}" | State: ${r.input.state} | Market: ${r.input.marketName} | Date: ${r.input.observedAt.slice(0, 10)}`);
  console.log(`    Duplicate Flag: ${r.reasons.join("; ")}`);
});

// Save complete preview output to scratch
fs.writeFileSync("scratch/dry_run_preview_output.json", JSON.stringify(preview, null, 2));
console.log("\nWrote full JSON output to scratch/dry_run_preview_output.json");
