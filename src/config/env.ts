import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required").optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  PAYSTACK_SECRET_KEY: z.string().min(1).optional(),
  PAYSTACK_PUBLIC_KEY: z.string().min(1).optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().min(1).optional(),
  FLUTTERWAVE_SECRET_KEY: z.string().min(1).optional(),
  FLUTTERWAVE_PUBLIC_KEY: z.string().min(1).optional(),
  FLUTTERWAVE_WEBHOOK_SECRET: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  SCHEDULER_SECRET: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export interface EnvironmentInspectionResult {
  nodeEnv: string;
  isProduction: boolean;
  coreDatabaseConfigured: boolean;
  serviceRoleConfigured: boolean;
  paystackConfigured: boolean;
  flutterwaveConfigured: boolean;
  schedulerConfigured: boolean;
  aiConfigured: boolean;
  missingRequired: string[];
  present: string[];
}

/**
 * Safely inspects environment readiness without ever printing or leaking secret values.
 */
export function inspectEnvironmentReadiness(): EnvironmentInspectionResult {
  const missingRequired: string[] = [];
  const present: string[] = [];

  const knownKeys = [
    "NODE_ENV",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_APP_URL",
    "PAYSTACK_SECRET_KEY",
    "PAYSTACK_PUBLIC_KEY",
    "PAYSTACK_WEBHOOK_SECRET",
    "FLUTTERWAVE_SECRET_KEY",
    "FLUTTERWAVE_PUBLIC_KEY",
    "FLUTTERWAVE_WEBHOOK_SECRET",
    "CRON_SECRET",
    "SCHEDULER_SECRET",
    "GEMINI_API_KEY",
  ];

  for (const key of knownKeys) {
    if (process.env[key] && process.env[key]!.trim().length > 0) {
      present.push(key);
    }
  }

  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.trim().length > 0);
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim().length > 0);
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim().length > 0);

  if (!hasUrl) missingRequired.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!hasAnon) missingRequired.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (process.env.NODE_ENV === "production" && !hasServiceRole) {
    missingRequired.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  const paystackConfigured = Boolean(
    process.env.PAYSTACK_SECRET_KEY &&
    (process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY)
  );

  const flutterwaveConfigured = Boolean(
    process.env.FLUTTERWAVE_SECRET_KEY &&
    process.env.FLUTTERWAVE_WEBHOOK_SECRET
  );

  const schedulerConfigured = Boolean(
    (process.env.CRON_SECRET && process.env.CRON_SECRET.trim().length > 0) ||
    (process.env.SCHEDULER_SECRET && process.env.SCHEDULER_SECRET.trim().length > 0)
  );

  const aiConfigured = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0
  );

  return {
    nodeEnv: process.env.NODE_ENV || "development",
    isProduction: process.env.NODE_ENV === "production",
    coreDatabaseConfigured: hasUrl && hasAnon,
    serviceRoleConfigured: hasServiceRole,
    paystackConfigured,
    flutterwaveConfigured,
    schedulerConfigured,
    aiConfigured,
    missingRequired,
    present,
  };
}

function validateEnv(): Env {
  const isTest = process.env.NODE_ENV === "test";

  // Provide deterministic fallback for test runners to prevent spurious error noise
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || (isTest ? "https://placeholder-test.supabase.co" : undefined);
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (isTest ? "placeholder-test-anon-key" : undefined);

  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnon,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
    PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY,
    PAYSTACK_WEBHOOK_SECRET: process.env.PAYSTACK_WEBHOOK_SECRET,
    FLUTTERWAVE_SECRET_KEY: process.env.FLUTTERWAVE_SECRET_KEY,
    FLUTTERWAVE_PUBLIC_KEY: process.env.FLUTTERWAVE_PUBLIC_KEY,
    FLUTTERWAVE_WEBHOOK_SECRET: process.env.FLUTTERWAVE_WEBHOOK_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    SCHEDULER_SECRET: process.env.SCHEDULER_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  });

  if (!parsed.success) {
    // Only log field names, NEVER actual secret values
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid production environment variables. Check server deployment configuration.");
    }
  }

  return (parsed.data ?? {
    NODE_ENV: "development",
    NEXT_PUBLIC_SUPABASE_URL: "https://placeholder-project.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: undefined,
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  }) as Env;
}

export const env = validateEnv();
