# AgroMarket 🌾

> Nigeria-first agricultural marketplace and digital agriculture ecosystem connecting farmers, consumers, businesses, agricultural laborers, equipment owners, and extension experts.

---

## 📌 Project Overview

AgroMarket is a production platform designed to eliminate market friction in Nigerian agriculture. It facilitates direct farm-to-buyer transactions, wholesale pooling, equipment leasing, agricultural labor placement, and verified agronomic advisory services.

This repository is **NOT** a landing page or mockup; it is the production codebase built incrementally as a **modular monolith** using Next.js App Router, TypeScript, and Supabase.

---

## 🏗️ Technical Architecture (Phase 0.1)

- **Framework**: Next.js 15 (App Router, Server Components, Server Actions)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS with custom Nigerian agricultural color tokens
- **Data & Auth Layer**: Supabase (PostgreSQL, Supabase SSR Auth, Row Level Security)
- **Validation**: Zod
- **Testing**: Vitest + Testing Library
- **Architecture Style**: Modular Monolith partitioned into domain boundaries under `src/features/`

---

## 👥 User Roles

A single user can hold multiple roles simultaneously:
- **`BUYER`**: Individual consumers and bulk wholesale purchasers
- **`FARMER`**: Farm owners and agricultural producers
- **`BUSINESS`**: Food processors, FMCG off-takers, aggregators, and exporters
- **`JOB_SEEKER`**: Farm hands, tractor operators, agronomists, harvesting crews
- **`SERVICE_PROVIDER`**: Soil testing, drone spraying, clearing, veterinary services
- **`EQUIPMENT_OWNER`**: Owners of tractors, tillers, harvesters, planters
- **`EXPERT`**: Certified agronomists and extension officers
- **`ADMIN`**: Platform operators and compliance officers

---

## ⚖️ Immutable Platform Rules

1. **Asset-Light Logistics**: AgroMarket does not own farms, warehouses, cold-storage facilities, fulfilment centres, or delivery vehicles. All logistics are orchestrated via verified third-party providers.
2. **Prohibited Products**: Pig/pork products (pork, swine, bacon, ham, lard) are strictly barred from categories, listings, recommendations, and seed data.
3. **Nigerian Fiat Foundation**: Primary checkout, escrow hold, and settlement integrations operate exclusively on Nigerian payment methods (Cards, Bank Transfer, USSD) in NGN fiat.
4. **AI Safety**: AI functions strictly as an advisory layer and never makes ungrounded medical, veterinary, or toxic pesticide claims.
5. **Server-Enforced Authorization**: Roles and permissions are strictly evaluated server-side.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ (Node 25 supported)
- npm 10+

### Setup

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd "AGROMARKET- Final version"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your Supabase credentials.

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the foundation status.

5. **Run Tests & Validation**:
   ```bash
   npm run test        # Runs Vitest unit tests
   npm run typecheck   # Validates TypeScript types
   npm run lint        # Runs ESLint checks
   npm run build       # Validates production Next.js build
   ```

---

## 📂 Project Structure

```
├── docs/                   # Architecture, development, and PRD references
├── src/
│   ├── app/                # Next.js App Router (Layouts, routes, error boundaries)
│   ├── components/         # Shared, reusable UI primitives
│   ├── config/             # Environment validation and app configuration
│   ├── features/           # 24 Domain boundaries for modular monolith
│   ├── hooks/              # Shared React hooks
│   ├── lib/                # Core utilities, Supabase SSR clients, Auth & RBAC
│   ├── styles/             # Global CSS and Tailwind tokens
│   └── types/              # Cross-cutting TypeScript definitions
└── supabase/               # Database migrations and Supabase CLI configuration
```

---

## 📖 Further Documentation

- [Architecture Guide](docs/architecture.md)
- [Development Guide](docs/development.md)
- [Database Migrations](supabase/README.md)
