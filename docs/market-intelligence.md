# AgroMarket — Market Intelligence, Regional Prices & Aggregation

## Overview
AgroMarket provides transparent price intelligence across Nigeria's agricultural trade corridors (e.g. Mile 12, Dawanau, Bodija, Gboko, and state agricultural hubs). The system tracks price movements, normalizes incompatible units mathematically, performs state-level aggregation, and calculates deterministic price trends.

> [!IMPORTANT]
> **Data Integrity Principle**:
> AgroMarket market intelligence is based on available observations and platform data. It must not be represented as a guaranteed live nationwide market price.
> Simulated/test data is explicitly tagged as `SIMULATED`.

---

## 1. Price Observation Model

Every observation in `public.price_observations` conceptually represents:
$$\text{Product} + \text{Location (State \& LGA)} + \text{Trade Unit} + \text{Reported Price} + \text{Timestamp} + \text{Verification Metadata}$$

### Schema Fields
- `product_id`: Foreign key referencing canonical produce in `public.products`. Strictly anti-pork compliant.
- `market_name`: Name of local market (e.g., Mile 12 International Market, Dawanau Grain Market).
- `state`: Canonical Nigerian state (36 states + FCT - Abuja).
- `lga`: Local Government Area where available. Optional because some wholesale reports only designate state or broader region.
- `price`: Raw transaction or surveyed price in Nigerian Naira (`NUMERIC(14, 2)`).
- `currency`: Strictly `NGN`.
- `unit`: Produce packaging unit (e.g., `50kg Bag`, `100kg Bag`, `Tonne (MT)`, `Kilogram (kg)`, `Crate`, `Basket`).
- `normalized_price`: Price per canonical base unit (`KG` or `LITRE`), or `NULL` if conversion is variable.
- `normalized_unit`: Canonical unit (`KG` or `LITRE`).
- `normalization_status`: `'EXACT'`, `'NORMALIZED'`, or `'UNAVAILABLE'`.
- `source_type`: Origin classification:
  - `PLATFORM_TRANSACTION`: Anonymized verified purchase on AgroMarket.
  - `FARMER_REPORTED`: Producer self-reported local market price.
  - `BUYER_REPORTED`: Consumer or off-taker field report.
  - `MARKET_SURVEY`: Enumerator or price surveyor collection.
  - `PARTNER_FEED`: Third-party agricultural partner data.
  - `GOVERNMENT_SOURCE`: Official government bureau statistics (when connected).
  - `COMMUNITY`: Cooperative or market association submission.
- `verification_status`:
  - `UNVERIFIED`: Fresh unreviewed submission.
  - `SELF_REPORTED`: Community report from authenticated farmer/buyer.
  - `VERIFIED`: Confirmed by AgroMarket enumerator or platform transaction.
  - `SYSTEM_DERIVED`: Derived deterministically by internal ledger.
  - `REJECTED`: Flagged or anomalous record.
- `data_quality_label`: `'OBSERVED'`, `'VERIFIED'`, `'ESTIMATED'`, `'SIMULATED'`.
- `observed_at`: Exact observation timestamp.
- `created_at`: Audit insertion timestamp.

---

## 2. Append-Only Price History

Price observations are **never overwritten**. If tomato prices in Mile 12 rise from ₦40,000 to ₦45,000 per crate, both records are preserved chronologically. This enables:
- Accurate 7-day, 30-day, and 90-day historical trend analysis.
- Longitudinal price charts and volatility indices.
- Regional price corridor comparisons.

---

## 3. Unit Normalization Strategy

Raw prices must not be compared across incompatible packaging units (e.g. comparing ₦50,000 / 50kg bag directly against ₦1,500 / kg).

### Deterministic Conversion Table
| Packaging Unit | Multiplier | Base Unit | Normalization Status |
| :--- | :--- | :--- | :--- |
| `Kilogram (kg)` | 1 | `KG` | `EXACT` |
| `100kg Bag` | 100 | `KG` | `NORMALIZED` |
| `50kg Bag` | 50 | `KG` | `NORMALIZED` |
| `25kg Bag` | 25 | `KG` | `NORMALIZED` |
| `Tonne (MT)` | 1000 | `KG` | `NORMALIZED` |
| `gram` | 0.001 | `KG` | `NORMALIZED` |
| `Litre` | 1 | `LITRE` | `EXACT` |
| `Gallon (25L)` | 25 | `LITRE` | `NORMALIZED` |
| `25L_KEG` | 25 | `LITRE` | `NORMALIZED` |

### Uncalibrated / Variable Units
Units such as `Basket`, `Crate`, `Bunch`, `Piece / Head`, `Carton`, and `Live Animal / Head` have variable weights that fluctuate depending on crop moisture, packing tightness, and animal maturity.

AgroMarket **does not guess or invent conversion weights**. When an observation uses a variable packaging unit:
$$\text{normalized\_price} = \text{NULL}$$
$$\text{normalization\_status} = \text{'UNAVAILABLE'}$$

---

## 4. Deterministic Price Trend Calculation

Trends are computed over defined time horizons (e.g. 30 days) by comparing the average price in the current window with the average price in the immediately preceding window:

$$\text{Percentage Change} = \left(\frac{\bar{P}_{\text{current}} - \bar{P}_{\text{previous}}}{\bar{P}_{\text{previous}}}\right) \times 100$$

### Trend Classifications
- **`RISING`**: $\Delta > +2.0\%$
- **`FALLING`**: $\Delta < -2.0\%$
- **`STABLE`**: $-2.0\% \le \Delta \le +2.0\%$
- **`INSUFFICIENT_DATA`**: Fewer than 2 observations, missing current period, missing previous period, or $\bar{P}_{\text{previous}} \le 0$.

### Division-by-Zero Guard
If $\bar{P}_{\text{previous}} \le 0$, the calculation safely returns `trend = 'INSUFFICIENT_DATA'` and `percentageChange = null`.

---

## 5. Regional Price Comparisons & Sparse Data Handling

The regional engine aggregates normalized prices state by state across Nigeria.

### Safe Presentation Wording
To prevent misleading claims of nationwide extremes when data is sparse, the UI uses contextual phrasing:
- `"Lowest observed price among available records"` (rather than "Cheapest in Nigeria").
- `"Highest observed price among available records"`.

### Data Sufficiency Tiers
- **`LOW_DATA`**: $< 3$ observations in the window. Displayed with a "Sparse Data" warning badge.
- **`MODERATE`**: $3 \le N < 10$ observations.
- **`HIGHER_CONFIDENCE`**: $N \ge 10$ observations across multiple market dates.

---

## 6. Privacy & Ingestion Architecture

The `MarketDataProvider` interface establishes a clean contract for future integrations (government feeds, cooperative monitors, NGO surveys):
- **Privacy Protection**: Anonymizes platform order transactions (`PLATFORM_TRANSACTION`) so that buyer identities, seller phone numbers, and private order IDs are never exposed in public or farmer intelligence APIs.
- **Anti-Collusion**: Price intelligence informs supply-chain planning and fair discovery; it is not designed to coordinate artificial floor prices or price fixing.
