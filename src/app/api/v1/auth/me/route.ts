import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth, handleApiError } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/auth/me
 * Retrieves the authenticated user's authoritative profile and roles.
 * Requires `Authorization: Bearer <token>`.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiAuth(req);

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            state: user.state,
            lga: user.lga,
            roles: user.roles,
            isVerified: user.isVerified,
            isOnboarded: user.isOnboarded,
            createdAt: user.createdAt,
          },
        },
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
