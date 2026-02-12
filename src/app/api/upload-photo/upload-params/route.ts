import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * GET: Signed params for client to upload user photo directly to Cloudinary (folder: user-photos).
 * No auth — used by main page for canvas user photo.
 */
export async function GET() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Upload not configured" },
      { status: 503 }
    );
  }

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { folder: "user-photos", timestamp };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return NextResponse.json({
    cloudName,
    apiKey,
    signature,
    timestamp,
    folder: "user-photos",
    resource_type: "image",
  });
}
