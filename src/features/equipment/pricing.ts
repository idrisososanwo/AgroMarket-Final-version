/**
 * AgroMarket Equipment Rental Pricing Utilities
 *
 * Server & client authoritative calculation of duration, rental sums, and escrow deposits.
 */

export interface RentalPricingCalculation {
  totalDays: number;
  totalRentalAmount: number;
  depositAmount: number;
  currency: string;
}

/**
 * Calculates rental duration and pricing.
 * total_days = (end_date - start_date) + 1
 * total_rental_amount = daily_rental_rate * total_days
 * deposit_amount = equipment.caution_deposit
 */
export function calculateRentalPricing(
  dailyRate: number,
  cautionDeposit: number,
  startDateStr: string,
  endDateStr: string
): RentalPricingCalculation {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  const utcStart = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const utcEnd = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());

  const diffDays = Math.round((utcEnd - utcStart) / (1000 * 60 * 60 * 24)) + 1;
  const totalDays = Math.max(1, diffDays);

  const totalRentalAmount = Number((dailyRate * totalDays).toFixed(2));
  const depositAmount = Number(cautionDeposit.toFixed(2));

  return {
    totalDays,
    totalRentalAmount,
    depositAmount,
    currency: "NGN",
  };
}
