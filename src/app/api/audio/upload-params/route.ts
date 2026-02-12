import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAdminResponse } from "@/lib/auth-admin";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * GET: Return signed upload params so the client can upload directly to Cloudinary.
 * No file passes through our server → no body size limit. Env stays on backend only.
 */
export async function GET(request: Request) {
  const unauth = await requireAdminResponse(request);
  if (unauth) return unauth;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary not configured" },
      { status: 503 }
    );
  }

  const timestamp = Math.round(Date.now() / 1000);
  // Cloudinary verifies using only folder + timestamp (resource_type is not part of the sign string)
  const paramsToSign = {
    folder: "audio",
    timestamp,
  };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    apiSecret
  );

  return NextResponse.json({
    cloudName,
    apiKey,
    signature,
    timestamp,
    folder: "audio",
    resource_type: "video",
  });
}
