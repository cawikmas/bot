import { NextRequest, NextResponse } from "next/server";
import { Bot } from "grammy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.SETUP_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
  }

  const baseUrl = req.nextUrl.origin;
  const webhookUrl = `${baseUrl}/api/telegram`;

  try {
    const bot = new Bot(token);
    await bot.api.setWebhook(webhookUrl, {
      allowed_updates: [
        "message",
        "edited_message",
        "callback_query",
        "chat_member",
        "my_chat_member",
        "inline_query",
      ],
    });

    const info = await bot.api.getWebhookInfo();
    const botInfo = await bot.api.getMe();

    // Set bot commands
    await bot.api.setMyCommands([
      { command: "start", description: "Mulai bot" },
      { command: "help", description: "Lihat semua perintah" },
      { command: "ping", description: "Cek latency bot" },
      { command: "info", description: "Info bot dan grup" },
      { command: "id", description: "Lihat ID kamu" },
      { command: "whois", description: "Info member" },
      { command: "rank", description: "Lihat rank XP kamu" },
      { command: "leaderboard", description: "Top 10 member aktif" },
      { command: "profile", description: "Profil kamu" },
      { command: "stats", description: "Statistik bot" },
      { command: "tagall", description: "Tag semua member (admin)" },
      { command: "tagadmin", description: "Tag semua admin" },
      { command: "ban", description: "Ban member (admin)" },
      { command: "unban", description: "Unban member (admin)" },
      { command: "kick", description: "Kick member (admin)" },
      { command: "mute", description: "Mute member (admin)" },
      { command: "unmute", description: "Unmute member (admin)" },
      { command: "warn", description: "Beri peringatan (admin)" },
      { command: "warns", description: "Lihat peringatan" },
      { command: "daily", description: "Klaim hadiah harian" },
      { command: "balance", description: "Cek saldo koin" },
      { command: "gamble", description: "Judi koin" },
      { command: "richlist", description: "Top koin" },
      { command: "dice", description: "Lempar dadu" },
      { command: "flip", description: "Lempar koin" },
      { command: "8ball", description: "Magic 8-ball" },
      { command: "rps", description: "Suit (rock paper scissors)" },
      { command: "joke", description: "Humor acak" },
      { command: "quote", description: "Quote inspirasi" },
      { command: "trivia", description: "Pertanyaan trivia" },
      { command: "calc", description: "Kalkulator" },
      { command: "weather", description: "Cuaca kota" },
      { command: "translate", description: "Terjemah teks" },
      { command: "qr", description: "Buat QR code" },
      { command: "poll", description: "Buat polling" },
      { command: "sticker", description: "Buat stiker dari teks" },
      { command: "note", description: "Simpan catatan (admin)" },
      { command: "notes", description: "Lihat semua catatan" },
      { command: "getnote", description: "Ambil catatan" },
      { command: "giveaway", description: "Buat giveaway (admin)" },
      { command: "joingiveaway", description: "Ikut giveaway" },
      { command: "settings", description: "Pengaturan grup (admin)" },
      { command: "welcome", description: "Lihat pesan welcome" },
      { command: "setwelcome", description: "Atur pesan welcome (admin)" },
      { command: "antilink", description: "Toggle anti-link (admin)" },
      { command: "antispam", description: "Toggle anti-spam (admin)" },
      { command: "rules", description: "Peraturan grup" },
      { command: "feedback", description: "Kirim feedback" },
    ]);

    return NextResponse.json({
      ok: true,
      message: "Webhook berhasil diatur!",
      webhook: webhookUrl,
      webhookInfo: info,
      bot: {
        id: botInfo.id,
        username: botInfo.username,
        firstName: botInfo.first_name,
      },
    });
  } catch (err) {
    console.error("Setup webhook error:", err);
    return NextResponse.json({
      error: "Gagal setup webhook",
      detail: String(err),
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.SETUP_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Token tidak ada" }, { status: 500 });

  const bot = new Bot(token);
  await bot.api.deleteWebhook();

  return NextResponse.json({ ok: true, message: "Webhook dihapus." });
}
