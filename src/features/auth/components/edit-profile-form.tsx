"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/features/auth/actions";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";

interface EditProfileFormProps {
  initialFullName: string;
  initialPhone: string;
  initialState: string;
  initialLga: string;
  initialLocationAddress?: string | null;
  initialBio?: string | null;
}

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

export function EditProfileForm({
  initialFullName,
  initialPhone,
  initialState,
  initialLga,
  initialLocationAddress,
  initialBio,
}: EditProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.message && (
        <div
          className={`flex items-center space-x-2 rounded-lg border p-3 text-xs ${
            state.success
              ? "border-primary-200 bg-primary-50 text-primary-800"
              : "border-destructive/20 bg-destructive/5 text-destructive"
          }`}
        >
          {state.success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{state.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="fullName" className="block text-xs font-medium text-foreground">
            Full Name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            defaultValue={initialFullName}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 sm:text-sm"
          />
          {state?.errors?.fullName && (
            <p className="mt-1 text-xs text-destructive">{state.errors.fullName[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-xs font-medium text-foreground">
            Phone Number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            defaultValue={initialPhone}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 sm:text-sm"
          />
          {state?.errors?.phone && (
            <p className="mt-1 text-xs text-destructive">{state.errors.phone[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="state" className="block text-xs font-medium text-foreground">
            State
          </label>
          <select
            id="state"
            name="state"
            required
            defaultValue={initialState}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 sm:text-sm"
          >
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
            Local Government Area (LGA)
          </label>
          <input
            id="lga"
            name="lga"
            type="text"
            required
            defaultValue={initialLga}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 sm:text-sm"
          />
          {state?.errors?.lga && (
            <p className="mt-1 text-xs text-destructive">{state.errors.lga[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="locationAddress" className="block text-xs font-medium text-foreground">
            Address / Landmark
          </label>
          <input
            id="locationAddress"
            name="locationAddress"
            type="text"
            defaultValue={initialLocationAddress || ""}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 sm:text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="bio" className="block text-xs font-medium text-foreground">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            defaultValue={initialBio || ""}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 sm:text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 sm:text-sm"
        >
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {isPending ? "Saving changes..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
