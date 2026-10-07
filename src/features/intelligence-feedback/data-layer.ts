/**
 * AgroMarket Phase 3.4: Intelligence Feedback Loop Data Layer
 * Governed persistence, evidence provenance, evaluations, learning signals, and data quality issues.
 */

import { createClient } from "@/lib/supabase/server";
import {
  FeedbackOutcomeRecord,
  OutcomeEvidenceItem,
  FeedbackEvaluationItem,
  LearningSignalItem,
  DataQualityIssueItem,
  OutcomeType,
  OutcomeStatus,
  OutcomeEvidenceType,
  EvidenceSourceType,
  ProvenanceNature,
  EvaluationStatus,
  UsefulnessRating,
  TimelinessStatus,
  TimeHorizon,
  FeedbackDomain,
  LearningSignalType,
  DataQualityIssueType,
  DataQualitySeverity,
  DataQualityStatus,
} from "./types";
import {
  assertNoProhibitedProduce,
  assertNoPrivateInformation,
  recordFeedbackOutcomeSchema,
  recordOutcomeEvidenceSchema,
  recordFeedbackEvaluationSchema,
  recordLearningSignalSchema,
  recordDataQualityIssueSchema,
} from "./validation";
import { Json } from "@/types/database";

// In-memory fallback stores for test and offline environments
const inMemoryOutcomes: FeedbackOutcomeRecord[] = [];
const inMemoryEvidence: OutcomeEvidenceItem[] = [];
const inMemoryEvaluations: FeedbackEvaluationItem[] = [];
const inMemoryLearningSignals: LearningSignalItem[] = [];
const inMemoryDataQualityIssues: DataQualityIssueItem[] = [];

// -----------------------------------------------------------------------------
// 1. OUTCOME PERSISTENCE
// -----------------------------------------------------------------------------

export interface RecordFeedbackOutcomeParams {
  recommendationId: string;
  decisionId?: string | null;
  actionId?: string | null;
  actionIntegrationId?: string | null;
  outcomeType: OutcomeType;
  status?: OutcomeStatus;
  decision: string;
  actionTaken: string;
  actionTime?: string;
  observedOutcome: string;
  expectedOutcome: string;
  variance: string;
  evaluationScore: number;
  lessonsLearned: string;
  actorRole?: string | null;
  commodity?: string | null;
  state?: string | null;
  lga?: string | null;
  recordedBy?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordFeedbackOutcome(
  params: RecordFeedbackOutcomeParams
): Promise<FeedbackOutcomeRecord> {
  const validated = recordFeedbackOutcomeSchema.parse(params);
  assertNoProhibitedProduce(validated, "Recording Feedback Outcome");
  assertNoPrivateInformation(validated, "Recording Feedback Outcome");

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const record: FeedbackOutcomeRecord = {
    id,
    recommendationId: validated.recommendationId,
    decisionId: validated.decisionId || null,
    actionId: validated.actionId || null,
    actionIntegrationId: validated.actionIntegrationId || null,
    outcomeType: validated.outcomeType,
    status: validated.status,
    decision: validated.decision,
    actionTaken: validated.actionTaken,
    actionTime: validated.actionTime || now,
    observedOutcome: validated.observedOutcome,
    expectedOutcome: validated.expectedOutcome,
    variance: validated.variance,
    evaluationScore: validated.evaluationScore,
    lessonsLearned: validated.lessonsLearned,
    actorRole: validated.actorRole || null,
    commodity: validated.commodity || null,
    state: validated.state || null,
    lga: validated.lga || null,
    recordedBy: validated.recordedBy || null,
    metadata: validated.metadata || {},
    createdAt: now,
    updatedAt: now,
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_orchestration_outcomes")
      .insert({
        id: record.id,
        recommendation_id: record.recommendationId,
        decision_id: record.decisionId,
        action_id: record.actionId,
        action_integration_id: record.actionIntegrationId,
        outcome_type: record.outcomeType,
        status: record.status,
        decision: record.decision,
        action_taken: record.actionTaken,
        action_time: record.actionTime,
        observed_outcome: record.observedOutcome,
        expected_outcome: record.expectedOutcome,
        variance: record.variance,
        evaluation_score: record.evaluationScore,
        lessons_learned: record.lessonsLearned,
        actor_role: record.actorRole,
        commodity: record.commodity,
        state: record.state,
        lga: record.lga,
        recorded_by: record.recordedBy,
        metadata: record.metadata as unknown as Json,
      })
      .select()
      .single();

    if (error) {
      console.warn("DB insert error for outcome, using memory fallback:", error.message);
      inMemoryOutcomes.push(record);
      return record;
    }

    return {
      id: data.id,
      recommendationId: data.recommendation_id,
      decisionId: data.decision_id,
      actionId: data.action_id,
      actionIntegrationId: data.action_integration_id,
      outcomeType: (data.outcome_type as OutcomeType) || record.outcomeType,
      status: (data.status as OutcomeStatus) || record.status,
      decision: data.decision,
      actionTaken: data.action_taken,
      actionTime: data.action_time,
      observedOutcome: data.observed_outcome,
      expectedOutcome: data.expected_outcome,
      variance: data.variance,
      evaluationScore: Number(data.evaluation_score),
      lessonsLearned: data.lessons_learned,
      actorRole: data.actor_role,
      commodity: data.commodity,
      state: data.state,
      lga: data.lga,
      recordedBy: data.recorded_by,
      metadata: (data.metadata as Record<string, unknown>) || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.warn("Exception in recordFeedbackOutcome, using memory fallback:", err);
    inMemoryOutcomes.push(record);
    return record;
  }
}

// -----------------------------------------------------------------------------
// 2. OUTCOME EVIDENCE PERSISTENCE
// -----------------------------------------------------------------------------

export interface RecordOutcomeEvidenceParams {
  outcomeId: string;
  evidenceType: OutcomeEvidenceType;
  sourceType: EvidenceSourceType;
  sourceReference?: string | null;
  provenanceNature: ProvenanceNature;
  observedAt: string;
  confidence: number;
  description: string;
  quantitativeValue?: number | null;
  unit?: string | null;
  createdBy?: string | null;
}

export async function recordOutcomeEvidence(
  params: RecordOutcomeEvidenceParams
): Promise<OutcomeEvidenceItem> {
  const validated = recordOutcomeEvidenceSchema.parse(params);
  assertNoProhibitedProduce(validated, "Recording Outcome Evidence");
  assertNoPrivateInformation(validated, "Recording Outcome Evidence");

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const item: OutcomeEvidenceItem = {
    id,
    outcomeId: validated.outcomeId,
    evidenceType: validated.evidenceType,
    sourceType: validated.sourceType,
    sourceReference: validated.sourceReference || null,
    provenanceNature: validated.provenanceNature,
    observedAt: validated.observedAt,
    confidence: validated.confidence,
    description: validated.description,
    quantitativeValue: validated.quantitativeValue || null,
    unit: validated.unit || null,
    createdBy: validated.createdBy || null,
    createdAt: now,
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_outcome_evidence")
      .insert({
        id: item.id,
        outcome_id: item.outcomeId,
        evidence_type: item.evidenceType,
        source_type: item.sourceType,
        source_reference: item.sourceReference,
        provenance_nature: item.provenanceNature,
        observed_at: item.observedAt,
        confidence: item.confidence,
        description: item.description,
        quantitative_value: item.quantitativeValue,
        unit: item.unit,
        created_by: item.createdBy,
      })
      .select()
      .single();

    if (error) {
      console.warn("DB insert error for outcome evidence, using memory fallback:", error.message);
      inMemoryEvidence.push(item);
      return item;
    }

    return {
      id: data.id,
      outcomeId: data.outcome_id,
      evidenceType: data.evidence_type as OutcomeEvidenceType,
      sourceType: data.source_type as EvidenceSourceType,
      sourceReference: data.source_reference,
      provenanceNature: data.provenance_nature as ProvenanceNature,
      observedAt: data.observed_at,
      confidence: Number(data.confidence),
      description: data.description,
      quantitativeValue: data.quantitative_value ? Number(data.quantitative_value) : null,
      unit: data.unit,
      createdBy: data.created_by,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.warn("Exception in recordOutcomeEvidence, using memory fallback:", err);
    inMemoryEvidence.push(item);
    return item;
  }
}

// -----------------------------------------------------------------------------
// 3. FEEDBACK EVALUATIONS PERSISTENCE
// -----------------------------------------------------------------------------

export interface RecordFeedbackEvaluationParams {
  recommendationId: string;
  outcomeId?: string | null;
  agentId: string;
  domain: FeedbackDomain;
  evaluationStatus: EvaluationStatus;
  accuracyScore?: number | null;
  usefulnessRating: UsefulnessRating;
  timeliness: TimelinessStatus;
  timeHorizon: TimeHorizon;
  predictedState?: string | null;
  actualState?: string | null;
  varianceAnalysis?: string | null;
  evaluationNotes?: string | null;
  evaluatedBy?: string | null;
  evaluatedAt?: string;
}

export async function recordFeedbackEvaluation(
  params: RecordFeedbackEvaluationParams
): Promise<FeedbackEvaluationItem> {
  const validated = recordFeedbackEvaluationSchema.parse(params);
  assertNoProhibitedProduce(validated, "Recording Feedback Evaluation");
  assertNoPrivateInformation(validated, "Recording Feedback Evaluation");

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const item: FeedbackEvaluationItem = {
    id,
    recommendationId: validated.recommendationId,
    outcomeId: validated.outcomeId || null,
    agentId: validated.agentId,
    domain: validated.domain,
    evaluationStatus: validated.evaluationStatus,
    accuracyScore: validated.accuracyScore !== undefined ? validated.accuracyScore : null,
    usefulnessRating: validated.usefulnessRating,
    timeliness: validated.timeliness,
    timeHorizon: validated.timeHorizon,
    predictedState: validated.predictedState || null,
    actualState: validated.actualState || null,
    varianceAnalysis: validated.varianceAnalysis || null,
    evaluationNotes: validated.evaluationNotes || null,
    evaluatedBy: validated.evaluatedBy || null,
    evaluatedAt: validated.evaluatedAt || now,
    createdAt: now,
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_feedback_evaluations")
      .insert({
        id: item.id,
        recommendation_id: item.recommendationId,
        outcome_id: item.outcomeId,
        agent_id: item.agentId,
        domain: item.domain,
        evaluation_status: item.evaluationStatus,
        accuracy_score: item.accuracyScore,
        usefulness_rating: item.usefulnessRating,
        timeliness: item.timeliness,
        time_horizon: item.timeHorizon,
        predicted_state: item.predictedState,
        actual_state: item.actualState,
        variance_analysis: item.varianceAnalysis,
        evaluation_notes: item.evaluationNotes,
        evaluated_by: item.evaluatedBy,
        evaluated_at: item.evaluatedAt,
      })
      .select()
      .single();

    if (error) {
      console.warn("DB insert error for feedback evaluation, using memory fallback:", error.message);
      inMemoryEvaluations.push(item);
      return item;
    }

    return {
      id: data.id,
      recommendationId: data.recommendation_id,
      outcomeId: data.outcome_id,
      agentId: data.agent_id,
      domain: data.domain as FeedbackDomain,
      evaluationStatus: data.evaluation_status as EvaluationStatus,
      accuracyScore: data.accuracy_score !== null ? Number(data.accuracy_score) : null,
      usefulnessRating: data.usefulness_rating as UsefulnessRating,
      timeliness: data.timeliness as TimelinessStatus,
      timeHorizon: data.time_horizon as TimeHorizon,
      predictedState: data.predicted_state,
      actualState: data.actual_state,
      varianceAnalysis: data.variance_analysis,
      evaluationNotes: data.evaluation_notes,
      evaluatedBy: data.evaluated_by,
      evaluatedAt: data.evaluated_at,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.warn("Exception in recordFeedbackEvaluation, using memory fallback:", err);
    inMemoryEvaluations.push(item);
    return item;
  }
}

// -----------------------------------------------------------------------------
// 4. LEARNING SIGNALS PERSISTENCE
// -----------------------------------------------------------------------------

export interface RecordLearningSignalParams {
  evaluationId?: string | null;
  agentId: string;
  domain: FeedbackDomain;
  signalType: LearningSignalType;
  commodity?: string | null;
  state?: string | null;
  lga?: string | null;
  sampleSize: number;
  metricValue?: number | null;
  confidence: number;
  interpretation: string;
  metadata?: Record<string, unknown>;
  generatedAt?: string;
}

export async function recordLearningSignal(
  params: RecordLearningSignalParams
): Promise<LearningSignalItem> {
  const validated = recordLearningSignalSchema.parse(params);
  assertNoProhibitedProduce(validated, "Recording Learning Signal");

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const item: LearningSignalItem = {
    id,
    evaluationId: validated.evaluationId || null,
    agentId: validated.agentId,
    domain: validated.domain,
    signalType: validated.signalType,
    commodity: validated.commodity || null,
    state: validated.state || null,
    lga: validated.lga || null,
    sampleSize: validated.sampleSize,
    metricValue: validated.metricValue !== undefined ? validated.metricValue : null,
    confidence: validated.confidence,
    interpretation: validated.interpretation,
    metadata: validated.metadata || {},
    generatedAt: validated.generatedAt || now,
    createdAt: now,
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_learning_signals")
      .insert({
        id: item.id,
        evaluation_id: item.evaluationId,
        agent_id: item.agentId,
        domain: item.domain,
        signal_type: item.signalType,
        commodity: item.commodity,
        state: item.state,
        lga: item.lga,
        sample_size: item.sampleSize,
        metric_value: item.metricValue,
        confidence: item.confidence,
        interpretation: item.interpretation,
        metadata: item.metadata as unknown as Json,
        generated_at: item.generatedAt,
      })
      .select()
      .single();

    if (error) {
      console.warn("DB insert error for learning signal, using memory fallback:", error.message);
      inMemoryLearningSignals.push(item);
      return item;
    }

    return {
      id: data.id,
      evaluationId: data.evaluation_id,
      agentId: data.agent_id,
      domain: data.domain as FeedbackDomain,
      signalType: data.signal_type as LearningSignalType,
      commodity: data.commodity,
      state: data.state,
      lga: data.lga,
      sampleSize: data.sample_size,
      metricValue: data.metric_value !== null ? Number(data.metric_value) : null,
      confidence: Number(data.confidence),
      interpretation: data.interpretation,
      metadata: (data.metadata as Record<string, unknown>) || {},
      generatedAt: data.generated_at,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.warn("Exception in recordLearningSignal, using memory fallback:", err);
    inMemoryLearningSignals.push(item);
    return item;
  }
}

// -----------------------------------------------------------------------------
// 5. DATA QUALITY ISSUES PERSISTENCE
// -----------------------------------------------------------------------------

export interface RecordDataQualityIssueParams {
  issueType: DataQualityIssueType;
  severity: DataQualitySeverity;
  domain: FeedbackDomain;
  commodity?: string | null;
  state?: string | null;
  lga?: string | null;
  affectedEntityType: string;
  affectedEntityId?: string | null;
  description: string;
  evidenceDetails?: Record<string, unknown>;
  status?: DataQualityStatus;
  resolutionNotes?: string | null;
  reportedBy?: string | null;
}

export async function recordDataQualityIssue(
  params: RecordDataQualityIssueParams
): Promise<DataQualityIssueItem> {
  const validated = recordDataQualityIssueSchema.parse(params);
  assertNoProhibitedProduce(validated, "Recording Data Quality Issue");

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const item: DataQualityIssueItem = {
    id,
    issueType: validated.issueType,
    severity: validated.severity,
    domain: validated.domain,
    commodity: validated.commodity || null,
    state: validated.state || null,
    lga: validated.lga || null,
    affectedEntityType: validated.affectedEntityType,
    affectedEntityId: validated.affectedEntityId || null,
    description: validated.description,
    evidenceDetails: validated.evidenceDetails || {},
    status: validated.status,
    resolutionNotes: validated.resolutionNotes || null,
    reportedBy: validated.reportedBy || null,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_data_quality_issues")
      .insert({
        id: item.id,
        issue_type: item.issueType,
        severity: item.severity,
        domain: item.domain,
        commodity: item.commodity,
        state: item.state,
        lga: item.lga,
        affected_entity_type: item.affectedEntityType,
        affected_entity_id: item.affectedEntityId,
        description: item.description,
        evidence_details: item.evidenceDetails as unknown as Json,
        status: item.status,
        resolution_notes: item.resolutionNotes,
        reported_by: item.reportedBy,
      })
      .select()
      .single();

    if (error) {
      console.warn("DB insert error for data quality issue, using memory fallback:", error.message);
      inMemoryDataQualityIssues.push(item);
      return item;
    }

    return {
      id: data.id,
      issueType: data.issue_type as DataQualityIssueType,
      severity: data.severity as DataQualitySeverity,
      domain: data.domain as FeedbackDomain,
      commodity: data.commodity,
      state: data.state,
      lga: data.lga,
      affectedEntityType: data.affected_entity_type,
      affectedEntityId: data.affected_entity_id,
      description: data.description,
      evidenceDetails: (data.evidence_details as Record<string, unknown>) || {},
      status: data.status as DataQualityStatus,
      resolutionNotes: data.resolution_notes,
      reportedBy: data.reported_by,
      resolvedBy: data.resolved_by,
      resolvedAt: data.resolved_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.warn("Exception in recordDataQualityIssue, using memory fallback:", err);
    inMemoryDataQualityIssues.push(item);
    return item;
  }
}

// -----------------------------------------------------------------------------
// 6. QUERIES & RETRIEVAL HELPERS
// -----------------------------------------------------------------------------

export async function getFeedbackEvaluationsForAgent(
  agentId: string
): Promise<FeedbackEvaluationItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_feedback_evaluations")
      .select("*")
      .eq("agent_id", agentId)
      .order("evaluated_at", { ascending: false })
      .limit(200);

    if (error || !data || data.length === 0) {
      return inMemoryEvaluations.filter((e) => e.agentId === agentId);
    }

    return data.map((d) => ({
      id: d.id,
      recommendationId: d.recommendation_id,
      outcomeId: d.outcome_id,
      agentId: d.agent_id,
      domain: d.domain as FeedbackDomain,
      evaluationStatus: d.evaluation_status as EvaluationStatus,
      accuracyScore: d.accuracy_score !== null ? Number(d.accuracy_score) : null,
      usefulnessRating: d.usefulness_rating as UsefulnessRating,
      timeliness: d.timeliness as TimelinessStatus,
      timeHorizon: d.time_horizon as TimeHorizon,
      predictedState: d.predicted_state,
      actualState: d.actual_state,
      varianceAnalysis: d.variance_analysis,
      evaluationNotes: d.evaluation_notes,
      evaluatedBy: d.evaluated_by,
      evaluatedAt: d.evaluated_at,
      createdAt: d.created_at,
    }));
  } catch {
    return inMemoryEvaluations.filter((e) => e.agentId === agentId);
  }
}

export async function getDataQualityIssues(
  status?: DataQualityStatus
): Promise<DataQualityIssueItem[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("agricultural_data_quality_issues").select("*");
    if (status) {
      query = query.eq("status", status);
    }
    const { data, error } = await query.order("created_at", { ascending: false }).limit(200);

    if (error || !data || data.length === 0) {
      return status ? inMemoryDataQualityIssues.filter((i) => i.status === status) : inMemoryDataQualityIssues;
    }

    return data.map((d) => ({
      id: d.id,
      issueType: d.issue_type as DataQualityIssueType,
      severity: d.severity as DataQualitySeverity,
      domain: d.domain as FeedbackDomain,
      commodity: d.commodity,
      state: d.state,
      lga: d.lga,
      affectedEntityType: d.affected_entity_type,
      affectedEntityId: d.affected_entity_id,
      description: d.description,
      evidenceDetails: (d.evidence_details as Record<string, unknown>) || {},
      status: d.status as DataQualityStatus,
      resolutionNotes: d.resolution_notes,
      reportedBy: d.reported_by,
      resolvedBy: d.resolved_by,
      resolvedAt: d.resolved_at,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
  } catch {
    return status ? inMemoryDataQualityIssues.filter((i) => i.status === status) : inMemoryDataQualityIssues;
  }
}
