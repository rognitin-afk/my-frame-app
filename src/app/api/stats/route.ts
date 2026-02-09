import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Stats, { getStatsId } from "@/models/Stats";
import { requireAdminResponse } from "@/lib/auth-admin";

export async function GET(request: Request) {
  const unauth = await requireAdminResponse(request);
  if (unauth) return unauth;

  try {
    await connectDB();
    const doc = await Stats.findById(getStatsId()).lean();
    const downloadCount = typeof doc?.downloadCount === "number" ? doc.downloadCount : 0;
    return NextResponse.json({ downloadCount });
  } catch (error) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
