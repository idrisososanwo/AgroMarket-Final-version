"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client error to monitoring service when ready
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4 rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Something went wrong!</h2>
        <p className="text-xs text-muted-foreground">
          {error.message || "An unexpected error occurred while processing your request."}
        </p>
        <div className="pt-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary-700"
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
