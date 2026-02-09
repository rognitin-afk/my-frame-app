import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongodb";
import Frame from "../../../models/Frame";
import { requireAdminResponse } from "../../../lib/auth-admin";

export async function GET() {
  try {
    await connectDB();
    const frames = await Frame.find({}).sort({ createdAt: -1 });
    return NextResponse.json(frames);
  } catch (error) {
    console.error("GET Error:", error); // Use the variable to stop the warning
    return NextResponse.json(
      { error: "Failed to fetch frames" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauth = await requireAdminResponse(request);
  if (unauth) return unauth;
  try {
    await connectDB();
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const src = typeof body?.src === "string" ? body.src.trim() : "";
    if (!name || !src) {
      return NextResponse.json(
        { error: "name and src are required" },
        { status: 400 },
      );
    }
    const newFrame = await Frame.create({
      name,
      src,
      category: body?.category || "General",
    });
    return NextResponse.json(newFrame, { status: 201 });
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json(
      { error: "Failed to create frame" },
      { status: 500 },
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
    await Frame.findByIdAndDelete(id);
    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
