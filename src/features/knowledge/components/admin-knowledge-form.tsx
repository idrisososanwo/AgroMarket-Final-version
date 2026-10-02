"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { containsProhibitedProduce } from "@/features/marketplace/validation";
import {
  KnowledgeArticle,
  KNOWLEDGE_CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  CANONICAL_KNOWLEDGE_TOPICS,
  KNOWLEDGE_SOURCE_TYPES,
  SOURCE_TYPE_LABELS,
  KnowledgeContentType,
} from "../types";
import {
  createKnowledgeArticleAction,
  updateKnowledgeArticleAction,
} from "../actions";
import {
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  MapPin,
  Tag,
  Save,
  Send,
} from "lucide-react";

interface AdminKnowledgeFormProps {
  initialData?: KnowledgeArticle;
}

export function AdminKnowledgeForm({ initialData }: AdminKnowledgeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isEditing = Boolean(initialData);

  const [contentType, setContentType] = useState<KnowledgeContentType>(
    initialData?.contentType || "NEWS"
  );
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [body, setBody] = useState(initialData?.body || "");
  const [coverImageUrl, setCoverImageUrl] = useState(
    initialData?.coverImageUrl || ""
  );
  const [topic, setTopic] = useState(initialData?.topic || "");
  const [state, setState] = useState(initialData?.state || "");
  const [lga, setLga] = useState(initialData?.lga || "");
  const [tags, setTags] = useState(initialData?.tags?.join(", ") || "");
  const [sourceName, setSourceName] = useState(initialData?.sourceName || "");
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl || "");
  const [sourceType, setSourceType] = useState(initialData?.sourceType || "");
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured || false);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">(
    initialData?.status || "DRAFT"
  );

  // Events / Training
  const [eventStartDate, setEventStartDate] = useState(
    initialData?.eventStartDate
      ? new Date(initialData.eventStartDate).toISOString().slice(0, 16)
      : ""
  );
  const [eventEndDate, setEventEndDate] = useState(
    initialData?.eventEndDate
      ? new Date(initialData.eventEndDate).toISOString().slice(0, 16)
      : ""
  );
  const [venue, setVenue] = useState(initialData?.venue || "");
  const [isOnline, setIsOnline] = useState(initialData?.isOnline || false);
  const [organizer, setOrganizer] = useState(initialData?.organizer || "");
  const [registrationUrl, setRegistrationUrl] = useState(
    initialData?.registrationUrl || ""
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live anti-pork detection
  const combinedText = `${title} ${excerpt} ${body} ${topic} ${tags}`;
  const hasProhibitedContent = containsProhibitedProduce(combinedText);

  const handleSubmit = (targetStatus?: "DRAFT" | "PUBLISHED") => {
    setErrorMessage(null);
    setFieldErrors({});
    setSuccessMessage(null);

    const submissionStatus = targetStatus || status;

    if (hasProhibitedContent) {
      setErrorMessage(
        "AgroMarket strictly disallows pig/pork content across all knowledge articles. Please remove prohibited terms."
      );
      return;
    }

    startTransition(async () => {
      const payload: Record<string, unknown> = {
        contentType,
        title,
        slug: slug.trim() || undefined,
        excerpt: excerpt.trim() || undefined,
        body,
        coverImageUrl: coverImageUrl.trim() || undefined,
        topic: topic.trim() || undefined,
        state: state.trim() || undefined,
        lga: lga.trim() || undefined,
        tags,
        sourceName: sourceName.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        sourceType: sourceType || undefined,
        isFeatured,
        status: submissionStatus,
      };

      if (contentType === "EVENT" || contentType === "TRAINING") {
        payload.eventStartDate = eventStartDate || undefined;
        payload.eventEndDate = eventEndDate || undefined;
        payload.venue = venue.trim() || undefined;
        payload.isOnline = isOnline;
        payload.organizer = organizer.trim() || undefined;
        payload.registrationUrl = registrationUrl.trim() || undefined;
      }

      if (isEditing && initialData) {
        payload.id = initialData.id;
        const res = await updateKnowledgeArticleAction(payload);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to update article.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        } else {
          setSuccessMessage("Article updated successfully!");
          router.push("/admin/knowledge");
        }
      } else {
        const res = await createKnowledgeArticleAction(payload);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to create article.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        } else {
          setSuccessMessage("Article created successfully!");
          router.push("/admin/knowledge");
        }
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-6"
    >
      {/* Notifications */}
      {hasProhibitedContent && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-900 shadow-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block mb-0.5">
              Prohibited Produce Policy Violation
            </strong>
            <span>
              AgroMarket strictly disallows pig/pork content across all knowledge guides, news, and food-health articles. Please remove any references to swine/pork before publishing.
            </span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-800 shadow-sm flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-800 shadow-sm flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 1. Core Classification */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-2 border-b border-neutral-100 flex items-center gap-2">
          <Tag className="h-4 w-4 text-emerald-700" />
          Content Category & Publication Target
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {KNOWLEDGE_CONTENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setContentType(t)}
              className={`p-3 rounded-lg border text-left transition text-xs font-semibold ${
                contentType === t
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600"
                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <div>{CONTENT_TYPE_LABELS[t]}</div>
            </button>
          ))}
        </div>
        {fieldErrors.contentType && (
          <p className="text-[11px] text-red-600">{fieldErrors.contentType[0]}</p>
        )}
      </div>

      {/* 2. Article Core Content */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-2 border-b border-neutral-100 flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-700" />
          Article Content & Editorial Details
        </h2>

        {/* Title */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-700">
            Article Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Modern Cassava Stems Multiplication in Ogun State"
            className="w-full rounded-lg border border-neutral-200 px-3.5 py-2 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
          />
          {fieldErrors.title && (
            <p className="text-[11px] text-red-600">{fieldErrors.title[0]}</p>
          )}
        </div>

        {/* Custom Slug (Optional) */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-700">
            URL Slug (Optional - auto-generated from title if blank)
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. modern-cassava-stems-multiplication-ogun"
            className="w-full rounded-lg border border-neutral-200 px-3.5 py-2 text-xs sm:text-sm text-neutral-900 font-mono focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
          />
          {fieldErrors.slug && (
            <p className="text-[11px] text-red-600">{fieldErrors.slug[0]}</p>
          )}
        </div>

        {/* Excerpt */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-700">
            Brief Summary / Lead Paragraph
          </label>
          <textarea
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="A concise overview of the article highlighting key takeaways for farmers or consumers..."
            className="w-full rounded-lg border border-neutral-200 px-3.5 py-2 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
          {fieldErrors.excerpt && (
            <p className="text-[11px] text-red-600">{fieldErrors.excerpt[0]}</p>
          )}
        </div>

        {/* Body Content */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-700">
            Full Article Content <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={12}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write full agricultural guidance, extension notes, policy bulletin, or nutritional advice..."
            className="w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono leading-relaxed"
          />
          <div className="text-[11px] text-neutral-400 text-right">
            {body.length} characters
          </div>
          {fieldErrors.body && (
            <p className="text-[11px] text-red-600">{fieldErrors.body[0]}</p>
          )}
        </div>

        {/* Cover Image URL */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-700">
            Cover Image URL (Optional)
          </label>
          <input
            type="url"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://images.example.com/farm-cassava.jpg"
            className="w-full rounded-lg border border-neutral-200 px-3.5 py-2 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
          />
          {fieldErrors.coverImageUrl && (
            <p className="text-[11px] text-red-600">{fieldErrors.coverImageUrl[0]}</p>
          )}
        </div>
      </div>

      {/* 3. Topic & Nigerian Geographical Context */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-2 border-b border-neutral-100 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-700" />
          Agricultural Discipline & Nigerian Region
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">Topic</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
            >
              <option value="">Select or leave general</option>
              {CANONICAL_KNOWLEDGE_TOPICS.map((top) => (
                <option key={top} value={top}>
                  {top}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">State</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
            >
              <option value="">Nationwide / General</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">LGA (Optional)</label>
            <input
              type="text"
              value={lga}
              onChange={(e) => setLga(e.target.value)}
              placeholder="e.g. Abeokuta South"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
            />
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-700">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. cassava, stems, pest-control, ogun-farmers"
            className="w-full rounded-lg border border-neutral-200 px-3.5 py-2 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
          />
          {fieldErrors.tags && (
            <p className="text-[11px] text-red-600">{fieldErrors.tags[0]}</p>
          )}
        </div>

        {/* Featured Flag */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="isFeatured"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="isFeatured" className="text-xs text-neutral-700 font-medium">
            Mark as Featured Article (Prioritize on Knowledge Hub & Home highlights)
          </label>
        </div>
      </div>

      {/* 4. Source Attribution */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-2 border-b border-neutral-100 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-emerald-700" />
          Source Attribution & Transparency
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">
              Source Name / Agency
            </label>
            <input
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="e.g. Federal Ministry of Agriculture"
              className="w-full rounded-lg border border-neutral-200 px-3.5 py-2 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">
              Source Organization Type
            </label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
            >
              <option value="">Select source type</option>
              {KNOWLEDGE_SOURCE_TYPES.map((st) => (
                <option key={st} value={st}>
                  {SOURCE_TYPE_LABELS[st]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">
              Source URL Reference
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://fmafs.gov.ng/announcements"
              className="w-full rounded-lg border border-neutral-200 px-3.5 py-2 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
            />
          </div>
        </div>
      </div>

      {/* 5. Event & Training Logistics (conditional) */}
      {(contentType === "EVENT" || contentType === "TRAINING") && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/20 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-indigo-950 uppercase tracking-wider pb-2 border-b border-indigo-100 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-700" />
            Training & Event Logistics
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={eventStartDate}
                onChange={(e) => setEventStartDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3.5 py-2 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={eventEndDate}
                onChange={(e) => setEventEndDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3.5 py-2 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
              />
              {fieldErrors.eventEndDate && (
                <p className="text-[11px] text-red-600">
                  {fieldErrors.eventEndDate[0]}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">
                Venue Location
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. IITA Conference Hall, Ibadan"
                className="w-full rounded-lg border border-neutral-200 px-3.5 py-2 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">
                Organizer Body
              </label>
              <input
                type="text"
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                placeholder="e.g. National Agricultural Extension Service"
                className="w-full rounded-lg border border-neutral-200 px-3.5 py-2 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-neutral-700">
                Registration / Enrollment Link
              </label>
              <input
                type="url"
                value={registrationUrl}
                onChange={(e) => setRegistrationUrl(e.target.value)}
                placeholder="https://events.example.com/register"
                className="w-full rounded-lg border border-neutral-200 px-3.5 py-2 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
              />
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="isOnline"
                checked={isOnline}
                onChange={(e) => setIsOnline(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="isOnline" className="text-xs text-neutral-700 font-medium">
                This program is held online / virtually
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 6. Publication Status & Actions */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-neutral-700 block">
              Publication Status
            </span>
            <div className="flex items-center gap-4 text-xs font-medium text-neutral-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="DRAFT"
                  checked={status === "DRAFT"}
                  onChange={() => setStatus("DRAFT")}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Draft (Isolated)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="PUBLISHED"
                  checked={status === "PUBLISHED"}
                  onChange={() => setStatus("PUBLISHED")}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Published (Publicly Viewable)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="ARCHIVED"
                  checked={status === "ARCHIVED"}
                  onChange={() => setStatus("ARCHIVED")}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Archived</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            <Link
              href="/admin/knowledge"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition min-h-[44px]"
            >
              Cancel
            </Link>

            <button
              type="button"
              disabled={isPending || hasProhibitedContent}
              onClick={() => handleSubmit("DRAFT")}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-50 min-h-[44px]"
            >
              <Save className="h-4 w-4" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              disabled={isPending || hasProhibitedContent}
              onClick={() => handleSubmit("PUBLISHED")}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition disabled:opacity-50 min-h-[44px]"
            >
              <Send className="h-4 w-4" />
              <span>{isEditing ? "Update & Publish" : "Publish Now"}</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
