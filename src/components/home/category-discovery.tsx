import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface CategoryTile {
  name: string;
  slug: string;
  icon: string;
  description: string;
  accentBg: string;
}

const FEATURED_CATEGORIES: CategoryTile[] = [
  {
    name: "Grains & Cereals",
    slug: "grains-cereals",
    icon: "🌾",
    description: "Dry white maize, paddy rice, sorghum, millet & wheat",
    accentBg: "bg-amber-50 border-amber-200 text-amber-900",
  },
  {
    name: "Tubers & Roots",
    slug: "roots-tubers",
    icon: "🥔",
    description: "Benue yam tubers, cassava roots, ginger & sweet potato",
    accentBg: "bg-orange-50 border-orange-200 text-orange-900",
  },
  {
    name: "Vegetables & Herbs",
    slug: "vegetables",
    icon: "🥬",
    description: "Fresh tomatoes, habanero peppers, onions & leafy greens",
    accentBg: "bg-emerald-50 border-emerald-200 text-emerald-900",
  },
  {
    name: "Fruits",
    slug: "fruits",
    icon: "🍌",
    description: "Ripened plantains, oranges, watermelons & mangoes",
    accentBg: "bg-yellow-50 border-yellow-200 text-yellow-900",
  },
  {
    name: "Livestock & Poultry",
    slug: "livestock",
    icon: "🐄",
    description: "Healthy cattle, goats, sheep, broilers & farm egg crates",
    accentBg: "bg-stone-50 border-stone-200 text-stone-900",
  },
  {
    name: "Legumes & Pulses",
    slug: "legumes",
    icon: "🫘",
    description: "Soybean tonnage, brown cowpeas & shelled groundnuts",
    accentBg: "bg-lime-50 border-lime-200 text-lime-900",
  },
  {
    name: "Aquaculture & Fish",
    slug: "aquaculture",
    icon: "🐟",
    description: "Fresh farm catfish, dried smoked fish & fingerlings",
    accentBg: "bg-sky-50 border-sky-200 text-sky-900",
  },
  {
    name: "Cash Crops",
    slug: "cash-crops",
    icon: "🌴",
    description: "Raw cashew nuts, cocoa beans, palm oil & sesame seeds",
    accentBg: "bg-amber-50 border-amber-200 text-amber-900",
  },
];

export function CategoryDiscovery() {
  return (
    <section className="py-12 md:py-16 bg-[#FBF9F4] border-b border-[#E5E0D5]/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F4327]">
              Marketplace Taxonomy
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1A231E] tracking-tight mt-1">
              Explore Agricultural Categories
            </h2>
            <p className="text-sm text-neutral-600 mt-1 max-w-xl">
              Source canonical commodities and farm-fresh produce across Nigeria&apos;s leading agricultural sectors.
            </p>
          </div>

          <Link
            href="/marketplace"
            className="inline-flex items-center text-xs font-bold text-[#0F4327] hover:text-[#165a36] transition"
          >
            Browse all produce <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {FEATURED_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/marketplace?category=${cat.slug}`}
              className="group rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs transition hover:border-[#0F4327] hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl p-2 rounded-xl bg-neutral-50 group-hover:bg-emerald-50 transition">
                  {cat.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-[#1A231E] group-hover:text-[#0F4327] transition truncate">
                    {cat.name}
                  </h3>
                  <span className="text-[11px] text-neutral-500 font-medium">
                    Shop produce &rarr;
                  </span>
                </div>
              </div>
              <p className="mt-2.5 text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                {cat.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
