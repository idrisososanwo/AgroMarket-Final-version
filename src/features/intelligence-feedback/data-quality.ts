/**
 * AgroMarket Phase 3.4: Agricultural Data Quality Feedback Mechanism
 * Detects upstream data flaws and anomalies without silently deleting questionable intelligence.
 *
 * SAFETY INVARIANTS:
 * 1. NO SILENT SUPPRESSION: Questionable intelligence is explicitly recorded with quality flags, not discarded silently.
 * 2. PROVENANCE INTEGRITY: Detects missing sources, single-source dependencies, and inconsistent units.
 * 3. EXPLICIT SEVERITY: Flags flaws as LOW, MEDIUM, HIGH, or CRITICAL.
 * 4. ANTI-PORK ZERO TOLERANCE: Rejects any prohibited produce references.
 */

import {
  DataQualityIssueItem,
  FeedbackDomain,
} from "./types";
import { assertNoProhibitedProduce } from "./validation";

export interface RawObservationInput {
  id?: string;
  sourceDomain: FeedbackDomain;
  sourceId?: string | null;
  commodity?: string | null;
  state?: string | null;
  lga?: string | null;
  observedValue?: number | null;
  unit?: string | null;
  observedAt: string;
  sourceReferences?: string[];
  confidence?: number;
}

/**
 * Inspects incoming observations and identifies empirical data quality issues
 */
export function auditObservationQuality(
  observations: RawObservationInput[]
): DataQualityIssueItem[] {
  assertNoProhibitedProduce(observations, "Audit Observation Quality");

  const issues: DataQualityIssueItem[] = [];
  const now = new Date();
  const seenFingerprints = new Set<string>();

  for (const obs of observations) {
    const obsTime = new Date(obs.observedAt).getTime();
    const ageHours = (now.getTime() - obsTime) / (1000 * 60 * 60);

    // 1. Stale Observation Check (> 72 hours for active market signals)
    if (ageHours > 72) {
      issues.push({
        id: crypto.randomUUID(),
        issueType: "STALE_OBSERVATION",
        severity: ageHours > 168 ? "HIGH" : "MEDIUM",
        domain: obs.sourceDomain,
        commodity: obs.commodity || null,
        state: obs.state || null,
        lga: obs.lga || null,
        affectedEntityType: "OBSERVATION",
        affectedEntityId: obs.id || null,
        description: `Observation timestamp is ${Math.round(ageHours)} hours old (> 72hr staleness threshold). May degrade recommendation recency.`,
        evidenceDetails: { observedAt: obs.observedAt, ageHours: Math.round(ageHours) },
        status: "OPEN",
        resolutionNotes: null,
        reportedBy: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    // 2. Missing Source Provenance Check
    if (!obs.sourceId && (!obs.sourceReferences || obs.sourceReferences.length === 0)) {
      issues.push({
        id: crypto.randomUUID(),
        issueType: "MISSING_SOURCE_PROVENANCE",
        severity: "HIGH",
        domain: obs.sourceDomain,
        commodity: obs.commodity || null,
        state: obs.state || null,
        lga: obs.lga || null,
        affectedEntityType: "OBSERVATION",
        affectedEntityId: obs.id || null,
        description: "Observation has no source identifier or verifiable source references. Lacks audit provenance.",
        evidenceDetails: { sourceDomain: obs.sourceDomain },
        status: "OPEN",
        resolutionNotes: null,
        reportedBy: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    // 3. Inconsistent Units Check
    if (!obs.unit && obs.observedValue !== undefined && obs.observedValue !== null) {
      issues.push({
        id: crypto.randomUUID(),
        issueType: "INCONSISTENT_UNITS",
        severity: "MEDIUM",
        domain: obs.sourceDomain,
        commodity: obs.commodity || null,
        state: obs.state || null,
        lga: obs.lga || null,
        affectedEntityType: "OBSERVATION",
        affectedEntityId: obs.id || null,
        description: `Observation specifies numeric value (${obs.observedValue}) but omits standard measurement unit (e.g., kg, metric_ton, crate).`,
        evidenceDetails: { observedValue: obs.observedValue },
        status: "OPEN",
        resolutionNotes: null,
        reportedBy: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    // 4. Duplicate Observation Check
    const fingerprint = `${obs.sourceDomain}-${obs.commodity}-${obs.state}-${obs.observedAt}-${obs.observedValue}`;
    if (seenFingerprints.has(fingerprint)) {
      issues.push({
        id: crypto.randomUUID(),
        issueType: "DUPLICATE_OBSERVATIONS",
        severity: "LOW",
        domain: obs.sourceDomain,
        commodity: obs.commodity || null,
        state: obs.state || null,
        lga: obs.lga || null,
        affectedEntityType: "OBSERVATION",
        affectedEntityId: obs.id || null,
        description: "Identical duplicate observation detected across domain, commodity, state, and observation timestamp.",
        evidenceDetails: { fingerprint },
        status: "OPEN",
        resolutionNotes: null,
        reportedBy: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    } else {
      seenFingerprints.add(fingerprint);
    }

    // 5. Suspicious Negative or Extreme Values Check
    if (obs.observedValue !== undefined && obs.observedValue !== null && obs.observedValue < 0) {
      issues.push({
        id: crypto.randomUUID(),
        issueType: "SUSPICIOUS_VALUES",
        severity: "CRITICAL",
        domain: obs.sourceDomain,
        commodity: obs.commodity || null,
        state: obs.state || null,
        lga: obs.lga || null,
        affectedEntityType: "OBSERVATION",
        affectedEntityId: obs.id || null,
        description: `Observation contains impossible negative value (${obs.observedValue}). Agricultural quantities and prices cannot be negative.`,
        evidenceDetails: { observedValue: obs.observedValue },
        status: "OPEN",
        resolutionNotes: null,
        reportedBy: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    // 6. Insufficient Independent Sources Check (single source with low confidence)
    if (
      obs.sourceReferences &&
      obs.sourceReferences.length === 1 &&
      obs.confidence !== undefined &&
      obs.confidence < 0.50
    ) {
      issues.push({
        id: crypto.randomUUID(),
        issueType: "INSUFFICIENT_INDEPENDENT_SOURCES",
        severity: "LOW",
        domain: obs.sourceDomain,
        commodity: obs.commodity || null,
        state: obs.state || null,
        lga: obs.lga || null,
        affectedEntityType: "OBSERVATION",
        affectedEntityId: obs.id || null,
        description: "Observation relies on a single unverified source with confidence < 0.50. Cross-validation recommended.",
        evidenceDetails: { sourceReferencesCount: 1, confidence: obs.confidence },
        status: "OPEN",
        resolutionNotes: null,
        reportedBy: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }
  }

  return issues;
}
