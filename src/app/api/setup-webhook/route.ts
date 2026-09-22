import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const setupSecret = process.env.SETUP_SECRET;

  if (setupSecret && secret !== setupSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || botToken === "placeholder") {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });
  }

  // Build webhook URL
  const host = req.headers.get("host") || req.headers.get("x-forwarded-host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const webhookUrl = `${proto}://${host}/api/telegram`;

  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const body: Record<string, string> = { url: webhookUrl };
    if (webhookSecret) body.secret_token = webhookSecret;

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json() as { ok: boolean; description?: string };

    if (data.ok) {
      return NextResponse.json({
        success: true,
        message: "Webhook berhasil diset!",
        webhook_url: webhookUrl,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: data.description,
      }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
