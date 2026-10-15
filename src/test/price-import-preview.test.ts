import { describe, it, expect } from "vitest";
import { generateDryRunImportPreview } from "@/features/prices/import/preview";
import { ExternalPriceInputRecord } from "@/features/prices/import/types";
import { CanonicalProductRef } from "@/features/prices/import/validator";

const MOCK_CATALOG: CanonicalProductRef[] = [
  { id: "b0000000-0000-0000-0000-000000000001", name: "White Maize (Grain)", defaultUnit: "100KG_BAG" },
  { id: "b0000000-0000-0000-0000-000000000002", name: "Yellow Maize (Grain)", defaultUnit: "100KG_BAG" },
  { id: "b0000000-0000-0000-0000-000000000003", name: "Paddy Rice", defaultUnit: "100KG_BAG" },
  { id: "b0000000-0000-0000-0000-000000000004", name: "Milled Parboiled Rice", defaultUnit: "50KG_BAG" },
  { id: "b0000000-0000-0000-0000-000000000005", name: "White Yam (Tubers)", defaultUnit: "TUBER_100" },
  { id: "b0000000-0000-0000-0000-000000000006", name: "Raw Cassava Roots", defaultUnit: "TONNE" },
  { id: "b0000000-0000-0000-0000-000000000007", name: "White Garri", defaultUnit: "50KG_BAG" },
  { id: "b0000000-0000-0000-0000-000000000008", name: "Roma Tomatoes", defaultUnit: "CRATE" },
  { id: "b0000000-0000-0000-0000-000000000009", name: "Habanero Pepper (Ata Rodo)", defaultUnit: "BAG_50KG" },
  { id: "b0000000-0000-0000-0000-000000000010", name: "Dry Red Onions", defaultUnit: "BAG_100KG" },
  { id: "b0000000-0000-0000-0000-000000000011", name: "Brown Beans (Cowpea)", defaultUnit: "100KG_BAG" },
  { id: "b0000000-0000-0000-0000-000000000012", name: "Soybeans", defaultUnit: "100KG_BAG" },
  { id: "b0000000-0000-0000-0000-000000000013", name: "Red Palm Oil", defaultUnit: "25L_KEG" },
  { id: "b0000000-0000-0000-0000-000000000014", name: "Raw Cashew Nuts", defaultUnit: "TONNE" },
  { id: "b0000000-0000-0000-0000-000000000015", name: "Live Broiler Chicken", defaultUnit: "BIRD" },
  { id: "b0000000-0000-0000-0000-000000000016", name: "Live Ram (Balami / Yankasa)", defaultUnit: "HEAD" },
  { id: "b0000000-0000-0000-0000-000000000017", name: "Live Boer / Red Sokoto Goat", defaultUnit: "HEAD" },
  { id: "b0000000-0000-0000-0000-000000000018", name: "Fresh Live African Catfish", defaultUnit: "KG" },
  { id: "b0000000-0000-0000-0000-000000000019", name: "Oven-Dried Smoked Catfish", defaultUnit: "KG" },
];

const MOCK_EXISTING_OBS = [
  {
    productId: "b0000000-0000-0000-0000-000000000004", // Rice
    state: "Lagos",
    marketName: "Mile 12 International Market",
    unit: "50kg Bag",
    price: 88000,
    observedAt: "2026-09-16T00:00:00.000Z",
  },
];

describe("External Price Import Dry-Run & Validation Engine", () => {
  it("successfully parses and maps canonical products from external publishers", () => {
    const records: ExternalPriceInputRecord[] = [
      {
        rawCommodityName: "Gari white,sold loose",
        marketName: "Mile 12 International Market",
        state: "Lagos",
        price: 1250,
        currency: "NGN",
        unit: "Kilogram (kg)",
        observedAt: "2026-10-01",
        publisher: "National Bureau of Statistics",
        sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
        publicationDate: "2026-10-05",
        priceClassification: "RETAIL",
        methodology: "Monthly Selected Food Prices Survey (in-person retail market audit)",
        license: "Open Government Data License (Nigeria) / CC BY 4.0",
      },
      {
        rawCommodityName: "Catfish (fresh)",
        marketName: "Epe Fish Market",
        state: "Lagos",
        price: 3800,
        currency: "NGN",
        unit: "Kilogram (kg)",
        observedAt: "2026-10-01",
        publisher: "National Bureau of Statistics",
        sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
        publicationDate: "2026-10-05",
        priceClassification: "RETAIL",
        methodology: "Monthly Selected Food Prices Survey",
        license: "Open Government Data License (Nigeria) / CC BY 4.0",
      },
      {
        rawCommodityName: "Raw Cashew Nuts",
        marketName: "Anyigba Produce Depot",
        state: "Kogi",
        price: 2100000,
        currency: "NGN",
        unit: "Tonne (MT)",
        observedAt: "2026-09-28",
        publisher: "Nigerian Export Promotion Council",
        sourceUrl: "https://nepc.gov.ng/indicative-market-prices/",
        publicationDate: "2026-10-02",
        priceClassification: "INDICATIVE_EXPORT",
        methodology: "Weekly non-oil export commodity trade floor survey",
        license: "NEPC Public Trade Advisory",
      },
    ];

    const preview = generateDryRunImportPreview(records, MOCK_CATALOG, MOCK_EXISTING_OBS);

    expect(preview.summary.totalEvaluated).toBe(3);
    expect(preview.summary.totalValid).toBe(3);
    expect(preview.summary.totalRejected).toBe(0);
    expect(preview.summary.productCoverageCount).toBe(3);

    // Verify Garri normalization
    const garri = preview.validRows.find((r) => r.canonicalProduct?.name === "White Garri");
    expect(garri).toBeDefined();
    expect(garri?.normalization.normalizedPrice).toBe(1250);
    expect(garri?.normalization.normalizedUnit).toBe("KG");
    expect(garri?.provenance.sourceType).toBe("GOVERNMENT_SOURCE");

    // Verify Cashew normalization: ₦2,100,000 / Tonne -> ₦2,100 / KG
    const cashew = preview.validRows.find((r) => r.canonicalProduct?.name === "Raw Cashew Nuts");
    expect(cashew).toBeDefined();
    expect(cashew?.normalization.normalizedPrice).toBe(2100);
    expect(cashew?.normalization.normalizedUnit).toBe("KG");
  });

  it("safely handles variable units (crates, baskets) without forcing arbitrary KG conversions", () => {
    const records: ExternalPriceInputRecord[] = [
      {
        rawCommodityName: "Tomato",
        marketName: "Mile 12 International Market",
        state: "Lagos",
        price: 36000,
        currency: "NGN",
        unit: "Crate",
        observedAt: "2026-10-02",
        publisher: "WFP / HDX",
        sourceUrl: "https://data.humdata.org/dataset/wfp_food_prices_nga",
        publicationDate: "2026-10-05",
        priceClassification: "WHOLESALE",
        methodology: "WFP Vulnerability Analysis and Mapping (VAM) Market Monitor",
        license: "CC BY-IGO",
      },
    ];

    const preview = generateDryRunImportPreview(records, MOCK_CATALOG, MOCK_EXISTING_OBS);

    expect(preview.summary.totalValid).toBe(1);
    const tomato = preview.validRows[0];
    expect(tomato.canonicalProduct?.name).toBe("Roma Tomatoes");
    expect(tomato.normalization.normalizedPrice).toBeNull();
    expect(tomato.normalization.normalizedUnit).toBeNull();
    expect(tomato.normalization.status).toBe("UNAVAILABLE");
    expect(tomato.input.price).toBe(36000);
    expect(tomato.input.unit).toBe("Crate");
    expect(tomato.provenance.sourceType).toBe("PARTNER_FEED");
  });

  it("distinguishes liquid volume (Litres) from mass (KG) without fake density conversion", () => {
    const records: ExternalPriceInputRecord[] = [
      {
        rawCommodityName: "Palm oil",
        marketName: "Bodija Market",
        state: "Oyo",
        price: 1700,
        currency: "NGN",
        unit: "Litre",
        observedAt: "2026-10-01",
        publisher: "National Bureau of Statistics",
        sourceUrl: "https://nigerianstat.gov.ng/elibrary/read/1241521",
        publicationDate: "2026-10-05",
        priceClassification: "RETAIL",
        methodology: "Selected Food Prices Watch",
        license: "Open Government Data License (Nigeria)",
      },
    ];

    const preview = generateDryRunImportPreview(records, MOCK_CATALOG, MOCK_EXISTING_OBS);

    expect(preview.summary.totalValid).toBe(1);
    const palmOil = preview.validRows[0];
    expect(palmOil.canonicalProduct?.name).toBe("Red Palm Oil");
    expect(palmOil.normalization.normalizedPrice).toBe(1700);
    expect(palmOil.normalization.normalizedUnit).toBe("LITRE"); // Must be LITRE, not KG!
    expect(palmOil.normalization.status).toBe("EXACT");
  });

  it("detects and flags duplicates against both existing database records and in-batch rows", () => {
    const records: ExternalPriceInputRecord[] = [
      // Matches existing DB observation (Rice in Lagos Mile 12 on 2026-09-16)
      {
        rawCommodityName: "Rice local sold loose",
        marketName: "Mile 12 International Market",
        state: "Lagos",
        price: 88000,
        currency: "NGN",
        unit: "50kg Bag",
        observedAt: "2026-09-16",
        publisher: "National Bureau of Statistics",
        sourceUrl: "https://nigerianstat.gov.ng",
        publicationDate: "2026-09-20",
        priceClassification: "RETAIL",
        methodology: "Monthly Survey",
        license: "Public Domain",
      },
      // First instance of White Garri
      {
        rawCommodityName: "Gari white,sold loose",
        marketName: "Dawanau Produce Section",
        state: "Kano",
        price: 1100,
        currency: "NGN",
        unit: "Kilogram (kg)",
        observedAt: "2026-10-01",
        publisher: "National Bureau of Statistics",
        sourceUrl: "https://nigerianstat.gov.ng",
        publicationDate: "2026-10-05",
        priceClassification: "RETAIL",
        methodology: "Monthly Survey",
        license: "Public Domain",
      },
      // Duplicate of second row within same batch
      {
        rawCommodityName: "Gari white,sold loose",
        marketName: "Dawanau Produce Section",
        state: "Kano",
        price: 1100,
        currency: "NGN",
        unit: "Kilogram (kg)",
        observedAt: "2026-10-01",
        publisher: "National Bureau of Statistics",
        sourceUrl: "https://nigerianstat.gov.ng",
        publicationDate: "2026-10-05",
        priceClassification: "RETAIL",
        methodology: "Monthly Survey",
        license: "Public Domain",
      },
    ];

    const preview = generateDryRunImportPreview(records, MOCK_CATALOG, MOCK_EXISTING_OBS);

    expect(preview.summary.totalEvaluated).toBe(3);
    expect(preview.summary.totalValid).toBe(1); // Only row 2 is valid
    expect(preview.summary.totalDuplicates).toBe(2); // Row 1 (DB dup) and Row 3 (batch dup)
  });

  it("strictly rejects invalid rows (missing fields, unmapped products, non-positive amounts, invalid state)", () => {
    const invalidRecords: ExternalPriceInputRecord[] = [
      {
        rawCommodityName: "Frozen Norwegian Salmon", // Unmapped commodity
        marketName: "Mile 12 International Market",
        state: "Lagos",
        price: 15000,
        currency: "NGN",
        unit: "Kilogram (kg)",
        observedAt: "2026-10-01",
        publisher: "External Vendor",
        sourceUrl: "https://example.com",
        publicationDate: "2026-10-02",
        priceClassification: "RETAIL",
        methodology: "Ad-hoc",
        license: "Proprietary",
      },
      {
        rawCommodityName: "Gari white,sold loose",
        marketName: "Mile 12 International Market",
        state: "Lagos",
        price: -500, // Negative amount
        currency: "NGN",
        unit: "Kilogram (kg)",
        observedAt: "2026-10-01",
        publisher: "NBS",
        sourceUrl: "https://nigerianstat.gov.ng",
        publicationDate: "2026-10-02",
        priceClassification: "RETAIL",
        methodology: "Survey",
        license: "Open Data",
      },
      {
        rawCommodityName: "White Yam (Tubers)",
        marketName: "Market",
        state: "New York", // Invalid Nigerian state
        price: 2500,
        currency: "USD", // Invalid currency
        unit: "Piece / Head",
        observedAt: "2026-10-01",
        publisher: "NBS",
        sourceUrl: "https://nigerianstat.gov.ng",
        publicationDate: "2026-10-02",
        priceClassification: "RETAIL",
        methodology: "Survey",
        license: "Open Data",
      },
    ];

    const preview = generateDryRunImportPreview(invalidRecords, MOCK_CATALOG, MOCK_EXISTING_OBS);

    expect(preview.summary.totalRejected).toBe(3);
    expect(preview.summary.totalValid).toBe(0);
    expect(preview.unmappedCommodities).toContain("Frozen Norwegian Salmon");
  });
});
