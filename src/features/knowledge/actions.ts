"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireAnyRole } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import {
  createKnowledgeArticleSchema,
  updateKnowledgeArticleSchema,
  changeArticleStatusSchema,
  slugifyTitle,
  ActionResponse,
} from "./validation";
import { KnowledgeContentStatus } from "./types";

/**
 * Creates a new knowledge article.
 *
 * AUTHORIZATION:
 * - Requires ADMIN or EXPERT role.
 * - author_id is derived strictly from server session (user.id).
 * - Client cannot spoof author_id.
 */
export async function createKnowledgeArticleAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ articleId: string; slug: string }>> {
  try {
    const user = await requireAnyRole(["ADMIN", "EXPERT"]);
    const raw =
      formData instanceof FormData
        ? Object.fromEntries(formData.entries())
        : formData;

    const parsed = createKnowledgeArticleSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please check the article fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      contentType,
      title,
      slug: providedSlug,
      excerpt,
      body,
      coverImageUrl,
      sourceName,
      sourceUrl,
      sourceType,
      state,
      lga,
      tags,
      topic,
      isFeatured,
      eventStartDate,
      eventEndDate,
      venue,
      isOnline,
      organizer,
      registrationUrl,
      status,
    } = parsed.data;

    const supabase = await createClient();

    // Generate unique slug
    let baseSlug = providedSlug && providedSlug.trim().length > 0
      ? providedSlug
      : slugifyTitle(title);

    if (!baseSlug) {
      baseSlug = `article-${Date.now()}`;
    }

    // Check slug collision
    let finalSlug = baseSlug;
    const { data: existingSlug } = await supabase
      .from("knowledge_articles")
      .select("id")
      .eq("slug", finalSlug)
      .maybeSingle();

    if (existingSlug) {
      finalSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
    }

    const publishedAt =
      status === "PUBLISHED" ? new Date().toISOString() : null;

    const { data: newArticle, error } = await supabase
      .from("knowledge_articles")
      .insert({
        content_type: contentType,
        title: title.trim(),
        slug: finalSlug,
        excerpt: excerpt?.trim() || null,
        body: body.trim(),
        cover_image_url: coverImageUrl || null,
        author_id: user.id,
        source_name: sourceName?.trim() || null,
        source_url: sourceUrl || null,
        source_type: sourceType || null,
        state: state?.trim() || null,
        lga: lga?.trim() || null,
        tags,
        topic: topic?.trim() || null,
        is_featured: isFeatured,
        event_start_date: eventStartDate || null,
        event_end_date: eventEndDate || null,
        venue: venue?.trim() || null,
        is_online: isOnline,
        organizer: organizer?.trim() || null,
        registration_url: registrationUrl || null,
        status,
        published_at: publishedAt,
      })
      .select("id, slug")
      .single();

    if (error || !newArticle) {
      console.error("Database error creating knowledge article:", error);
      return {
        success: false,
        error: "Failed to create knowledge article. Please try again.",
      };
    }

    revalidatePath("/learn");
    revalidatePath("/admin/knowledge");

    return {
      success: true,
      data: { articleId: newArticle.id, slug: newArticle.slug },
    };
  } catch (err: unknown) {
    console.error("Error in createKnowledgeArticleAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Updates an existing knowledge article.
 *
 * AUTHORIZATION:
 * - Requires authenticated user who is ADMIN or the original author.
 */
export async function updateKnowledgeArticleAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ articleId: string; slug: string }>> {
  try {
    const user = await requireAuth();
    const raw =
      formData instanceof FormData
        ? Object.fromEntries(formData.entries())
        : formData;

    const parsed = updateKnowledgeArticleSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please check the modified fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { id, ...updates } = parsed.data;
    const supabase = await createClient();

    // Verify existing record & permissions
    const { data: existing, error: fetchError } = await supabase
      .from("knowledge_articles")
      .select("id, author_id, slug, status, published_at")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existing) {
      return {
        success: false,
        error: "Knowledge article not found.",
      };
    }

    const isAdmin = hasRole(user.roles, "ADMIN");
    const isAuthor = existing.author_id === user.id;

    if (!isAdmin && !isAuthor) {
      return {
        success: false,
        error: "Unauthorized. You can only edit your own articles.",
      };
    }

    const dbUpdates: Record<string, unknown> = {};

    if (updates.contentType !== undefined) dbUpdates.content_type = updates.contentType;
    if (updates.title !== undefined) dbUpdates.title = updates.title.trim();
    if (updates.excerpt !== undefined) dbUpdates.excerpt = updates.excerpt?.trim() || null;
    if (updates.body !== undefined) dbUpdates.body = updates.body.trim();
    if (updates.coverImageUrl !== undefined) dbUpdates.cover_image_url = updates.coverImageUrl || null;
    if (updates.sourceName !== undefined) dbUpdates.source_name = updates.sourceName?.trim() || null;
    if (updates.sourceUrl !== undefined) dbUpdates.source_url = updates.sourceUrl || null;
    if (updates.sourceType !== undefined) dbUpdates.source_type = updates.sourceType || null;
    if (updates.state !== undefined) dbUpdates.state = updates.state?.trim() || null;
    if (updates.lga !== undefined) dbUpdates.lga = updates.lga?.trim() || null;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.topic !== undefined) dbUpdates.topic = updates.topic?.trim() || null;
    if (updates.isFeatured !== undefined) dbUpdates.is_featured = updates.isFeatured;
    if (updates.eventStartDate !== undefined) dbUpdates.event_start_date = updates.eventStartDate || null;
    if (updates.eventEndDate !== undefined) dbUpdates.event_end_date = updates.eventEndDate || null;
    if (updates.venue !== undefined) dbUpdates.venue = updates.venue?.trim() || null;
    if (updates.isOnline !== undefined) dbUpdates.is_online = updates.isOnline;
    if (updates.organizer !== undefined) dbUpdates.organizer = updates.organizer?.trim() || null;
    if (updates.registrationUrl !== undefined) dbUpdates.registration_url = updates.registrationUrl || null;

    if (updates.status !== undefined) {
      dbUpdates.status = updates.status;
      if (updates.status === "PUBLISHED" && !existing.published_at) {
        dbUpdates.published_at = new Date().toISOString();
      }
    }

    const { error: updateError } = await supabase
      .from("knowledge_articles")
      .update(dbUpdates)
      .eq("id", id);

    if (updateError) {
      console.error("Database error updating knowledge article:", updateError);
      return {
        success: false,
        error: "Failed to update article.",
      };
    }

    revalidatePath("/learn");
    revalidatePath(`/learn/${existing.slug}`);
    revalidatePath("/admin/knowledge");

    return {
      success: true,
      data: { articleId: id, slug: existing.slug },
    };
  } catch (err: unknown) {
    console.error("Error in updateKnowledgeArticleAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Transitions article status (DRAFT, PUBLISHED, ARCHIVED).
 */
export async function changeArticleStatusAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ status: KnowledgeContentStatus }>> {
  try {
    const user = await requireAuth();
    const raw =
      formData instanceof FormData
        ? Object.fromEntries(formData.entries())
        : formData;

    const parsed = changeArticleStatusSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid status transition request.",
      };
    }

    const { id, status: targetStatus } = parsed.data;
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from("knowledge_articles")
      .select("id, author_id, slug, status, published_at")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existing) {
      return {
        success: false,
        error: "Article not found.",
      };
    }

    const isAdmin = hasRole(user.roles, "ADMIN");
    const isAuthor = existing.author_id === user.id;

    if (!isAdmin && !isAuthor) {
      return {
        success: false,
        error: "Unauthorized to change status of this article.",
      };
    }

    const updates: Record<string, unknown> = { status: targetStatus };
    if (targetStatus === "PUBLISHED" && !existing.published_at) {
      updates.published_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("knowledge_articles")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      console.error("Database error changing article status:", updateError);
      return {
        success: false,
        error: "Failed to update article status.",
      };
    }

    revalidatePath("/learn");
    revalidatePath(`/learn/${existing.slug}`);
    revalidatePath("/admin/knowledge");

    return {
      success: true,
      data: { status: targetStatus },
    };
  } catch (err: unknown) {
    console.error("Error in changeArticleStatusAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Deletes a knowledge article (ADMIN or DRAFT author only).
 */
export async function deleteKnowledgeArticleAction(
  articleId: string
): Promise<ActionResponse<boolean>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from("knowledge_articles")
      .select("id, author_id, slug, status")
      .eq("id", articleId)
      .maybeSingle();

    if (fetchError || !existing) {
      return {
        success: false,
        error: "Article not found.",
      };
    }

    const isAdmin = hasRole(user.roles, "ADMIN");
    const isAuthor = existing.author_id === user.id;

    // Authors can only delete their own drafts; admins can delete any
    if (!isAdmin && (!isAuthor || existing.status !== "DRAFT")) {
      return {
        success: false,
        error: "Unauthorized to delete this article.",
      };
    }

    const { error: deleteError } = await supabase
      .from("knowledge_articles")
      .delete()
      .eq("id", articleId);

    if (deleteError) {
      console.error("Database error deleting article:", deleteError);
      return {
        success: false,
        error: "Failed to delete article.",
      };
    }

    revalidatePath("/learn");
    revalidatePath("/admin/knowledge");

    return {
      success: true,
      data: true,
    };
  } catch (err: unknown) {
    console.error("Error in deleteKnowledgeArticleAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}
