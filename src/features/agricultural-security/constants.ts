import {
  SecurityIncidentType,
  SecurityIncidentSeverity,
  SecurityVerificationStatus,
  SecuritySourceType,
  SecurityLocationScope,
} from "./types";

export const SECURITY_DISCLAIMER_TEXT =
  "Security information can change quickly. This information is provided for awareness and agricultural planning and does not guarantee the safety of any person, route or location. Follow current guidance from relevant authorities and professional security/emergency services.";

export const SECURITY_EMPTY_STATE_MESSAGE =
  "No verified agricultural security incidents are currently published for this area.";

export const INCIDENT_TYPE_LABELS: Record<SecurityIncidentType, string> = {
  FARM_ATTACK: "Farm Attack",
  KIDNAPPING_SECURITY_THREAT: "Kidnapping / Security Threat",
  FARM_ACCESS_DISRUPTION: "Farm Access Disruption",
  LOGISTICS_CORRIDOR_INCIDENT: "Logistics Corridor Incident",
  THEFT_OR_ROBBERY: "Produce / Asset Theft or Robbery",
  MOVEMENT_RESTRICTION: "Movement Restriction / Curfew",
  AGRICULTURAL_MARKET_DISRUPTION: "Agricultural Market Disruption",
  OTHER_AGRICULTURAL_SECURITY_EVENT: "Other Agricultural Security Event",
};

export const INCIDENT_TYPE_DESCRIPTIONS: Record<SecurityIncidentType, string> = {
  FARM_ATTACK: "Reported direct armed or violent incident affecting farming settlements, fields, or agricultural workers.",
  KIDNAPPING_SECURITY_THREAT: "Reported abduction, extortion, or acute security hazard restricting grower movements or cultivation.",
  FARM_ACCESS_DISRUPTION: "Physical impediment, insecurity, or hostility preventing farm owners or laborers from tending fields.",
  LOGISTICS_CORRIDOR_INCIDENT: "Disruption, roadblock, ambush, or transit safety event along primary inter-state agricultural freight routes.",
  THEFT_OR_ROBBERY: "Large-scale harvest pilfering, warehouse break-in, cattle rustling, or armed transit robbery of farm inputs.",
  MOVEMENT_RESTRICTION: "Imposed curfew, military/police checkpoint closure, or administrative transport halt impeding produce movement.",
  AGRICULTURAL_MARKET_DISRUPTION: "Security-induced closure, relocation, or panic shutdown of a major rural aggregation or grain market.",
  OTHER_AGRICULTURAL_SECURITY_EVENT: "Localized agricultural safety or environmental-conflict incident not categorized elsewhere.",
};

export const SEVERITY_LABELS: Record<SecurityIncidentSeverity, string> = {
  LOW: "Low",
  MODERATE: "Moderate",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const SEVERITY_COLORS: Record<
  SecurityIncidentSeverity,
  { bg: string; text: string; border: string; badge: string }
> = {
  LOW: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800 border-blue-300",
  },
  MODERATE: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
  },
  HIGH: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-800 border-orange-300",
  },
  CRITICAL: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    badge: "bg-red-100 text-red-800 border-red-300",
  },
};

export const VERIFICATION_STATUS_LABELS: Record<SecurityVerificationStatus, string> = {
  UNVERIFIED: "Unverified Report",
  REPORTED: "Under Editorial Review",
  VERIFIED: "Verified Incident",
  OFFICIAL: "Official Security Bulletin",
  CORRECTED: "Corrected Record",
  ARCHIVED: "Archived Record",
};

export const VERIFICATION_STATUS_COLORS: Record<
  SecurityVerificationStatus,
  { bg: string; text: string; border: string }
> = {
  UNVERIFIED: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" },
  REPORTED: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  VERIFIED: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  OFFICIAL: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  CORRECTED: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  ARCHIVED: { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-300" },
};

export const SOURCE_TYPE_LABELS: Record<SecuritySourceType, string> = {
  OFFICIAL: "Government / Security Agency",
  NEWS: "Accredited News Media",
  PARTNER: "Logistics / Field Partner",
  EXPERT: "Security & Agricultural Analyst",
  COMMUNITY_REPORT: "Farmers Cooperative / Community",
  OTHER: "Documented Third-Party Source",
};

export const LOCATION_SCOPE_LABELS: Record<SecurityLocationScope, string> = {
  STATE: "State-Wide Scope",
  LGA: "Local Government Area",
  REGION_CORRIDOR: "Interstate Transit Corridor",
  GENERAL_AREA: "General Agricultural District",
};

export const ANTI_PORK_ERROR_MESSAGE =
  "AgroMarket strictly disallows pig/pork content across all agricultural security records, incident notes, and food-security impacts.";
