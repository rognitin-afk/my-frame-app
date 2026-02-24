import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongodb";
import District from "../../../models/District";

export async function GET() {
  try {
    await connectDB();
    const districts = await District.find({}).sort({ name: 1 });
    return NextResponse.json(districts);
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch districts" },
      { status: 500 },
    );
  }
}