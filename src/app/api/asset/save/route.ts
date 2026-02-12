import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Asset from "@/models/Asset";
import { requireAdminResponse } from "@/lib/auth-admin";

/**
 * POST: Save asset after client uploaded directly to Cloudinary.
 * Body: { name: string, src: string }
 */
export async function POST(request: Request) {
  const unauth = await requireAdminResponse(request);
  if (unauth) return unauth;

  let body: { name?: string; src?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const src = typeof body?.src === "string" ? body.src.trim() : "";
  if (!name || !src) {
    return NextResponse.json(
      { error: "name and src are required" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const newAsset = await Asset.create({ name, src });
    return NextResponse.json(newAsset, { status: 201 });
  } catch (error) {
    console.error("Asset save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
