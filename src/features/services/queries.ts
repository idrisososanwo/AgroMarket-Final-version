import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import {
  ServiceFilterParams,
  ServiceListing,
  ServiceRequest,
  PaginatedServicesResult,
  SafeProviderProfile,
  ServiceCategory,
  PricingModel,
  ServiceRequestStatus,
} from "./types";

interface RawServiceRow {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  service_category: string;
  coverage_states: string[];
  pricing_model: string;
  base_rate: number | string;
  currency: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

interface RawProviderProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  state: string | null;
  lga: string | null;
}

interface RawServiceRequestRow {
  id: string;
  service_id: string;
  client_id: string;
  provider_id: string;
  details: string;
  state: string;
  lga: string;
  location_address: string;
  proposed_date: string;
  quoted_amount: number | string | null;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
  } | null;
  services?: {
    id: string;
    title: string;
    service_category: string;
    pricing_model: string;
  } | null;
}

export function mapServiceRow(
  row: RawServiceRow,
  provider?: SafeProviderProfile | null,
  requestsCount?: number
): ServiceListing {
  return {
    id: row.id,
    providerId: row.provider_id,
    title: row.title,
    description: row.description,
    serviceCategory: row.service_category as ServiceCategory,
    coverageStates: Array.isArray(row.coverage_states) ? row.coverage_states : [],
    pricingModel: row.pricing_model as PricingModel,
    baseRate: Number(row.base_rate),
    currency: row.currency || "NGN",
    isAvailable: Boolean(row.is_available),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    provider: provider ?? null,
    requestsCount,
  };
}

/**
 * Public Active & Available Service Discovery Query.
 *
 * PRIVACY & SECURITY:
 * 1. Strictly filters for is_available = true.
 * 2. Resolves provider information exclusively from public.services_provider_profiles view.
 * 3. NEVER queries public.profiles directly.
 * 4. NEVER exposes phone, email, or private residential addresses.
 */
export async function getServices(
  filters: ServiceFilterParams = {}
): Promise<PaginatedServicesResult> {
  const supabase = await createClient();

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 12));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("services")
    .select(
      `
        id,
        provider_id,
        title,
        description,
        service_category,
        coverage_states,
        pricing_model,
        base_rate,
        currency,
        is_available,
        created_at,
        updated_at
      `,
      { count: "exact" }
    )
    .eq("is_available", true);

  // Filter by category
  if (filters.serviceCategory && filters.serviceCategory !== "all") {
    query = query.eq("service_category", filters.serviceCategory);
  }

  // Filter by coverage state (Postgres array contains operator)
  if (filters.coverageState && filters.coverageState !== "all") {
    query = query.contains("coverage_states", [filters.coverageState]);
  }

  // Filter by pricing model
  if (filters.pricingModel && filters.pricingModel !== "all") {
    query = query.eq("pricing_model", filters.pricingModel);
  }

  // Keyword search across title and description
  if (filters.search && filters.search.trim().length > 0) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`title.ilike.${term},description.ilike.${term}`);
  }

  // Sorting
  switch (filters.sortBy) {
    case "rate_asc":
      query = query.order("base_rate", { ascending: true });
      break;
    case "rate_desc":
      query = query.order("base_rate", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  // Pagination
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error querying agricultural services:", {
      message: error.message,
      code: error.code,
    });
    return {
      services: [],
      totalCount: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  const rawRows = (data as unknown as RawServiceRow[]) || [];
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Batch resolve provider safe profile from services_provider_profiles view
  const providerIds = Array.from(
    new Set(rawRows.map((r) => r.provider_id).filter(Boolean))
  );

  const providerMap = new Map<string, SafeProviderProfile>();
  if (providerIds.length > 0) {
    const { data: providers, error: provError } = await supabase
      .from("services_provider_profiles")
      .select("id, full_name, avatar_url, is_verified, state, lga")
      .in("id", providerIds);

    if (!provError && providers) {
      for (const prov of providers as RawProviderProfileRow[]) {
        providerMap.set(prov.id, {
          id: prov.id,
          fullName: prov.full_name,
          avatarUrl: prov.avatar_url,
          isVerified: Boolean(prov.is_verified),
          state: prov.state,
          lga: prov.lga,
        });
      }
    }
  }

  const services = rawRows.map((row) =>
    mapServiceRow(row, providerMap.get(row.provider_id))
  );

  return {
    services,
    totalCount,
    page,
    limit,
    totalPages,
  };
}

/**
 * Single Service Detail Query
 * Safe provider profile resolved from services_provider_profiles view.
 */
export async function getServiceById(serviceId: string): Promise<ServiceListing | null> {
  const supabase = await createClient();
  const currentUser = await getCurrentUser();

  const { data, error } = await supabase
    .from("services")
    .select(
      `
        id,
        provider_id,
        title,
        description,
        service_category,
        coverage_states,
        pricing_model,
        base_rate,
        currency,
        is_available,
        created_at,
        updated_at
      `
    )
    .eq("id", serviceId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as unknown as RawServiceRow;

  // Authorization check for unavailable services
  if (!row.is_available) {
    const isOwner = currentUser?.id === row.provider_id;
    const isAdmin = currentUser ? hasRole(currentUser.roles, "ADMIN") : false;
    if (!isOwner && !isAdmin) {
      return null;
    }
  }

  // Resolve safe provider profile
  let safeProvider: SafeProviderProfile | null = null;
  const { data: provData } = await supabase
    .from("services_provider_profiles")
    .select("id, full_name, avatar_url, is_verified, state, lga")
    .eq("id", row.provider_id)
    .maybeSingle();

  if (provData) {
    const rawProv = provData as RawProviderProfileRow;
    safeProvider = {
      id: rawProv.id,
      fullName: rawProv.full_name,
      avatarUrl: rawProv.avatar_url,
      isVerified: Boolean(rawProv.is_verified),
      state: rawProv.state,
      lga: rawProv.lga,
    };
  }

  return mapServiceRow(row, safeProvider);
}

/**
 * Provider's Own Services Query
 * Authorizes the provider or an administrator.
 */
export async function getProviderServices(providerId?: string): Promise<ServiceListing[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }

  const targetProviderId = providerId || currentUser.id;
  const isAdmin = hasRole(currentUser.roles, "ADMIN");

  if (targetProviderId !== currentUser.id && !isAdmin) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .select(
      `
        id,
        provider_id,
        title,
        description,
        service_category,
        coverage_states,
        pricing_model,
        base_rate,
        currency,
        is_available,
        created_at,
        updated_at,
        service_requests (id)
      `
    )
    .eq("provider_id", targetProviderId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as Array<RawServiceRow & { service_requests?: Array<{ id: string }> }>).map(
    (row) => {
      const requestsCount = Array.isArray(row.service_requests)
        ? row.service_requests.length
        : 0;
      return mapServiceRow(row, null, requestsCount);
    }
  );
}

/**
 * Provider's Incoming Service Requests Query
 * Enforces ownership: only provider or ADMIN may view.
 * Exposes location_address only to authorized participants.
 */
export async function getProviderServiceRequests(
  serviceId?: string
): Promise<ServiceRequest[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }

  const supabase = await createClient();

  let query = supabase
    .from("service_requests")
    .select(
      `
        id,
        service_id,
        client_id,
        provider_id,
        details,
        state,
        lga,
        location_address,
        proposed_date,
        quoted_amount,
        currency,
        status,
        created_at,
        updated_at,
        services (
          id,
          title,
          service_category,
          pricing_model
        )
      `
    )
    .eq("provider_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (serviceId) {
    query = query.eq("service_id", serviceId);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  const rawRequests = ((data as unknown as RawServiceRequestRow[]) || []);
  const clientIds = Array.from(new Set(rawRequests.map((r) => r.client_id).filter(Boolean)));

  // Safely resolve client display details
  const clientMap = new Map<
    string,
    { id: string; fullName: string | null; avatarUrl: string | null; phone: string | null }
  >();

  if (clientIds.length > 0) {
    const { data: clientProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, phone")
      .in("id", clientIds);

    if (clientProfiles) {
      for (const p of clientProfiles) {
        clientMap.set(p.id, {
          id: p.id,
          fullName: p.full_name,
          avatarUrl: p.avatar_url,
          phone: p.phone,
        });
      }
    }
  }

  return rawRequests.map((req) => {
    const rawServ = req.services as unknown;
    const servData = (Array.isArray(rawServ) ? rawServ[0] : rawServ) as
      | { id: string; title: string; service_category: string; pricing_model: string }
      | null
      | undefined;

    return {
      id: req.id,
      serviceId: req.service_id,
      clientId: req.client_id,
      providerId: req.provider_id,
      details: req.details,
      state: req.state,
      lga: req.lga,
      locationAddress: req.location_address,
      proposedDate: req.proposed_date,
      quotedAmount: req.quoted_amount !== null ? Number(req.quoted_amount) : null,
      currency: req.currency || "NGN",
      status: req.status as ServiceRequestStatus,
      createdAt: req.created_at,
      updatedAt: req.updated_at,
      client: clientMap.get(req.client_id) ?? null,
      service: servData
        ? {
            id: servData.id,
            title: servData.title,
            serviceCategory: servData.service_category as ServiceCategory,
            pricingModel: servData.pricing_model as PricingModel,
          }
        : null,
    };
  });
}

/**
 * Client's Own Service Requests Query
 * Returns all service requests submitted by the authenticated user.
 */
export async function getClientServiceRequests(): Promise<ServiceRequest[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_requests")
    .select(
      `
        id,
        service_id,
        client_id,
        provider_id,
        details,
        state,
        lga,
        location_address,
        proposed_date,
        quoted_amount,
        currency,
        status,
        created_at,
        updated_at,
        services (
          id,
          title,
          service_category,
          pricing_model
        )
      `
    )
    .eq("client_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const rawRequests = ((data as unknown as RawServiceRequestRow[]) || []);
  const providerIds = Array.from(new Set(rawRequests.map((r) => r.provider_id).filter(Boolean)));

  // Batch resolve provider safe profile from services_provider_profiles view
  const providerMap = new Map<string, SafeProviderProfile>();
  if (providerIds.length > 0) {
    const { data: providers } = await supabase
      .from("services_provider_profiles")
      .select("id, full_name, avatar_url, is_verified, state, lga")
      .in("id", providerIds);

    if (providers) {
      for (const prov of providers as RawProviderProfileRow[]) {
        providerMap.set(prov.id, {
          id: prov.id,
          fullName: prov.full_name,
          avatarUrl: prov.avatar_url,
          isVerified: Boolean(prov.is_verified),
          state: prov.state,
          lga: prov.lga,
        });
      }
    }
  }

  return rawRequests.map((req) => {
    const rawServ = req.services as unknown;
    const servData = (Array.isArray(rawServ) ? rawServ[0] : rawServ) as
      | { id: string; title: string; service_category: string; pricing_model: string }
      | null
      | undefined;

    return {
      id: req.id,
      serviceId: req.service_id,
      clientId: req.client_id,
      providerId: req.provider_id,
      details: req.details,
      state: req.state,
      lga: req.lga,
      locationAddress: req.location_address,
      proposedDate: req.proposed_date,
      quotedAmount: req.quoted_amount !== null ? Number(req.quoted_amount) : null,
      currency: req.currency || "NGN",
      status: req.status as ServiceRequestStatus,
      createdAt: req.created_at,
      updatedAt: req.updated_at,
      provider: providerMap.get(req.provider_id) ?? null,
      service: servData
        ? {
            id: servData.id,
            title: servData.title,
            serviceCategory: servData.service_category as ServiceCategory,
            pricingModel: servData.pricing_model as PricingModel,
          }
        : null,
    };
  });
}

/**
 * Single Service Request Detail Query
 * Enforces strict participant isolation: only the client, provider, or ADMIN may access.
 * Accurately exposes exact site/farm address ONLY to authorized participants.
 */
export async function getServiceRequestById(
  requestId: string
): Promise<ServiceRequest | null> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_requests")
    .select(
      `
        id,
        service_id,
        client_id,
        provider_id,
        details,
        state,
        lga,
        location_address,
        proposed_date,
        quoted_amount,
        currency,
        status,
        created_at,
        updated_at,
        services (
          id,
          title,
          service_category,
          pricing_model
        )
      `
    )
    .eq("id", requestId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const req = data as unknown as RawServiceRequestRow;
  const isClient = req.client_id === currentUser.id;
  const isProvider = req.provider_id === currentUser.id;
  const isAdmin = hasRole(currentUser.roles, "ADMIN");

  if (!isClient && !isProvider && !isAdmin) {
    return null;
  }

  // Fetch client details
  let clientDetails: { id: string; fullName: string | null; avatarUrl: string | null; phone: string | null } | null = null;
  const { data: clientProf } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, phone")
    .eq("id", req.client_id)
    .maybeSingle();

  if (clientProf) {
    clientDetails = {
      id: clientProf.id,
      fullName: clientProf.full_name,
      avatarUrl: clientProf.avatar_url,
      phone: clientProf.phone,
    };
  }

  // Fetch safe provider profile
  let safeProvider: SafeProviderProfile | null = null;
  const { data: provProf } = await supabase
    .from("services_provider_profiles")
    .select("id, full_name, avatar_url, is_verified, state, lga")
    .eq("id", req.provider_id)
    .maybeSingle();

  if (provProf) {
    const rawProv = provProf as RawProviderProfileRow;
    safeProvider = {
      id: rawProv.id,
      fullName: rawProv.full_name,
      avatarUrl: rawProv.avatar_url,
      isVerified: Boolean(rawProv.is_verified),
      state: rawProv.state,
      lga: rawProv.lga,
    };
  }

  const rawServ = req.services as unknown;
  const servData = (Array.isArray(rawServ) ? rawServ[0] : rawServ) as
    | { id: string; title: string; service_category: string; pricing_model: string }
    | null
    | undefined;

  return {
    id: req.id,
    serviceId: req.service_id,
    clientId: req.client_id,
    providerId: req.provider_id,
    details: req.details,
    state: req.state,
    lga: req.lga,
    locationAddress: req.location_address,
    proposedDate: req.proposed_date,
    quotedAmount: req.quoted_amount !== null ? Number(req.quoted_amount) : null,
    currency: req.currency || "NGN",
    status: req.status as ServiceRequestStatus,
    createdAt: req.created_at,
    updatedAt: req.updated_at,
    client: clientDetails,
    provider: safeProvider,
    service: servData
      ? {
          id: servData.id,
          title: servData.title,
          serviceCategory: servData.service_category as ServiceCategory,
          pricingModel: servData.pricing_model as PricingModel,
        }
      : null,
  };
}

