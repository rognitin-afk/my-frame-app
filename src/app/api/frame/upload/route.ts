import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import connectDB from "@/lib/mongodb";
import Frame from "@/models/Frame";
import { requireAdminResponse } from "@/lib/auth-admin";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 }
    );
  }

  const name = (formData.get("name") as string)?.trim() || "";
  const category = (formData.get("category") as string)?.trim() || "General";
  if (!name) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: "frames", resource_type: "image" },
          (err, res) => {
            if (err) reject(err);
            else if (res) resolve(res);
            else reject(new Error("No result from Cloudinary"));
          }
        )
        .end(buffer);
    });

    await connectDB();
    const newFrame = await Frame.create({
      name,
      src: result.secure_url,
      category,
    });

    return NextResponse.json(newFrame, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
