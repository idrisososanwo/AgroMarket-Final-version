# AgroMarket Brand Identity Guide

## 1. Overview & Brand Definition

**AgroMarket** is a Nigerian-first digital agricultural ecosystem and coordination platform. It is not merely an e-commerce shopfront or a generic farming marketplace; it is the coordination infrastructure that unifies and powers Nigeria's entire agricultural value chain.

### Core Brand Essence
> **"AgroMarket connects the people, products, infrastructure and intelligence that move agriculture forward."**

### Brand Direction: *AGRO NETWORK*
The visual identity crystallizes AgroMarket as a connected network uniting disparate nodes across Nigeria's agricultural landscape:
- **Agriculture**: Vitality, crops, soil, sustainable production, and cultivation.
- **Network**: Structured infrastructure, nodes, communication links, and coordination.
- **Connection**: Direct linkages between producers, aggregators, processors, and markets.
- **Movement**: Logistics corridors, supply chains, food distribution, and velocity.
- **Commerce**: Transparent transactions, shared purchases, liquidity, and economic growth.
- **Intelligence**: Predictive analytics, decision-making agents, and data coordination.
- **Growth**: Resilient upward expansion of national food security and wealth.

---

## 2. Logo Concept & Geometry

### The "Agro Network" Symbol
The central mark is a geometric network mark that subtly resolves into the silhouette of an upward **"A"** (for AgroMarket), while functioning as an autonomous infrastructure diagram.

```
                  (Apex: Growth & Tech)
                         [50, 18]
                           /\
                          /  \
     (Processing) [28, 50]----[72, 50] (Markets & Logistics)
                     \   \ | /   /
                      \   [50, 50] (Intelligence Hub)
                       \  /  \  /
                        \/    \/
    (Producers) [22, 82]----[50, 76]----[78, 82] (Buyers / Commerce)
                       (Aggregation)
```

### Geometric Structure & Symbolism
1. **The Base Nodes (Producers & Buyers)**: Anchor points representing grassroots farmers on the left and commercial buyers on the right.
2. **The Aggregation Node (Center Base)**: Physical aggregation hubs consolidating local produce.
3. **The Crossbar Nodes (Processing & Logistics)**: Industrial value-addition processors and dynamic transport corridors bridging farm-gate supply to consumption markets.
4. **The Central Hub (Ecosystem Intelligence)**: Represents the AI agent reasoning and coordination layer (Market, Production, Demand, Procurement, Resilience, Logistics, Biosecurity).
5. **The Apex Node (Growth & Scalable Infrastructure)**: Signifies upward progress, food sovereignty, and modernization.
6. **Connecting Conduits**: Vector pathways denoting flow of physical produce, verified payments, trade settlements, and algorithmic intelligence.

---

## 3. Brand Color System

AgroMarket employs an authentic, organic, yet technically rigorous color palette rooted in Nigerian agriculture and enterprise reliability.

| Token Name | Hex Code | HSL / RGB | Purpose / Usage |
| :--- | :--- | :--- | :--- |
| **Deep Agricultural Green** (Primary) | `#0F4327` | `rgb(15, 67, 39)` | Primary brand mark, anchor nodes, main wordmark, headers, core authority. |
| **Fresh Growth Green** (Secondary) | `#16A34A` | `rgb(22, 163, 74)` | Central growth stem, apex node, vitality accents, positive statuses. |
| **Warm Earth Clay** (Supporting) | `#C26732` | `rgb(194, 103, 50)` | Crossbar conduits, value-chain processing nodes, soil & harvest connection. |
| **Amber Gold** (Intelligence Accent) | `#E59500` | `rgb(229, 149, 0)` | Central coordination hub, solar energy, intelligence alerts, highlights. |
| **Neutral Cream** (Background) | `#FBF9F4` | `rgb(251, 249, 244)` | Node core centers, clean background fills, card containers. |
| **Deep Charcoal** (Text & Base) | `#1A231E` | `rgb(26, 35, 30)` | High-contrast typography, body text, data visualizations. |

---

## 4. Typography & Wordmark

### Wordmark Construction
- **Strict Spelling & Capitalization**: `AgroMarket`
- **Prohibited Variants**:
  - ❌ `AGROMARKET` (Do not use all-caps)
  - ❌ `Agro MARKET` (Do not separate with spaces)
  - ❌ `Agro-Market` (Do not hyphenate)
  - ❌ `agromarket` (Do not use all-lowercase)

### Typeface Selection
Modern sans-serif with geometric balance and open counters:
- **Primary Web Font**: `Inter` (Next.js font variable `--font-inter`)
- **System Fallbacks**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Styling**: `Agro` is rendered in bold/extrabold with Primary Green (`#0F4327`), and `Market` is rendered in bold/extrabold with Fresh Growth Green (`#16A34A`) or matching contrast tokens.

---

## 5. Logo System & Variants

The AgroMarket identity includes 8 asset formats designed for varied contexts:

1. **Primary Logo (`/brand/logo-primary.svg`)**:
   - Stacked vertical lockup with central symbol over the wordmark and optional national network subtext.
   - Used for landing heroes, presentation title slides, document covers, and large print.
2. **Horizontal Logo (`/brand/logo-horizontal.svg`)**:
   - Inline lockup with symbol on the left and wordmark + descriptor on the right.
   - Ideal for navigation bars, top headers, invoices, and letterheads.
3. **Symbol Only (`/brand/symbol.svg`)**:
   - Pure vector symbol without text. Used for responsive avatars, watermarks, and app headers.
4. **Compact Logo**:
   - Scaled horizontal lockup without descriptor subtitle, optimized for tight navigation trays and mobile headers.
5. **Monochrome Version (`/brand/symbol-monochrome.svg`)**:
   - Single-color deep charcoal/black vector for fax, newsprint, rubber stamps, or thermal receipt printers.
6. **Reverse / White Version (`/brand/symbol-white.svg` & `logo-white.svg`)**:
   - High-contrast white and pastel green mark designed for dark mode UI and deep green container backgrounds.
7. **App Icon (`/brand/app-icon.svg`)**:
   - 512x512 squircle container with deep green background and glowing network nodes for Android/iOS homescreens and PWA manifests.
8. **Favicon (`/brand/favicon.svg`)**:
   - 32x32 pixel-grid-aligned high-contrast SVG for browser tabs and bookmarks.

---

## 6. Implementation & Component Architecture

### React Components (`src/components/brand/`)

The design system provides native React components that integrate with Next.js and Tailwind CSS:

#### `<AgroMarketSymbol />`
```tsx
import { AgroMarketSymbol } from "@/components/brand";

// Available sizes: "xs" (16px), "sm" (24px), "md" (32px), "lg" (48px), "xl" (64px), or raw number
<AgroMarketSymbol size="md" variant="color" />
<AgroMarketSymbol size={28} variant="white" />
<AgroMarketSymbol size="sm" variant="monochrome" />
```

#### `<AgroMarketLogo />`
```tsx
import { AgroMarketLogo } from "@/components/brand";

// Horizontal header lockup with Next.js link
<AgroMarketLogo
  layout="horizontal"
  size="md"
  showTagline
  taglineText="NIGERIAN AGRICULTURAL NETWORK"
  href="/"
/>

// Stacked hero lockup
<AgroMarketLogo layout="stacked" size="lg" />

// White reversed logo for dark headers
<AgroMarketLogo variant="white" size="md" />
```

---

## 7. Size & Accessibility Guidelines

### Minimum Display Sizes
- **Favicon**: 16px × 16px (simplified conduits remain sharp)
- **Compact UI Symbol**: 24px × 24px (minimum in data tables and badge icons)
- **Header Navigation Mark**: 32px – 40px (default header standard)
- **Primary Hero Lockup**: 48px – 64px+ (homepage and splash screens)

### Contrast & Legibility
- **WCAG AA Compliance**: Primary green `#0F4327` against white `#FFFFFF` achieves an **11.4:1** contrast ratio (exceeding AAA requirement of 7:1 for normal text).
- **Dark Mode Surfaces**: Always use `variant="white"` on backgrounds darker than Tailwind `neutral-700` or `#1E293B`.
- **Aria Labels & Screen Readers**: All vector SVGs include semantic `role="img"` and descriptive `aria-label` tags (`"AgroMarket Agro Network Symbol"`).

---

## 8. Anti-Patterns & Prohibited Usages

- ❌ **Do NOT stretch or distort proportions**: Always preserve the 1:1 aspect ratio of the symbol.
- ❌ **Do NOT use generic clichés**: Avoid single leaves, tractors, shopping carts, or barns.
- ❌ **Do NOT alter node relationships**: The geometric triangulation represents the balanced agricultural ecosystem.
- ❌ **Do NOT apply drop shadows or 3D extrusions**: The mark is strictly flat, modern, and vector-centric.
