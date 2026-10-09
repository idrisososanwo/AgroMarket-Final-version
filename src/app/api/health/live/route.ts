import { NextResponse } from "next/server";
import { checkLiveness } from "@/features/observability/health";

export const dynamic = "force-dynamic";

/**
 * Liveness Probe: Fast check that verifies the Node.js process is active.
 * Fails closed only if process cannot execute.
 */
export async function GET() {
  const result = checkLiveness();
  return NextResponse.json(result, { status: 200 });
}
