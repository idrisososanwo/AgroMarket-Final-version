import { formatNGN } from "@/features/marketplace/constants";
import {
  CandidateListing,
  PriceBenchmark,
  RecommendationContext,
  RecommendationProvider,
  SmartBasketItemRecommendation,
  SmartBasketResult,
} from "./types";

/**
 * Strict Anti-Pork content validator.
 * Enforces AgroMarket's non-negotiable policy that prohibited porcine products
 * can never enter recommendations.
 */
const PORK_PROHIBITED_REGEX = /\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard)\b/i;

function isProhibited(text: string): boolean {
  return PORK_PROHIBITED_REGEX.test(text);
}

interface ScoredCandidate {
  candidate: CandidateListing;
  score: number;
  explanations: string[];
  recommendedQuantity: number;
  subtotal: number;
  benchmark?: PriceBenchmark;
  estimatedSavings: number;
}

/**
 * Deterministic Baseline Recommendation Provider for Phase 1.0.
 *
 * Implements a transparent, mathematical scoring and greedy knapsack allocation algorithm.
 * Strictly avoids pseudo-scientific AI claims, hallucinated data, or fake machine-learning.
 * Provides verifiable explanations grounded directly in user preferences, location,
 * available inventory, and authoritative market price benchmarks.
 */
export class DeterministicRecommendationProvider implements RecommendationProvider {
  readonly name = "DETERMINISTIC_BASELINE";
  readonly version = "1.0.0";

  async generateRecommendations(context: RecommendationContext): Promise<SmartBasketResult> {
    const { userId, input, preferences, candidates, benchmarks } = context;
    const targetBudget = Number(input.budget);
    const targetState = input.state;
    const targetLga = input.lga || preferences?.lga || null;
    const householdSize = input.familySize || preferences?.familySize || 4;

    const preferredStaples = new Set(
      (input.preferredStaples || preferences?.preferredStaples || []).map((s) =>
        s.trim().toLowerCase()
      )
    );

    const preferredCategories = new Set(
      input.preferredCategories || preferences?.preferredCategories || []
    );

    const excludedProducts = new Set(
      input.excludedProducts || preferences?.excludedProducts || []
    );

    const excludedCategories = new Set(
      input.excludedCategories || preferences?.excludedCategories || []
    );

    // 1. Hard Filter Candidates
    const eligibleCandidates: CandidateListing[] = [];

    for (const c of candidates) {
      // Anti-Pork Policy: Immediate absolute exclusion
      if (
        isProhibited(c.productName) ||
        isProhibited(c.categoryName) ||
        isProhibited(c.title) ||
        (c.description && isProhibited(c.description))
      ) {
        continue;
      }

      // User Exclusions
      if (excludedProducts.has(c.productId) || excludedCategories.has(c.categoryId)) {
        continue;
      }

      // Stock & MOQ safety: Must have available inventory >= MOQ
      if (c.quantityAvailable <= 0 || c.quantityAvailable < c.minimumOrderQuantity) {
        continue;
      }

      // Valid price
      if (c.pricePerUnit <= 0 || !Number.isFinite(c.pricePerUnit)) {
        continue;
      }

      eligibleCandidates.push(c);
    }

    // 2. Score and Explain Candidates
    const scoredCandidates: ScoredCandidate[] = [];

    for (const c of eligibleCandidates) {
      let score = 0;
      const explanations: string[] = [];

      const benchmark = benchmarks.get(c.productId);

      // Factor 1: Staple / Category Preference Match (Max 35 pts)
      const productNameLower = c.productName.toLowerCase();
      const titleLower = c.title.toLowerCase();

      let matchedStaple = false;
      for (const staple of preferredStaples) {
        if (productNameLower.includes(staple) || titleLower.includes(staple)) {
          score += 35;
          explanations.push(`Matches your preferred staple produce (${c.productName}).`);
          matchedStaple = true;
          break;
        }
      }

      if (!matchedStaple) {
        if (preferredCategories.has(c.categoryId)) {
          score += 25;
          explanations.push(`Belongs to your preferred category (${c.categoryName}).`);
        } else {
          // Core Nigerian staples baseline
          const stapleCategories = ["grains", "roots & tubers", "legumes & pulses", "vegetables"];
          if (stapleCategories.some((sc) => c.categoryName.toLowerCase().includes(sc))) {
            score += 15;
            explanations.push(`Core nutritional household staple (${c.categoryName}).`);
          }
        }
      }

      // Factor 2: Regional Proximity & Location (Max 25 pts)
      if (c.state.toLowerCase() === targetState.toLowerCase()) {
        score += 20;
        if (targetLga && c.lga && c.lga.toLowerCase() === targetLga.toLowerCase()) {
          score += 5;
          explanations.push(`Directly available in your local LGA (${c.lga}, ${c.state}).`);
        } else {
          explanations.push(`Locally produced and stocked in ${c.state} to minimize transit delay.`);
        }
      } else {
        score += 5;
      }

      // Factor 3: Price Suitability & Market Value (Max 20 pts)
      let estimatedSavings = 0;
      if (benchmark && benchmark.benchmarkPrice > 0) {
        if (c.pricePerUnit <= benchmark.benchmarkPrice) {
          const savingsPerUnit = benchmark.benchmarkPrice - c.pricePerUnit;
          estimatedSavings = savingsPerUnit;
          score += 20;
          explanations.push(
            `Competitive price (${formatNGN(c.pricePerUnit)}/${c.unit}) compared to regional benchmark (${formatNGN(benchmark.benchmarkPrice)}).`
          );
        } else if (c.pricePerUnit <= benchmark.benchmarkPrice * 1.1) {
          score += 10;
          explanations.push(`Fair market value close to prevailing regional benchmark.`);
        }
      } else {
        score += 10;
        explanations.push(`Current direct farm price of ${formatNGN(c.pricePerUnit)} per ${c.unit}.`);
      }

      // Factor 4: Stock Reliability & Inventory Depth (Max 15 pts)
      const moq = Math.max(1, Number(c.minimumOrderQuantity));
      if (c.quantityAvailable >= moq * 5) {
        score += 15;
      } else if (c.quantityAvailable >= moq * 2) {
        score += 10;
      } else {
        score += 5;
      }

      // Determine initial safe recommended quantity
      // Default to MOQ; for larger households, adjust if budget and stock allow
      let recommendedQuantity = moq;
      if (householdSize >= 6 && c.quantityAvailable >= moq * 2) {
        // Only scale if item subtotal remains reasonable
        const doubleCost = moq * 2 * c.pricePerUnit;
        if (doubleCost <= targetBudget * 0.4) {
          recommendedQuantity = moq * 2;
        }
      }

      const subtotal = Number((recommendedQuantity * c.pricePerUnit).toFixed(2));
      const totalSavings = Number((estimatedSavings * recommendedQuantity).toFixed(2));

      scoredCandidates.push({
        candidate: c,
        score,
        explanations,
        recommendedQuantity,
        subtotal,
        benchmark,
        estimatedSavings: totalSavings,
      });
    }

    // 3. Sort Candidates by Score Descending (Tie-breaker: lower unit price)
    scoredCandidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.candidate.pricePerUnit - b.candidate.pricePerUnit;
    });

    // 4. Greedy Knapsack Basket Assembly within Budget Constraint
    let currentTotal = 0;
    const selectedItems: SmartBasketItemRecommendation[] = [];
    const categoryCountMap = new Map<string, number>();

    for (const item of scoredCandidates) {
      // Ensure basket diversity: limit max items per category (e.g. max 2 of same category)
      const catCount = categoryCountMap.get(item.candidate.categoryId) || 0;
      if (catCount >= 2 && scoredCandidates.length > 5) {
        continue;
      }

      // Check if item fits within remaining budget
      if (currentTotal + item.subtotal <= targetBudget) {
        currentTotal += item.subtotal;
        categoryCountMap.set(item.candidate.categoryId, catCount + 1);

        item.explanations.push(`Fits comfortably within your ${formatNGN(targetBudget)} basket budget.`);

        selectedItems.push({
          listingId: item.candidate.id,
          productId: item.candidate.productId,
          productName: item.candidate.productName,
          categoryName: item.candidate.categoryName,
          sellerId: item.candidate.sellerId,
          sellerName: item.candidate.sellerName,
          state: item.candidate.state,
          lga: item.candidate.lga,
          pricePerUnit: item.candidate.pricePerUnit,
          unit: item.candidate.unit,
          recommendedQuantity: item.recommendedQuantity,
          subtotal: item.subtotal,
          score: item.score,
          explanations: item.explanations,
          moq: item.candidate.minimumOrderQuantity,
          quantityAvailable: item.candidate.quantityAvailable,
          benchmarkPrice: item.benchmark?.benchmarkPrice || null,
          benchmarkUnit: item.benchmark?.unit || null,
          estimatedSavings: item.estimatedSavings,
        });
      }
    }

    // Edge case: If even the single highest-scored item exceeds the entire budget,
    // Provide clear transparent explanation without silently exceeding budget
    const budgetRemaining = Number((targetBudget - currentTotal).toFixed(2));
    const totalSavings = Number(
      selectedItems.reduce((acc, item) => acc + (item.estimatedSavings || 0), 0).toFixed(2)
    );

    const categoriesRepresented = Array.from(
      new Set(selectedItems.map((i) => i.categoryName))
    );

    let rationale = `Balanced produce basket generated for a ${householdSize}-person household in ${targetState}. `;
    if (selectedItems.length > 0) {
      rationale += `Includes ${selectedItems.length} staple item(s) across ${categoriesRepresented.length} category standard(s) optimized for freshness and budget efficiency.`;
    } else {
      rationale += `No complete produce bundle could be created within your stated budget of ${formatNGN(targetBudget)}. Please increase your budget or adjust minimum order quantities.`;
    }

    const explanationNotes = [
      "Generated using AgroMarket's deterministic transparent baseline engine.",
      "Scoring combines user staple preferences (+35 max), local state availability (+25 max), competitive market price (+20 max), and stock depth (+15 max).",
      "All prices are authoritative live farm listing prices. No artificial discounts or synthetic markups have been applied.",
      "Informational commodity guidance only; not a financial or medical nutrition prescription.",
    ];

    return {
      id: crypto.randomUUID(),
      userId,
      title: `${targetState} Fresh Produce Basket`,
      items: selectedItems,
      estimatedTotalCost: Number(currentTotal.toFixed(2)),
      budgetAllocated: targetBudget,
      budgetRemaining,
      estimatedSavings: totalSavings,
      rationale,
      status: "GENERATED",
      engineVersion: `${this.name}_v${this.version}`,
      state: targetState,
      createdAt: new Date().toISOString(),
      metadata: {
        generationTimestamp: new Date().toISOString(),
        itemCount: selectedItems.length,
        categoriesRepresented,
        explanationNotes,
        isDeterministic: true,
      },
    };
  }
}
