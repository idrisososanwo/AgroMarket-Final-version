# AgroMarket Phase 3.0: Agricultural Disease & Biosecurity Intelligence Agent

> **EXPLICIT REGULATORY & OPERATIONAL DISCLAIMER**  
> **AgroMarket Disease & Biosecurity Intelligence is an agricultural decision-support and early-warning capability. It is not a veterinary diagnostic service, laboratory, disease-certification authority, regulator, emergency-response authority, or substitute for qualified agricultural/veterinary professionals.**

---

## 1. Executive Purpose & Scope

AgroMarket is a Nigerian-first, asset-light agricultural coordination and intelligence ecosystem. 

Phase 3.0 establishes the **Agricultural Disease & Biosecurity Intelligence Agent** (`AGRICULTURAL_DISEASE_BIOSECURITY_AGENT`, alias `DISEASE_BIOSECURITY`). Its primary objective is to observe, structure, correlate, and communicate agricultural disease-risk signals and biosecurity constraints across Nigerian trade basins.

The system connects the agricultural value chain:
```
PRODUCTION / FARM HEALTH
        ↓
ANIMAL / CROP HEALTH SIGNALS
        ↓
AGGREGATION CENTERS
        ↓
PROCESSING FACILITIES
        ↓
LOGISTICS MOVEMENT CORRIDORS
        ↓
REGIONAL MARKET EXPOSURE
        ↓
FOOD SECURITY INTERVENTIONS
```

### What This Agent Does:
- Detects and correlates agricultural disease-risk signals from verified and secondary sources.
- Calculates an objective, deterministic **AgroMarket Agricultural Disease Risk Index** (0–100).
- Calculates an objective, deterministic **Agricultural Biosecurity Resilience Score** (0–100).
- Identifies **Signal Convergence** across independent, non-duplicate sources.
- Analyzes potential value-chain vulnerabilities (production concentration, movement restrictions, single-source dependencies).
- Enforces human-in-the-loop review for early-warning public alerts.

### What This Agent Does NOT Do:
- **No Veterinary Diagnoses**: The agent does not clinically diagnose animal or crop diseases.
- **No Medical/Prescription Advice**: The agent never instructs farmers to administer medications, chemicals, or pesticides, nor does it recommend culling or quarantine actions.
- **No Regulatory Certification**: The platform is not a government disease control agency or sanitary certifier.
- **No Fake Data**: The system operates only on real platform observations and official notices; simulated evidence never triggers public alerts.
- **Zero Pork Tolerance**: In strict alignment with AgroMarket core standards, no pig or pork commodities are permitted anywhere in the system.

---

## 2. Core Question & Decision Loop

The agent answers:
> *"What evidence suggests agricultural health risk, where is it concentrated, how confident are we, what parts of the value chain could potentially be affected, and what requires human or official verification?"*

### Continuous Improvement Loop:
```
OBSERVE
  ↓
NORMALIZE
  ↓
CORRELATE
  ↓
DETECT
  ↓
ASSESS
  ↓
RECOMMEND
  ↓
HUMAN REVIEW
  ↓
ACTION
  ↓
OUTCOME
  ↓
EVALUATION
  ↓
IMPROVEMENT
```

---

## 3. Authoritative Deterministic Calculations

All core scores are computed deterministically. AI is strictly advisory and grounded in deterministic data packages.

### A. Agricultural Disease Risk Index (0–100)
A higher score indicates greater observed agricultural disease-risk pressure. Missing evidence penalizes confidence rather than inflating risk artificially.

$$\text{Disease Risk Index} = \sum_{i=1}^{7} W_i \cdot C_i$$

| Component | Weight | Analytical Basis |
| :--- | :---: | :--- |
| **Evidence Strength** | **20%** | Verification status of records (`OFFICIAL`/`VERIFIED` vs `SECONDARY` vs `UNVERIFIED`). Simulated data = 0. |
| **Signal Convergence** | **20%** | Corroboration across independent, distinct reporting sources. Repeated same-source reports do not inflate score. |
| **Geographic Concentration** | **15%** | Ratio of observations concentrated in the target LGA/State production basin. |
| **Commodity Exposure** | **15%** | Direct commodity-specific vulnerability (e.g., broiler poultry, sorghum, cowpea). |
| **Production Impact Evidence** | **10%** | Observed output decline, abnormal mortality reports, or harvest disruption. |
| **Movement / Biosecurity Exposure** | **10%** | Health-related transit restrictions, sanitary checkpoints, or corridor quarantine friction. |
| **Supply Impact Evidence** | **10%** | Observed wholesale marketplace supply contractions or procurement fulfillment gaps. |
| **Total** | **100%** | **Strictly normalized between 0.0 and 100.0** |

#### Level Thresholds:
- **`CRITICAL_RISK`**: Score $\ge 75$
- **`HIGH_RISK`**: Score $\ge 55$
- **`ELEVATED_RISK`**: Score $\ge 40$
- **`MODERATE_RISK`**: Score $\ge 25$
- **`LOW_RISK`**: Score $< 25$
- **`INSUFFICIENT_DATA`**: Assigned when observations count is zero, confidence $< 0.40$, or missing evidence $\ge 4$.

---

### B. Agricultural Biosecurity Resilience Score (0–100)
A higher score reflects greater systemic capacity of the local trade basin to absorb, contain, or bypass health disruptions.

$$\text{Biosecurity Resilience Score} = \sum_{j=1}^{8} W_j \cdot R_j$$

| Dimension | Weight | Measurement Objective |
| :--- | :---: | :--- |
| **Production Diversification** | **15%** | Producer dispersion; decentralization prevents single-farm outbreak containment failures. |
| **Regional Diversification** | **15%** | Availability of alternate production states and sourcing basins. |
| **Supplier / Source Diversity** | **10%** | Commercial supplier mix; avoids single-farm counterparty dependency. |
| **Movement Flexibility** | **15%** | Availability of secondary feeder transit routes to bypass health-restricted corridors. |
| **Aggregation Flexibility** | **10%** | Redundancy in local aggregation centers to enable staging and isolation. |
| **Processing Redundancy** | **10%** | Alternate processing plants to redirect safe agricultural volumes. |
| **Market Diversification** | **10%** | Diverse commercial offtake and wholesale channels. |
| **Observed Response Capacity** | **15%** | Presence of active veterinary extension advisory and cooperative support. |
| **Total** | **100%** | **Strictly normalized between 0.0 and 100.0** |

#### Resilience Thresholds:
- **`HIGH_RESILIENCE`**: Score $\ge 75$
- **`MODERATE_RESILIENCE`**: Score $\ge 50$
- **`VULNERABLE`**: Score $\ge 25$
- **`CRITICALLY_VULNERABLE`**: Score $< 25$
- **`INSUFFICIENT_DATA`**: Assigned when critical telemetry inputs are missing.

---

## 4. Evidence Verification & Provenance Model

Every piece of evidence tracks source provenance and verification state:

| Verification Status | Authority Level | Public Alert Allowed? |
| :--- | :--- | :---: |
| **`OFFICIAL`** | State/Federal Ministries of Agriculture, Federal Veterinary Services, FAO/WOAH bulletins. | Yes (post human review) |
| **`VERIFIED`** | Certified research institutes (IITA, NVRI, universities), formal extension officer logs. | Yes (post human review) |
| **`SECONDARY`** | Commercial agricultural aggregators, driver cooperatives, verified trade associations. | Review only |
| **`UNVERIFIED`** | Informal farmer community reports, media notices pending institutional confirmation. | No (internal monitoring only) |
| **`SIMULATED`** | Test harness artifacts or synthetic simulation models. | **NEVER** |

---

## 5. Value-Chain Impact & Logistics Integration

The agent interfaces directly with **Phase 2.9 (Logistics Intelligence)** and **Phase 2.8 (Food Security)**:

1. **Production Impact**: Abnormal mortality or crop blight signals identify potential harvest contractions.
2. **Movement & Biosecurity**: Health checkpoints or quarantine notices are linked with arterial corridors. (Explicit rule: the agent never closes roads or issues evasion instructions).
3. **Downstream Supply Availability**: Traces potential volume shortfalls to urban wholesale hubs.
4. **Food Security Correlation**: Signals `DISEASE_FOOD_SECURITY_RISK` into the food security intelligence loop.

> **Causation Disclaimer**:  
> *"Correlation is not causation. Disease-risk indicators represent early-warning decision support and require verification by official agricultural and veterinary authorities."*

---

## 6. Governed Alert Lifecycle & Human-in-the-Loop Gate

To prevent false panic or unverified disease rumors, **autonomous publication of critical public alerts is strictly prohibited**.

```
DRAFT
  ↓
REVIEW (Authorized internal admin / agricultural specialist review)
  ↓
PUBLISHED (Aggregated public visibility)
  ↓
ACKNOWLEDGED (Cooperative / farmer acknowledgment)
  ↓
RESOLVED (Health event cleared by authorities)
  ↓
ARCHIVED
```

---

## 7. Privacy & Commercial Confidentiality

- **No Farm Coordinates**: Exact GPS coordinates, farm plots, and private homestead locations are never published.
- **Aggregation by LGA/State**: Public and cross-actor dashboards expose aggregated regional indicators only.
- **No PII**: Farmer names, phone numbers, and individual commercial contract values remain strictly confidential.

---

## 8. Anti-Pork Hard Invariant

Enforced at all application boundaries:
1. **Database Schema**: `CHECK` constraints on snapshots, observations, dependencies, and alerts reject terms matching `pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine`.
2. **TypeScript & Zod**: Validated through `assertNoProhibitedProduce` before any computation or storage.
3. **Agent & Prompt Layers**: Prompt packaging sanitizes and rejects prohibited produce terms.
4. **UI & Tests**: Comprehensive unit tests verify that prohibited terms are rejected with runtime exceptions.

---

## 9. Future Extensions (Documented Only)

The following capabilities are reserved for future phases and are **not** implemented in Phase 3.0:
- Laboratory API integrations and molecular diagnostics.
- Farm IoT temperature, humidity, and animal mortality sensors.
- Satellite multispectral crop blight image classification.
- Autonomous municipal movement restriction enforcement.
- Automated veterinary prescription engines.
