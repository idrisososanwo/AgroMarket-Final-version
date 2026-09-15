/**
 * Smart Basket Domain Types
 * Defines data structures for buyer preferences, deterministic recommendation generation,
 * item scoring, and cart integration.
 */

export type PurchasingFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "ONE_TIME";

export type BasketPurpose = "HOUSEHOLD" | "BULK_SHARING" | "SMALL_COMMERCIAL" | "INDIVIDUAL";

export type RecommendationStatus = "GENERATED" | "ACCEPTED" | "MODIFIED" | "REJECTED";

export interface UserPreferences {
  id: string;
  userId: string;
  dietaryPreferences: string[];
  familySize: number;
  budgetTargetMonthly: number | null;
  budgetTargetBasket: number | null;
  preferredStaples: string[];
  preferredCategories: string[];
  excludedProducts: string[];
  excludedCategories: string[];
  purchasingFrequency: PurchasingFrequency;
  basketPurpose: BasketPurpose;
  state: string | null;
  lga: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserPreferencesInput {
  budgetTargetBasket?: number | null;
  budgetTargetMonthly?: number | null;
  state?: string | null;
  lga?: string | null;
  familySize?: number;
  dietaryPreferences?: string[];
  preferredStaples?: string[];
  preferredCategories?: string[];
  excludedProducts?: string[];
  excludedCategories?: string[];
  purchasingFrequency?: PurchasingFrequency;
  basketPurpose?: BasketPurpose;
  metadata?: Record<string, unknown>;
}

export interface GenerateBasketInput {
  budget: number;
  state: string;
  lga?: string | null;
  familySize?: number;
  basketPurpose?: BasketPurpose;
  preferredStaples?: string[];
  preferredCategories?: string[];
  excludedProducts?: string[];
  excludedCategories?: string[];
}

export interface SmartBasketItemRecommendation {
  listingId: string;
  productId: string;
  productName: string;
  categoryName: string;
  sellerId: string;
  sellerName?: string;
  state: string;
  lga?: string | null;
  pricePerUnit: number;
  unit: string;
  recommendedQuantity: number;
  subtotal: number;
  score: number;
  explanations: string[];
  moq: number;
  quantityAvailable: number;
  benchmarkPrice?: number | null;
  benchmarkUnit?: string | null;
  estimatedSavings?: number;
}

export interface SmartBasketResult {
  id: string;
  userId: string;
  title: string;
  items: SmartBasketItemRecommendation[];
  estimatedTotalCost: number;
  budgetAllocated: number;
  budgetRemaining: number;
  estimatedSavings: number;
  rationale: string;
  status: RecommendationStatus;
  engineVersion: string;
  state: string;
  createdAt: string;
  metadata: {
    generationTimestamp: string;
    itemCount: number;
    categoriesRepresented: string[];
    explanationNotes: string[];
    isDeterministic: boolean;
    [key: string]: unknown;
  };
}

export interface CandidateListing {
  id: string;
  productId: string;
  productName: string;
  categoryName: string;
  categoryId: string;
  sellerId: string;
  sellerName?: string;
  title: string;
  description?: string | null;
  pricePerUnit: number;
  unit: string;
  minimumOrderQuantity: number;
  quantityAvailable: number;
  state: string;
  lga?: string | null;
  pickupAddress?: string;
}

export interface PriceBenchmark {
  productId: string;
  benchmarkPrice: number;
  unit: string;
  dataQualityLabel: string;
}

export interface RecommendationContext {
  userId: string;
  input: GenerateBasketInput;
  preferences?: UserPreferences | null;
  candidates: CandidateListing[];
  benchmarks: Map<string, PriceBenchmark>;
}

/**
 * Pluggable Recommendation Provider interface.
 * Decouples the recommendation engine from the underlying algorithm so that
 * future machine-learning or external models can be introduced without altering
 * the Smart Basket domain or client cart integration.
 */
export interface RecommendationProvider {
  readonly name: string;
  readonly version: string;
  generateRecommendations(context: RecommendationContext): Promise<SmartBasketResult>;
}
