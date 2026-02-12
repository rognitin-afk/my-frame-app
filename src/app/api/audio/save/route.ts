import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Audio from "@/models/Audio";
import { requireAdminResponse } from "@/lib/auth-admin";

/**
 * POST: Save an audio record after client has uploaded directly to Cloudinary.
 * Body: { name: string, src: string } (src = secure_url from Cloudinary).
 */
export async function POST(request: Request) {
  const unauth = await requireAdminResponse(request);
  if (unauth) return unauth;

  let body: { name?: string; src?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
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
    const newAudio = await Audio.create({ name, src });
    return NextResponse.json(newAudio, { status: 201 });
  } catch (error) {
    console.error("Audio save error:", error);
    return NextResponse.json(
      { error: "Failed to save" },
      { status: 500 }
    );
  }
}
