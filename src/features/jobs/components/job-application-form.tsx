"use client";

import { useState } from "react";
import { applyForJobAction } from "../actions";
import { applyForJobSchema } from "../validation";
import { CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";

interface JobApplicationFormProps {
  jobId: string;
  jobTitle: string;
  isJobActive?: boolean;
}

export function JobApplicationForm({
  jobId,
  jobTitle,
  isJobActive = true,
}: JobApplicationFormProps) {
  const [coverNote, setCoverNote] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isJobActive) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center">
        <p className="text-sm font-medium text-neutral-600">
          This job placement is not currently accepting applications.
        </p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-3">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-emerald-950">
          Application Submitted Successfully
        </h3>
        <p className="mt-1 text-xs text-emerald-800 max-w-md mx-auto">
          Your application for <strong>{jobTitle}</strong> has been received by the farm employer. You can track the status in your account dashboard.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    // Client-side validation check
    const clientParsed = applyForJobSchema.safeParse({
      jobId,
      coverNote: coverNote || null,
      resumeUrl: resumeUrl || null,
    });

    if (!clientParsed.success) {
      setFieldErrors(clientParsed.error.flatten().fieldErrors);
      setErrorMessage("Please verify your application fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await applyForJobAction({
        jobId,
        coverNote,
        resumeUrl: resumeUrl || null,
      });

      if (!response.success) {
        setErrorMessage(response.error || "Failed to submit application.");
        if (response.fieldErrors) {
          setFieldErrors(response.fieldErrors);
        }
      } else {
        setIsSuccess(true);
      }
    } catch {
      setErrorMessage("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-5"
    >
      <div>
        <h3 className="text-base font-bold text-neutral-900">
          Apply for this Position
        </h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Submit your cover note and credential links directly to the verified farm employer.
        </p>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Cover Note */}
      <div>
        <label
          htmlFor="coverNote"
          className="block text-xs font-semibold text-neutral-800 mb-1"
        >
          Cover Note & Experience Summary <span className="text-neutral-400 font-normal">(Optional)</span>
        </label>
        <textarea
          id="coverNote"
          value={coverNote}
          onChange={(e) => setCoverNote(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Describe your agricultural background, relevant certifications, experience with specific machinery or crops, and availability..."
          className="w-full rounded-xl border border-neutral-300 p-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <div className="flex justify-between items-center mt-1">
          {fieldErrors.coverNote && (
            <p className="text-[11px] text-rose-600">{fieldErrors.coverNote[0]}</p>
          )}
          <span className="text-[11px] text-neutral-400 ml-auto">
            {coverNote.length}/2000
          </span>
        </div>
      </div>

      {/* Resume URL */}
      <div>
        <label
          htmlFor="resumeUrl"
          className="block text-xs font-semibold text-neutral-800 mb-1"
        >
          Resume / CV Document Web Link <span className="text-neutral-400 font-normal">(Optional)</span>
        </label>
        <input
          id="resumeUrl"
          type="url"
          value={resumeUrl}
          onChange={(e) => setResumeUrl(e.target.value)}
          placeholder="https://drive.google.com/... or https://example.com/cv.pdf"
          className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
        />
        {fieldErrors.resumeUrl && (
          <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.resumeUrl[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 transition min-h-[44px]"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Submitting Application...</span>
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            <span>Submit Application</span>
          </>
        )}
      </button>
    </form>
  );
}
