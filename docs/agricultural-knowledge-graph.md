# Agricultural Knowledge Graph & Ontology Layer (Phase 3.13)

## 1. Executive Summary & Objective

AgroMarket Phase 3.13 introduces a structured, strongly typed, and queryable **Agricultural Knowledge Graph & Ontology Layer**. While Phase 3.12 answered *"What depends on what?"* through operational dependency tracking and cascade propagation, Phase 3.13 answers:

> **"What is this thing, what does it mean, what is it related to, and how should the rest of AgroMarket understand it?"**

This knowledge graph serves as the semantic substrate underneath future semantic search, AI context retrieval, agricultural education, related-content discovery, and multi-agent intelligence context assembly across Nigerian agro-ecological domains.

---

## 2. Architectural Boundaries & Non-Goals

1. **No Duplication of Operational Tables**: Operational records remain anchored in their authoritative tables (`products`, `categories`, `production_units`, `aggregation_pools`, `processing_facilities`, `b2b_demands`, `logistics_corridors`, `knowledge_content`). The knowledge layer references these canonical entities via `agricultural_entity_links`.
2. **Distinct from Dependency Graph**: Operational failure dependencies remain in `agricultural_dependency_relationships` (Phase 3.12). The knowledge graph models semantic relationships (`IS_A`, `PART_OF`, `GROWS_IN`, `AFFECTED_BY`, `HAS_INPUT`, `PROCESSED_INTO`).
3. **No Autonomous or Diagnostic Authority**:
   - Disease associations represent documented agricultural risk pathways, **not** veterinary diagnoses, prescriptions, or autonomous quarantine.
   - Food health associations represent nutritional storage and hygiene principles, **not** medical advice or clinical treatment.
4. **Zero Fabrication**: The ontology layer never fabricates fake agricultural entities or facts. If data is absent, the system honestly reports empty states or `INSUFFICIENT_DATA`.
5. **Strict Anti-Pork Invariant**: Global zero-tolerance rejection of porcine/swine terms enforced at database constraints, Zod schemas, action gates, and query layers.

---

## 3. Knowledge Concept Taxonomy

The ontology defines 26 constrained concept types:

| Concept Type | Description & Nigerian Context | Example |
| :--- | :--- | :--- |
| `COMMODITY` | Commercial agricultural produce category | Cassava, White Maize, Cowpea |
| `CROP` | Cultivated crop plant species | Sorghum (*Sorghum bicolor*), Yam (*Dioscorea*) |
| `LIVESTOCK` | Domesticated farm animals | Cattle (Bunaji/White Fulani), Goat (Red Sokoto) |
| `POULTRY` | Domesticated avian species | Broiler, Layer, Cockerel, Guinea Fowl |
| `AQUACULTURE` | Cultivated aquatic species | Catfish (*Clarias gariepinus*), Tilapia |
| `INPUT` | Certified seeds, fertilizers, or agro-chemicals | NPK 15:15:15, Certified Seed Yam |
| `DISEASE` | Crop or livestock pathology / pest infestation | Fall Armyworm (*Spodoptera frugiperda*), Yam Anthracnose |
| `BIOSECURITY_CONCEPT` | Disinfection, vector containment, movement control | Quarantine Buffer, Footbath Sanitization |
| `PROCESS` | Post-harvest, milling, or value addition method | Parboiling, Fermentation, Flash Drying |
| `PRODUCTION_SYSTEM` | Agro-ecological farming technique | Rain-fed Arable, Fadama Irrigation, Pastoralism |
| `VALUE_CHAIN_STAGE` | Sequence in commodity transformation | Primary Cultivation, Aggregation, Industrial Milling |
| `PROCESSING_OUTPUT` | Refined or processed derivative output | High Quality Cassava Flour (HQCF), Parboiled Milled Rice |
| `MARKET` | Physical or regional wholesale trading market | Dawanau Grain Market (Kano), Bodija Market (Ibadan) |
| `REGION` | Agro-ecological production zone | Guinea Savannah, Sudan Savannah, Rainforest |
| `STATE` | Nigerian State administrative boundary | Kaduna, Kano, Benue, Oyo, Niger |
| `LGA` | Local Government Area administrative subdivision | Dala, Zaria, Gboko, Akinyele |
| `LOGISTICS_CONCEPT` | Transit, storage, or haulage terminology | Cold Chain, Bulk Grain Haulage, Bagged Freight |
| `LOGISTICS_CORRIDOR` | Key transit trunk route | Lagos-Ibadan-Kaduna North-South Transit Corridor |
| `EQUIPMENT` | Mechanization or processing machinery | Disc Plough, Rice Thresher, Cassava Grater |
| `SERVICE` | Professional agricultural service | Soil Testing, Aerial Spraying, Tractor Hire |
| `FOOD_SECURITY_CONCEPT` | Nutritional availability and stability metric | Caloric Sufficiency, Post-Harvest Loss Buffer |
| `FOOD_HEALTH_CONCEPT` | Nutrition, food hygiene, and preservation principle | Aflatoxin Mitigation, Safe Moisture Threshold |
| `AGRICULTURAL_PRACTICE`| Good Agricultural Practice (GAP) | Crop Rotation, Integrated Pest Management (IPM) |
| `KNOWLEDGE_TOPIC` | Educational curriculum or extension topic | Soil Fertility Management |
| `KNOWLEDGE_CONTENT` | Link to published educational articles | Extension Guides, Advisory Bulletins |
| `ORGANIZATION_TYPE` | Actor organizational structure | Farmer Cooperative Society, Outgrower Scheme |

---

## 4. Semantic Relationship Vocabulary

Edges in `agricultural_knowledge_relationships` are directed, typed, provenance-aware, and temporally bounded:

- `IS_A`: Taxonomic classification (e.g., `Broiler` $\to$ `IS_A` $\to$ `Poultry`).
- `PART_OF`: Compositional containment (e.g., `Kaduna` $\to$ `PART_OF` $\to$ `North-West Zone`).
- `RELATED_TO`: General semantic co-occurrence without hierarchical containment.
- `PRODUCES`: Yield relation (e.g., `Crop Production` $\to$ `PRODUCES` $\to$ `Rice Grain`).
- `REQUIRES`: Agronomic or processing prerequisite (e.g., `Parboiling` $\to$ `REQUIRES` $\to$ `Clean Water Supply`).
- `USED_FOR`: Practical application (e.g., `High Quality Cassava Flour` $\to$ `USED_FOR` $\to$ `Composite Baking`).
- `GROWS_IN`: Cultivation habitat (e.g., `Ginger` $\to$ `GROWS_IN` $\to$ `Southern Kaduna`).
- `COMMON_IN`: Prevalence in a state or region.
- `PROCESSED_INTO`: Transformation derivative (e.g., `Cassava Root` $\to$ `PROCESSED_INTO` $\to$ `Garri`).
- `PROCESSED_BY`: Method of transformation.
- `SOLD_IN`: Terminal market connection (e.g., `Maize` $\to$ `SOLD_IN` $\to$ `Dawanau Market`).
- `DEMANDED_BY`: Institutional or consumer off-taker demand.
- `TRANSPORTED_THROUGH`: Movement via strategic transit corridor.
- `AFFECTED_BY`: Vulnerability to crop pathology or pest.
- `AT_RISK_FROM`: Biological susceptibility of livestock or aquaculture.
- `HAS_INPUT`: Required seed, fertilizer, or mechanization input.
- `HAS_PROCESS`: Applicable post-harvest handling stage.
- `HAS_MARKET`: Associated trading wholesale depot.
- `HAS_VALUE_CHAIN_STAGE`: Alignment with value-chain pipeline.
- `HAS_OUTPUT`: Derived byproduct or co-product.
- `ALTERNATIVE_TO`: Agronomic or processing functional substitute.
- `SIMILAR_TO`: Peer variety or cultivation practice.
- `PRECEDES` / `FOLLOWS`: Chronological lifecycle sequencing.
- `ASSOCIATED_WITH`: Contextual association.
- `HAS_KNOWLEDGE`: Direct linkage to verified extension literature.
- `HAS_FOOD_HEALTH_CONTEXT`: Connection to food hygiene or nutritional guidelines.

---

## 5. Hierarchy Rules & Cycle Detection

1. **Self-Parenting Prohibition**: Enforced by check constraint `chk_akc_no_self_parent` and Zod validation.
2. **Cycle Protection**:
   - `detectHierarchyCycle`: Recursively traverses proposed ancestor branches before saving; returns `true` if circular ancestry is detected.
   - `traverseHierarchyInMemory` & `get_knowledge_concept_hierarchy`: Uses `path UUID[]` tracking; automatically flags `cycleDetected: true` and halts recursion.
3. **Bounded Depth**: Hard recursion limit of 5 levels (default 3 levels).

---

## 6. Entity Linking (`agricultural_entity_links`)

Connects ontology concepts to concrete operational AgroMarket database entities:
- `PRODUCT` $\to$ `public.products`
- `LISTING` $\to$ `public.listings`
- `FARM` / `PRODUCTION_UNIT` $\to$ `public.farms` / `public.production_units`
- `PRODUCTION_OUTPUT` $\to$ `public.production_outputs`
- `AGGREGATION_POOL` $\to$ `public.aggregation_pools`
- `PROCESSING_FACILITY` $\to$ `public.processing_facilities`
- `PROCESSING_EVENT` $\to$ `public.processing_events`
- `B2B_DEMAND` $\to$ `public.b2b_demands`
- `LOGISTICS_PROVIDER` $\to$ `public.logistics_providers`
- `LOGISTICS_CORRIDOR` $\to$ `public.logistics_corridors`
- `EQUIPMENT` $\to$ `public.equipment`
- `SERVICE` $\to$ `public.services`
- `KNOWLEDGE_CONTENT` $\to$ `public.knowledge_content`

Link natures supported: `CANONICAL`, `INSTANCE_OF`, `EXEMPLAR`, `RELATED_OPERATIONAL`.

---

## 7. Provenance & Confidence Dimensions

- **Provenance**: `OBSERVED`, `DERIVED`, `CORRELATED`, `ESTIMATED`, `EXTERNAL_SOURCE`, `EDITORIAL`, `SYSTEM_IMPORTED`, `INSUFFICIENT_DATA`.
- **Confidence**: `HIGH`, `MODERATE`, `LOW`, `INSUFFICIENT_DATA`.
- Strictly orthogonal: A relationship may be `STRONG` in severity/association but carry `LOW` confidence if derived from limited seasonal observation.

---

## 8. Temporal Validity

- All concepts and relationships feature `valid_from` and `valid_until` ISO timestamps.
- Check constraints enforce `valid_until >= valid_from`.
- Active traversal queries automatically exclude expired relationships unless `includeHistorical: true` is explicitly requested.

---

## 9. Privacy, Masking & Confidentiality

- Metadata is stripped of sensitive commercial terms (e.g., `phone`, `price`, `sellerPrice`, `buyerPrice`, `gps`, `exactAddress`, `accountNumber`).
- Geographic scopes are restricted to state or LGA aggregation, never exposing individual farm coordinates or private farmer contact details.

---

## 10. Multi-Agent Intelligence Integration

Deterministic query functions provide contextual packages to analytical agents:
- `getCommodityKnowledgeContext(commodityKeyOrId)`
- `getProductionKnowledgeContext(productionKeyOrId)`
- `getDiseaseKnowledgeContext(diseaseKeyOrId)`
- `getRegionalKnowledgeContext(regionKeyOrId)`
- `getMarketKnowledgeContext(marketKeyOrId)`
- `getProcessingKnowledgeContext(processKeyOrId)`
- `getFoodSecurityKnowledgeContext(conceptKeyOrId)`

All queries return sanitized, structured evidence packages with mandatory advisory disclaimers.

---

## 11. Human-in-the-Loop Governance

Mutating actions (`createKnowledgeConceptAction`, `createKnowledgeRelationshipAction`, `createEntityLinkAction`, `promoteKnowledgeStatusAction`) evaluate Phase 3.8 Governance Policy ([evaluateGovernancePolicy](file:///c:/Users/Ososanwo%20Idris/Documents/AGROMARKET-%20Final%20version/src/features/intelligence-governance/policy-engine.ts)). If governance evaluates to `DENY`, the mutation is blocked.

---

## 12. Verification & Quality Gates

- **Database Migration**: `20261008190000_phase_3_13_agricultural_knowledge_graph.sql` applied to live Supabase DB.
- **Automated Tests**:
  - `src/test/knowledge-graph.test.ts`: 17 tests passed (100%).
  - Total test suite: 65 test files, 1,102 tests passed (100%).
- **TypeScript**: `npm run typecheck` passed with 0 errors.
- **Linting**: `npm run lint` passed with 0 warnings and 0 errors.
- **Production Build**: `npm run build` compiled all 46 routes cleanly, including dynamic `/knowledge-graph`.
