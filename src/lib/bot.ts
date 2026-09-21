import { Bot, webhookCallback, InputFile, InlineKeyboard } from "grammy";
import type { MessageEntity } from "grammy/types";
import { db } from "@/db";
import {
  groupMembers,
  botLogs,
  userWarnings,
  bannedWords,
  groupNotes,
  userStats,
  groupSettings,
  polls,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// ─── Helper: Escape MarkdownV2 ────────────────────────────────────────────────
export function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

// ─── Helper: Escape XML untuk SVG ─────────────────────────────────────────────
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── Helper: Track member di database ─────────────────────────────────────────
async function trackMember(
  chatId: number,
  userId: number,
  username?: string,
  firstName?: string,
  lastName?: string
) {
  try {
    const existing = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.chatId, chatId),
          eq(groupMembers.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(groupMembers)
        .set({
          username: username ?? existing[0].username,
          firstName: firstName ?? existing[0].firstName,
          lastName: lastName ?? existing[0].lastName,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(groupMembers.chatId, chatId),
            eq(groupMembers.userId, userId)
          )
        );
    } else {
      await db.insert(groupMembers).values({
        chatId,
        userId,
        username,
        firstName,
        lastName,
        isActive: true,
      });
    }
  } catch (e) {
    console.error("trackMember error:", e);
  }
}

// ─── Helper: Update statistik pesan user ─────────────────────────────────────
async function updateUserStats(chatId: number, userId: number, isCommand = false) {
  try {
    const existing = await db
      .select()
      .from(userStats)
      .where(and(eq(userStats.chatId, chatId), eq(userStats.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userStats)
        .set({
          messageCount: sql`${userStats.messageCount} + 1`,
          commandCount: isCommand ? sql`${userStats.commandCount} + 1` : existing[0].commandCount,
          lastActive: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(userStats.chatId, chatId), eq(userStats.userId, userId)));
    } else {
      await db.insert(userStats).values({
        chatId,
        userId,
        messageCount: 1,
        commandCount: isCommand ? 1 : 0,
        lastActive: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (e) {
    console.error("updateUserStats error:", e);
  }
}

// ─── Helper: Log perintah ─────────────────────────────────────────────────────
async function logCommand(
  chatId: number,
  userId: number | undefined,
  command: string,
  result: string
) {
  try {
    await db.insert(botLogs).values({ chatId, userId, command, result });
  } catch (e) {
    console.error("logCommand error:", e);
  }
}

// ─── Helper: Ambil pengaturan grup ───────────────────────────────────────────
async function getGroupSettings(chatId: number) {
  try {
    const settings = await db
      .select()
      .from(groupSettings)
      .where(eq(groupSettings.chatId, chatId))
      .limit(1);
    return settings[0] ?? null;
  } catch {
    return null;
  }
}

// ─── Helper: Cek apakah user adalah admin ────────────────────────────────────
async function isAdmin(bot: Bot, chatId: number, userId: number): Promise<boolean> {
  try {
    const member = await bot.api.getChatMember(chatId, userId);
    return member.status === "administrator" || member.status === "creator";
  } catch {
    return false;
  }
}

// ─── Speed Test via Cloudflare ────────────────────────────────────────────────
async function runSpeedTest(): Promise<{
  ping: string;
  download: string;
  upload: string;
  server: string;
}> {
  const testSizes = [100_000, 1_000_000];
  const pingResults: number[] = [];
  const downloadSpeeds: number[] = [];

  for (let i = 0; i < 3; i++) {
    const pingStart = Date.now();
    await fetch("https://speed.cloudflare.com/__down?bytes=1000");
    pingResults.push(Date.now() - pingStart);
  }

  for (const size of testSizes) {
    const start = Date.now();
    await fetch(`https://speed.cloudflare.com/__down?bytes=${size}`);
    const elapsed = (Date.now() - start) / 1000;
    const speedMbps = (size * 8) / elapsed / 1_000_000;
    downloadSpeeds.push(speedMbps);
  }

  const uploadStart = Date.now();
  const uploadData = new Uint8Array(500_000);
  await fetch("https://speed.cloudflare.com/__up", {
    method: "POST",
    body: uploadData,
  });
  const uploadElapsed = (Date.now() - uploadStart) / 1000;
  const uploadMbps = (500_000 * 8) / uploadElapsed / 1_000_000;

  const avgPing = Math.round(
    pingResults.reduce((a, b) => a + b, 0) / pingResults.length
  );
  const avgDownload =
    downloadSpeeds.reduce((a, b) => a + b, 0) / downloadSpeeds.length;

  return {
    ping: `${avgPing} ms`,
    download: `${avgDownload.toFixed(2)} Mbps`,
    upload: `${uploadMbps.toFixed(2)} Mbps`,
    server: "Cloudflare speed.cloudflare.com",
  };
}

// ─── Buat Stiker SVG dari Teks ────────────────────────────────────────────────
async function createTextSticker(text: string): Promise<Buffer> {
  const width = 512;
  const height = 512;
  const bgColors = [
    ["#FF6B6B", "#FFEAA7"],
    ["#74B9FF", "#A29BFE"],
    ["#55EFC4", "#00CEC9"],
    ["#FD79A8", "#FDCB6E"],
    ["#6C5CE7", "#A29BFE"],
    ["#E17055", "#FDCB6E"],
    ["#00B894", "#00CEC9"],
    ["#E84393", "#F368E0"],
  ];
  const colorPair = bgColors[Math.floor(Math.random() * bgColors.length)];
  const truncated = text.length > 40 ? text.substring(0, 38) + "…" : text;
  const fontSize = truncated.length > 25 ? 44 : truncated.length > 15 ? 60 : 76;
  const words = truncated.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  const maxCharsPerLine = Math.floor(10 * (76 / fontSize));

  for (const word of words) {
    const candidate = currentLine ? currentLine + " " + word : word;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSize * 1.3;
  const totalTextHeight = lines.length * lineHeight;
  const startY = (height - totalTextHeight) / 2 + fontSize;

  const linesSvg = lines
    .map(
      (line, i) =>
        `<text x="50%" y="${startY + i * lineHeight}" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" filter="url(#shadow)">${escapeXml(line)}</text>`
    )
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colorPair[0]};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colorPair[1]};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="3" dy="3" stdDeviation="4" flood-color="rgba(0,0,0,0.4)"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" rx="60" ry="60" fill="url(#bg)"/>
  ${linesSvg}
</svg>`;

  return Buffer.from(svg, "utf-8");
}

// ─── Buat Stiker QR dari Teks ─────────────────────────────────────────────────
async function createQRSticker(text: string): Promise<Buffer> {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(text)}&format=svg&color=6C5CE7&bgcolor=FFFFFF&qzone=2`;
  const response = await fetch(qrUrl);
  const svg = await response.text();
  return Buffer.from(svg, "utf-8");
}

// ─── Hitung Kalkulator ────────────────────────────────────────────────────────
function calculate(expr: string): string {
  try {
    // Sanitize: hanya izinkan angka dan operator matematika
    const sanitized = expr.replace(/[^0-9+\-*/().,\s%^]/g, "");
    if (!sanitized.trim()) return "❌ Ekspresi tidak valid";

    // Ganti ^ dengan ** untuk pangkat
    const jsExpr = sanitized.replace(/\^/g, "**").replace(/,/g, ".");

    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + jsExpr + ")")();
    if (typeof result !== "number" || !isFinite(result)) return "❌ Hasil tidak valid";
    return String(Number(result.toFixed(10)).toString());
  } catch {
    return "❌ Ekspresi tidak valid";
  }
}

// ─── Konversi Mata Uang ───────────────────────────────────────────────────────
async function convertCurrency(amount: number, from: string, to: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?amount=${amount}&from=${from.toUpperCase()}&to=${to.toUpperCase()}`
    );
    const data = await res.json() as { rates: Record<string, number>; amount: number; base: string };
    if (!data.rates) return "❌ Mata uang tidak ditemukan";
    const result = data.rates[to.toUpperCase()];
    if (!result) return "❌ Mata uang tujuan tidak ditemukan";
    return `💱 ${amount} ${from.toUpperCase()} = *${result.toFixed(4)} ${to.toUpperCase()}*`;
  } catch {
    return "❌ Gagal mengkonversi mata uang";
  }
}

// ─── Buat Bot ─────────────────────────────────────────────────────────────────
function createBot(token: string) {
  const bot = new Bot(token);

  // ── Middleware: Track setiap pesan ──────────────────────────────────────────
  bot.on("message", async (ctx, next) => {
    const msg = ctx.message;
    if (!msg || !ctx.chat || ctx.chat.type === "private") return next();

    const from = msg.from;
    if (from && !from.is_bot) {
      await trackMember(ctx.chat.id, from.id, from.username, from.first_name, from.last_name);
      await updateUserStats(ctx.chat.id, from.id);

      // ── Anti-Spam: cek kata terlarang ──
      const settings = await getGroupSettings(ctx.chat.id);
      if (settings?.antiSpamEnabled && msg.text) {
        const words = await db
          .select()
          .from(bannedWords)
          .where(eq(bannedWords.chatId, ctx.chat.id));

        const msgLower = msg.text.toLowerCase();
        const foundBanned = words.find((w) => msgLower.includes(w.word.toLowerCase()));
        if (foundBanned) {
          try {
            await ctx.deleteMessage();
            await ctx.reply(
              `⚠️ *Pesan dihapus*\n${escapeMarkdownV2(from.first_name)}, pesan kamu mengandung kata terlarang: \`${escapeMarkdownV2(foundBanned.word)}\``,
              { parse_mode: "MarkdownV2" }
            );
          } catch {
            // ignore
          }
        }
      }
    }
    return next();
  });

  // ── Track member baru bergabung ──────────────────────────────────────────────
  bot.on("chat_member", async (ctx) => {
    const member = ctx.chatMember;
    const newStatus = member.new_chat_member;

    if (
      newStatus.status === "member" ||
      newStatus.status === "administrator" ||
      newStatus.status === "creator"
    ) {
      const user = newStatus.user;
      if (!user.is_bot) {
        await trackMember(ctx.chat.id, user.id, user.username, user.first_name, user.last_name);

        // ── Welcome message ──
        const settings = await getGroupSettings(ctx.chat.id);
        if (settings?.welcomeEnabled !== false) {
          const chat = await ctx.api.getChat(ctx.chat.id);
          const chatTitle = "title" in chat ? chat.title : "Grup";
          const welcomeText =
            settings?.welcomeMessage ||
            `🎉 Selamat datang *{name}* di *{group}*!\n\nKetik /help untuk melihat daftar perintah.`;

          const personalizedWelcome = welcomeText
            .replace(/\{name\}/g, user.first_name)
            .replace(/\{username\}/g, user.username ? "@" + user.username : user.first_name)
            .replace(/\{group\}/g, chatTitle ?? "Grup");

          try {
            await ctx.api.sendMessage(ctx.chat.id, personalizedWelcome, {
              parse_mode: "Markdown",
            });
          } catch {
            // ignore
          }
        }
      }
    } else if (newStatus.status === "left" || newStatus.status === "kicked") {
      try {
        await db
          .update(groupMembers)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(groupMembers.chatId, ctx.chat.id),
              eq(groupMembers.userId, newStatus.user.id)
            )
          );
      } catch (e) {
        console.error("member left update error:", e);
      }
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /start & /help
  // ════════════════════════════════════════════════════════════════════════════
  bot.command(["start", "help"], async (ctx) => {
    const helpText =
      `🤖 *Bot Multi\\-Fitur Telegram*\n\n` +
      `*👥 Manajemen Grup:*\n` +
      `/tagall \\- Tag semua member di grup\n` +
      `/tagadmin \\- Tag semua admin\n` +
      `/warn @user \\[alasan\\] \\- Beri peringatan\n` +
      `/warnings @user \\- Lihat peringatan user\n` +
      `/kick @user \\- Keluarkan member\n` +
      `/mute @user \\[menit\\] \\- Bungkam member\n` +
      `/unmute @user \\- Bebaskan bungkam\n` +
      `/promote @user \\- Jadikan admin\n` +
      `/demote @user \\- Cabut status admin\n\n` +
      `*🔒 Anti\\-Spam:*\n` +
      `/addbanned [kata] \\- Tambah kata terlarang\n` +
      `/delbanned [kata] \\- Hapus kata terlarang\n` +
      `/listbanned \\- Lihat kata terlarang\n` +
      `/antispam on|off \\- Aktifkan anti\\-spam\n\n` +
      `*📌 Catatan Grup:*\n` +
      `/note [kunci] [isi] \\- Simpan catatan\n` +
      `/getnote [kunci] \\- Ambil catatan\n` +
      `/notes \\- Lihat semua catatan\n` +
      `/delnote [kunci] \\- Hapus catatan\n\n` +
      `*📊 Statistik & Info:*\n` +
      `/stats \\- Statistik pesan grup\n` +
      `/topactive \\- 10 member paling aktif\n` +
      `/info \\- Info bot dan grup\n` +
      `/ping \\- Cek latency bot\n` +
      `/uptime \\- Uptime server\n\n` +
      `*🛠️ Tools:*\n` +
      `/speedtest \\- Tes kecepatan internet\n` +
      `/calc [ekspresi] \\- Kalkulator\n` +
      `/qr [teks] \\- Buat QR Code\n` +
      `/currency [jumlah] [dari] [ke] \\- Konversi mata uang\n` +
      `/translate [bahasa] [teks] \\- Terjemahkan teks\n` +
      `/weather [kota] \\- Cuaca kota\n\n` +
      `*🎨 Kreatif:*\n` +
      `/sticker [teks] \\- Buat stiker teks\n` +
      `/poll [pertanyaan]|[opsi1]|[opsi2] \\- Buat polling\n\n` +
      `*⚙️ Pengaturan:*\n` +
      `/setwelcome [pesan] \\- Atur pesan sambutan\n` +
      `/welcome on|off \\- Toggle pesan sambutan\n` +
      `/setmaxwarn [angka] \\- Atur maks peringatan\n`;

    await ctx.reply(helpText, { parse_mode: "MarkdownV2" });
    await logCommand(ctx.chat.id, ctx.from?.id, "help", "shown");
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /ping
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("ping", async (ctx) => {
    const start = Date.now();
    const sent = await ctx.reply("🏓 Pong! Mengukur latency...");
    const latency = Date.now() - start;
    await ctx.api.editMessageText(
      ctx.chat.id,
      sent.message_id,
      `🏓 *Pong\\!*\n\n⚡ Latency: \`${latency}ms\`\n🕐 Waktu: \`${escapeMarkdownV2(new Date().toLocaleTimeString("id-ID"))}\``,
      { parse_mode: "MarkdownV2" }
    );
    await logCommand(ctx.chat.id, ctx.from?.id, "ping", `${latency}ms`);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /uptime
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("uptime", async (ctx) => {
    const uptimeSec = Math.floor(process.uptime());
    const h = Math.floor(uptimeSec / 3600);
    const m = Math.floor((uptimeSec % 3600) / 60);
    const s = uptimeSec % 60;
    const memUsed = Math.round(process.memoryUsage().rss / 1024 / 1024);
    await ctx.reply(
      `⏱️ *Uptime Server*\n\n` +
        `🕐 Uptime: \`${h}j ${m}m ${s}d\`\n` +
        `💾 Memory: \`${memUsed} MB\`\n` +
        `🖥️ Platform: \`${process.platform}\`\n` +
        `🟢 Status: Online`,
      { parse_mode: "MarkdownV2" }
    );
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /speedtest
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("speedtest", async (ctx) => {
    const msg = await ctx.reply(
      "🌐 Menjalankan speedtest\\.\\.\\. Mohon tunggu ⏳\n_\\(Ini mungkin memerlukan 10\\-20 detik\\)_",
      { parse_mode: "MarkdownV2" }
    );
    try {
      const results = await runSpeedTest();
      await ctx.api.editMessageText(
        ctx.chat.id,
        msg.message_id,
        `🚀 *Hasil Speed Test Internet*\n\n` +
          `📥 *Download:* \`${escapeMarkdownV2(results.download)}\`\n` +
          `📤 *Upload:* \`${escapeMarkdownV2(results.upload)}\`\n` +
          `📡 *Ping:* \`${escapeMarkdownV2(results.ping)}\`\n` +
          `🌍 *Server:* \`${escapeMarkdownV2(results.server)}\`\n` +
          `⏰ *Waktu:* \`${escapeMarkdownV2(new Date().toLocaleString("id-ID"))}\``,
        { parse_mode: "MarkdownV2" }
      );
      await logCommand(ctx.chat.id, ctx.from?.id, "speedtest", JSON.stringify(results));
    } catch (e) {
      console.error("speedtest error:", e);
      await ctx.api
        .editMessageText(ctx.chat.id, msg.message_id, "❌ Gagal menjalankan speedtest\\. Silakan coba lagi\\.", {
          parse_mode: "MarkdownV2",
        })
        .catch(() => null);
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /tagall
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("tagall", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") {
      await ctx.reply("❌ Perintah ini hanya bisa digunakan di grup!");
      return;
    }
    const from = ctx.from;
    if (!from) return;

    if (!(await isAdmin(bot, ctx.chat.id, from.id))) {
      await ctx.reply("❌ Hanya admin yang bisa menggunakan perintah ini!");
      return;
    }

    const processingMsg = await ctx.reply("⏳ Mengumpulkan daftar member...");
    try {
      const admins = await ctx.api.getChatAdministrators(ctx.chat.id);
      for (const admin of admins) {
        if (!admin.user.is_bot) {
          await trackMember(ctx.chat.id, admin.user.id, admin.user.username, admin.user.first_name, admin.user.last_name);
        }
      }

      const allMembers = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.chatId, ctx.chat.id), eq(groupMembers.isActive, true)));

      if (allMembers.length === 0) {
        await ctx.api.editMessageText(
          ctx.chat.id,
          processingMsg.message_id,
          "⚠️ Belum ada member yang tercatat\\.\nTunggu member mengirim pesan terlebih dahulu\\.",
          { parse_mode: "MarkdownV2" }
        );
        return;
      }

      const customMsg = ctx.match?.trim();
      const header = customMsg
        ? `📢 *Tag All Member* \\(${allMembers.length} orang\\)\n\n_${escapeMarkdownV2(customMsg)}_`
        : `📢 *Tag All Member* \\(${allMembers.length} orang\\)`;

      await ctx.api.editMessageText(ctx.chat.id, processingMsg.message_id, header, {
        parse_mode: "MarkdownV2",
      });

      const chunkSize = 5;
      for (let i = 0; i < allMembers.length; i += chunkSize) {
        const chunk = allMembers.slice(i, i + chunkSize);
        const entities: MessageEntity[] = [];
        let text = "";
        let offset = 0;

        for (const m of chunk) {
          const name = m.firstName || m.username || `User${m.userId}`;
          entities.push({ type: "text_mention", offset, length: name.length, user: { id: m.userId, is_bot: false, first_name: name } });
          text += name + " ";
          offset += name.length + 1;
        }

        await ctx.reply(text.trim(), { entities });
        await new Promise((r) => setTimeout(r, 500));
      }

      await logCommand(ctx.chat.id, from.id, "tagall", `Tagged ${allMembers.length} members`);
    } catch (e) {
      console.error("tagall error:", e);
      await ctx.api
        .editMessageText(ctx.chat.id, processingMsg.message_id, "❌ Gagal melakukan tag all member\\.", {
          parse_mode: "MarkdownV2",
        })
        .catch(() => null);
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /tagadmin
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("tagadmin", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") {
      await ctx.reply("❌ Perintah ini hanya bisa digunakan di grup!");
      return;
    }
    try {
      const admins = await ctx.api.getChatAdministrators(ctx.chat.id);
      const humanAdmins = admins.filter((a) => !a.user.is_bot);
      if (humanAdmins.length === 0) {
        await ctx.reply("⚠️ Tidak ada admin manusia di grup ini.");
        return;
      }

      const entities: MessageEntity[] = [];
      let text = "👑 Admin Grup:\n";
      let offset = [...text].length;

      for (const admin of humanAdmins) {
        const name = admin.user.first_name || admin.user.username || "Admin";
        const label = admin.status === "creator" ? `🏆 ${name} (Owner)` : `⭐ ${name} (Admin)`;
        entities.push({ type: "text_mention", offset, length: [...label].length, user: { id: admin.user.id, is_bot: false, first_name: admin.user.first_name || name } });
        text += label + "\n";
        offset += [...label].length + 1;
      }

      await ctx.reply(text.trim(), { entities });
      await logCommand(ctx.chat.id, ctx.from?.id, "tagadmin", `${humanAdmins.length} admins`);
    } catch (e) {
      console.error("tagadmin error:", e);
      await ctx.reply("❌ Gagal mendapatkan daftar admin.");
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /warn — beri peringatan ke user
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("warn", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") {
      await ctx.reply("❌ Hanya bisa digunakan di grup!");
      return;
    }
    if (!(await isAdmin(bot, ctx.chat.id, ctx.from!.id))) {
      await ctx.reply("❌ Hanya admin yang bisa menggunakan perintah ini!");
      return;
    }

    const replyTo = ctx.message?.reply_to_message?.from;
    if (!replyTo || replyTo.is_bot) {
      await ctx.reply("❌ Reply pesan user yang ingin diperingatkan!\n\nContoh: Reply pesan user → /warn [alasan]");
      return;
    }

    const reason = ctx.match?.trim() || "Tidak ada alasan";
    const settings = await getGroupSettings(ctx.chat.id);
    const maxWarns = settings?.maxWarnings ?? 3;

    await db.insert(userWarnings).values({
      chatId: ctx.chat.id,
      userId: replyTo.id,
      reason,
      warnedBy: ctx.from!.id,
    });

    const warnCount = await db
      .select()
      .from(userWarnings)
      .where(and(eq(userWarnings.chatId, ctx.chat.id), eq(userWarnings.userId, replyTo.id)));

    const currentCount = warnCount.length;

    if (currentCount >= maxWarns) {
      try {
        await ctx.api.banChatMember(ctx.chat.id, replyTo.id);
        await ctx.reply(
          `🚫 *${escapeMarkdownV2(replyTo.first_name)}* telah mencapai *${maxWarns} peringatan* dan di\\-kick dari grup\\!\n\n_Alasan terakhir: ${escapeMarkdownV2(reason)}_`,
          { parse_mode: "MarkdownV2" }
        );
      } catch {
        await ctx.reply(`⚠️ Gagal kick user, tapi peringatan sudah tercatat.`);
      }
    } else {
      await ctx.reply(
        `⚠️ *Peringatan diberikan kepada ${escapeMarkdownV2(replyTo.first_name)}*\n\n` +
          `📝 Alasan: ${escapeMarkdownV2(reason)}\n` +
          `🔢 Peringatan: *${currentCount}/${maxWarns}*\n\n` +
          `_Jika mencapai ${maxWarns} peringatan, user akan di\\-kick\\._`,
        { parse_mode: "MarkdownV2" }
      );
    }
    await logCommand(ctx.chat.id, ctx.from?.id, "warn", `Warned ${replyTo.id}: ${reason}`);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /warnings — lihat peringatan user
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("warnings", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") {
      await ctx.reply("❌ Hanya bisa digunakan di grup!");
      return;
    }
    const replyTo = ctx.message?.reply_to_message?.from;
    if (!replyTo) {
      await ctx.reply("❌ Reply pesan user yang ingin dilihat peringatannya!");
      return;
    }

    const warns = await db
      .select()
      .from(userWarnings)
      .where(and(eq(userWarnings.chatId, ctx.chat.id), eq(userWarnings.userId, replyTo.id)))
      .orderBy(desc(userWarnings.createdAt));

    const settings = await getGroupSettings(ctx.chat.id);
    const maxWarns = settings?.maxWarnings ?? 3;

    if (warns.length === 0) {
      await ctx.reply(`✅ ${escapeMarkdownV2(replyTo.first_name)} tidak memiliki peringatan\\.`, { parse_mode: "MarkdownV2" });
      return;
    }

    const warnList = warns
      .map((w, i) => `${i + 1}\\. ${escapeMarkdownV2(w.reason || "Tidak ada alasan")} \\(${escapeMarkdownV2(new Date(w.createdAt).toLocaleDateString("id-ID"))}\\)`)
      .join("\n");

    await ctx.reply(
      `⚠️ *Peringatan ${escapeMarkdownV2(replyTo.first_name)}*\n\n${warnList}\n\n🔢 Total: *${warns.length}/${maxWarns}*`,
      { parse_mode: "MarkdownV2" }
    );
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /kick — keluarkan member
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("kick", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;
    if (!(await isAdmin(bot, ctx.chat.id, ctx.from!.id))) {
      await ctx.reply("❌ Hanya admin yang bisa menggunakan perintah ini!");
      return;
    }
    const replyTo = ctx.message?.reply_to_message?.from;
    if (!replyTo || replyTo.is_bot) {
      await ctx.reply("❌ Reply pesan user yang ingin di-kick!");
      return;
    }
    try {
      await ctx.api.banChatMember(ctx.chat.id, replyTo.id);
      await ctx.api.unbanChatMember(ctx.chat.id, replyTo.id);
      await ctx.reply(`✅ *${escapeMarkdownV2(replyTo.first_name)}* telah di\\-kick dari grup\\.`, { parse_mode: "MarkdownV2" });
      await logCommand(ctx.chat.id, ctx.from?.id, "kick", `Kicked ${replyTo.id}`);
    } catch {
      await ctx.reply("❌ Gagal kick user. Pastikan bot memiliki permission 'Ban Members'.");
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /mute — bungkam member
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("mute", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;
    if (!(await isAdmin(bot, ctx.chat.id, ctx.from!.id))) {
      await ctx.reply("❌ Hanya admin yang bisa menggunakan perintah ini!");
      return;
    }
    const replyTo = ctx.message?.reply_to_message?.from;
    if (!replyTo || replyTo.is_bot) {
      await ctx.reply("❌ Reply pesan user yang ingin di-mute!\n\nContoh: Reply → /mute 10 (mute 10 menit)");
      return;
    }
    const minutes = parseInt(ctx.match?.trim() || "60");
    const muteUntil = new Date(Date.now() + minutes * 60 * 1000);
    try {
      await ctx.api.restrictChatMember(
        ctx.chat.id,
        replyTo.id,
        { can_send_messages: false },
        { until_date: Math.floor(muteUntil.getTime() / 1000) }
      );
      await ctx.reply(
        `🔇 *${escapeMarkdownV2(replyTo.first_name)}* telah di\\-mute selama *${minutes} menit*\\.`,
        { parse_mode: "MarkdownV2" }
      );
      await logCommand(ctx.chat.id, ctx.from?.id, "mute", `Muted ${replyTo.id} for ${minutes}m`);
    } catch {
      await ctx.reply("❌ Gagal mute user. Pastikan bot memiliki permission 'Restrict Members'.");
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /unmute — bebaskan bungkam
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("unmute", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;
    if (!(await isAdmin(bot, ctx.chat.id, ctx.from!.id))) {
      await ctx.reply("❌ Hanya admin yang bisa menggunakan perintah ini!");
      return;
    }
    const replyTo = ctx.message?.reply_to_message?.from;
    if (!replyTo) {
      await ctx.reply("❌ Reply pesan user yang ingin di-unmute!");
      return;
    }
    try {
      await ctx.api.restrictChatMember(ctx.chat.id, replyTo.id, {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
      });
      await ctx.reply(`🔊 *${escapeMarkdownV2(replyTo.first_name)}* telah di\\-unmute\\.`, { parse_mode: "MarkdownV2" });
      await logCommand(ctx.chat.id, ctx.from?.id, "unmute", `Unmuted ${replyTo.id}`);
    } catch {
      await ctx.reply("❌ Gagal unmute user.");
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /promote — jadikan admin
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("promote", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;
    if (!(await isAdmin(bot, ctx.chat.id, ctx.from!.id))) {
      await ctx.reply("❌ Hanya admin yang bisa menggunakan perintah ini!");
      return;
    }
    const replyTo = ctx.message?.reply_to_message?.from;
    if (!replyTo || replyTo.is_bot) {
      await ctx.reply("❌ Reply pesan user yang ingin dipromosikan!");
      return;
    }
    try {
      await ctx.api.promoteChatMember(ctx.chat.id, replyTo.id, {
        can_delete_messages: true,
        can_restrict_members: true,
        can_invite_users: true,
        can_pin_messages: true,
        can_manage_chat: true,
      });
      await ctx.reply(`⭐ *${escapeMarkdownV2(replyTo.first_name)}* telah dipromosikan menjadi *Admin*\\.`, { parse_mode: "MarkdownV2" });
      await logCommand(ctx.chat.id, ctx.from?.id, "promote", `Promoted ${replyTo.id}`);
    } catch {
      await ctx.reply("❌ Gagal promote user. Pastikan bot memiliki permission 'Add Admins'.");
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /demote — cabut status admin
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("demote", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;
    if (!(await isAdmin(bot, ctx.chat.id, ctx.from!.id))) {
      await ctx.reply("❌ Hanya admin yang bisa menggunakan perintah ini!");
      return;
    }
    const replyTo = ctx.message?.reply_to_message?.from;
    if (!replyTo) {
      await ctx.reply("❌ Reply pesan user yang ingin di-demote!");
      return;
    }
    try {
      await ctx.api.promoteChatMember(ctx.chat.id, replyTo.id, {
        can_delete_messages: false,
        can_restrict_members: false,
        can_invite_users: false,
        can_pin_messages: false,
        can_manage_chat: false,
      });
      await ctx.reply(`👤 *${escapeMarkdownV2(replyTo.first_name)}* telah di\\-demote dari status Admin\\.`, { parse_mode: "MarkdownV2" });
      await logCommand(ctx.chat.id, ctx.from?.id, "demote", `Demoted ${replyTo.id}`);
    } catch {
      await ctx.reply("❌ Gagal demote user.");
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /addbanned — tambah kata terlarang
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("addbanned", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;
    if (!(await isAdmin(bot, ctx.chat.id, ctx.from!.id))) {
      await ctx.reply("❌ Hanya admin yang bisa menggunakan perintah ini!");
      return;
    }
    const word = ctx.match?.trim().toLowerCase();
    if (!word) {
      await ctx.reply("❌ Gunakan: /addbanned [kata]");
      return;
    }
    await db.insert(bannedWords).values({ chatId: ctx.chat.id, word, addedBy: ctx.from!.id });
    await ctx.reply(`✅ Kata *${escapeMarkdownV2(word)}* ditambahkan ke daftar terlarang\\.`, { parse_mode: "MarkdownV2" });
    await logCommand(ctx.chat.id, ctx.from?.id, "addbanned", word);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /delbanned — hapus kata terlarang
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("delbanned", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;
    if (!(await isAdmin(bot, ctx.chat.id, ctx.from!.id))) {
      await ctx.reply("❌ Hanya admin yang bisa menggunakan perintah ini!");
      return;
    }
    const word = ctx.match?.trim().toLowerCase();
    if (!word) {
      await ctx.reply("❌ Gunakan: /delbanned [kata]");
      return;
    }
    await db.delete(bannedWords).where(and(eq(bannedWords.chatId, ctx.chat.id), eq(bannedWords.word, word)));
    await ctx.reply(`✅ Kata *${escapeMarkdownV2(word)}* dihapus dari daftar terlarang\\.`, { parse_mode: "MarkdownV2" });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /listbanned — lihat kata terlarang
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("listbanned", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;
    const words = await db.select().from(bannedWords).where(eq(bannedWords.chatId, ctx.chat.id));
    if (words.length === 0) {
      await ctx.reply("✅ Tidak ada kata terlarang di grup ini.");
      return;
    }
    const list = words.map((w, i) => `${i + 1}\\. \`${escapeMarkdownV2(w.word)}\``).join("\n");
    await ctx.reply(`🚫 *Kata Terlarang:*\n\n${list}`, { parse_mode: "MarkdownV2" });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /antispam — toggle anti-spam
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("antispam", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;
    if (!(await isAdmin(bot, ctx.chat.id, ctx.from!.id))) {
      await ctx.reply("❌ Hanya admin yang bisa menggunakan perintah ini!");
      return;
    }
    const arg = ctx.match?.trim().toLowerCase();
    const enabled = arg === "on";
    const disabled = arg === "off";
    if (!enabled && !disabled) {
      await ctx.reply("❌ Gunakan: /antispam on atau /antispam off");
      return;
    }

    const existing = await db.select().from(groupSettings).where(eq(groupSettings.chatId, ctx.chat.id)).limit(1);
    if (existing.length > 0) {
      await db.update(groupSettings).set({ antiSpamEnabled: enabled, updatedAt: new Date() }).where(eq(groupSettings.chatId, ctx.chat.id));
    } else {
      await db.insert(groupSettings).values({ chatId: ctx.chat.id, antiSpamEnabled: enabled });
    }
    await ctx.reply(`🛡️ Anti\\-Spam: *${enabled ? "AKTIF ✅" : "NONAKTIF ❌"}*\n\n${enabled ? "Pesan dengan kata terlarang akan otomatis dihapus\\." : "Filter kata terlarang dinonaktifkan\\."}`, { parse_mode: "MarkdownV2" });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /note — simpan catatan grup
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("note", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;
    if (!(await isAdmin(bot, ctx.chat.id, ctx.from!.id))) {
      await ctx.reply("❌ Hanya admin yang bisa menyimpan catatan!");
      return;
    }
    const args = ctx.match?.trim().split(" ");
    if (!args || args.length < 2) {
      await ctx.reply("❌ Gunakan: /note [kunci] [isi catatan]\n\nContoh: /note rules 1. Dilarang spam");
      return;
    }
    const key = args[0].toLowerCase();
    const content = args.slice(1).join(" ");

    const existing = await db.select().from(groupNotes).where(and(eq(groupNotes.chatId, ctx.chat.id), eq(groupNotes.key, key))).limit(1);
    if (existing.length > 0) {
      await db.update(groupNotes).set({ content, addedBy: ctx.from!.id, updatedAt: new Date() }).where(and(eq(groupNotes.chatId, ctx.chat.id), eq(groupNotes.key, key)));
    } else {
      await db.insert(groupNotes).values({ chatId: ctx.chat.id, key, content, addedBy: ctx.from!.id });
    }
    await ctx.reply(`✅ Catatan *${escapeMarkdownV2(key)}* berhasil disimpan\\.`, { parse_mode: "MarkdownV2" });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /getnote — ambil catatan
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("getnote", async (ctx) => {
    const key = ctx.match?.trim().toLowerCase();
    if (!key) {
      await ctx.reply("❌ Gunakan: /getnote [kunci]");
      return;
    }
    const note = await db.select().from(groupNotes).where(and(eq(groupNotes.chatId, ctx.chat.id), eq(groupNotes.key, key))).limit(1);
    if (note.length === 0) {
      await ctx.reply(`❌ Catatan *${escapeMarkdownV2(key)}* tidak ditemukan\\.`, { parse_mode: "MarkdownV2" });
      return;
    }
    await ctx.reply(`📌 *${escapeMarkdownV2(key)}*\n\n${escapeMarkdownV2(note[0].content)}`, { parse_mode: "MarkdownV2" });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /notes — lihat semua catatan
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("notes", async (ctx) => {
    const allNotes = await db.select().from(groupNotes).where(eq(groupNotes.chatId, ctx.chat.id));
    if (allNotes.length === 0) {
      await ctx.reply("📌 Belum ada catatan di grup ini.\n\nGunakan /note [kunci] [isi] untuk menambah catatan.");
      return;
    }
    const list = allNotes.map((n, i) => `${i + 1}\\. \`${escapeMarkdownV2(n.key)}\``).join("\n");
    await ctx.reply(`📌 *Catatan Grup:*\n\n${list}\n\n_Gunakan /getnote \\[kunci\\] untuk membaca_`, { parse_mode: "MarkdownV2" });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /delnote — hapus catatan
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("delnote", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;
    if (!(await isAdmin(bot, ctx.chat.id, ctx.from!.id))) {
      await ctx.reply("❌ Hanya admin yang bisa menghapus catatan!");
      return;
    }
    const key = ctx.match?.trim().toLowerCase();
    if (!key) {
      await ctx.reply("❌ Gunakan: /delnote [kunci]");
      return;
    }
    await db.delete(groupNotes).where(and(eq(groupNotes.chatId, ctx.chat.id), eq(groupNotes.key, key)));
    await ctx.reply(`✅ Catatan *${escapeMarkdownV2(key)}* berhasil dihapus\\.`, { parse_mode: "MarkdownV2" });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /stats — statistik grup
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("stats", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") {
      await ctx.reply("❌ Hanya bisa digunakan di grup!");
      return;
    }
    const totalMembers = await db.select().from(groupMembers).where(and(eq(groupMembers.chatId, ctx.chat.id), eq(groupMembers.isActive, true)));
    const totalLogs = await db.select().from(botLogs).where(eq(botLogs.chatId, ctx.chat.id));
    const totalWarnings = await db.select().from(userWarnings).where(eq(userWarnings.chatId, ctx.chat.id));
    const totalNotes = await db.select().from(groupNotes).where(eq(groupNotes.chatId, ctx.chat.id));
    const settings = await getGroupSettings(ctx.chat.id);

    await ctx.reply(
      `📊 *Statistik Grup*\n\n` +
        `👥 Member aktif: *${totalMembers.length}*\n` +
        `⚡ Total perintah: *${totalLogs.length}*\n` +
        `⚠️ Total peringatan: *${totalWarnings.length}*\n` +
        `📌 Total catatan: *${totalNotes.length}*\n` +
        `🛡️ Anti\\-spam: *${settings?.antiSpamEnabled ? "Aktif" : "Nonaktif"}*\n` +
        `👋 Pesan sambutan: *${settings?.welcomeEnabled !== false ? "Aktif" : "Nonaktif"}*`,
      { parse_mode: "MarkdownV2" }
    );
    await logCommand(ctx.chat.id, ctx.from?.id, "stats", "viewed");
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /topactive — 10 member paling aktif
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("topactive", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") {
      await ctx.reply("❌ Hanya bisa digunakan di grup!");
      return;
    }
    const topUsers = await db
      .select()
      .from(userStats)
      .where(eq(userStats.chatId, ctx.chat.id))
      .orderBy(desc(userStats.messageCount))
      .limit(10);

    if (topUsers.length === 0) {
      await ctx.reply("📊 Belum ada data statistik member.");
      return;
    }

    // Ambil info member dari groupMembers
    const memberMap: Record<number, { firstName?: string | null; username?: string | null }> = {};
    const members = await db.select().from(groupMembers).where(eq(groupMembers.chatId, ctx.chat.id));
    for (const m of members) memberMap[m.userId] = { firstName: m.firstName, username: m.username };

    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const list = topUsers
      .map((u, i) => {
        const info = memberMap[u.userId];
        const name = info?.firstName || info?.username || `User${u.userId}`;
        return `${medals[i]} *${escapeMarkdownV2(name)}* \\- ${u.messageCount} pesan`;
      })
      .join("\n");

    await ctx.reply(`🏆 *Top 10 Member Aktif*\n\n${list}`, { parse_mode: "MarkdownV2" });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /sticker — buat stiker teks SVG
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("sticker", async (ctx) => {
    const text = ctx.match?.trim();
    if (!text) {
      await ctx.reply("❌ Gunakan: /sticker [teks]\n\nContoh:\n• /sticker Halo Dunia! 😊");
      return;
    }
    const processingMsg = await ctx.reply("🎨 Membuat stiker dari teks...");
    try {
      const stickerBuffer = await createTextSticker(text);
      await ctx.api.deleteMessage(ctx.chat.id, processingMsg.message_id).catch(() => null);
      await ctx.replyWithDocument(new InputFile(stickerBuffer, "sticker.svg"), {
        caption: `🎨 Stiker: *${escapeMarkdownV2(text)}*`,
        parse_mode: "MarkdownV2",
      });
      await logCommand(ctx.chat.id, ctx.from?.id, "sticker", `Created: ${text.substring(0, 50)}`);
    } catch (e) {
      console.error("sticker error:", e);
      await ctx.api.editMessageText(ctx.chat.id, processingMsg.message_id, "❌ Gagal membuat stiker\\.", { parse_mode: "MarkdownV2" }).catch(() => null);
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /qr — buat QR Code
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("qr", async (ctx) => {
    const text = ctx.match?.trim();
    if (!text) {
      await ctx.reply("❌ Gunakan: /qr [teks atau URL]\n\nContoh: /qr https://t.me/mygroup");
      return;
    }
    const processingMsg = await ctx.reply("🔲 Membuat QR Code...");
    try {
      const qrBuffer = await createQRSticker(text);
      await ctx.api.deleteMessage(ctx.chat.id, processingMsg.message_id).catch(() => null);
      await ctx.replyWithDocument(new InputFile(qrBuffer, "qrcode.svg"), {
        caption: `🔲 QR Code untuk:\n\`${escapeMarkdownV2(text.substring(0, 100))}\``,
        parse_mode: "MarkdownV2",
      });
      await logCommand(ctx.chat.id, ctx.from?.id, "qr", text.substring(0, 50));
    } catch (e) {
      console.error("qr error:", e);
      await ctx.api.editMessageText(ctx.chat.id, processingMsg.message_id, "❌ Gagal membuat QR Code\\.", { parse_mode: "MarkdownV2" }).catch(() => null);
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /calc — kalkulator
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("calc", async (ctx) => {
    const expr = ctx.match?.trim();
    if (!expr) {
      await ctx.reply(
        "🧮 *Kalkulator*\n\nGunakan: /calc [ekspresi]\n\nContoh:\n• /calc 2 \\+ 2\n• /calc 100 \\* 3\\.14\n• /calc \\(5\\+3\\) \\* 2\n• /calc 2\\^10",
        { parse_mode: "MarkdownV2" }
      );
      return;
    }
    const result = calculate(expr);
    await ctx.reply(
      `🧮 *Kalkulator*\n\n📝 Ekspresi: \`${escapeMarkdownV2(expr)}\`\n✅ Hasil: \`${escapeMarkdownV2(result)}\``,
      { parse_mode: "MarkdownV2" }
    );
    await logCommand(ctx.chat.id, ctx.from?.id, "calc", `${expr} = ${result}`);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /currency — konversi mata uang
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("currency", async (ctx) => {
    const args = ctx.match?.trim().split(" ");
    if (!args || args.length < 3) {
      await ctx.reply(
        "💱 *Konversi Mata Uang*\n\nGunakan: /currency [jumlah] [dari] [ke]\n\nContoh:\n• /currency 100 USD IDR\n• /currency 1 EUR USD\n• /currency 50000 IDR SGD",
        { parse_mode: "MarkdownV2" }
      );
      return;
    }
    const amount = parseFloat(args[0]);
    if (isNaN(amount)) {
      await ctx.reply("❌ Jumlah tidak valid!");
      return;
    }
    const processingMsg = await ctx.reply("💱 Mengkonversi mata uang...");
    const result = await convertCurrency(amount, args[1], args[2]);
    await ctx.api.editMessageText(ctx.chat.id, processingMsg.message_id, result, { parse_mode: "MarkdownV2" });
    await logCommand(ctx.chat.id, ctx.from?.id, "currency", `${amount} ${args[1]} → ${args[2]}`);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /translate — terjemahkan teks
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("translate", async (ctx) => {
    const args = ctx.match?.trim().split(" ");
    if (!args || args.length < 2) {
      await ctx.reply(
        "🌐 *Terjemah Teks*\n\nGunakan: /translate [bahasa\\_tujuan] [teks]\n\nContoh:\n• /translate en Halo semua\n• /translate id Hello everyone\n• /translate ja Selamat pagi",
        { parse_mode: "MarkdownV2" }
      );
      return;
    }
    const targetLang = args[0];
    const textToTranslate = args.slice(1).join(" ");
    const processingMsg = await ctx.reply("🌐 Menerjemahkan...");
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=auto|${targetLang}`
      );
      const data = await res.json() as { responseStatus: number; responseData: { translatedText: string }; quotaFinished?: boolean };
      if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
        throw new Error("Translation failed");
      }
      const translated = data.responseData.translatedText;
      await ctx.api.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        `🌐 *Terjemahan ke \`${escapeMarkdownV2(targetLang)}\`*\n\n📝 Asli: _${escapeMarkdownV2(textToTranslate)}_\n\n✅ Hasil: *${escapeMarkdownV2(translated)}*`,
        { parse_mode: "MarkdownV2" }
      );
      await logCommand(ctx.chat.id, ctx.from?.id, "translate", `→${targetLang}: ${textToTranslate.substring(0, 30)}`);
    } catch {
      await ctx.api.editMessageText(ctx.chat.id, processingMsg.message_id, "❌ Gagal menerjemahkan teks\\. Coba lagi\\.", { parse_mode: "MarkdownV2" }).catch(() => null);
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /weather — info cuaca kota
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("weather", async (ctx) => {
    const city = ctx.match?.trim();
    if (!city) {
      await ctx.reply("🌤️ Gunakan: /weather [nama kota]\n\nContoh: /weather Jakarta");
      return;
    }
    const processingMsg = await ctx.reply("🌤️ Mengambil data cuaca...");
    try {
      // Menggunakan wttr.in yang gratis dan tidak butuh API key
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
      const data = await res.json() as {
        current_condition: Array<{
          temp_C: string;
          temp_F: string;
          humidity: string;
          windspeedKmph: string;
          weatherDesc: Array<{ value: string }>;
          FeelsLikeC: string;
        }>;
        nearest_area: Array<{
          areaName: Array<{ value: string }>;
          country: Array<{ value: string }>;
        }>;
      };

      const current = data.current_condition[0];
      const area = data.nearest_area[0];
      const cityName = area.areaName[0].value;
      const country = area.country[0].value;
      const desc = current.weatherDesc[0].value;

      const weatherEmoji: Record<string, string> = {
        "Sunny": "☀️", "Clear": "🌙", "Partly cloudy": "⛅", "Cloudy": "☁️",
        "Overcast": "☁️", "Mist": "🌫️", "Rain": "🌧️", "Drizzle": "🌦️",
        "Thunderstorm": "⛈️", "Snow": "❄️", "Fog": "🌫️",
      };
      const emoji = Object.entries(weatherEmoji).find(([key]) => desc.includes(key))?.[1] || "🌤️";

      await ctx.api.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        `${emoji} *Cuaca ${escapeMarkdownV2(cityName)}, ${escapeMarkdownV2(country)}*\n\n` +
          `🌡️ Suhu: *${current.temp_C}°C* \\(${current.temp_F}°F\\)\n` +
          `🤔 Terasa: *${current.FeelsLikeC}°C*\n` +
          `💧 Kelembapan: *${current.humidity}%*\n` +
          `💨 Angin: *${current.windspeedKmph} km/h*\n` +
          `📝 Kondisi: *${escapeMarkdownV2(desc)}*`,
        { parse_mode: "MarkdownV2" }
      );
      await logCommand(ctx.chat.id, ctx.from?.id, "weather", city);
    } catch {
      await ctx.api.editMessageText(ctx.chat.id, processingMsg.message_id, `❌ Kota *${escapeMarkdownV2(city)}* tidak ditemukan\\. Coba nama kota dalam bahasa Inggris\\.`, { parse_mode: "MarkdownV2" }).catch(() => null);
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /poll — buat polling
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("poll", async (ctx) => {
    const input = ctx.match?.trim();
    if (!input || !input.includes("|")) {
      await ctx.reply(
        "📊 *Buat Polling*\n\nGunakan: /poll [pertanyaan]|[opsi1]|[opsi2]|\\.\\.\\.\n\nContoh:\n/poll Makanan favorit?|Nasi Goreng|Mie Ayam|Sate\n\n_Minimal 2 opsi, maksimal 8 opsi_",
        { parse_mode: "MarkdownV2" }
      );
      return;
    }
    const parts = input.split("|").map((p) => p.trim());
    const question = parts[0];
    const options = parts.slice(1);

    if (options.length < 2) {
      await ctx.reply("❌ Minimal 2 pilihan jawaban!");
      return;
    }
    if (options.length > 8) {
      await ctx.reply("❌ Maksimal 8 pilihan jawaban!");
      return;
    }

    try {
      // Gunakan Telegram native poll
      await ctx.replyWithPoll(question, options, {
        is_anonymous: false,
        allows_multiple_answers: false,
      });
      await logCommand(ctx.chat.id, ctx.from?.id, "poll", `Q: ${question.substring(0, 30)}`);
    } catch {
      await ctx.reply("❌ Gagal membuat polling.");
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /setwelcome — atur pesan sambutan
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("setwelcome", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;
    if (!(await isAdmin(bot, ctx.chat.id, ctx.from!.id))) {
      await ctx.reply("❌ Hanya admin yang bisa mengatur pesan sambutan!");
      return;
    }
    const msg = ctx.match?.trim();
    if (!msg) {
      await ctx.reply(
        "👋 *Atur Pesan Sambutan*\n\nGunakan: /setwelcome [pesan]\n\n_Variabel yang tersedia:_\n• `{name}` \\- Nama depan member\n• `{username}` \\- Username \\(@tag\\)\n• `{group}` \\- Nama grup\n\nContoh:\n/setwelcome Halo \\{name\\}\\! Selamat datang di \\{group\\} 🎉",
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    const existing = await db.select().from(groupSettings).where(eq(groupSettings.chatId, ctx.chat.id)).limit(1);
    if (existing.length > 0) {
      await db.update(groupSettings).set({ welcomeMessage: msg, updatedAt: new Date() }).where(eq(groupSettings.chatId, ctx.chat.id));
    } else {
      await db.insert(groupSettings).values({ chatId: ctx.chat.id, welcomeMessage: msg });
    }
    const fromUser = ctx.from!;
    const previewMsg = msg
      .replace("{name}", fromUser.first_name)
      .replace("{group}", "Nama Grup")
      .replace("{username}", fromUser.username ? "@" + fromUser.username : fromUser.first_name);
    await ctx.reply(`✅ Pesan sambutan berhasil diatur!\n\nPreview:\n${previewMsg}`);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /welcome — toggle pesan sambutan
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("welcome", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;
    if (!(await isAdmin(bot, ctx.chat.id, ctx.from!.id))) {
      await ctx.reply("❌ Hanya admin yang bisa mengatur pesan sambutan!");
      return;
    }
    const arg = ctx.match?.trim().toLowerCase();
    const enabled = arg === "on";
    const disabled = arg === "off";
    if (!enabled && !disabled) {
      await ctx.reply("❌ Gunakan: /welcome on atau /welcome off");
      return;
    }

    const existing = await db.select().from(groupSettings).where(eq(groupSettings.chatId, ctx.chat.id)).limit(1);
    if (existing.length > 0) {
      await db.update(groupSettings).set({ welcomeEnabled: enabled, updatedAt: new Date() }).where(eq(groupSettings.chatId, ctx.chat.id));
    } else {
      await db.insert(groupSettings).values({ chatId: ctx.chat.id, welcomeEnabled: enabled });
    }
    await ctx.reply(`👋 Pesan Sambutan: *${enabled ? "AKTIF ✅" : "NONAKTIF ❌"}*`, { parse_mode: "MarkdownV2" });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /setmaxwarn — atur maks peringatan
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("setmaxwarn", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;
    if (!(await isAdmin(bot, ctx.chat.id, ctx.from!.id))) {
      await ctx.reply("❌ Hanya admin yang bisa mengatur ini!");
      return;
    }
    const num = parseInt(ctx.match?.trim() || "");
    if (isNaN(num) || num < 1 || num > 10) {
      await ctx.reply("❌ Gunakan: /setmaxwarn [angka 1-10]\n\nContoh: /setmaxwarn 3");
      return;
    }

    const existing = await db.select().from(groupSettings).where(eq(groupSettings.chatId, ctx.chat.id)).limit(1);
    if (existing.length > 0) {
      await db.update(groupSettings).set({ maxWarnings: num, updatedAt: new Date() }).where(eq(groupSettings.chatId, ctx.chat.id));
    } else {
      await db.insert(groupSettings).values({ chatId: ctx.chat.id, maxWarnings: num });
    }
    await ctx.reply(`✅ Maksimal peringatan diatur ke *${num}*\\. User akan di\\-kick jika mencapai batas ini\\.`, { parse_mode: "MarkdownV2" });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /info — info bot dan grup
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("info", async (ctx) => {
    try {
      const chat = ctx.chat;
      const botInfo = await ctx.api.getMe();
      let memberCount = 0;
      let dbMemberCount = 0;

      if (chat.type !== "private") {
        try {
          memberCount = await ctx.api.getChatMemberCount(chat.id);
        } catch { /* ignore */ }

        const dbMembers = await db
          .select()
          .from(groupMembers)
          .where(and(eq(groupMembers.chatId, chat.id), eq(groupMembers.isActive, true)));
        dbMemberCount = dbMembers.length;
      }

      const chatTitle = "title" in chat ? chat.title : "Private Chat";
      await ctx.reply(
        `ℹ️ *Informasi Bot & Grup*\n\n` +
          `🤖 *Bot:* @${escapeMarkdownV2(botInfo.username || "unknown")}\n` +
          `💬 *Grup:* ${escapeMarkdownV2(chatTitle || "N/A")}\n` +
          `👥 *Total Member:* ${memberCount}\n` +
          `📊 *Member Tercatat:* ${dbMemberCount}\n` +
          `🆔 *Chat ID:* \`${chat.id}\`\n` +
          `⏰ *Waktu Server:* ${escapeMarkdownV2(new Date().toLocaleString("id-ID"))}`,
        { parse_mode: "MarkdownV2" }
      );
      await logCommand(ctx.chat.id, ctx.from?.id, "info", `Chat: ${chat.id}`);
    } catch (e) {
      console.error("info error:", e);
      await ctx.reply("❌ Gagal mendapatkan informasi.");
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PERINTAH: /gift — kirim gift ke user
  // ════════════════════════════════════════════════════════════════════════════
  bot.command("gift", async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    const replyTo = ctx.message?.reply_to_message;
    const args = ctx.match?.trim();
    let targetUser: { id: number; first_name: string; username?: string } | null = null;

    if (replyTo?.from && !replyTo.from.is_bot) {
      targetUser = replyTo.from;
    } else if (args) {
      const username = args.replace("@", "").trim();
      const found = await db.select().from(groupMembers).where(eq(groupMembers.username, username)).limit(1);
      if (found.length > 0) {
        targetUser = { id: found[0].userId, first_name: found[0].firstName || username, username: found[0].username ?? undefined };
      }
    }

    if (!targetUser) {
      await ctx.reply("❌ *Cara penggunaan:*\n\n• Reply pesan seseorang lalu ketik /gift\n• /gift @username\n\n⚠️ Fitur gift memerlukan Telegram Stars di saldo bot\\.", { parse_mode: "MarkdownV2" });
      return;
    }

    const processingMsg = await ctx.reply(`🎁 Memproses gift untuk ${targetUser.first_name}...`);
    try {
      const giftsResponse = await fetch(`https://api.telegram.org/bot${token}/getAvailableGifts`);
      const giftsData = await giftsResponse.json() as { ok: boolean; result?: { gifts: Array<{ id: string; star_count: number; sticker?: { emoji?: string }; total_count?: number; remaining_count?: number }> } };

      if (!giftsData.ok || !giftsData.result?.gifts?.length) {
        await ctx.api.editMessageText(
          ctx.chat.id,
          processingMsg.message_id,
          `🎁 *Info Gift untuk ${escapeMarkdownV2(targetUser.first_name)}*\n\n⚠️ Tidak ada gift yang tersedia saat ini\\.\nBot memerlukan saldo Telegram Stars untuk mengirim gift\\.\n\n💡 Isi saldo Stars bot via @BotFather`,
          { parse_mode: "MarkdownV2" }
        );
        return;
      }

      const availableGifts = giftsData.result.gifts.filter((g) => !g.total_count || (g.remaining_count !== undefined && g.remaining_count > 0));
      if (availableGifts.length === 0) throw new Error("No available gifts");

      const cheapestGift = availableGifts.sort((a, b) => a.star_count - b.star_count)[0];
      const sendGiftResponse = await fetch(`https://api.telegram.org/bot${token}/sendGift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: targetUser.id, gift_id: cheapestGift.id, text: `🎁 Hadiah dari ${from.first_name}! Semoga harimu menyenangkan! ✨` }),
      });
      const sendResult = await sendGiftResponse.json() as { ok: boolean; description?: string };

      if (sendResult.ok) {
        await ctx.api.editMessageText(
          ctx.chat.id,
          processingMsg.message_id,
          `🎁 *Gift Berhasil Dikirim\\!*\n\nDari: ${escapeMarkdownV2(from.first_name)}\nUntuk: ${escapeMarkdownV2(targetUser.first_name)}\nHadiah: ${cheapestGift.sticker?.emoji || "🎁"} \\(${cheapestGift.star_count} ⭐\\)`,
          { parse_mode: "MarkdownV2" }
        );
      } else {
        throw new Error(sendResult.description || "Gift send failed");
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      await ctx.api
        .editMessageText(
          ctx.chat.id,
          processingMsg.message_id,
          `🎁 *Gift untuk ${escapeMarkdownV2(targetUser.first_name)}*\n\n⚠️ Gagal mengirim gift otomatis\\.\n_Error: ${escapeMarkdownV2(errorMsg)}_`,
          { parse_mode: "MarkdownV2" }
        )
        .catch(() => null);
    }
  });

  return bot;
}

// ─── Webhook Handler ──────────────────────────────────────────────────────────
export function getBotWebhookCallback() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const bot = createBot(token);
  return webhookCallback(bot, "std/http");
}
