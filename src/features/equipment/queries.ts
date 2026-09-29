import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import { getReviewStats } from "@/features/reviews/queries";
import {
  Equipment,
  EquipmentListing,
  EquipmentRental,
  SafeEquipmentOwnerProfile,
  EquipmentFilterParams,
  PaginatedEquipmentResult,
  EquipmentCategory,
  EquipmentCondition,
  EquipmentStatus,
  RentalStatus,
} from "./types";

interface RawEquipmentRow {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  make_model: string | null;
  year_manufactured: number | null;
  description: string | null;
  location_state: string;
  location_lga: string;
  daily_rental_rate: number | string;
  caution_deposit: number | string;
  currency: string;
  operator_included: boolean;
  condition: string;
  is_available: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

interface RawOwnerProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  state: string | null;
  lga: string | null;
}

interface RawRentalRow {
  id: string;
  equipment_id: string;
  renter_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  daily_rate: number | string;
  total_rental_amount: number | string;
  deposit_amount: number | string;
  currency: string;
  status: string;
  handover_notes: string | null;
  return_notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Maps raw database equipment row to strongly-typed EquipmentListing domain model.
 */
export function mapEquipmentRow(
  row: RawEquipmentRow,
  owner?: SafeEquipmentOwnerProfile | null,
  reviewStats?: { averageRating: number; totalReviews: number } | null
): EquipmentListing {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    category: row.category as EquipmentCategory,
    makeModel: row.make_model ?? null,
    yearManufactured: row.year_manufactured ?? null,
    description: row.description ?? null,
    locationState: row.location_state,
    locationLga: row.location_lga,
    dailyRentalRate: Number(row.daily_rental_rate),
    cautionDeposit: Number(row.caution_deposit),
    currency: row.currency || "NGN",
    operatorIncluded: Boolean(row.operator_included),
    condition: row.condition as EquipmentCondition,
    isAvailable: Boolean(row.is_available),
    status: row.status as EquipmentStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    owner: owner ?? null,
    reviewStats: reviewStats ?? null,
  };
}

/**
 * Maps raw database rental row to strongly-typed EquipmentRental domain model.
 */
export function mapRentalRow(
  row: RawRentalRow,
  equipment?: Equipment | null,
  owner?: SafeEquipmentOwnerProfile | null,
  renter?: {
    id: string;
    fullName: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
  } | null
): EquipmentRental {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    renterId: row.renter_id,
    ownerId: row.owner_id,
    startDate: row.start_date,
    endDate: row.end_date,
    totalDays: Number(row.total_days),
    dailyRate: Number(row.daily_rate),
    totalRentalAmount: Number(row.total_rental_amount),
    depositAmount: Number(row.deposit_amount),
    currency: row.currency || "NGN",
    status: row.status as RentalStatus,
    handoverNotes: row.handover_notes ?? null,
    returnNotes: row.return_notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    equipment: equipment ?? null,
    owner: owner ?? null,
    renter: renter ?? null,
  };
}

/**
 * Public Equipment Discovery Query.
 *
 * PRIVACY & SECURITY RULES:
 * 1. Owner metadata is sourced strictly from public.equipment_owner_profiles view.
 * 2. NEVER joins directly to public.profiles.
 * 3. Never returns owner phone, email, or private address.
 */
export async function getEquipment(
  filters: EquipmentFilterParams = {}
): Promise<PaginatedEquipmentResult> {
  const supabase = await createClient();

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 12));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("equipment").select(
    `
      id,
      owner_id,
      name,
      category,
      make_model,
      year_manufactured,
      description,
      location_state,
      location_lga,
      daily_rental_rate,
      caution_deposit,
      currency,
      operator_included,
      condition,
      is_available,
      status,
      created_at,
      updated_at
    `,
    { count: "exact" }
  );

  // Status filtering (default to ACTIVE for public discovery)
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  } else {
    query = query.eq("status", "ACTIVE");
  }

  // Availability flag
  if (filters.isAvailable !== undefined) {
    query = query.eq("is_available", filters.isAvailable);
  }

  // Category
  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }

  // Condition
  if (filters.condition && filters.condition !== "all") {
    query = query.eq("condition", filters.condition);
  }

  // Location
  if (filters.state) {
    query = query.ilike("location_state", `%${filters.state.trim()}%`);
  }
  if (filters.lga) {
    query = query.ilike("location_lga", `%${filters.lga.trim()}%`);
  }

  // Search keyword (name, make_model, description)
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    query = query.or(`name.ilike.%${term}%,make_model.ilike.%${term}%,description.ilike.%${term}%`);
  }

  // Sorting
  switch (filters.sortBy) {
    case "rate_asc":
      query = query.order("daily_rental_rate", { ascending: true });
      break;
    case "rate_desc":
      query = query.order("daily_rental_rate", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching equipment:", error);
    return {
      equipment: [],
      totalCount: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  const rawRows = (data as unknown as RawEquipmentRow[]) || [];
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Batch resolve safe owner profiles from public.equipment_owner_profiles
  const ownerIds = Array.from(new Set(rawRows.map((r) => r.owner_id).filter(Boolean)));
  const ownerMap = new Map<string, SafeEquipmentOwnerProfile>();

  if (ownerIds.length > 0) {
    const { data: owners, error: ownerError } = await supabase
      .from("equipment_owner_profiles")
      .select("id, full_name, avatar_url, is_verified, state, lga")
      .in("id", ownerIds);

    if (ownerError) {
      console.error("Error fetching safe equipment owner profiles:", ownerError);
    } else if (owners) {
      for (const o of owners as RawOwnerProfileRow[]) {
        ownerMap.set(o.id, {
          id: o.id,
          fullName: o.full_name,
          avatarUrl: o.avatar_url,
          isVerified: Boolean(o.is_verified),
          state: o.state,
          lga: o.lga,
        });
      }
    }
  }

  const equipment = rawRows.map((row) =>
    mapEquipmentRow(row, ownerMap.get(row.owner_id) ?? null)
  );

  return {
    equipment,
    totalCount,
    page,
    limit,
    totalPages,
  };
}

/**
 * Retrieves a single equipment item by ID for public view or detail page.
 *
 * PRIVACY RULES:
 * - Uses public.equipment_owner_profiles for owner info.
 * - Does NOT expose owner phone, email, or exact residential address.
 * - Integrates reviews aggregate summary.
 */
export async function getEquipmentById(
  equipmentId: string
): Promise<EquipmentListing | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("equipment")
    .select(
      `
        id,
        owner_id,
        name,
        category,
        make_model,
        year_manufactured,
        description,
        location_state,
        location_lga,
        daily_rental_rate,
        caution_deposit,
        currency,
        operator_included,
        condition,
        is_available,
        status,
        created_at,
        updated_at
      `
    )
    .eq("id", equipmentId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const rawRow = data as unknown as RawEquipmentRow;

  // Resolve safe owner profile strictly from equipment_owner_profiles
  const { data: ownerData } = await supabase
    .from("equipment_owner_profiles")
    .select("id, full_name, avatar_url, is_verified, state, lga")
    .eq("id", rawRow.owner_id)
    .maybeSingle();

  let safeOwner: SafeEquipmentOwnerProfile | null = null;
  if (ownerData) {
    const rawOwner = ownerData as RawOwnerProfileRow;
    safeOwner = {
      id: rawOwner.id,
      fullName: rawOwner.full_name,
      avatarUrl: rawOwner.avatar_url,
      isVerified: Boolean(rawOwner.is_verified),
      state: rawOwner.state,
      lga: rawOwner.lga,
    };
  }

  // Resolve review summary
  const reviewStats = await getReviewStats({ equipmentId });

  return mapEquipmentRow(rawRow, safeOwner, {
    averageRating: reviewStats.averageRating,
    totalReviews: reviewStats.totalReviews,
  });
}

/**
 * Retrieves equipment items owned by the currently authenticated user.
 *
 * AUTHORIZATION:
 * - Uses auth.uid() server-side via getCurrentUser().
 * - Never accepts owner_id from client.
 */
export async function getOwnerEquipment(): Promise<EquipmentListing[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("equipment")
    .select(
      `
        id,
        owner_id,
        name,
        category,
        make_model,
        year_manufactured,
        description,
        location_state,
        location_lga,
        daily_rental_rate,
        caution_deposit,
        currency,
        operator_included,
        condition,
        is_available,
        status,
        created_at,
        updated_at
      `
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching owner equipment:", error);
    return [];
  }

  const rawRows = data as unknown as RawEquipmentRow[];
  return rawRows.map((row) => mapEquipmentRow(row));
}

/**
 * Retrieves rentals placed by the currently authenticated renter.
 */
export async function getUserRentals(): Promise<EquipmentRental[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("equipment_rentals")
    .select(
      `
        id,
        equipment_id,
        renter_id,
        owner_id,
        start_date,
        end_date,
        total_days,
        daily_rate,
        total_rental_amount,
        deposit_amount,
        currency,
        status,
        handover_notes,
        return_notes,
        created_at,
        updated_at
      `
    )
    .eq("renter_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching user rentals:", error);
    return [];
  }

  const rawRentals = data as unknown as RawRentalRow[];
  if (rawRentals.length === 0) return [];

  // Batch resolve equipment details
  const equipmentIds = Array.from(new Set(rawRentals.map((r) => r.equipment_id)));
  const { data: equipmentData } = await supabase
    .from("equipment")
    .select("*")
    .in("id", equipmentIds);

  const equipmentMap = new Map<string, Equipment>();
  if (equipmentData) {
    for (const eq of equipmentData as RawEquipmentRow[]) {
      equipmentMap.set(eq.id, mapEquipmentRow(eq));
    }
  }

  return rawRentals.map((row) => mapRentalRow(row, equipmentMap.get(row.equipment_id)));
}

/**
 * Retrieves rentals for equipment owned by the currently authenticated user.
 */
export async function getOwnerRentals(): Promise<EquipmentRental[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("equipment_rentals")
    .select(
      `
        id,
        equipment_id,
        renter_id,
        owner_id,
        start_date,
        end_date,
        total_days,
        daily_rate,
        total_rental_amount,
        deposit_amount,
        currency,
        status,
        handover_notes,
        return_notes,
        created_at,
        updated_at
      `
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching owner rentals:", error);
    return [];
  }

  const rawRentals = data as unknown as RawRentalRow[];
  if (rawRentals.length === 0) return [];

  // Batch resolve equipment details
  const equipmentIds = Array.from(new Set(rawRentals.map((r) => r.equipment_id)));
  const { data: equipmentData } = await supabase
    .from("equipment")
    .select("*")
    .in("id", equipmentIds);

  const equipmentMap = new Map<string, Equipment>();
  if (equipmentData) {
    for (const eq of equipmentData as RawEquipmentRow[]) {
      equipmentMap.set(eq.id, mapEquipmentRow(eq));
    }
  }

  return rawRentals.map((row) => mapRentalRow(row, equipmentMap.get(row.equipment_id)));
}

/**
 * Retrieves a single rental record by ID.
 *
 * AUTHORIZATION:
 * - Only the renter, the equipment owner, or an administrator can access this record.
 * - Unauthorized requests return null.
 * - Never exposed publicly.
 */
export async function getRentalById(
  rentalId: string
): Promise<EquipmentRental | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("equipment_rentals")
    .select(
      `
        id,
        equipment_id,
        renter_id,
        owner_id,
        start_date,
        end_date,
        total_days,
        daily_rate,
        total_rental_amount,
        deposit_amount,
        currency,
        status,
        handover_notes,
        return_notes,
        created_at,
        updated_at
      `
    )
    .eq("id", rentalId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const rawRow = data as unknown as RawRentalRow;

  // Authorization check
  const isRenter = rawRow.renter_id === user.id;
  const isOwner = rawRow.owner_id === user.id;
  const isAdmin = hasRole(user.roles, "ADMIN");

  if (!isRenter && !isOwner && !isAdmin) {
    return null;
  }

  // Resolve equipment info
  const { data: equipmentData } = await supabase
    .from("equipment")
    .select("*")
    .eq("id", rawRow.equipment_id)
    .maybeSingle();

  const equipment = equipmentData
    ? mapEquipmentRow(equipmentData as RawEquipmentRow)
    : null;

  // Resolve safe owner profile
  const { data: ownerData } = await supabase
    .from("equipment_owner_profiles")
    .select("id, full_name, avatar_url, is_verified, state, lga")
    .eq("id", rawRow.owner_id)
    .maybeSingle();

  const owner: SafeEquipmentOwnerProfile | null = ownerData
    ? {
        id: (ownerData as RawOwnerProfileRow).id,
        fullName: (ownerData as RawOwnerProfileRow).full_name,
        avatarUrl: (ownerData as RawOwnerProfileRow).avatar_url,
        isVerified: Boolean((ownerData as RawOwnerProfileRow).is_verified),
        state: (ownerData as RawOwnerProfileRow).state,
        lga: (ownerData as RawOwnerProfileRow).lga,
      }
    : null;

  // Resolve renter details for authorized handover coordination
  const { data: renterData } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, phone")
    .eq("id", rawRow.renter_id)
    .maybeSingle();

  const renter = renterData
    ? {
        id: (renterData as { id: string }).id,
        fullName: (renterData as { full_name: string | null }).full_name,
        avatarUrl: (renterData as { avatar_url: string | null }).avatar_url,
        phone: (renterData as { phone: string | null }).phone,
      }
    : null;

  return mapRentalRow(rawRow, equipment, owner, renter);
}
