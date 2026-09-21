import { NextRequest, NextResponse } from "next/server";
import { handleUpdate } from "@/lib/bot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const webhookSecret = process.env.WEBHOOK_SECRET;

    // Optional: verify secret token header
    if (webhookSecret) {
      const secret = req.headers.get("x-telegram-bot-api-secret-token");
      if (secret !== webhookSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    await handleUpdate(new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "TeleBot Pro Webhook is running",
    timestamp: new Date().toISOString(),
  });
}
