import { NextResponse } from "next/server";
import connectDB from "../../../../lib/mongodb";
import Frame from "../../../../models/Frame";
import { requireAdminResponse } from "../../../../lib/auth-admin";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauth = await requireAdminResponse(request);
  if (unauth) return unauth;
  try {
    await connectDB();
    const body = await request.json();
    const { id } = await params;
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const src = typeof body?.src === "string" ? body.src.trim() : undefined;
    const category =
      typeof body?.category === "string" ? body.category.trim() : undefined;
    const districts = Array.isArray(body?.districts)
      ? body.districts.filter(
          (districtId: any) =>
            typeof districtId === "string" && districtId.length === 24,
        )
      : undefined;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (src !== undefined) updateData.src = src;
    if (category !== undefined) updateData.category = category;
    if (districts !== undefined) updateData.districts = districts;

    const updatedFrame = await Frame.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!updatedFrame) {
      return NextResponse.json({ error: "Frame not found" }, { status: 404 });
    }
    return NextResponse.json(updatedFrame);
  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update frame" },
      { status: 500 },
    );
  }
}
