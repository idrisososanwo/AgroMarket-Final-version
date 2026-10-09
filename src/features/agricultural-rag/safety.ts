/**
 * AgroMarket Phase 3.15: Evidence-Grounded Agricultural Intelligence & RAG Domain Safety
 * Enforces safety boundaries across veterinary, biosecurity, financial, and agronomic domains.
 */

import { PROFESSIONAL_REVIEW_DISCLAIMER } from "./constants";

// -----------------------------------------------------------------------------
// 1. SAFETY REGEX PATTERNS
// -----------------------------------------------------------------------------

const VETERINARY_CLINICAL_REGEX =
  /\b(diagnos\w*|prescrib\w*|treatment|dosage|vaccin\w*|cull\w*|quarantine|lethal dose|inject\w*)\b/i;

// Disease outbreak / biosecurity inquiry patterns
const DISEASE_BIOSECURITY_TERMS =
  /\b(anthrax|avian flu|bird flu|contagious|foot and mouth|rinderpest|swine|pest outbreak|blight|fall armyworm|canker)\b/i;

// False yield / profit guarantee patterns
const PROFIT_GUARANTEE_REGEX =
  /\b(guaranteed (?:yield|profit|return|income|harvest)|100% risk[- ]free|foolproof profit)\b/i;

// Official government emergency claim patterns
const STATUTORY_DECLARATION_REGEX =
  /\b(official government declaration|national state of emergency declared by agromarket|statutory quarantine order)\b/i;

// -----------------------------------------------------------------------------
// 2. DOMAIN SAFETY EVALUATION
// -----------------------------------------------------------------------------

export interface DomainSafetyEvaluation {
  needsProfessionalReview: boolean;
  professionalReviewNotice?: string;
  sanitizedAnswer: string;
  safetyFlags: string[];
}

/**
 * Evaluates raw generated answer or user question against strict domain safety rules.
 * Automatically injects veterinary and extension officer disclaimers where clinical risk is present.
 */
export function evaluateDomainSafety(
  question: string,
  rawAnswerText: string
): DomainSafetyEvaluation {
  const safetyFlags: string[] = [];
  let needsProfessionalReview = false;
  let professionalReviewNotice: string | undefined;
  let sanitizedAnswer = rawAnswerText;

  // 1. Check for veterinary / disease diagnosis
  if (
    VETERINARY_CLINICAL_REGEX.test(question) ||
    VETERINARY_CLINICAL_REGEX.test(rawAnswerText) ||
    DISEASE_BIOSECURITY_TERMS.test(question)
  ) {
    needsProfessionalReview = true;
    professionalReviewNotice = PROFESSIONAL_REVIEW_DISCLAIMER;
    safetyFlags.push("VETERINARY_BIOSECURITY_INQUIRY");
  }

  // 2. Check for commercial profit or yield guarantees
  if (PROFIT_GUARANTEE_REGEX.test(sanitizedAnswer)) {
    sanitizedAnswer = sanitizedAnswer.replace(
      PROFIT_GUARANTEE_REGEX,
      "[Projected agronomic outcome subject to weather and market variability]"
    );
    safetyFlags.push("PROFIT_GUARANTEE_REDACTED");
  }

  // 3. Check for statutory government declarations
  if (STATUTORY_DECLARATION_REGEX.test(sanitizedAnswer)) {
    sanitizedAnswer = sanitizedAnswer.replace(
      STATUTORY_DECLARATION_REGEX,
      "[Advisory analytical indicator - consult Federal Ministry of Agriculture for statutory declarations]"
    );
    safetyFlags.push("STATUTORY_DECLARATION_REDACTED");
  }

  return {
    needsProfessionalReview,
    professionalReviewNotice,
    sanitizedAnswer,
    safetyFlags,
  };
}
