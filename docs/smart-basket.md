# AgroMarket — Smart Basket Recommendation Engine (Phase 1.0)

## 1. Overview
The AgroMarket Smart Basket provides Nigerian consumers, households, and small food businesses with transparent, budget-conscious produce bundles sourced directly from verified local farms and market stalls.

In Phase 1.0, Smart Basket operates as a **deterministic recommendation baseline**. It strictly avoids pseudo-scientific AI claims, opaque black-box machine learning, or hallucinated discounts. The engine evaluates live marketplace inventory against consumer preferences, proximity, regional price benchmarks, and minimum order quantities.

---

## 2. Recommendation Architecture

The domain follows a decoupled provider abstraction:

```text
Buyer Request / Preferences
         ↓
SmartBasketService (Domain Facade & Persistence)
         ↓
SmartBasketRecommendationEngine (Orchestrator)
         ↓
DeterministicRecommendationProvider (Phase 1.0 Provider)
    ├── Factor 1: Category & Staple Preference Match (+35 max)
    ├── Factor 2: Regional Proximity & Location (+25 max)
    ├── Factor 3: Value vs Regional Price Benchmark (+20 max)
    ├── Factor 4: Stock Reliability & MOQ (+15 max)
    ├── Factor 5: Basket Nutritional Diversity (+15 max)
    └── Hard Filters: Zero-Pork Policy, User Exclusions, Active Stock, Budget Knapsack
         ↓
Authoritative Cart Service Integration (`addToCartAction`)
```

This interface ensures that future machine learning or personalized recommendation models can be plugged in seamlessly without altering the cart or buyer ordering flows.

---

## 3. Scoring & Ranking Factors

Each candidate marketplace listing is evaluated against five transparent, verifiable criteria:

| Factor | Maximum Points | Description |
| :--- | :--- | :--- |
| **Preference & Staple Match** | 35 pts | Exact match with user's configured staple produce (e.g. Rice, Beans, Garri, Yam) or preferred categories. Core staples default to 15 pts. |
| **Regional Proximity** | 25 pts | Listings located in the buyer's destination state receive 20 pts (+5 bonus if matching local LGA) to reduce transit time and logistics costs. |
| **Price & Market Value** | 20 pts | Compares listing unit price to Phase 0.9 regional price benchmarks (`price_observations`). Awards full points if below or equal to prevailing market rates. |
| **Stock Reliability** | 15 pts | High inventory depth relative to MOQ (>= 5x MOQ) scores highest, ensuring fulfilled orders without stock-outs. |
| **Nutritional & Diversity** | 15 pts | Prevents category over-concentration (limits max 2 items per category) to assemble balanced baskets across grains, tubers, legumes, and vegetables. |

### Hard Constraint Filters
- **Strict Anti-Pork Policy**: All items matching porcine keywords (`pork`, `pig`, `swine`, `bacon`, `ham`, `lard`) are immediately rejected.
- **Out of Stock**: Listings with `quantity_available < minimum_order_quantity` are filtered out.
- **User Exclusions**: Items or categories explicitly excluded by the buyer are dropped.
- **Budget Knapsack**: Candidates are evaluated in descending score order. An item is included only if `subtotal = price_per_unit * recommended_quantity <= remaining_budget`.

---

## 4. Transparent Explanations
Every recommended commodity card presents honest, data-grounded explanations directly explaining why it was chosen:
* *"Matches your preferred staple produce (Milled Parboiled Rice)."*
* *"Locally produced and stocked in Lagos to minimize transit delay."*
* *"Competitive price (₦85,000/50kg Bag) compared to regional benchmark (₦88,000)."*
* *"Fits comfortably within your ₦100,000 basket budget."*

---

## 5. Budget, Pricing & Freshness Invariants

1. **Authoritative Server Pricing**: The client never calculates authoritative basket totals or item prices.
2. **Freshness Revalidation**: When the buyer selects *"Add Selected Items to Cart"*, the server re-validates each listing's active status, current inventory, and unit price directly from the database.
3. **No Phantom Discounts**: Smart Basket displays true current farm listing prices. Estimated savings are calculated only when a legitimate regional benchmark exists.

---

## 6. Unit Safety Rules
* Compatible weights (kg, 25kg bag, 50kg bag, 100kg bag, tonne) and volumes (litre, 25L keg) are normalized deterministically.
* Discrete units (crates, baskets, bunches, pieces, heads, live animals) are preserved in their native packaging standards. No invented weight conversions are ever synthesized.

---

## 7. Food Health & Non-Medical Boundary
Smart Basket provides logistical commodity purchasing guidance based on Nigerian staple availability and consumer budget allocation.
* **Non-Medical Statement**: Recommendations are strictly educational and logistical. They do not constitute medical diet plans, clinical nutritional therapy, or therapeutic treatments.

---

## 8. Database & Security (RLS)
* **`public.user_preferences`**:
  * Private to the owning user (`auth.uid() = user_id`).
  * Cross-user reading or modification is prevented by Row Level Security.
* **`public.basket_recommendations`**:
  * Viewable and insertable only by the owning authenticated buyer (`auth.uid() = user_id`).
  * Client `DELETE` is revoked to maintain an immutable audit trail of generated recommendations.
