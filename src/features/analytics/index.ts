/**
 * Analytics Domain Boundary
 * Market trade volumes, post-harvest loss tracking, price volatility index, and regional trade corridors.
 */
export interface PlatformMetricSummary {
  metric: string;
  value: number;
  period: string;
}
