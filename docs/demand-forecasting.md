# AgroMarket — Demand Signals & Baseline Demand Forecasting

## Overview
Phase 0.9 introduces platform-derived demand signals and deterministic baseline demand forecasting to help Nigerian farmers, agribusinesses, and logistics partners understand trade volume patterns.

> [!IMPORTANT]
> **Data Integrity & Zero Fake AI Principle**:
> AgroMarket strictly refrains from branding transparent statistical averages as "AI predictions".
> Demand forecasts are transparent mathematical projections based on confirmed platform sales.
> Notice in UI: *"Baseline demand forecasts are statistical estimates based on available AgroMarket activity and are not guaranteed predictions."*

---

## 1. Platform Demand Signals

The demand system aggregates real platform activity from authoritative database tables:
- **Confirmed Sales Volume**: Sum of `quantity` across paid and non-cancelled `order_items` in the past 30 days.
- **Transaction Frequency**: Count of distinct orders placed for the commodity in the state.
- **Active Cart Interest**: Number of items currently staged in buyer shopping carts (`cart_items`).
- **Active Supply Listings**: Count of active seller offerings (`listings`) in the market corridor.

### Deferred Signals
AgroMarket does not currently track client-side search query streams or product page view clickstreams in PostgreSQL. These metrics are explicitly documented as **deferred** until dedicated telemetry infrastructure is introduced in a future phase.

---

## 2. Baseline Moving-Average Forecasting Methodology

Forecasting employs a transparent, deterministic moving-average model:

### Parameters
- **Data Window**: Previous 30 days ($W = 30$).
- **Forecast Horizon**: Next 7 days ($H = 7$).
- **Aggregation Metric**: Sum of confirmed sold produce quantity ($\sum Q$).

### Formula
$$\text{Daily Average Volume} = \frac{\sum_{i=1}^{W} Q_i}{W}$$

$$\text{Forecasted Demand Volume} = \text{Daily Average Volume} \times H$$

### Example
If 10 orders for Milled Parboiled Rice totaling 500 bags were confirmed in Lagos over the past 30 days:
$$\text{Daily Average} = \frac{500}{30} = 16.67 \text{ bags/day}$$
$$\text{Forecasted 7-Day Demand} = 16.67 \times 7 = 116.67 \text{ bags}$$

---

## 3. Confidence Classification & Edge Cases

The system evaluates confidence based on data density rather than pretending to generate calibrated Bayesian probabilities:

| Confidence Level | Criteria | Interpretation |
| :--- | :--- | :--- |
| **`HIGH`** | Sample orders $\ge 10$ in window | Consistent transactional activity on the platform. |
| **`MEDIUM`** | $3 \le \text{Sample orders} < 10$ | Moderate trade volume with limited distribution. |
| **`LOW`** | $1 \le \text{Sample orders} \le 2$ | Sparse platform activity; forecast has high variance. |
| **`INSUFFICIENT_DATA`** | $0$ orders recorded in window | Forecast is unavailable. Zero volume predicted. |

### Edge Cases Handled
1. **Zero Demand / No Sales**: Returns `predictedDemandVolume = 0` with confidence `INSUFFICIENT_DATA` and an explanatory note, rather than fabricating a projection.
2. **New / Unsold Commodities**: Returns `INSUFFICIENT_DATA`.
3. **Missing Regional Data**: Restricts projections strictly to the reporting state; does not extrapolate national numbers to unobserved LGAs.

---

## 4. Limitations & Real-World Context

Baseline demand forecasts reflect **on-platform activity only**. Nigerian agricultural markets are influenced by:
- Seasonal rain patterns and localized floods (e.g. Niger/Benue basin).
- Macroeconomic fluctuations, fuel costs, and interstate transport tariffs.
- Significant off-platform commodity movements.

Farmers are advised to use AgroMarket demand signals as operational context alongside local cooperative guidance.
