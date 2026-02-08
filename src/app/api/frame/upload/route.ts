import { NextResponse } from "next/server";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import connectDB from "@/lib/mongodb";
import Frame from "@/models/Frame";

// Only WebP, JPG, PNG, and iPhone (HEIC/HEIF)
const ALLOWED_EXTENSIONS = new Set([".webp", ".jpg", ".jpeg", ".png", ".heic", ".heif"]);
const ALLOWED_TYPES = new Set([
  "image/webp", "image/jpeg", "image/png", "image/heic", "image/heif",
]);

function isAllowedImage(file: File): boolean {
  const ext = path.extname(file.name).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) return true;
  if (ALLOWED_TYPES.has(file.type)) return true;
  return false;
}

export async function POST(request: Request) {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET." },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string)?.trim();
    const category = (formData.get("category") as string)?.trim() || "General";

    if (!file || !name) {
      return NextResponse.json(
        { error: "Missing file or name" },
        { status: 400 }
      );
    }

    if (!isAllowedImage(file)) {
      return NextResponse.json(
        { error: "Only WebP, JPG, PNG, and iPhone (HEIC/HEIF) images are allowed." },
        { status: 400 }
      );
    }

    const ext = (path.extname(file.name) || ".png").toLowerCase();
    const safeSlug = `${Date.now()}-${name.replace(/[^a-zA-Z0-9-_]/g, "-")}${ext}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    const dataUri = `data:${file.type || "image/png"};base64,${buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "frames",
      public_id: safeSlug.replace(ext, ""),
      overwrite: true,
    });

    await connectDB();
    const newFrame = await Frame.create({
      name,
      src: result.secure_url,
      category,
    });

    return NextResponse.json(newFrame, { status: 201 });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json(
      { error: "Failed to upload frame" },
      { status: 500 }
    );
  }
}
