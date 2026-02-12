import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Frame from "@/models/Frame";
import { requireAdminResponse } from "@/lib/auth-admin";

/**
 * POST: Save frame after client uploaded directly to Cloudinary.
 * Body: { name: string, src: string, category?: string }
 */
export async function POST(request: Request) {
  const unauth = await requireAdminResponse(request);
  if (unauth) return unauth;

  let body: { name?: string; src?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const src = typeof body?.src === "string" ? body.src.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim() || "General" : "General";
  if (!name || !src) {
    return NextResponse.json(
      { error: "name and src are required" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const newFrame = await Frame.create({ name, src, category });
    return NextResponse.json(newFrame, { status: 201 });
  } catch (error) {
    console.error("Frame save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
