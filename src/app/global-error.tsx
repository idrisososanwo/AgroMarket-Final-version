"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Critical root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-bold text-red-600">Critical System Error</h1>
          <p className="text-sm text-gray-600">
            A critical error interrupted the application shell.
          </p>
          <button
            onClick={() => reset()}
            className="rounded bg-green-700 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
