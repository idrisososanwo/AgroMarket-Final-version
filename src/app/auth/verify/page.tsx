import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-xl border bg-card p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Account Verified!
          </h2>
          <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
            Your email has been successfully verified. You can now log in and complete your profile onboarding.
          </p>
          <div className="mt-6">
            <Link
              href="/auth/login"
              className="inline-flex w-full items-center justify-center rounded-md bg-primary-600 px-4 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-primary-700 sm:text-sm"
            >
              Sign In to Continue <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
