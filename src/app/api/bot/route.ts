export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { getBotWebhookCallback } from "@/lib/bot";

export async function POST(request: Request) {
  const handler = getBotWebhookCallback();
  if (!handler) {
    return new Response(
      JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  return handler(request);
}
