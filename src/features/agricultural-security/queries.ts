import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import {
  SecurityIncident,
  SecurityIncidentFilterParams,
  PaginatedSecurityIncidentsResult,
  SafeSecurityReporterProfile,
  LogisticsCorridorAdvisory,
  SecurityIncidentSeverity,
} from "./types";

interface RawSecurityIncidentRow {
  id: string;
  title: string;
  slug: string;
  incident_type: string;
  status: string;
  severity: string;
  description: string;
  occurred_at: string | null;
  reported_at: string;
  published_at: string | null;
  source_name: string;
  source_type: string;
  source_url: string | null;
  source_publication_date: string | null;
  verification_status: string;
  state: string;
  lga: string | null;
  location_scope: string;
  affected_commodities: string[];
  affected_categories: string[];
  movement_impact: string | null;
  food_security_impact: string | null;
  editorial_notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface RawReporterProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  state: string | null;
}

/**
 * Maps raw database row to strongly-typed SecurityIncident domain model.
 */
export function mapSecurityIncidentRow(
  row: RawSecurityIncidentRow,
  creator?: SafeSecurityReporterProfile | null
): SecurityIncident {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    incidentType: row.incident_type as SecurityIncident["incidentType"],
    status: row.status as SecurityIncident["status"],
    severity: row.severity as SecurityIncident["severity"],
    description: row.description,
    occurredAt: row.occurred_at ?? null,
    reportedAt: row.reported_at,
    publishedAt: row.published_at ?? null,
    sourceName: row.source_name,
    sourceType: row.source_type as SecurityIncident["sourceType"],
    sourceUrl: row.source_url ?? null,
    sourcePublicationDate: row.source_publication_date ?? null,
    verificationStatus: row.verification_status as SecurityIncident["verificationStatus"],
    state: row.state,
    lga: row.lga ?? null,
    locationScope: row.location_scope as SecurityIncident["locationScope"],
    affectedCommodities: Array.isArray(row.affected_commodities) ? row.affected_commodities : [],
    affectedCategories: Array.isArray(row.affected_categories) ? row.affected_categories : [],
    movementImpact: row.movement_impact ?? null,
    foodSecurityImpact: row.food_security_impact ?? null,
    editorialNotes: row.editorial_notes ?? null,
    createdBy: row.created_by ?? null,
    creator: creator ?? null,
    updatedBy: row.updated_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? null,
  };
}

/**
 * Retrieves paginated list of published security incidents for public discovery.
 */
export async function getPublishedSecurityIncidents(
  params: SecurityIncidentFilterParams = {}
): Promise<PaginatedSecurityIncidentsResult> {
  const supabase = await createClient();
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 12));
  const offset = (page - 1) * limit;

  let query = supabase
    .from("agricultural_security_incidents")
    .select("*", { count: "exact" })
    .eq("status", "PUBLISHED");

  if (params.incidentType && params.incidentType !== "all") {
    query = query.eq("incident_type", params.incidentType);
  }

  if (params.severity && params.severity !== "all") {
    query = query.eq("severity", params.severity);
  }

  if (params.verificationStatus && params.verificationStatus !== "all") {
    query = query.eq("verification_status", params.verificationStatus);
  }

  if (params.state && params.state !== "all") {
    query = query.eq("state", params.state);
  }

  if (params.commodity && params.commodity !== "all") {
    query = query.contains("affected_commodities", [params.commodity]);
  }

  if (params.search && params.search.trim().length > 0) {
    const term = params.search.trim();
    query = query.or(
      `title.ilike.%${term}%,description.ilike.%${term}%,state.ilike.%${term}%,movement_impact.ilike.%${term}%`
    );
  }

  query = query
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("reported_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error querying published security incidents:", error.message);
    return {
      incidents: [],
      totalCount: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  const rawIncidents = (data || []) as RawSecurityIncidentRow[];
  const creatorIds = Array.from(
    new Set(rawIncidents.map((i) => i.created_by).filter((id): id is string => Boolean(id)))
  );

  let creatorsMap: Record<string, SafeSecurityReporterProfile> = {};
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("security_incident_reporters")
      .select("id, full_name, avatar_url, is_verified, state")
      .in("id", creatorIds);

    if (profiles) {
      creatorsMap = (profiles as RawReporterProfileRow[]).reduce<Record<string, SafeSecurityReporterProfile>>(
        (acc, p) => {
          acc[p.id] = {
            id: p.id,
            fullName: p.full_name,
            avatarUrl: p.avatar_url,
            isVerified: p.is_verified,
            state: p.state,
          };
          return acc;
        },
        {}
      );
    }
  }

  const incidents = rawIncidents.map((row) =>
    mapSecurityIncidentRow(row, row.created_by ? creatorsMap[row.created_by] : null)
  );

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    incidents,
    totalCount,
    page,
    limit,
    totalPages,
  };
}

/**
 * Retrieves a single security incident by its URL slug.
 */
export async function getSecurityIncidentBySlug(
  slug: string
): Promise<SecurityIncident | null> {
  const supabase = await createClient();
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser ? hasRole(currentUser.roles, "ADMIN") : false;

  let query = supabase
    .from("agricultural_security_incidents")
    .select("*")
    .eq("slug", slug);

  if (!isAdmin) {
    query = query.eq("status", "PUBLISHED");
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  const raw = data as RawSecurityIncidentRow;
  let creator: SafeSecurityReporterProfile | null = null;

  if (raw.created_by) {
    const { data: profile } = await supabase
      .from("security_incident_reporters")
      .select("id, full_name, avatar_url, is_verified, state")
      .eq("id", raw.created_by)
      .maybeSingle();

    if (profile) {
      const p = profile as RawReporterProfileRow;
      creator = {
        id: p.id,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        isVerified: p.is_verified,
        state: p.state,
      };
    }
  }

  return mapSecurityIncidentRow(raw, creator);
}

/**
 * Retrieves a security incident by ID for administrative editing.
 */
export async function getSecurityIncidentByIdForAdmin(
  id: string
): Promise<SecurityIncident | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agricultural_security_incidents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapSecurityIncidentRow(data as RawSecurityIncidentRow, null);
}

/**
 * Administrative query for listing incidents across all publication statuses.
 */
export async function getAdminSecurityIncidents(
  params: SecurityIncidentFilterParams = {}
): Promise<PaginatedSecurityIncidentsResult> {
  const supabase = await createClient();
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  let query = supabase
    .from("agricultural_security_incidents")
    .select("*", { count: "exact" });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.incidentType && params.incidentType !== "all") {
    query = query.eq("incident_type", params.incidentType);
  }

  if (params.severity && params.severity !== "all") {
    query = query.eq("severity", params.severity);
  }

  if (params.verificationStatus && params.verificationStatus !== "all") {
    query = query.eq("verification_status", params.verificationStatus);
  }

  if (params.state && params.state !== "all") {
    query = query.eq("state", params.state);
  }

  if (params.search && params.search.trim().length > 0) {
    const term = params.search.trim();
    query = query.or(
      `title.ilike.%${term}%,description.ilike.%${term}%,state.ilike.%${term}%,source_name.ilike.%${term}%`
    );
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("Admin query error for security incidents:", error.message);
    return {
      incidents: [],
      totalCount: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  const rawIncidents = (data || []) as RawSecurityIncidentRow[];
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    incidents: rawIncidents.map((r) => mapSecurityIncidentRow(r, null)),
    totalCount,
    page,
    limit,
    totalPages,
  };
}

/**
 * Logistics Corridor Advisory Query:
 * Checks whether given states (e.g. pickup, delivery, transit) have active published
 * security incidents or movement restrictions.
 */
export async function getActiveLogisticsCorridorAdvisories(
  states: string[]
): Promise<Record<string, LogisticsCorridorAdvisory>> {
  if (!states || states.length === 0) {
    return {};
  }

  const uniqueStates = Array.from(new Set(states.map((s) => s.trim()))).filter(Boolean);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agricultural_security_incidents")
    .select("title, slug, severity, incident_type, state, published_at")
    .eq("status", "PUBLISHED")
    .in("state", uniqueStates)
    .order("published_at", { ascending: false });

  if (error || !data) {
    return {};
  }

  const severityRank: Record<SecurityIncidentSeverity, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MODERATE: 2,
    LOW: 1,
  };

  const advisories: Record<string, LogisticsCorridorAdvisory> = {};

  for (const item of data) {
    const st = item.state;
    const sev = item.severity as SecurityIncidentSeverity;
    const isMovement =
      item.incident_type === "MOVEMENT_RESTRICTION" ||
      item.incident_type === "LOGISTICS_CORRIDOR_INCIDENT";

    if (!advisories[st]) {
      advisories[st] = {
        state: st,
        activeDisruptionsCount: 1,
        highestSeverity: sev,
        hasMovementRestrictions: isMovement,
        latestIncidentTitle: item.title,
        latestIncidentSlug: item.slug,
        publishedAt: item.published_at,
      };
    } else {
      advisories[st].activeDisruptionsCount += 1;
      if (isMovement) {
        advisories[st].hasMovementRestrictions = true;
      }
      const currentHighest = advisories[st].highestSeverity;
      if (!currentHighest || (sev && severityRank[sev] > severityRank[currentHighest])) {
        advisories[st].highestSeverity = sev;
      }
    }
  }

  return advisories;
}
