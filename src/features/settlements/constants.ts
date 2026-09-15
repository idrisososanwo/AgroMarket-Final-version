/**
 * Settlement & Fulfilment Hold Configuration
 */

/**
 * Number of days after confirmed delivery during which buyers can open a dispute.
 * Settlement funds are held from seller eligibility until this window expires.
 */
export const DEFAULT_DISPUTE_WINDOW_DAYS = 7;

/**
 * Platform fee percentage applied to gross seller item volume.
 * Configured as 0% by default until commercial commission terms are formalized.
 */
export const DEFAULT_PLATFORM_FEE_PERCENT = 0;
