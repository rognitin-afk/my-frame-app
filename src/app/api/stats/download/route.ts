import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Stats, { getStatsId } from "@/models/Stats";
import Frame from "@/models/Frame";

export async function POST(request: Request) {
  try {
    await connectDB();

    let frameId: string | null = null;
    try {
      const body = await request.json().catch(() => ({}));
      frameId = typeof body?.frameId === "string" ? body.frameId : null;
    } catch {
      // no body or invalid JSON is ok
    }

    // Increment global download count (upsert singleton if needed)
    await Stats.findByIdAndUpdate(
      getStatsId(),
      { $inc: { downloadCount: 1 } },
      { upsert: true, new: true }
    );

    // Increment this frame's download count if frameId provided
    if (frameId) {
      await Frame.findByIdAndUpdate(frameId, { $inc: { downloadCount: 1 } });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/stats/download error:", error);
    return NextResponse.json(
      { error: "Failed to record download" },
      { status: 500 }
    );
  }
}
