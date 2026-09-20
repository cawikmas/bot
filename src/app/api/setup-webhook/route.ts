export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return Response.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const adminSecret = process.env.SETUP_SECRET || "setup123";

  if (secret !== adminSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXTAUTH_URL || request.url.replace("/api/setup-webhook", "");

  const webhookUrl = `${baseUrl}/api/bot`;

  try {
    // Set webhook
    const setWebhookRes = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "chat_member", "edited_message", "callback_query"],
          drop_pending_updates: true,
        }),
      }
    );
    const setWebhookData = await setWebhookRes.json();

    // Get webhook info
    const infoRes = await fetch(
      `https://api.telegram.org/bot${token}/getWebhookInfo`
    );
    const infoData = await infoRes.json();

    // Set bot commands
    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "start", description: "Mulai & tampilkan bantuan" },
          { command: "help", description: "Tampilkan menu bantuan" },
          { command: "ping", description: "Cek latency bot" },
          { command: "speedtest", description: "Tes kecepatan internet server" },
          { command: "tagall", description: "Tag semua member grup (admin only)" },
          { command: "tagadmin", description: "Tag semua admin grup" },
          { command: "sticker", description: "Buat stiker dari teks: /sticker [teks]" },
          { command: "gift", description: "Kirim gift ke user: /gift @username" },
          { command: "info", description: "Info bot dan grup" },
        ],
      }),
    });

    return Response.json({
      success: true,
      webhook_url: webhookUrl,
      set_webhook: setWebhookData,
      webhook_info: infoData,
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
