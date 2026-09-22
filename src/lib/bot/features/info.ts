import { Bot } from "grammy";
import { db } from "@/db";
import { groupMembers, botStats } from "@/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { safeReply, formatNumber, progressBar, xpToLevel, levelToXp, timeAgo } from "../helpers";
import { getMember } from "../memberTracker";

export function registerInfoCommands(bot: Bot) {
  // ─── /start ───────────────────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    const name = ctx.from?.first_name || "Sobat";
    await safeReply(ctx,
      `🤖 *Halo, ${name}!* Saya adalah TeleBot Pro!\n\n` +
      `Saya bisa membantu mengelola grup Anda dengan banyak fitur canggih.\n\n` +
      `📋 Ketik /help untuk melihat semua perintah yang tersedia.\n` +
      `➕ Tambahkan saya ke grup sebagai admin untuk mulai menggunakan semua fitur!\n\n` +
      `🌐 Dashboard: _/dashboard_`
    );
  });

  // ─── /help ────────────────────────────────────────────────────────────
  bot.command("help", async (ctx) => {
    const page = parseInt(ctx.match || "1") || 1;

    const pages = [
      `📚 *DAFTAR PERINTAH — Halaman 1/4*\n\n` +
      `*🛡️ Moderasi (Admin)*\n` +
      `/ban — Ban member\n` +
      `/unban — Unban member\n` +
      `/kick — Kick member\n` +
      `/mute [durasi] — Mute member\n` +
      `/unmute — Unmute member\n` +
      `/warn — Beri peringatan\n` +
      `/unwarn — Hapus peringatan\n` +
      `/warns — Lihat peringatan\n` +
      `/purge — Hapus pesan massal\n` +
      `/pin — Pin pesan\n` +
      `/unpin — Unpin semua pesan\n` +
      `/promote — Jadikan admin\n` +
      `/demote — Turunkan admin\n` +
      `/slowmode — Atur slow mode\n` +
      `/silence — Silence member\n` +
      `/unsilence — Unsilence member\n` +
      `/settitle — Atur judul admin\n\n` +
      `_Ketik /help 2 untuk halaman berikutnya_`,

      `📚 *DAFTAR PERINTAH — Halaman 2/4*\n\n` +
      `*👥 Grup & Pengaturan*\n` +
      `/tagall — Tag semua member\n` +
      `/tagadmin — Tag semua admin\n` +
      `/welcome — Info pesan welcome\n` +
      `/setwelcome — Atur pesan welcome\n` +
      `/setgoodbye — Atur pesan goodbye\n` +
      `/rules — Tampilkan peraturan\n` +
      `/setrules — Atur peraturan\n` +
      `/settings — Lihat pengaturan grup\n` +
      `/antilink — Toggle anti-link\n` +
      `/antispam — Toggle anti-spam\n` +
      `/antiflood — Toggle anti-flood\n` +
      `/setlang — Atur bahasa\n` +
      `/addcmd — Tambah custom command\n` +
      `/delcmd — Hapus custom command\n` +
      `/listcmds — Lihat custom commands\n` +
      `/addfilter — Tambah filter kata\n` +
      `/delfilter — Hapus filter kata\n` +
      `/listfilters — Lihat filter\n` +
      `/giveaway — Buat giveaway\n` +
      `/joingiveaway — Ikut giveaway\n` +
      `/endgiveaway — Akhiri giveaway\n` +
      `/raffle — Pilih pemenang raffle\n` +
      `/joinraffle — Ikut raffle\n` +
      `/poll — Buat polling\n` +
      `/sticker — Buat stiker SVG\n` +
      `/broadcast — Broadcast pesan\n` +
      `/feedback — Kirim feedback\n\n` +
      `_Ketik /help 3 untuk halaman berikutnya_`,

      `📚 *DAFTAR PERINTAH — Halaman 3/4*\n\n` +
      `*ℹ️ Informasi & Profil*\n` +
      `/info — Info bot & grup\n` +
      `/id — Tampilkan ID\n` +
      `/whois — Info user\n` +
      `/stats — Statistik bot\n` +
      `/rank — Peringkat XP kamu\n` +
      `/leaderboard — Top 10 member\n` +
      `/profile — Profil kamu\n` +
      `/setbirthday — Atur ulang tahun\n` +
      `/birthday — Cek ulang tahun hari ini\n` +
      `/zodiac — Cek zodiak\n\n` +
      `*💰 Ekonomi & Game*\n` +
      `/daily — Klaim hadiah harian\n` +
      `/balance — Cek saldo koin\n` +
      `/transfer — Transfer koin\n` +
      `/richlist — Top koin\n` +
      `/gamble — Judi koin\n` +
      `/give — Beri koin ke member\n` +
      `/work — Kerja dapat koin\n` +
      `/deposit — Simpan ke bank\n` +
      `/withdraw — Ambil dari bank\n` +
      `/invest — Investasikan koin\n` +
      `/claiminvest — Claim hasil investasi\n` +
      `/rep — Beri reputasi\n` +
      `/topreputation — Top reputasi\n\n` +
      `_Ketik /help 4 untuk halaman berikutnya_`,

      `📚 *DAFTAR PERINTAH — Halaman 4/4*\n\n` +
      `*🎮 Fun & Games*\n` +
      `/dice — Lempar dadu 🎲\n` +
      `/flip — Lempar koin 🪙\n` +
      `/8ball — Magic 8-ball 🎱\n` +
      `/rps — Suit (batu kertas gunting)\n` +
      `/slots — Mesin slot 🎰\n` +
      `/gamestats — Statistik game\n` +
      `/marry — Menikah 💍\n` +
      `/divorce — Cerai 💔\n` +
      `/partner — Cek pasangan 💑\n` +
      `/wordchain — Main word chain\n` +
      `/stopwordchain — Stop word chain\n` +
      `/fortune — Ramalan nasib 🔮\n` +
      `/tebak — Tebak angka 🔢\n` +
      `/joke — Humor acak 😄\n` +
      `/quote — Quote inspirasi 💭\n` +
      `/savequote — Simpan quote\n` +
      `/randomquote — Quote random\n` +
      `/trivia — Pertanyaan trivia 🧩\n` +
      `/math — Soal matematika 🧮\n` +
      `/choose — Pilih acak\n` +
      `/reverse — Balik teks\n` +
      `/mock — Teks meme\n` +
      `/aesthetic — Teks estetik\n` +
      `/encode — Encode Base64\n` +
      `/decode — Decode Base64\n\n` +
      `*🔧 Tools*\n` +
      `/calc — Kalkulator\n` +
      `/convert — Konversi satuan\n` +
      `/tinyurl — Persingkat URL\n` +
      `/weather — Cuaca kota\n` +
      `/translate — Terjemah teks\n` +
      `/qr — Buat QR code\n` +
      `/note, /notes, /getnote, /delnote — Catatan\n` +
      `/afk — Set AFK\n` +
      `/ping, /speedtest — Tes koneksi\n` +
      `/timestamp — Waktu server\n` +
      `/color — Info warna\n` +
      `/password — Generate password\n` +
      `/define — Definisi kata Inggris`,
    ];

    const idx = Math.min(Math.max(page - 1, 0), pages.length - 1);
    await safeReply(ctx, pages[idx]);
  });

  // ─── /id ──────────────────────────────────────────────────────────────
  bot.command("id", async (ctx) => {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    const replyUserId = ctx.message?.reply_to_message?.from?.id;
    let msg = `🆔 *Info ID*\n\n`;
    msg += `👤 User ID kamu: \`${userId}\`\n`;
    if (replyUserId) msg += `👤 User ID target: \`${replyUserId}\`\n`;
    msg += `💬 Chat ID: \`${chatId}\`\n`;
    const replyMsg = ctx.message?.reply_to_message as Record<string, unknown> | undefined;
    if (replyMsg && replyMsg["forward_from"]) {
      const ff = replyMsg["forward_from"] as { id: number };
      msg += `🔄 Forward dari: \`${ff.id}\`\n`;
    }
    await safeReply(ctx, msg);
  });

  // ─── /whois ───────────────────────────────────────────────────────────
  bot.command("whois", async (ctx) => {
    const target = ctx.message?.reply_to_message?.from ?? ctx.from;
    if (!target) return;
    const chatId = String(ctx.chat!.id);
    const userId = String(target.id);
    const member = await getMember(chatId, userId);

    let status = "Member";
    try {
      const cm = await ctx.api.getChatMember(ctx.chat!.id, target.id);
      status =
        cm.status === "creator" ? "👑 Owner" :
        cm.status === "administrator" ? "🛡️ Admin" :
        cm.status === "member" ? "👤 Member" :
        cm.status === "restricted" ? "🔇 Dibatasi" :
        cm.status === "left" ? "🚪 Keluar" : "🚫 Dibanned";
    } catch { /* ignore */ }

    const xp = member?.xpPoints ?? 0;
    const level = member?.level ?? 1;
    const nextLevelXp = levelToXp(level + 1);
    const bar = progressBar(xp - levelToXp(level), nextLevelXp - levelToXp(level));

    await safeReply(ctx,
      `👤 *Profil Member*\n\n` +
      `🏷️ Nama: ${target.first_name}${target.last_name ? ` ${target.last_name}` : ""}\n` +
      `📛 Username: ${target.username ? `@${target.username}` : "Tidak ada"}\n` +
      `🆔 ID: \`${target.id}\`\n` +
      `🤖 Bot: ${target.is_bot ? "Ya" : "Tidak"}\n` +
      `👑 Status: ${status}\n` +
      (member?.customTitle ? `🏅 Judul: _${member.customTitle}_\n` : "") +
      `\n📊 *Statistik*\n` +
      `💬 Pesan: ${formatNumber(member?.messageCount ?? 0)}\n` +
      `⭐ XP: ${formatNumber(xp)}\n` +
      `🏆 Level: ${level}\n` +
      `📈 Progress: ${bar} ${xp}/${nextLevelXp}\n` +
      `🪙 Koin: ${formatNumber(member?.coins ?? 0)}\n` +
      `⭐ Reputasi: ${member?.reputation ?? 0}\n` +
      `⚠️ Warn: ${member?.warnings ?? 0}\n` +
      `🕐 Terakhir aktif: ${member?.lastSeenAt ? timeAgo(member.lastSeenAt) : "Tidak diketahui"}`
    );
  });

  // ─── /rank ────────────────────────────────────────────────────────────
  bot.command("rank", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const userId = String(ctx.from!.id);
    const member = await getMember(chatId, userId);
    if (!member) return safeReply(ctx, "❌ Data kamu belum tersimpan. Kirim pesan dulu!");

    const xp = member.xpPoints ?? 0;
    const level = member.level ?? 1;
    const nextLevelXp = levelToXp(level + 1);
    const curLevelXp = levelToXp(level);
    const progress = xp - curLevelXp;
    const needed = nextLevelXp - curLevelXp;
    const bar = progressBar(progress, needed);

    await safeReply(ctx,
      `🏆 *Rank Kamu*\n\n` +
      `👤 ${ctx.from!.first_name}\n` +
      `⭐ Level: *${level}*\n` +
      `📊 XP: *${formatNumber(xp)}*\n` +
      `📈 Progress: ${bar}\n` +
      ` ${formatNumber(progress)}/${formatNumber(needed)} XP ke Level ${level + 1}\n\n` +
      `💬 Total pesan: ${formatNumber(member.messageCount ?? 0)}\n` +
      `🪙 Koin: ${formatNumber(member.coins ?? 0)}\n` +
      `⭐ Reputasi: ${member.reputation ?? 0}`
    );
  });

  // ─── /leaderboard ─────────────────────────────────────────────────────
  bot.command("leaderboard", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const top = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.isBot, false)))
      .orderBy(desc(groupMembers.xpPoints))
      .limit(10);

    if (top.length === 0) return safeReply(ctx, "📊 Belum ada data member.");

    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const list = top.map((m, i) => {
      const name = m.username ? `@${m.username}` : (m.firstName ?? "Unknown");
      return `${medals[i]} *${name}* — Lvl ${m.level} | ${formatNumber(m.xpPoints ?? 0)} XP`;
    }).join("\n");

    await safeReply(ctx, `🏆 *Top 10 Member Aktif*\n\n${list}`);
  });

  // ─── /profile ─────────────────────────────────────────────────────────
  bot.command("profile", async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    const chatId = String(ctx.chat!.id);
    const member = await getMember(chatId, String(user.id));
    const xp = member?.xpPoints ?? 0;
    const level = member?.level ?? 1;
    const streak = member?.streak ?? 0;
    const nextLevelXp = levelToXp(level + 1);
    const bar = progressBar(xp - levelToXp(level), nextLevelXp - levelToXp(level));

    await safeReply(ctx,
      `🎴 *Profil Kamu*\n\n` +
      `👤 ${user.first_name}${user.last_name ? ` ${user.last_name}` : ""}\n` +
      `📛 @${user.username ?? "tidak ada username"}\n` +
      `🆔 \`${user.id}\`\n` +
      (member?.customTitle ? `🏅 Judul: _${member.customTitle}_\n` : "") +
      `\n⭐ Level: ${level}\n` +
      `📊 XP: ${formatNumber(xp)}\n` +
      `📈 Progress: ${bar}\n` +
      `🔥 Streak harian: ${streak} hari\n` +
      `💬 Pesan: ${formatNumber(member?.messageCount ?? 0)}\n` +
      `🪙 Koin: ${formatNumber(member?.coins ?? 0)}\n` +
      `⭐ Reputasi: ${member?.reputation ?? 0}\n` +
      `⚠️ Peringatan: ${member?.warnings ?? 0}`
    );
  });

  // ─── /stats ───────────────────────────────────────────────────────────
  bot.command("stats", async (ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    const stat = await db.select().from(botStats).where(eq(botStats.date, today)).limit(1);
    const allGroups = await db.select({ chatId: groupMembers.chatId }).from(groupMembers);
    const uniqueGroups = new Set(allGroups.map((g) => g.chatId)).size;
    const allUsers = await db.select({ count: count() }).from(groupMembers);

    await safeReply(ctx,
      `📊 *Statistik TeleBot Pro*\n\n` +
      `📅 Hari ini:\n` +
      `💬 Pesan: ${formatNumber(stat[0]?.totalMessages ?? 0)}\n` +
      `⚡ Perintah: ${formatNumber(stat[0]?.totalCommands ?? 0)}\n\n` +
      `📈 Total:\n` +
      `👥 Grup aktif: ${uniqueGroups}\n` +
      `👤 User terdaftar: ${formatNumber(allUsers[0]?.count ?? 0)}\n` +
      `\n🕐 Update: ${new Date().toLocaleString("id-ID")}`
    );
  });

  // ─── /info ────────────────────────────────────────────────────────────
  bot.command("info", async (ctx) => {
    const chat = ctx.chat;
    if (!chat) return;
    let chatInfo = `💬 *Info Bot & Grup*\n\n`;
    if (chat.type !== "private") {
      const admins = await ctx.api.getChatAdministrators(chat.id);
      const adminCount = admins.length;
      chatInfo += `📌 Nama: *${"title" in chat ? chat.title : "Private"}*\n`;
      chatInfo += `🆔 ID: \`${chat.id}\`\n`;
      chatInfo += `📋 Tipe: ${chat.type}\n`;
      chatInfo += `👑 Jumlah Admin: ${adminCount}\n\n`;
    }
    chatInfo += `🤖 Bot: *TeleBot Pro*\n`;
    chatInfo += `⚡ Versi: *3.0.0*\n`;
    chatInfo += `🛠️ Framework: grammY + Next.js\n`;
    chatInfo += `💾 Database: PostgreSQL + Drizzle ORM\n`;
    chatInfo += `🕐 Server time: ${new Date().toLocaleString("id-ID")}`;
    await safeReply(ctx, chatInfo);
  });
}
