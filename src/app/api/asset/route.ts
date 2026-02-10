import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Asset from "@/models/Asset";
import { requireAdminResponse } from "@/lib/auth-admin";

export async function GET() {
  try {
    await connectDB();
    const assets = await Asset.find({}).sort({ createdAt: -1 });
    return NextResponse.json(assets);
  } catch (error) {
    console.error("GET assets error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
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
    await Asset.findByIdAndDelete(id);
    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (error) {
    console.error("DELETE asset error:", error);
    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 }
    );
  }
}
