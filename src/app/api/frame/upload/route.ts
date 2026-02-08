import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import connectDB from "@/lib/mongodb";
import Frame from "@/models/Frame";

const FRAMES_DIR = path.join(process.cwd(), "public", "frames");

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string)?.trim();
    const category = (formData.get("category") as string)?.trim() || "General";

    if (!file || !name) {
      return NextResponse.json(
        { error: "Missing file or name" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use PNG, JPEG, or WebP." },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name) || ".png";
    const safeName = `${Date.now()}-${name.replace(/[^a-zA-Z0-9-_]/g, "-")}${ext}`;
    const publicPath = `/frames/${safeName}`;
    const filePath = path.join(FRAMES_DIR, safeName);

    await mkdir(FRAMES_DIR, { recursive: true });
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    await connectDB();
    const newFrame = await Frame.create({
      name,
      src: publicPath,
      category,
    });

    return NextResponse.json(newFrame, { status: 201 });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json(
      { error: "Failed to upload frame" },
      { status: 500 }
    );
  }
}
