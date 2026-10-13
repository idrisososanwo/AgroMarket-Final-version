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
  allergenWarning: string | null;
  isFrequentPurchase: boolean;
}

/**
 * Deterministic Baseline Recommendation Provider.
 *
 * Implements transparent, mathematical scoring and greedy knapsack allocation.
 * Integrates:
 * 1. Customer budget as a strict hard spending limit.
 * 2. Real marketplace inventory and valid prices.
 * 3. Voluntary dietary preferences, allergy avoidance, and health considerations.
 * 4. Authenticated buyer order history for personalization.
 * 5. Transparent explanations and clear disclaimers without hallucinated data.
 */
export class DeterministicRecommendationProvider implements RecommendationProvider {
  readonly name = "DETERMINISTIC_BASELINE";
  readonly version = "1.1.0";

  async generateRecommendations(context: RecommendationContext): Promise<SmartBasketResult> {
    const { userId, input, preferences, candidates, benchmarks, orderHistory } = context;
    const targetBudget = Number(input.budget);
    const targetState = input.state;
    const targetLga = input.lga || preferences?.lga || null;
    const householdSize = input.familySize || preferences?.familySize || 4;
    const priorityGoal = input.priorityGoal || preferences?.priorityGoal || "AFFORDABILITY";

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

    // Collect allergies and avoided ingredients
    const allergiesList = [
      ...(input.allergies || []),
      ...(preferences?.allergies || []),
      ...(input.dislikedItems || []),
      ...(preferences?.dislikedItems || []),
    ]
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);

    // Collect health considerations
    const healthConsiderations = new Set(
      [
        ...(input.healthConsiderations || []),
        ...(preferences?.healthConsiderations || []),
      ].map((h) => h.toUpperCase())
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

      // Explicit Product & Category Exclusions
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

      // Allergy & Ingredient Exclusion
      const prodText = `${c.productName} ${c.title} ${c.description || ""}`.toLowerCase();
      let hasAllergyConflict = false;
      for (const allergy of allergiesList) {
        if (prodText.includes(allergy)) {
          hasAllergyConflict = true;
          break;
        }
      }
      if (hasAllergyConflict) {
        continue;
      }

      eligibleCandidates.push(c);
    }

    // 2. Score and Explain Candidates
    const scoredCandidates: ScoredCandidate[] = [];

    for (const c of eligibleCandidates) {
      let score = 0;
      const explanations: string[] = [];
      let isFrequentPurchase = false;

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
      const cState = (c.state || "").trim();
      const targetStateTrim = (targetState || "").trim();
      const cLga = (c.lga || "").trim();
      const targetLgaTrim = (targetLga || "").trim();

      if (cState && cState.toLowerCase() === targetStateTrim.toLowerCase()) {
        score += 20;
        if (targetLgaTrim && cLga && cLga.toLowerCase() === targetLgaTrim.toLowerCase()) {
          score += 5;
          explanations.push(`Directly available in your local LGA (${cLga}, ${cState}).`);
        } else if (targetLgaTrim && cLga && cLga.toLowerCase() !== targetLgaTrim.toLowerCase()) {
          explanations.push(`Regional fallback: Sourced from ${cState} (${cLga}) outside your local LGA (${targetLgaTrim}).`);
        } else {
          explanations.push(`Locally produced and stocked in ${cState} to minimize transit delay.`);
        }
      } else if (cState) {
        score += 5;
        explanations.push(
          `Sourced from ${cState}${cLga ? ` (${cLga})` : ""} outside your primary location (${targetStateTrim}) to fulfill staple availability.`
        );
      } else {
        score += 2;
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

      // Factor 5: Historical Purchases Personalization (Max 20 pts)
      if (orderHistory?.frequentProductIds && orderHistory.frequentProductIds.has(c.productId)) {
        const pastCount = orderHistory.frequentProductIds.get(c.productId) || 1;
        score += 20;
        isFrequentPurchase = true;
        explanations.push(
          `Frequently ordered in your past AgroMarket purchases (${pastCount} time${pastCount > 1 ? "s" : ""}).`
        );
      }

      // Factor 6: Health Considerations Matching (Max 15 pts)
      if (healthConsiderations.has("LOW_SODIUM") || healthConsiderations.has("HYPERTENSION_FRIENDLY")) {
        const freshCat = ["vegetables", "fruits", "roots & tubers"];
        if (freshCat.some((fc) => c.categoryName.toLowerCase().includes(fc))) {
          score += 15;
          explanations.push(`Natural, unprocessed fresh produce aligned with lower-sodium dietary guidance.`);
        }
      }
      if (healthConsiderations.has("DIABETIC_FRIENDLY") || healthConsiderations.has("LOW_GLYCEMIC")) {
        const diabeticCat = ["legumes & pulses", "vegetables", "fishery & aquaculture"];
        if (diabeticCat.some((dc) => c.categoryName.toLowerCase().includes(dc))) {
          score += 15;
          explanations.push(`High-fiber or lean protein staple aligned with low-glycemic dietary preferences.`);
        }
      }

      // Factor 7: Priority Goal Alignment
      if (priorityGoal === "AFFORDABILITY") {
        if (c.pricePerUnit <= targetBudget * 0.25) {
          score += 10;
        }
      } else if (priorityGoal === "HEALTH_CONSCIOUS") {
        const healthCat = ["vegetables", "fruits", "legumes & pulses", "fishery & aquaculture"];
        if (healthCat.some((hc) => c.categoryName.toLowerCase().includes(hc))) {
          score += 15;
        }
      }

      // Allergen verification warning flag if ingredients details are absent
      let allergenWarning: string | null = null;
      if (allergiesList.length > 0 && (!c.description || c.description.length < 15)) {
        allergenWarning = "Farm ingredients not independently laboratory-tested. If severely sensitive, verify with producer.";
      }

      // Determine initial safe recommended quantity
      let recommendedQuantity = moq;
      if (householdSize >= 6 && c.quantityAvailable >= moq * 2) {
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
        allergenWarning,
        isFrequentPurchase,
      });
    }

    // 3. Sort Candidates by Score Descending (Tie-breaker: lower unit price)
    scoredCandidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.candidate.pricePerUnit - b.candidate.pricePerUnit;
    });

    // 4. Greedy Knapsack Basket Assembly within Hard Budget Constraint
    let currentTotal = 0;
    const selectedItems: SmartBasketItemRecommendation[] = [];
    const categoryCountMap = new Map<string, number>();

    const maxItemsPerCategory = priorityGoal === "VARIETY" ? 1 : 2;

    for (const item of scoredCandidates) {
      const catCount = categoryCountMap.get(item.candidate.categoryId) || 0;
      if (catCount >= maxItemsPerCategory && scoredCandidates.length > 4) {
        continue;
      }

      // Strict check: item subtotal must fit within remaining budget
      if (currentTotal + item.subtotal <= targetBudget) {
        currentTotal += item.subtotal;
        categoryCountMap.set(item.candidate.categoryId, catCount + 1);

        item.explanations.push(`Fits within your ${formatNGN(targetBudget)} basket budget.`);

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
          imageUrl: item.candidate.imageUrl,
          allergenWarning: item.allergenWarning,
          isFrequentPurchase: item.isFrequentPurchase,
          benchmarkPrice: item.benchmark?.benchmarkPrice || null,
          benchmarkUnit: item.benchmark?.unit || null,
          estimatedSavings: item.estimatedSavings,
        });
      }
    }

    const budgetRemaining = Number((targetBudget - currentTotal).toFixed(2));
    const totalSavings = Number(
      selectedItems.reduce((acc, item) => acc + (item.estimatedSavings || 0), 0).toFixed(2)
    );

    const categoriesRepresented = Array.from(
      new Set(selectedItems.map((i) => i.categoryName))
    );

    const isFirstTimeCustomer = (orderHistory?.orderCount || 0) === 0;

    let rationale = `Balanced produce basket generated for a ${householdSize}-person household in ${targetState}. `;
    if (selectedItems.length > 0) {
      const outsideRegionItems = selectedItems.filter(
        (i) => (i.state || "").trim().toLowerCase() !== (targetState || "").trim().toLowerCase()
      );
      rationale += `Includes ${selectedItems.length} staple item(s) across ${categoriesRepresented.length} category standard(s) optimized for freshness and budget efficiency.`;
      if (outsideRegionItems.length > 0) {
        rationale += ` (${outsideRegionItems.length} item(s) sourced via regional fallback outside ${targetState} to satisfy staple availability.)`;
      }
      if (isFirstTimeCustomer) {
        rationale += ` (First-time customer basket: recommendations will further adapt as you order on AgroMarket.)`;
      }
    } else {
      if (candidates.length === 0) {
        rationale = `Currently, no active marketplace listings with available stock match your regional location (${targetState}) or available stock criteria. Try expanding your search location or check back soon as producers update their harvests.`;
      } else if (eligibleCandidates.length === 0) {
        rationale = `No active produce listings matched your dietary, allergy, or exclusion preferences. Please review your dietary preferences.`;
      } else {
        rationale = `No complete produce bundle could be created within your stated budget of ${formatNGN(targetBudget)}. Please increase your budget or adjust minimum order quantities.`;
      }
    }

    const explanationNotes = [
      "Generated using AgroMarket's deterministic transparent baseline engine.",
      "Scoring combines user staple preferences, local state availability, competitive market prices, stock depth, and past order history.",
      "All prices are authoritative live farm listing prices. Delivery fees and logistics are calculated separately at checkout.",
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
        isFirstTimeCustomer,
        orderHistoryCount: orderHistory?.orderCount || 0,
      },
    };
  }
}
