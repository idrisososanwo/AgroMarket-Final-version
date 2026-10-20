import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { requireApiAnyRole, handleApiError } from "@/lib/auth/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { ForbiddenError, ValidationError } from "@/lib/errors/app-error";

export const dynamic = "force-dynamic";

const produceImageUploadSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required.").max(255),
  fileType: z.enum(["image/jpeg", "image/png", "image/webp"], {
    errorMap: () => ({ message: "Only JPEG, PNG, and WebP image formats are permitted." }),
  }),
  fileSize: z
    .number()
    .int()
    .positive("File size must be greater than zero.")
    .max(5 * 1024 * 1024, "Image file size exceeds the 5MB maximum limit."),
  listingId: z.string().uuid("Invalid listing identifier format.").optional(),
});

const ALLOWED_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * POST /api/v1/upload/produce-image
 * Securely generates a scoped presigned upload URL for mobile produce photographs.
 *
 * CRITICAL SAFEGUARDS:
 * - Requires authentication with FARMER, BUSINESS, or ADMIN role.
 * - Restricts upload paths to `farmers/${user.id}/...`, preventing users from overwriting or reading others' assets.
 * - Validates permitted MIME types (JPEG, PNG, WebP) and enforces a 5MB size limit.
 * - If listingId is provided, validates that the caller owns the listing.
 * - Uploads go directly to Supabase Storage, avoiding large payloads traversing serverless functions.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAnyRole(req, ["FARMER", "BUSINESS"]);

    // 1. Rate Limiting: 20 upload ticket requests per minute per user
    const rateLimit = checkRateLimit(`upload-image:${user.id}`, 20, 60000);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many upload requests. Please wait a moment before trying again.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString(),
            "Cache-Control": "no-store",
          },
        },
      );
    }

    // 2. Validate Request Body
    const json = await req.json().catch(() => null);
    if (!json || typeof json !== "object") {
      throw new ValidationError("Malformed JSON request body.");
    }

    const parsed = produceImageUploadSchema.safeParse(json);
    if (!parsed.success) {
      return handleApiError(parsed.error);
    }

    const { fileType, listingId } = parsed.data;
    const admin = createAdminClient();

    // 3. Verify Listing Ownership if listingId is provided
    if (listingId) {
      const isSuperuser = user.roles.includes("ADMIN");
      if (!isSuperuser) {
        const { data: listing, error: listingErr } = await admin
          .from("listings")
          .select("id, seller_id")
          .eq("id", listingId)
          .maybeSingle();

        if (listingErr || !listing) {
          throw new ValidationError("Associated listing was not found.");
        }

        if (listing.seller_id !== user.id) {
          throw new ForbiddenError("Unauthorized: You do not own the specified produce listing.");
        }
      }
    }

    // 4. Construct Isolated Storage Path
    const ext = ALLOWED_EXTENSIONS[fileType] || "jpg";
    const secureFileName = `${crypto.randomUUID()}.${ext}`;
    const subfolder = listingId ? `${listingId}/` : "";
    const storagePath = `farmers/${user.id}/${subfolder}${secureFileName}`;

    // 5. Generate Scoped Signed Upload URL from Supabase Storage
    const bucketName = "produce-images";
    const expiresInSeconds = 900; // 15 minutes

    const { data: signedData, error: signedErr } = await admin.storage
      .from(bucketName)
      .createSignedUploadUrl(storagePath);

    if (signedErr) {
      console.error("Storage signed upload error:", signedErr);
      throw new Error(`Failed to generate signed upload URL: ${signedErr.message}`);
    }

    const { data: publicUrlData } = admin.storage.from(bucketName).getPublicUrl(storagePath);

    return NextResponse.json(
      {
        success: true,
        data: {
          bucket: bucketName,
          storagePath,
          signedUploadUrl: signedData.signedUrl,
          token: signedData.token,
          publicUrl: publicUrlData.publicUrl,
          expiresInSeconds,
          maxFileSizeBytes: 5 * 1024 * 1024,
          allowedMimeType: fileType,
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
