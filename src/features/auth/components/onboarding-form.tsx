"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { completeOnboardingAction } from "@/features/auth/actions";
import { SELF_ASSIGNABLE_ROLES, SelfAssignableRole } from "@/types/auth";
import {
  AlertCircle,
  ShoppingBag,
  Tractor,
  Building2,
  Briefcase,
  Wrench,
  Cog,
  GraduationCap,
} from "lucide-react";

interface OnboardingFormProps {
  initialEmail?: string | null;
  initialPhone?: string | null;
  initialFullName?: string | null;
}

const ROLE_METADATA: Record<
  SelfAssignableRole,
  { title: string; description: string; icon: React.ElementType }
> = {
  BUYER: {
    title: "Buyer / Consumer",
    description: "Purchase farm produce, wholesale commodities, or shared grocery pools",
    icon: ShoppingBag,
  },
  FARMER: {
    title: "Farmer / Producer",
    description: "Produce crops, rear livestock, manage farms, and sell wholesale produce",
    icon: Tractor,
  },
  BUSINESS: {
    title: "Agribusiness / Off-taker",
    description: "Commercial food processor, commodity aggregator, or FMCG exporter",
    icon: Building2,
  },
  JOB_SEEKER: {
    title: "Agricultural Labor / Operator",
    description: "Farm worker, tractor driver, agronomist, or graduate seeking employment",
    icon: Briefcase,
  },
  SERVICE_PROVIDER: {
    title: "Service Provider",
    description: "Offer soil testing, drone spraying, land clearing, or veterinary services",
    icon: Wrench,
  },
  EQUIPMENT_OWNER: {
    title: "Equipment Owner / Lessor",
    description: "Rent out tractors, combine harvesters, planters, and farm implements",
    icon: Cog,
  },
  EXPERT: {
    title: "Agronomic Specialist / Extensionist",
    description: "Provide certified agronomic advisory, pest guidance, and training",
    icon: GraduationCap,
  },
};

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

export function OnboardingForm({
  initialEmail,
  initialPhone,
  initialFullName,
}: OnboardingFormProps) {
  const [state, formAction, isPending] = useActionState(completeOnboardingAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.push("/account");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-8">
      {state?.message && !state.success && (
        <div className="flex items-center space-x-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      {/* Step 1: Basic Profile Details */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">
          1. Basic Profile Information
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Provide your contact details so trading partners and logistics providers can connect with you.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="fullName" className="block text-xs font-medium text-foreground">
              Full Name *
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              defaultValue={initialFullName || ""}
              placeholder="e.g. Ibrahim Adebayo"
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 sm:text-sm"
            />
            {state?.errors?.fullName && (
              <p className="mt-1 text-xs text-destructive">{state.errors.fullName[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-foreground">
              Nigerian Phone Number *
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              defaultValue={initialPhone || ""}
              placeholder="e.g. 08012345678"
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 sm:text-sm"
            />
            {state?.errors?.phone && (
              <p className="mt-1 text-xs text-destructive">{state.errors.phone[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-medium text-foreground">
              Email Address (Read-only)
            </label>
            <input
              id="email"
              type="email"
              disabled
              value={initialEmail || ""}
              className="mt-1 block w-full rounded-md border bg-muted px-3 py-2 text-xs text-muted-foreground sm:text-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="state" className="block text-xs font-medium text-foreground">
              State *
            </label>
            <select
              id="state"
              name="state"
              required
              defaultValue=""
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 sm:text-sm"
            >
              <option value="" disabled>Select State</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {state?.errors?.state && (
              <p className="mt-1 text-xs text-destructive">{state.errors.state[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="lga" className="block text-xs font-medium text-foreground">
              Local Government Area (LGA) *
            </label>
            <input
              id="lga"
              name="lga"
              type="text"
              required
              placeholder="e.g. Ido / Ikeja / Kano Municipal"
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 sm:text-sm"
            />
            {state?.errors?.lga && (
              <p className="mt-1 text-xs text-destructive">{state.errors.lga[0]}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="bio" className="block text-xs font-medium text-foreground">
              Bio / Agricultural Background (Optional)
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={2}
              placeholder="Briefly describe your farming experience, business, or interests..."
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Step 2: Role Selection */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            2. How will you participate in AgroMarket?
          </h2>
          <p className="text-xs text-muted-foreground">
            You can hold <strong>multiple roles simultaneously</strong>. Select all roles that apply to you.
            (For example, a user can be both a <strong>Farmer</strong> and an <strong>Equipment Owner</strong>).
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SELF_ASSIGNABLE_ROLES.map((roleKey) => {
            const meta = ROLE_METADATA[roleKey];
            const IconComponent = meta.icon;
            const isDefaultBuyer = roleKey === "BUYER";

            return (
              <label
                key={roleKey}
                htmlFor={`role-${roleKey}`}
                className="relative flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition hover:border-primary-500 hover:bg-primary-50/20"
              >
                <div className="flex h-5 items-center">
                  <input
                    id={`role-${roleKey}`}
                    name="roles"
                    type="checkbox"
                    value={roleKey}
                    defaultChecked={isDefaultBuyer}
                    className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-4 w-4 text-primary-700" />
                    <span className="text-xs font-semibold text-foreground sm:text-sm">
                      {meta.title}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {meta.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 disabled:opacity-50 sm:text-sm"
        >
          {isPending ? "Completing setup..." : "Complete Profile & Start"}
        </button>
      </div>
    </form>
  );
}
