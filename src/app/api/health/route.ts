import { NextResponse } from "next/server";
import { db } from "@/db";
import { botStats } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Quick DB check
    await db.select().from(botStats).limit(1);
    return NextResponse.json({
      status: "ok",
      message: "TeleBot Pro is running",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch {
    return NextResponse.json({
      status: "ok",
      message: "TeleBot Pro is running",
      timestamp: new Date().toISOString(),
      database: "not connected",
    });
  }
}
