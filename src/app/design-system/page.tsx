"use client";

import * as React from "react";
import {
  AgroMarketLogo,
  AgroMarketSymbol,
  AGROMARKET_BRAND_SLOGAN,
} from "@/components/brand";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  DomainStatusBadge,
  Input,
  SearchInput,
  Select,
  Textarea,
  Checkbox,
  Switch,
  FormField,
  MetricCard,
  ProgressBar,
  ConfidenceIndicator,
  ScoreIndicator,
  EmptyState,
  LoadingSpinner,
  Skeleton,
  IntelligenceCard,
  RecommendationCard,
  Breadcrumbs,
  Tabs,
} from "@/components/ui";
import {
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function DesignSystemShowcasePage() {
  const [activeTab, setActiveTab] = React.useState("brand");
  const [activePillTab, setActivePillTab] = React.useState("overview");
  const [switchState, setSwitchState] = React.useState(true);
  const [checkboxState, setCheckboxState] = React.useState(true);
  const [loadingButton, setLoadingButton] = React.useState(false);

  const TABS = [
    { id: "brand", label: "Brand & Colors" },
    { id: "typography", label: "Typography" },
    { id: "buttons", label: "Buttons" },
    { id: "badges", label: "Badges & Statuses" },
    { id: "cards", label: "Cards & Surfaces" },
    { id: "forms", label: "Form Controls" },
    { id: "data", label: "Data Display & Metrics" },
    { id: "intelligence", label: "Intelligence Language" },
    { id: "navigation", label: "Navigation" },
  ];

  return (
    <div className="min-h-screen bg-[#FBF9F4] text-[#1A231E]">
      {/* Design System Header */}
      <header className="border-b border-[#E5E0D5] bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <AgroMarketLogo size="md" href="/" />
            <span className="hidden sm:inline-block h-6 w-px bg-neutral-200" />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F0FDF4] text-[#0F4327] border border-[#BBF7D0] text-xs font-bold uppercase tracking-wider">
              Design System Showcase v1.0
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoadingButton(true);
                setTimeout(() => setLoadingButton(false), 1200);
              }}
              isLoading={loadingButton}
            >
              Test Loading State
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Top of Spec
            </Button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-12">
        {/* ================================================================= */}
        {/* 1. BRAND & COLORS */}
        {/* ================================================================= */}
        {activeTab === "brand" && (
          <section className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#0F4327]">
                1. AgroMarket Brand Foundation
              </h2>
              <p className="text-sm text-neutral-600 mt-1 max-w-2xl">
                Official Agro Network visual direction combining agriculture, technology, commerce, and intelligence.
              </p>
              <blockquote className="mt-3 p-3 bg-white border-l-4 border-[#0F4327] rounded-r text-xs italic text-neutral-700">
                &ldquo;{AGROMARKET_BRAND_SLOGAN}&rdquo;
              </blockquote>
            </div>

            {/* Logo Variations */}
            <Card>
              <CardHeader>
                <CardTitle>Logo System Variants</CardTitle>
                <CardDescription>
                  Vector lockups and symbol tokens for responsive applications.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-6 bg-white border border-[#E5E0D5] rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                  <span className="text-xs font-semibold text-neutral-500 uppercase">Horizontal Primary</span>
                  <AgroMarketLogo layout="horizontal" size="md" showTagline />
                </div>
                <div className="p-6 bg-white border border-[#E5E0D5] rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                  <span className="text-xs font-semibold text-neutral-500 uppercase">Stacked Large</span>
                  <AgroMarketLogo layout="stacked" size="lg" showTagline />
                </div>
                <div className="p-6 bg-[#0F4327] rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                  <span className="text-xs font-semibold text-emerald-200 uppercase">White / Dark Surface</span>
                  <AgroMarketLogo layout="horizontal" variant="white" size="md" showTagline />
                </div>
                <div className="p-6 bg-white border border-[#E5E0D5] rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                  <span className="text-xs font-semibold text-neutral-500 uppercase">Monochrome</span>
                  <AgroMarketLogo layout="horizontal" variant="monochrome" size="md" />
                </div>
                <div className="p-6 bg-white border border-[#E5E0D5] rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                  <span className="text-xs font-semibold text-neutral-500 uppercase">Symbol Sizes</span>
                  <div className="flex items-center gap-3">
                    <AgroMarketSymbol size="xs" />
                    <AgroMarketSymbol size="sm" />
                    <AgroMarketSymbol size="md" />
                    <AgroMarketSymbol size="lg" />
                  </div>
                </div>
                <div className="p-6 bg-[#0F4327] rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                  <span className="text-xs font-semibold text-emerald-200 uppercase">Symbol Reverse</span>
                  <div className="flex items-center gap-3">
                    <AgroMarketSymbol size="sm" variant="white" />
                    <AgroMarketSymbol size="md" variant="white" />
                    <AgroMarketSymbol size="lg" variant="white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Color Palette Tokens */}
            <Card>
              <CardHeader>
                <CardTitle>Design Token Swatches</CardTitle>
                <CardDescription>
                  Authentic agricultural color palette grounded in Nigerian soil and digital network infrastructure.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                <div className="space-y-1.5">
                  <div className="h-16 rounded-lg bg-[#0F4327] shadow-inner" />
                  <p className="text-xs font-bold">Deep Green (Primary)</p>
                  <p className="text-[11px] font-mono text-neutral-500">#0F4327</p>
                </div>
                <div className="space-y-1.5">
                  <div className="h-16 rounded-lg bg-[#16A34A] shadow-inner" />
                  <p className="text-xs font-bold">Growth Green</p>
                  <p className="text-[11px] font-mono text-neutral-500">#16A34A</p>
                </div>
                <div className="space-y-1.5">
                  <div className="h-16 rounded-lg bg-[#C26732] shadow-inner" />
                  <p className="text-xs font-bold">Warm Earth Clay</p>
                  <p className="text-[11px] font-mono text-neutral-500">#C26732</p>
                </div>
                <div className="space-y-1.5">
                  <div className="h-16 rounded-lg bg-[#E59500] shadow-inner" />
                  <p className="text-xs font-bold">Amber Gold</p>
                  <p className="text-[11px] font-mono text-neutral-500">#E59500</p>
                </div>
                <div className="space-y-1.5">
                  <div className="h-16 rounded-lg bg-[#FBF9F4] border border-[#E5E0D5] shadow-inner" />
                  <p className="text-xs font-bold">Organic Cream</p>
                  <p className="text-[11px] font-mono text-neutral-500">#FBF9F4</p>
                </div>
                <div className="space-y-1.5">
                  <div className="h-16 rounded-lg bg-[#1A231E] shadow-inner" />
                  <p className="text-xs font-bold">Deep Charcoal</p>
                  <p className="text-[11px] font-mono text-neutral-500">#1A231E</p>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ================================================================= */}
        {/* 2. TYPOGRAPHY */}
        {/* ================================================================= */}
        {activeTab === "typography" && (
          <section className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#0F4327]">
                2. Typography System
              </h2>
              <p className="text-sm text-neutral-600 mt-1">
                Engineered for both high-impact marketing surfaces and data-dense agricultural dashboards.
              </p>
            </div>

            <Card>
              <CardContent className="p-6 space-y-6 divide-y divide-[#F0ECE3]">
                <div className="pt-2">
                  <span className="text-xs font-mono text-neutral-400">Display (48px / 3rem, black)</span>
                  <p className="text-4xl md:text-5xl font-black tracking-tight text-[#0F4327] mt-1">
                    Agricultural Network
                  </p>
                </div>
                <div className="pt-4">
                  <span className="text-xs font-mono text-neutral-400">H1 (36px / 2.25rem, extrabold)</span>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1A231E] mt-1">
                    Coordinating Farm Production & Markets
                  </h1>
                </div>
                <div className="pt-4">
                  <span className="text-xs font-mono text-neutral-400">H2 (30px / 1.875rem, bold)</span>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1A231E] mt-1">
                    Commodity Price & Demand Intelligence
                  </h2>
                </div>
                <div className="pt-4">
                  <span className="text-xs font-mono text-neutral-400">H3 (24px / 1.5rem, bold)</span>
                  <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[#1A231E] mt-1">
                    Logistics Corridors & Supply Aggregation
                  </h3>
                </div>
                <div className="pt-4">
                  <span className="text-xs font-mono text-neutral-400">H4 (20px / 1.25rem, semibold)</span>
                  <h4 className="text-lg md:text-xl font-semibold tracking-tight text-[#1A231E] mt-1">
                    Verified Seller Listings & Quality Grading
                  </h4>
                </div>
                <div className="pt-4">
                  <span className="text-xs font-mono text-neutral-400">Body Large (18px, leading-relaxed)</span>
                  <p className="text-lg leading-relaxed text-neutral-700 mt-1">
                    AgroMarket is a Nigerian-first digital ecosystem connecting farmers, aggregators, processors, and buyers across all 36 states and the FCT.
                  </p>
                </div>
                <div className="pt-4">
                  <span className="text-xs font-mono text-neutral-400">Body Standard (16px, leading-normal)</span>
                  <p className="text-base text-neutral-600 mt-1">
                    Our platform integrates market intelligence, demand forecasting, logistics dispatch, and shared purchase aggregation into one transparent ecosystem.
                  </p>
                </div>
                <div className="pt-4">
                  <span className="text-xs font-mono text-neutral-400">Metric / Monospace (tabular-nums)</span>
                  <p className="text-3xl font-mono font-bold text-[#0F4327] mt-1">
                    ₦450,000 / Metric Ton <span className="text-sm font-sans font-normal text-neutral-500">(+12.4% MoM)</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ================================================================= */}
        {/* 3. BUTTONS */}
        {/* ================================================================= */}
        {activeTab === "buttons" && (
          <section className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#0F4327]">
                3. Button Components
              </h2>
              <p className="text-sm text-neutral-600 mt-1">
                Standardized variants, sizes, and states for all interactive actions.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Variants</CardTitle>
                <CardDescription>Purpose-driven styles for action hierarchy.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary Action</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="success">Success Action</Button>
                <Button variant="destructive">Destructive Action</Button>
                <Button variant="link">Link Style</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sizes</CardTitle>
                <CardDescription>Scale tokens from compact data tables to major hero CTAs.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button size="xs">Extra Small (xs)</Button>
                <Button size="sm">Small (sm)</Button>
                <Button size="md">Medium (md)</Button>
                <Button size="lg">Large (lg)</Button>
                <Button size="icon" aria-label="Icon action">
                  <Sparkles className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interactive States</CardTitle>
                <CardDescription>Disabled and animated loading states with spinner.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button disabled>Disabled Button</Button>
                <Button isLoading loadingText="Processing Transaction...">
                  Submit
                </Button>
                <Button variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  With Right Icon
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ================================================================= */}
        {/* 4. BADGES */}
        {/* ================================================================= */}
        {activeTab === "badges" && (
          <section className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#0F4327]">
                4. Badge & Status System
              </h2>
              <p className="text-sm text-neutral-600 mt-1">
                Semantic indicators and domain-aware platform statuses.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Semantic Badges</CardTitle>
                <CardDescription>General feedback states across modules.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Badge variant="primary" dot>Primary Network</Badge>
                <Badge variant="growth" dot>Growth Vitality</Badge>
                <Badge variant="clay" dot>Earth Clay</Badge>
                <Badge variant="amber" dot>Intelligence Amber</Badge>
                <Badge variant="success" dot>Success Verified</Badge>
                <Badge variant="warning" dot>Warning Review</Badge>
                <Badge variant="danger" dot>Critical Risk</Badge>
                <Badge variant="info" dot>System Info</Badge>
                <Badge variant="neutral">Neutral Tag</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Domain Status Badges</CardTitle>
                <CardDescription>
                  Pre-configured tokens for orders, shared purchases, logistics dispatch, and biosecurity.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <DomainStatusBadge status="VERIFIED" />
                <DomainStatusBadge status="PENDING" />
                <DomainStatusBadge status="ACTIVE" />
                <DomainStatusBadge status="COMPLETED" />
                <DomainStatusBadge status="PROCESSING" />
                <DomainStatusBadge status="DISRUPTED" />
                <DomainStatusBadge status="REVIEW_REQUIRED" />
                <DomainStatusBadge status="INSUFFICIENT_DATA" />
              </CardContent>
            </Card>
          </section>
        )}

        {/* ================================================================= */}
        {/* 5. CARDS & SURFACES */}
        {/* ================================================================= */}
        {activeTab === "cards" && (
          <section className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#0F4327]">
                5. Cards & Surface System
              </h2>
              <p className="text-sm text-neutral-600 mt-1">
                Grounded containers avoiding excessive glassmorphism or floating shadows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card variant="default">
                <CardHeader>
                  <CardTitle>Standard Card</CardTitle>
                  <CardDescription>Clean border and subtle resting shadow.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-neutral-600">
                    Used for content grouping, listing details, and standard dashboard panels.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="link" size="sm">Read documentation &rarr;</Button>
                </CardFooter>
              </Card>

              <Card variant="interactive">
                <CardHeader>
                  <CardTitle>Interactive Card</CardTitle>
                  <CardDescription>Hover elevation with green boundary emphasis.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-neutral-600">
                    Clickable marketplace listings, directory cards, and navigable modules.
                  </p>
                </CardContent>
                <CardFooter>
                  <Badge variant="growth">Clickable Item</Badge>
                </CardFooter>
              </Card>

              <Card variant="dark">
                <CardHeader>
                  <CardTitle>Dark Green Surface</CardTitle>
                  <CardDescription className="text-emerald-200">
                    Controlled dark container for command hero sections.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-200">
                    Deep Agricultural Green (#0F4327) background preserving strong white contrast.
                  </p>
                </CardContent>
                <CardFooter className="border-t border-[#14532D]">
                  <Button variant="secondary" size="sm">Explore Command</Button>
                </CardFooter>
              </Card>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* 6. FORM CONTROLS */}
        {/* ================================================================= */}
        {activeTab === "forms" && (
          <section className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#0F4327]">
                6. Form Controls
              </h2>
              <p className="text-sm text-neutral-600 mt-1">
                Consistent focus rings, borders, labels, and validation feedback states.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Inputs & Selection</CardTitle>
                <CardDescription>Standardized heights (h-10) and accessible focus management.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Produce Commodity" htmlFor="crop-name" required>
                  <Input id="crop-name" placeholder="e.g. Yellow Maize, Cassava Tubers" />
                </FormField>

                <FormField label="Search Marketplace" htmlFor="search-input">
                  <SearchInput id="search-input" placeholder="Search by state, LGA, or commodity..." />
                </FormField>

                <FormField label="Target State" htmlFor="state-select" helperText="Filter by Nigerian state corridor">
                  <Select id="state-select">
                    <option value="kano">Kano State</option>
                    <option value="oyo">Oyo State</option>
                    <option value="kaduna">Kaduna State</option>
                    <option value="lagos">Lagos State</option>
                  </Select>
                </FormField>

                <FormField label="Error Example" htmlFor="err-input" error="Minimum volume must be greater than 0 kg">
                  <Input id="err-input" defaultValue="-50" error />
                </FormField>

                <div className="md:col-span-2">
                  <FormField label="Logistics Specifications" htmlFor="logistics-notes">
                    <Textarea id="logistics-notes" placeholder="Describe truck requirement, refrigerated conditions, etc." />
                  </FormField>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-semibold uppercase text-neutral-500">Toggles & Checks</span>
                  <Checkbox
                    label="Enable Automated Matching"
                    description="AI supply matching agent will automatically pair verified sellers."
                    checked={checkboxState}
                    onChange={(e) => setCheckboxState(e.target.checked)}
                  />
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-semibold uppercase text-neutral-500">State Switches</span>
                  <Switch
                    label="Food Security Monitoring"
                    description="Receive alerts when regional reserves drop below 30 days."
                    checked={switchState}
                    onChange={setSwitchState}
                  />
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ================================================================= */}
        {/* 7. DATA DISPLAY */}
        {/* ================================================================= */}
        {activeTab === "data" && (
          <section className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#0F4327]">
                7. Data Display & Metrics
              </h2>
              <p className="text-sm text-neutral-600 mt-1">
                Visualizing agricultural volume, pricing trends, and ecosystem metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Maize Farm-Gate"
                value="₦320,000"
                unit="/ MT"
                trend={{ direction: "up", value: "+8.4%", label: "vs last week" }}
                description="Kano Hub"
              />
              <MetricCard
                label="Cassava Flour"
                value="₦195,000"
                unit="/ MT"
                trend={{ direction: "down", value: "-3.1%", label: "vs last week" }}
                description="Oyo Corridor"
              />
              <MetricCard
                label="Regional Supply Deficit"
                value="4,200"
                unit="Tons"
                trend={{ direction: "down", value: "-12%", label: "improving" }}
                description="North-Central Zone"
              />
              <MetricCard
                variant="dark"
                label="Resilience Score"
                value="88"
                unit="/ 100"
                trend={{ direction: "up", value: "Optimal", label: "State index" }}
                description="National food buffer"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Meters, Scores & Progress Indicators</CardTitle>
                <CardDescription>Quantified status indicators for agricultural intelligence.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#FBF9F4] rounded-lg border border-[#E5E0D5] space-y-2">
                    <span className="text-xs font-semibold text-neutral-500 uppercase">Confidence Tiers</span>
                    <div className="space-y-2">
                      <div><ConfidenceIndicator score={92} tier="HIGH" /></div>
                      <div><ConfidenceIndicator score={64} tier="MEDIUM" /></div>
                      <div><ConfidenceIndicator score={28} tier="LOW" /></div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#FBF9F4] rounded-lg border border-[#E5E0D5] space-y-2">
                    <span className="text-xs font-semibold text-neutral-500 uppercase">Score Indicators</span>
                    <div className="space-y-2">
                      <div><ScoreIndicator score={94} label="Supply Health" /></div>
                      <div><ScoreIndicator score={58} label="Price Volatility" /></div>
                      <div><ScoreIndicator score={32} label="Pest Risk" /></div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#FBF9F4] rounded-lg border border-[#E5E0D5] space-y-3">
                    <span className="text-xs font-semibold text-neutral-500 uppercase">Progress Meters</span>
                    <ProgressBar value={76} label="Aggregation Target" showLabel variant="growth" />
                    <ProgressBar value={45} label="Logistics In-Transit" showLabel variant="clay" />
                    <ProgressBar value={90} label="Payment Escrow" showLabel variant="primary" />
                  </div>
                </div>

                {/* Empty & Loading Feedback States */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#F0ECE3]">
                  <div>
                    <span className="text-xs font-semibold text-neutral-500 uppercase mb-2 block">
                      Empty State Component
                    </span>
                    <EmptyState
                      title="No Active Produce Requests"
                      description="Connect with regional aggregators or create an intelligence trigger to begin matching."
                      actionText="Post Supply Listing"
                      onAction={() => alert("Action triggered")}
                    />
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-neutral-500 uppercase mb-2 block">
                      Loading State Skeletons
                    </span>
                    <div className="p-6 bg-white border border-[#E5E0D5] rounded-xl space-y-3">
                      <LoadingSpinner size="md" label="Synchronizing National Agro Network..." />
                      <div className="space-y-2 pt-3">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ================================================================= */}
        {/* 8. INTELLIGENCE VISUAL LANGUAGE */}
        {/* ================================================================= */}
        {activeTab === "intelligence" && (
          <section className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#0F4327]">
                8. Intelligence Visual Language
              </h2>
              <p className="text-sm text-neutral-600 mt-1">
                Unified design language for multi-agent reasoning, predictions, risks, and actionable recommendations.
              </p>
            </div>

            <div className="space-y-6">
              {/* Recommendation Card */}
              <RecommendationCard
                title="Consolidate Kaduna-Kano Maize Aggregation"
                rationale="Market intelligence detects a 14% price surge across Southern off-takers over the next 14 days. Pre-booking 120 MT from verified Kaduna clusters will maximize farmer margins and secure buyer volume."
                expectedImpact="Est. +₦1,450,000 net margin for 18 smallholder farmer cooperatives."
                domain="Procurement & Demand"
                confidenceScore={88}
                actionText="Execute Aggregated Purchase"
                onExecute={() => alert("Executing recommendation...")}
              />

              {/* Intelligence Signal Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <IntelligenceCard
                  type="SIGNAL"
                  title="Cross-Border Fertilizer Inflow Spike"
                  summary="Import inspection posts at Seme report 28 truck arrivals of NPK 15-15-15. Downward price pressure anticipated in Ogun state."
                  domain="Market Intelligence"
                  confidence={{ score: 85, tier: "HIGH" }}
                  evidenceItems={[
                    "Authoritative border customs clearance receipts",
                    "State agro-dealer price report (-4% week-on-week)",
                  ]}
                  actionLabel="Inspect Market Trend"
                  onAction={() => alert("View signal")}
                />

                <IntelligenceCard
                  type="RISK"
                  title="Armyworm Vulnerability Warning"
                  summary="Biosecurity telemetry identifies humidity conditions in Niger state surpassing pest escalation thresholds."
                  domain="Disease & Biosecurity"
                  severity="HIGH"
                  confidence={{ score: 78, tier: "HIGH" }}
                  evidenceItems={[
                    "Satellite soil moisture anomaly (+18% normal)",
                    "3 extension agent scout reports filed in Kontagora LGA",
                  ]}
                  actionLabel="Initiate Containment Protocol"
                  onAction={() => alert("Mitigate risk")}
                />

                <IntelligenceCard
                  type="CONFLICT"
                  title="Storage Capacity vs Export Window"
                  summary="Production agent recommends immediate offloading while logistics agent forecasts port container congestion for 5 days."
                  domain="Orchestration"
                  confidence={{ score: 92, tier: "HIGH" }}
                  actionLabel="Resolve Strategy"
                  onAction={() => alert("Resolve conflict")}
                />

                <IntelligenceCard
                  type="OUTCOME"
                  title="Shared Purchase Aggregation Fulfilled"
                  summary="Shared batch completed 24 hours ahead of schedule with 100% verified farmer settlements processed."
                  domain="Action Integration"
                  confidence={{ score: 99, tier: "HIGH" }}
                  actionLabel="View Reconciliation"
                  onAction={() => alert("View reconciliation")}
                />
              </div>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* 9. NAVIGATION */}
        {/* ================================================================= */}
        {activeTab === "navigation" && (
          <section className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#0F4327]">
                9. Navigation & Global Shell
              </h2>
              <p className="text-sm text-neutral-600 mt-1">
                Responsive header, breadcrumb trails, and tab bars supporting intuitive exploration.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Breadcrumbs</CardTitle>
                <CardDescription>Hierarchical pathway across deep modules.</CardDescription>
              </CardHeader>
              <CardContent>
                <Breadcrumbs
                  items={[
                    { label: "Intelligence", href: "/my-intelligence" },
                    { label: "Production Planning", href: "/production-intelligence" },
                    { label: "Season Forecast 2026" },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pill Tab Navigation</CardTitle>
                <CardDescription>Compact filters and sub-view switchers.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs
                  variant="pills"
                  activeTab={activePillTab}
                  onTabChange={setActivePillTab}
                  tabs={[
                    { id: "overview", label: "Overview", badge: 12 },
                    { id: "producers", label: "Producers & Farmers", badge: 45 },
                    { id: "logistics", label: "Corridors", badge: 6 },
                    { id: "alerts", label: "Intelligence Alerts", badge: 3 },
                  ]}
                />
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}
