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
          allowed_updates: [
            "message",
            "chat_member",
            "edited_message",
            "callback_query",
            "poll",
            "poll_answer",
          ],
          drop_pending_updates: true,
        }),
      }
    );
    const setWebhookData = await setWebhookRes.json();

    // Get webhook info
    const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
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
          { command: "uptime", description: "Uptime server" },
          { command: "speedtest", description: "Tes kecepatan internet server" },
          { command: "tagall", description: "Tag semua member grup (admin only)" },
          { command: "tagadmin", description: "Tag semua admin grup" },
          { command: "warn", description: "Beri peringatan ke user (reply pesan)" },
          { command: "warnings", description: "Lihat peringatan user (reply pesan)" },
          { command: "kick", description: "Kick member (reply pesan, admin only)" },
          { command: "mute", description: "Mute member [menit] (reply pesan, admin only)" },
          { command: "unmute", description: "Unmute member (reply pesan, admin only)" },
          { command: "promote", description: "Jadikan admin (reply pesan)" },
          { command: "demote", description: "Cabut status admin (reply pesan)" },
          { command: "addbanned", description: "Tambah kata terlarang: /addbanned [kata]" },
          { command: "delbanned", description: "Hapus kata terlarang: /delbanned [kata]" },
          { command: "listbanned", description: "Lihat daftar kata terlarang" },
          { command: "antispam", description: "Toggle anti-spam: /antispam on|off" },
          { command: "note", description: "Simpan catatan: /note [kunci] [isi]" },
          { command: "getnote", description: "Ambil catatan: /getnote [kunci]" },
          { command: "notes", description: "Lihat semua catatan" },
          { command: "delnote", description: "Hapus catatan: /delnote [kunci]" },
          { command: "stats", description: "Statistik grup" },
          { command: "topactive", description: "Top 10 member paling aktif" },
          { command: "info", description: "Info bot dan grup" },
          { command: "sticker", description: "Buat stiker dari teks: /sticker [teks]" },
          { command: "qr", description: "Buat QR Code: /qr [teks/URL]" },
          { command: "calc", description: "Kalkulator: /calc [ekspresi]" },
          { command: "currency", description: "Konversi mata uang: /currency [jumlah] [dari] [ke]" },
          { command: "translate", description: "Terjemah teks: /translate [bahasa] [teks]" },
          { command: "weather", description: "Cuaca kota: /weather [kota]" },
          { command: "poll", description: "Buat polling: /poll [pertanyaan]|[opsi1]|[opsi2]" },
          { command: "setwelcome", description: "Atur pesan sambutan" },
          { command: "welcome", description: "Toggle pesan sambutan: /welcome on|off" },
          { command: "setmaxwarn", description: "Atur maks peringatan: /setmaxwarn [1-10]" },
          { command: "gift", description: "Kirim gift ke user: /gift @username" },
        ],
      }),
    });

    return Response.json({
      success: true,
      webhook_url: webhookUrl,
      set_webhook: setWebhookData,
      webhook_info: infoData,
      commands_count: 35,
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
