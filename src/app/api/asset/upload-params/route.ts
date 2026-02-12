import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAdminResponse } from "@/lib/auth-admin";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * GET: Signed params for client to upload directly to Cloudinary (folder: assets).
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
  const paramsToSign = { folder: "assets", timestamp };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return NextResponse.json({
    cloudName,
    apiKey,
    signature,
    timestamp,
    folder: "assets",
    resource_type: "image",
  });
}
