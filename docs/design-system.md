# AgroMarket Design System Specification

## 1. Overview & Design Philosophy

The **AgroMarket Design System** translates the brand direction—**"AGRO NETWORK"**—into a coherent, production-ready visual language.

AgroMarket is a digital agricultural ecosystem and coordination platform connecting farmers, buyers, businesses, logistics, and multi-agent intelligence across Nigeria. The interface communicates a serious agricultural technology infrastructure platform:

- **Agricultural**: Authentic organic tones rooted in Nigerian soil, harvest, and crops.
- **Technology & Network**: Structured layout grids, precise data display, and clean vectors.
- **Commerce**: Transparent transactions, shared batch progress, and liquidity flows.
- **Intelligence**: Coherent multi-agent visual cues for forecasts, signals, and actionable decisions.
- **Trust**: Resilient contrast, grounded elevation, and WCAG AA accessibility compliance.

---

## 2. Design Tokens

### Brand Palette Variables (`:root` & Tailwind `agro`)

```css
/* Core Brand Tokens */
--agro-green-950: #082615;
--agro-green-900: #0F4327; /* Deep Agricultural Green (Primary Brand Anchor) */
--agro-green-800: #14532D;
--agro-green-700: #166534;
--agro-green-600: #15803D;
--agro-green-500: #16A34A; /* Fresh Growth Green (Secondary Vitality) */
--agro-green-400: #22C55E;
--agro-green-300: #86EFAC;
--agro-green-200: #BBF7D0;
--agro-green-100: #DCFCE7;
--agro-green-50:  #F0FDF4;

--agro-growth: #16A34A;
--agro-clay: #C26732;       /* Warm Earth Clay (Value Chain & Logistics) */
--agro-clay-light: #FBECE5;
--agro-clay-dark: #9A3412;

--agro-amber: #E59500;      /* Amber Gold (Intelligence & Market Attention) */
--agro-amber-light: #FEF3C7;
--agro-amber-dark: #B45309;

/* Neutral Surfaces */
--agro-cream: #FBF9F4;      /* Organic Cream (Primary Canvas Background) */
--agro-white: #FFFFFF;      /* Clean Elevated Surface */
--agro-charcoal: #1A231E;   /* Deep Slate Charcoal (Primary Typography) */
--agro-surface-muted: #F4F1EA;
--agro-border: #E6E1D6;
--agro-border-subtle: #F0ECE3;
```

### Semantic Feedback Tokens

| Semantic Role | Token Name | Text / Icon | Surface / Background | Border |
| :--- | :--- | :--- | :--- | :--- |
| **Success** | `--agro-success` | `#15803D` | `#F0FDF4` | `#BBF7D0` |
| **Warning** | `--agro-warning` | `#D97706` | `#FFFBEB` | `#FDE68A` |
| **Danger / Risk** | `--agro-danger` | `#DC2626` | `#FEF2F2` | `#FECACA` |
| **Info / Signal** | `--agro-info` | `#0284C7` | `#F0F9FF` | `#BAE6FD` |
| **Neutral** | `--agro-neutral` | `#475569` | `#F8FAFC` | `#E2E8F0` |

---

## 3. Typography Hierarchy

Primary web font: **`Inter`** (`--font-inter`) with fallback to standard system typography (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).

| Level | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | 48px / 3rem | Black (900) | 1.1 | Major landing hero and splash headings |
| **H1** | 36px / 2.25rem | Extrabold (800) | 1.2 | Module titles and top-level pages |
| **H2** | 30px / 1.875rem | Bold (700) | 1.25 | Major dashboard sections |
| **H3** | 24px / 1.5rem | Bold (700) | 1.3 | Panel & card group headings |
| **H4** | 20px / 1.25rem | Semibold (600) | 1.35 | Widget and card headers |
| **Body Large** | 18px / 1.125rem | Normal (400) | 1.6 | Introductory summaries and leads |
| **Body** | 16px / 1rem | Normal (400) | 1.5 | General UI body text |
| **Body Small** | 14px / 0.875rem | Normal (400) | 1.5 | Secondary annotations and table rows |
| **Caption** | 12px / 0.75rem | Medium (500) | 1.4 | Timestamps, metadata, footnotes |
| **Label** | 12px / 0.75rem | Semibold (600) | 1.2 | Form field labels and uppercase tokens |
| **Metric / Data**| 28px – 40px | Bold (700) | 1.0 | Monospace tabular values (`font-mono`) |

---

## 4. Spacing, Radius & Elevation

### Spacing Scale
- `p-1` / `4px`: Fine control padding and micro-dots
- `p-2` / `8px`: Compact controls and button icon padding
- `p-3` / `12px`: Form field vertical spacing and card header separators
- `p-4` / `16px`: Standard widget and mobile card content padding
- `p-6` / `24px`: Desktop card content padding
- `p-8` / `32px` to `p-12` / `48px`: Page sections and major container layouts

### Border Radius
- `sm` (`4px`): Inputs, compact badges, inner meters
- `md` (`8px`): Standard buttons, dropdowns, form controls
- `lg` (`12px`): Cards, modal dialogs, intelligence containers
- `xl` (`16px`): Major feature callouts and hero surfaces
- `full` (`9999px`): Badges, pill tabs, status dots, and avatars

### Elevation & Depth
- **Resting**: Clean `1px` border (`border-[#E5E0D5]`) with `shadow-sm` or `shadow-xs`. Avoid excessive floating cards.
- **Hover / Interactive**: `shadow-md` with border emphasis (`border-[#16A34A]`).
- **Dark Surface**: Solid Deep Green (`#0F4327`) with inner border (`border-[#14532D]`) and controlled white text contrast.

---

## 5. Core Reusable Components (`src/components/ui/`)

All core UI primitives are exported from `@/components/ui`:

### Buttons (`<Button />`)
- **Variants**: `primary`, `secondary`, `outline`, `ghost`, `destructive`, `success`, `link`
- **Sizes**: `xs`, `sm`, `md`, `lg`, `icon`
- **States**: `isLoading` (renders animated spinner), `disabled`, `leftIcon`, `rightIcon`

### Cards (`<Card />`)
- **Variants**: `default`, `elevated`, `interactive`, `dark`, `bordered`
- **Sub-components**: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

### Badges (`<Badge />` & `<DomainStatusBadge />`)
- **Semantic Variants**: `primary`, `growth`, `clay`, `amber`, `success`, `warning`, `danger`, `info`, `neutral`
- **Domain Statuses**: `VERIFIED`, `PENDING`, `ACTIVE`, `COMPLETED`, `PROCESSING`, `DISRUPTED`, `REVIEW_REQUIRED`, `INSUFFICIENT_DATA`

### Form Controls
- `<Input />` & `<SearchInput />`: Standard text and search inputs with addon support.
- `<Select />`: Clean select dropdown with chevron icon.
- `<Textarea />`: Resizable text area with consistent focus styling.
- `<Checkbox />`: Checkbox with optional label and description.
- `<Switch />`: Accessible toggle switch with smooth translation.
- `<FormField />`: Wrapper uniting label, required asterisk, input, error, and helper text.

### Data Display
- `<MetricCard />`: KPI summary card with label, value, unit, trend, and optional dark variant.
- `<TrendIndicator />`: Directional up/down/neutral trend indicator with optional inverse logic.
- `<ProgressBar />`: Bounded progress indicator with `primary`, `growth`, `clay`, `amber`, and `danger` variants.
- `<ConfidenceIndicator />`: High/Medium/Low confidence visualization with multi-segment meter.
- `<ScoreIndicator />`: Quantified health/priority score meter (0–100).
- `<EmptyState />`: Clean fallback container with icon, title, description, and call to action.
- `<LoadingSpinner />` & `<Skeleton />`: Accessible loading indicators.

---

## 6. Intelligence Visual Language

AgroMarket integrates 8 specialized AI agents and an orchestration engine. The design system provides standardized visual cues so that intelligence feels like one unified ecosystem:

| Intelligence Element | Component / Style | Visual Cue | Purpose |
| :--- | :--- | :--- | :--- |
| **SIGNAL** | `<IntelligenceCard type="SIGNAL" />` | Blue icon & border | Emerging telemetry from border posts, market trades, or satellite feeds. |
| **RECOMMENDATION** | `<RecommendationCard />` | Emerald glow & badge | High-value, actionable decision with projected impact and execute CTA. |
| **PREDICTION** | `<IntelligenceCard type="PREDICTION" />` | Deep green border | Algorithmic forecasting of prices, yields, or demand shifts. |
| **RISK** | `<IntelligenceCard type="RISK" />` | Rose border & badge | Severity-ranked alerts for pests, supply disruption, or logistics bottlenecks. |
| **CONFLICT** | `<IntelligenceCard type="CONFLICT" />` | Clay border & badge | Multi-agent tradeoff requiring user review or automated priority arbitration. |
| **OUTCOME** | `<IntelligenceCard type="OUTCOME" />` | Growth green badge | Measured real-world results from executed actions and fulfilled trades. |

---

## 7. Global Shell & Navigation

- **`<GlobalHeader />`**: Sticky, responsive navigation bar featuring `AgroMarketLogo`, desktop navigation tabs (`Marketplace`, `Ecosystem`, `Intelligence`, `Shared Purchases`, `Equipment`, `Services`, `Learn`), mobile hamburger drawer, and direct account access.
- **`<Breadcrumbs />`**: Hierarchical pathway for deep drill-down pages.
- **`<Tabs />`**: Underline or pill-style accessible tab switchers.

---

## 8. Showcase Page

The interactive design system showcase is accessible in development at:
```
/design-system
```
This route demonstrates all components, color swatches, button states, form controls, and intelligence cards with strictly labeled examples and zero fake business data.
