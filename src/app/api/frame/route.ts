import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Frame from "@/models/Frame";

export async function GET() {
  try {
    await connectDB();
    const frames = await Frame.find({});
    return NextResponse.json(frames);
  } catch (error) {
    console.error("GET Error:", error); // Use the variable to stop the warning
    return NextResponse.json({ error: "Failed to fetch frames" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const newFrame = await Frame.create(body);
    return NextResponse.json(newFrame, { status: 201 });
  } catch (error) {
    console.error("POST Error:", error); // Use the variable here too
    return NextResponse.json({ error: "Failed to create frame" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { id } = await request.json();
    await Frame.findByIdAndDelete(id);
    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (error) {
    console.error("DELETE Error:", error); // And here
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}