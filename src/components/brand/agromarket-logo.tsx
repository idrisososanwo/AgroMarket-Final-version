import React from "react";
import Link from "next/link";
import { AgroMarketSymbol, SymbolSize, SymbolVariant } from "./agromarket-symbol";

export type LogoLayout = "horizontal" | "stacked" | "symbol-only" | "compact";
export type LogoVariant = "default" | "monochrome" | "white";
export type LogoSize = "sm" | "md" | "lg" | "xl";

export interface AgroMarketLogoProps {
  /** Layout arrangement of symbol and wordmark */
  layout?: LogoLayout;
  /** Color theme variant */
  variant?: LogoVariant;
  /** Size token affecting symbol and typography scale */
  size?: LogoSize;
  /** Whether to render secondary descriptor tagline */
  showTagline?: boolean;
  /** Custom descriptor tagline text */
  taglineText?: string;
  /** If provided, renders an accessible Next.js Link */
  href?: string;
  className?: string;
}

const SYMBOL_SIZE_BY_LOGO_SIZE: Record<LogoSize, SymbolSize> = {
  sm: 24,
  md: 36,
  lg: 48,
  xl: 64,
};

const TEXT_SIZE_BY_LOGO_SIZE: Record<LogoSize, string> = {
  sm: "text-lg font-bold tracking-tight",
  md: "text-2xl font-extrabold tracking-tight",
  lg: "text-3xl font-extrabold tracking-tight",
  xl: "text-4xl font-black tracking-tight",
};

const TAGLINE_SIZE_BY_LOGO_SIZE: Record<LogoSize, string> = {
  sm: "text-[9px] tracking-widest",
  md: "text-[10px] tracking-widest",
  lg: "text-xs tracking-widest",
  xl: "text-sm tracking-widest",
};

export function AgroMarketLogo({
  layout = "horizontal",
  variant = "default",
  size = "md",
  showTagline = false,
  taglineText = "AGRICULTURAL NETWORK",
  href,
  className = "",
}: AgroMarketLogoProps) {
  const symbolVariant: SymbolVariant =
    variant === "white" ? "white" : variant === "monochrome" ? "monochrome" : "color";

  const symbolDimension = SYMBOL_SIZE_BY_LOGO_SIZE[size];
  const textSizeClass = TEXT_SIZE_BY_LOGO_SIZE[size];
  const taglineSizeClass = TAGLINE_SIZE_BY_LOGO_SIZE[size];

  // Text color mapping
  const agroTextColor =
    variant === "white"
      ? "text-white"
      : variant === "monochrome"
        ? "text-slate-900"
        : "text-[#0F4327]";

  const marketTextColor =
    variant === "white"
      ? "text-emerald-300"
      : variant === "monochrome"
        ? "text-slate-900"
        : "text-[#16A34A]";

  const taglineTextColor =
    variant === "white"
      ? "text-slate-200/80"
      : variant === "monochrome"
        ? "text-slate-600"
        : "text-slate-500";

  // Symbol only layout
  if (layout === "symbol-only") {
    const symbolEl = (
      <AgroMarketSymbol
        size={symbolDimension}
        variant={symbolVariant}
        label="AgroMarket"
        className={className}
      />
    );
    return href ? (
      <Link href={href} className="inline-flex items-center focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-md">
        {symbolEl}
      </Link>
    ) : (
      symbolEl
    );
  }

  // Wordmark content
  const wordmark = (
    <div className={`flex flex-col leading-none ${layout === "stacked" ? "items-center text-center mt-2" : "justify-center"}`}>
      <span className={`inline-flex items-baseline font-sans ${textSizeClass} select-none`}>
        <span className={agroTextColor}>Agro</span>
        <span className={marketTextColor}>Market</span>
      </span>
      {showTagline && (
        <span
          className={`font-semibold uppercase select-none mt-1 ${taglineSizeClass} ${taglineTextColor}`}
        >
          {taglineText}
        </span>
      )}
    </div>
  );

  const containerClasses = [
    "inline-flex items-center transition-opacity hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-md",
    layout === "stacked" ? "flex-col text-center" : "gap-3",
    layout === "compact" ? "gap-2" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <AgroMarketSymbol
        size={symbolDimension}
        variant={symbolVariant}
        label="AgroMarket Agro Network Symbol"
      />
      {wordmark}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={containerClasses} aria-label="AgroMarket Home">
        {content}
      </Link>
    );
  }

  return (
    <div className={containerClasses} role="banner" aria-label="AgroMarket Brand">
      {content}
    </div>
  );
}
