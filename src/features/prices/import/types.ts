import { NormalizationStatus, PriceSourceType } from "../types";

export type PriceClassification = "RETAIL" | "WHOLESALE" | "FARM_GATE" | "INDICATIVE_EXPORT";

export interface ExternalPriceInputRecord {
  /** External identifier or row index */
  externalId?: string;
  /** Raw commodity name as published in external source */
  rawCommodityName: string;
  /** Canonical product ID or slug if already mapped, else mapped during ingestion */
  canonicalProductId?: string;
  /** Observed market or trading floor name */
  marketName: string;
  /** State within Nigeria */
  state: string;
  /** Optional Local Government Area */
  lga?: string;
  /** Raw price amount in NGN */
  price: number;
  /** Currency code (must be NGN) */
  currency: string;
  /** Quoted trading unit from publisher (e.g. '100kg Bag', 'KG', '25L_KEG', 'Crate', 'Tonne') */
  unit: string;
  /** Date the price was observed or published (YYYY-MM-DD or ISO) */
  observedAt: string;
  /** Original publisher/institution (e.g., 'National Bureau of Statistics', 'WFP / HDX', 'NEPC') */
  publisher: string;
  /** Report or dataset URL */
  sourceUrl: string;
  /** Publication or bulletin date */
  publicationDate: string;
  /** Classification of price point */
  priceClassification: PriceClassification;
  /** Data collection methodology or notes */
  methodology: string;
  /** Licensing or attribution terms */
  license: string;
}

export interface PreviewValidationItem {
  status: "VALID" | "REJECTED" | "DUPLICATE" | "CONFLICT" | "STALE";
  input: ExternalPriceInputRecord;
  reasons: string[];
  canonicalProduct?: {
    id: string;
    name: string;
    defaultUnit: string;
  };
  normalization: {
    normalizedPrice: number | null;
    normalizedUnit: string | null;
    status: NormalizationStatus;
    conversionFactor?: number;
    method: string;
  };
  provenance: {
    sourceType: PriceSourceType;
    dataQualityLabel: "OBSERVED" | "VERIFIED" | "ESTIMATED" | "SIMULATED";
    verificationStatus: "UNVERIFIED" | "SELF_REPORTED" | "VERIFIED" | "SYSTEM_DERIVED";
    metadata: Record<string, unknown>;
  };
}

export interface DryRunImportPreviewResult {
  summary: {
    totalEvaluated: number;
    totalValid: number;
    totalRejected: number;
    totalDuplicates: number;
    totalStale: number;
    totalConflicts: number;
    productCoverageCount: number;
    sourceBreakdown: Record<string, number>;
  };
  validRows: PreviewValidationItem[];
  rejectedRows: PreviewValidationItem[];
  duplicateRows: PreviewValidationItem[];
  conflictRows: PreviewValidationItem[];
  unmappedCommodities: string[];
}
