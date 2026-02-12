import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Audio from "@/models/Audio";
import { requireAdminResponse } from "@/lib/auth-admin";

export async function GET() {
  try {
    await connectDB();
    const list = await Audio.find({}).sort({ createdAt: -1 });
    return NextResponse.json(list);
  } catch (error) {
    console.error("GET audio error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audio" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const unauth = await requireAdminResponse(request);
  if (unauth) return unauth;
  try {
    const body = await request.json().catch(() => ({}));
    const id = body?.id;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await connectDB();
    await Audio.findByIdAndDelete(id);
    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (error) {
    console.error("DELETE audio error:", error);
    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 }
    );
  }
}
