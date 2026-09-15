/**
 * Marketplace Constants & Formatting Utilities
 */

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
] as const;

export const PRODUCE_UNITS = [
  "100kg Bag",
  "50kg Bag",
  "25kg Bag",
  "Kilogram (kg)",
  "Tonne (MT)",
  "Basket",
  "Crate",
  "Bunch",
  "Piece / Head",
  "Carton",
  "Gallon (25L)",
  "Litre",
  "Live Animal / Head",
] as const;

/**
 * Format a number into standard Nigerian Naira (NGN) currency string.
 * Example: formatNGN(45000) -> "₦45,000"
 */
export function formatNGN(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}
