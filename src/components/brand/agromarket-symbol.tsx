import React from "react";

export type SymbolSize = "xs" | "sm" | "md" | "lg" | "xl" | number;
export type SymbolVariant = "color" | "monochrome" | "white" | "inverted";

export interface AgroMarketSymbolProps extends React.SVGAttributes<SVGSVGElement> {
  /** Size token or numeric pixel dimension */
  size?: SymbolSize;
  /** Visual color variant */
  variant?: SymbolVariant;
  /** Custom accessibility label */
  label?: string;
  className?: string;
}

const SIZE_MAP: Record<"xs" | "sm" | "md" | "lg" | "xl", number> = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

export function AgroMarketSymbol({
  size = "md",
  variant = "color",
  label = "AgroMarket Agro Network Symbol",
  className = "",
  ...rest
}: AgroMarketSymbolProps) {
  const dimension = typeof size === "number" ? size : SIZE_MAP[size] || 32;

  // Color schemes for paths and nodes
  const isMonochrome = variant === "monochrome";
  const isWhite = variant === "white";

  // Palette definitions
  const strokeOuter = isWhite ? "#FFFFFF" : isMonochrome ? "#111827" : "#0F4327";
  const strokeCross = isWhite ? "#FFFFFF" : isMonochrome ? "#111827" : "#C26732";
  const strokeStem = isWhite ? "#4ADE80" : isMonochrome ? "#111827" : "#16A34A";
  const strokeRoot = isWhite ? "#FFFFFF" : isMonochrome ? "#111827" : "#0F4327";

  const nodeBase = isWhite ? "#FFFFFF" : isMonochrome ? "#111827" : "#0F4327";
  const nodeCenterBase = isWhite ? "#4ADE80" : isMonochrome ? "#111827" : "#16A34A";
  const nodeMid = isWhite ? "#FFFFFF" : isMonochrome ? "#111827" : "#C26732";
  const nodeHub = isWhite ? "#FDE047" : isMonochrome ? "#111827" : "#E59500";
  const nodeApex = isWhite ? "#4ADE80" : isMonochrome ? "#111827" : "#16A34A";
  const nodeHole = isWhite ? "#0F4327" : isMonochrome ? "#FFFFFF" : "#FBF9F4";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={dimension}
      height={dimension}
      fill="none"
      role="img"
      aria-label={label}
      className={`shrink-0 transition-transform ${className}`}
      {...rest}
    >
      <title>{label}</title>

      {/* Network Pathways / Connecting Infrastructure */}
      <g strokeLinecap="round" strokeLinejoin="round">
        {/* Left Ascent Conduit */}
        <path d="M 22 82 L 28 50 L 50 18" stroke={strokeOuter} strokeWidth="7" />

        {/* Right Ascent Conduit */}
        <path d="M 78 82 L 72 50 L 50 18" stroke={strokeOuter} strokeWidth="7" />

        {/* Horizontal Trade & Logistics Crossbar */}
        <path
          d="M 28 50 L 72 50"
          stroke={strokeCross}
          strokeWidth="6.5"
          opacity={isWhite ? 0.85 : 1}
        />

        {/* Central Vertical Growth Stem */}
        <path d="M 50 76 L 50 18" stroke={strokeStem} strokeWidth="6" />

        {/* Base Interconnection Web */}
        <path
          d="M 22 82 L 50 76 L 78 82"
          stroke={strokeRoot}
          strokeWidth="5.5"
          opacity={isWhite ? 0.75 : 0.85}
        />
      </g>

      {/* Network Nodes */}
      {/* Base Left (Producers / Farmers) */}
      <circle cx="22" cy="82" r="7" fill={nodeBase} />
      <circle cx="22" cy="82" r="2.8" fill={nodeHole} />

      {/* Base Right (Buyers / Commerce) */}
      <circle cx="78" cy="82" r="7" fill={nodeBase} />
      <circle cx="78" cy="82" r="2.8" fill={nodeHole} />

      {/* Base Center (Aggregation Points) */}
      <circle cx="50" cy="76" r="6" fill={nodeCenterBase} />
      <circle cx="50" cy="76" r="2.4" fill={nodeHole} />

      {/* Mid Left (Processing & Value Chains) */}
      <circle cx="28" cy="50" r="6.5" fill={nodeMid} />
      <circle cx="28" cy="50" r="2.5" fill={nodeHole} />

      {/* Mid Right (Markets & Logistics) */}
      <circle cx="72" cy="50" r="6.5" fill={nodeMid} />
      <circle cx="72" cy="50" r="2.5" fill={nodeHole} />

      {/* Center Hub (Coordination & Intelligence) */}
      <circle cx="50" cy="50" r="6" fill={nodeHub} />
      <circle cx="50" cy="50" r="2.4" fill={nodeHole} />

      {/* Apex Node (Growth & Digital Infrastructure) */}
      <circle cx="50" cy="18" r="8" fill={nodeApex} />
      <circle cx="50" cy="18" r="3.2" fill={nodeHole} />
    </svg>
  );
}
