import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import {
  KnowledgeArticle,
  KnowledgeFilterParams,
  PaginatedKnowledgeResult,
  SafeKnowledgeAuthorProfile,
  KnowledgeContentType,
} from "./types";

interface RawArticleRow {
  id: string;
  content_type: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  cover_image_url: string | null;
  author_id: string | null;
  source_name: string | null;
  source_url: string | null;
  source_type: string | null;
  status: string;
  state: string | null;
  lga: string | null;
  tags: string[];
  topic: string | null;
  is_featured: boolean;
  event_start_date: string | null;
  event_end_date: string | null;
  venue: string | null;
  is_online: boolean;
  organizer: string | null;
  registration_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RawAuthorProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  state: string | null;
  lga: string | null;
}

/**
 * Maps raw database row to strongly-typed KnowledgeArticle domain model.
 */
export function mapKnowledgeArticleRow(
  row: RawArticleRow,
  author?: SafeKnowledgeAuthorProfile | null
): KnowledgeArticle {
  return {
    id: row.id,
    contentType: row.content_type as KnowledgeArticle["contentType"],
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? null,
    body: row.body,
    coverImageUrl: row.cover_image_url ?? null,
    authorId: row.author_id ?? null,
    author: author ?? null,
    sourceName: row.source_name ?? null,
    sourceUrl: row.source_url ?? null,
    sourceType: (row.source_type as KnowledgeArticle["sourceType"]) ?? null,
    status: row.status as KnowledgeArticle["status"],
    state: row.state ?? null,
    lga: row.lga ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    topic: row.topic ?? null,
    isFeatured: Boolean(row.is_featured),
    eventStartDate: row.event_start_date ?? null,
    eventEndDate: row.event_end_date ?? null,
    venue: row.venue ?? null,
    isOnline: Boolean(row.is_online),
    organizer: row.organizer ?? null,
    registrationUrl: row.registration_url ?? null,
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Public Knowledge Discovery Query.
 *
 * SECURITY & PRIVACY RULES:
 * 1. Strictly returns PUBLISHED articles only.
 * 2. Drafts and archived records are excluded.
 * 3. Author details are resolved strictly from the security-barrier view
 *    public.knowledge_author_profiles, never leaking phone, email, or private address.
 */
export async function getPublishedArticles(
  filters: KnowledgeFilterParams = {}
): Promise<PaginatedKnowledgeResult> {
  const supabase = await createClient();

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 12));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("knowledge_articles")
    .select("*", { count: "exact" })
    .eq("status", "PUBLISHED");

  // Filter by content type
  if (filters.contentType && filters.contentType !== "all") {
    query = query.eq("content_type", filters.contentType);
  }

  // Filter by topic
  if (filters.topic && filters.topic !== "all") {
    query = query.eq("topic", filters.topic);
  }

  // Filter by state
  if (filters.state && filters.state !== "all") {
    query = query.ilike("state", `%${filters.state.trim()}%`);
  }

  // Filter by featured flag
  if (filters.isFeatured !== undefined) {
    query = query.eq("is_featured", filters.isFeatured);
  }

  // Full-text / keyword search
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    query = query.or(
      `title.ilike.%${term}%,excerpt.ilike.%${term}%,body.ilike.%${term}%,topic.ilike.%${term}%`
    );
  }

  // Ordering
  query = query
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;

  if (error || !data) {
    console.error("Error fetching published knowledge articles:", error);
    return {
      articles: [],
      totalCount: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  const rawRows = (data as unknown as RawArticleRow[]) || [];
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Batch resolve safe author profiles
  const authorIds = Array.from(
    new Set(rawRows.map((r) => r.author_id).filter(Boolean) as string[])
  );
  const authorMap = new Map<string, SafeKnowledgeAuthorProfile>();

  if (authorIds.length > 0) {
    const { data: authors } = await supabase
      .from("knowledge_author_profiles")
      .select("id, full_name, avatar_url, is_verified, state, lga")
      .in("id", authorIds);

    if (authors) {
      for (const a of authors as RawAuthorProfileRow[]) {
        authorMap.set(a.id, {
          id: a.id,
          fullName: a.full_name,
          avatarUrl: a.avatar_url,
          isVerified: Boolean(a.is_verified),
          state: a.state,
          lga: a.lga,
        });
      }
    }
  }

  const articles = rawRows.map((row) =>
    mapKnowledgeArticleRow(
      row,
      row.author_id ? authorMap.get(row.author_id) ?? null : null
    )
  );

  return {
    articles,
    totalCount,
    page,
    limit,
    totalPages,
  };
}

/**
 * Retrieves a single published knowledge article by slug.
 * Allows authors or administrators to preview their unpublished articles.
 */
export async function getArticleBySlug(
  slug: string
): Promise<KnowledgeArticle | null> {
  const supabase = await createClient();
  const currentUser = await getCurrentUser();

  const { data, error } = await supabase
    .from("knowledge_articles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const rawRow = data as unknown as RawArticleRow;

  // Authorization check for non-published articles
  if (rawRow.status !== "PUBLISHED") {
    if (!currentUser) return null;
    const isAdmin = hasRole(currentUser.roles, "ADMIN");
    const isAuthor = rawRow.author_id === currentUser.id;
    if (!isAdmin && !isAuthor) {
      return null;
    }
  }

  // Resolve safe author profile
  let safeAuthor: SafeKnowledgeAuthorProfile | null = null;
  if (rawRow.author_id) {
    const { data: authorData } = await supabase
      .from("knowledge_author_profiles")
      .select("id, full_name, avatar_url, is_verified, state, lga")
      .eq("id", rawRow.author_id)
      .maybeSingle();

    if (authorData) {
      const a = authorData as RawAuthorProfileRow;
      safeAuthor = {
        id: a.id,
        fullName: a.full_name,
        avatarUrl: a.avatar_url,
        isVerified: Boolean(a.is_verified),
        state: a.state,
        lga: a.lga,
      };
    }
  }

  return mapKnowledgeArticleRow(rawRow, safeAuthor);
}

/**
 * Retrieves related published articles for content recommendations.
 */
export async function getRelatedArticles(
  currentSlug: string,
  contentType: KnowledgeContentType,
  topic?: string | null,
  limit = 3
): Promise<KnowledgeArticle[]> {
  const supabase = await createClient();

  let query = supabase
    .from("knowledge_articles")
    .select("*")
    .eq("status", "PUBLISHED")
    .neq("slug", currentSlug)
    .limit(limit);

  if (topic) {
    query = query.eq("topic", topic);
  } else {
    query = query.eq("content_type", contentType);
  }

  query = query.order("published_at", { ascending: false });

  const { data } = await query;
  if (!data || data.length === 0) {
    // Fallback to same content type if topic didn't match enough
    const { data: fallback } = await supabase
      .from("knowledge_articles")
      .select("*")
      .eq("status", "PUBLISHED")
      .neq("slug", currentSlug)
      .eq("content_type", contentType)
      .order("published_at", { ascending: false })
      .limit(limit);

    return ((fallback as unknown as RawArticleRow[]) || []).map((r) =>
      mapKnowledgeArticleRow(r)
    );
  }

  return ((data as unknown as RawArticleRow[]) || []).map((r) =>
    mapKnowledgeArticleRow(r)
  );
}

/**
 * Administrative Content Query.
 * Restricted strictly to users with ADMIN or EXPERT roles.
 */
export async function getAdminArticles(
  filters: KnowledgeFilterParams = {}
): Promise<PaginatedKnowledgeResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { articles: [], totalCount: 0, page: 1, limit: 12, totalPages: 0 };
  }

  const isAdmin = hasRole(user.roles, "ADMIN");
  const isExpert = hasRole(user.roles, "EXPERT");

  if (!isAdmin && !isExpert) {
    return { articles: [], totalCount: 0, page: 1, limit: 12, totalPages: 0 };
  }

  const supabase = await createClient();

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("knowledge_articles").select("*", { count: "exact" });

  // Experts without Admin role only see their own authored content
  if (!isAdmin && isExpert) {
    query = query.eq("author_id", user.id);
  }

  // Status filter
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  // Content type filter
  if (filters.contentType && filters.contentType !== "all") {
    query = query.eq("content_type", filters.contentType);
  }

  // Keyword search
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    query = query.or(`title.ilike.%${term}%,topic.ilike.%${term}%`);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;

  if (error || !data) {
    console.error("Error fetching admin knowledge articles:", error);
    return { articles: [], totalCount: 0, page, limit, totalPages: 0 };
  }

  const rawRows = (data as unknown as RawArticleRow[]) || [];
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const articles = rawRows.map((row) => mapKnowledgeArticleRow(row));

  return {
    articles,
    totalCount,
    page,
    limit,
    totalPages,
  };
}

/**
 * Retrieves a single knowledge article by ID for editing in the admin console.
 */
export async function getArticleByIdForAdmin(
  id: string
): Promise<KnowledgeArticle | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const isAdmin = hasRole(user.roles, "ADMIN");
  const isExpert = hasRole(user.roles, "EXPERT");

  if (!isAdmin && !isExpert) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("knowledge_articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const rawRow = data as unknown as RawArticleRow;

  if (!isAdmin && rawRow.author_id !== user.id) {
    return null;
  }

  return mapKnowledgeArticleRow(rawRow);
}
