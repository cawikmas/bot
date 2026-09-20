import { Bot, webhookCallback, InputFile } from "grammy";
import type { MessageEntity } from "grammy/types";
import { db } from "@/db";
import { groupMembers, botLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// ─────────────────────────────────────────────
// Helper: Escape MarkdownV2
// ─────────────────────────────────────────────
function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

// ─────────────────────────────────────────────
// Helper: Escape XML for SVG
// ─────────────────────────────────────────────
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─────────────────────────────────────────────
// Helper: Track member in database
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Helper: Log command
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Speed test implementation using Cloudflare
// ─────────────────────────────────────────────
async function runSpeedTest(): Promise<{
  ping: string;
  download: string;
  upload: string;
  server: string;
}> {
  const testSizes = [100_000, 1_000_000];
  const pingResults: number[] = [];
  const downloadSpeeds: number[] = [];

  for (let i = 0; i < 5; i++) {
    const pingStart = Date.now();
    await fetch("https://speed.cloudflare.com/__down?bytes=0", {
      cache: "no-store",
    });
    pingResults.push(Date.now() - pingStart);
  }

  for (const size of testSizes) {
    const dlStart = Date.now();
    const resp = await fetch(
      `https://speed.cloudflare.com/__down?bytes=${size}`,
      { cache: "no-store" }
    );
    const blob = await resp.arrayBuffer();
    const dlTime = (Date.now() - dlStart) / 1000;
    const speedMbps = (blob.byteLength * 8) / dlTime / 1_000_000;
    downloadSpeeds.push(speedMbps);
  }

  const uploadData = new Uint8Array(500_000);
  const ulStart = Date.now();
  await fetch("https://speed.cloudflare.com/__up", {
    method: "POST",
    body: uploadData,
    cache: "no-store",
  });
  const ulTime = (Date.now() - ulStart) / 1000;
  const uploadMbps = (uploadData.byteLength * 8) / ulTime / 1_000_000;

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

// ─────────────────────────────────────────────
// Sticker creation (SVG)
// ─────────────────────────────────────────────
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
  ];
  const colorPair = bgColors[Math.floor(Math.random() * bgColors.length)];

  const truncated = text.length > 40 ? text.substring(0, 38) + "…" : text;
  const fontSize =
    truncated.length > 25 ? 44 : truncated.length > 15 ? 60 : 76;

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

  const lineHeight = fontSize + 18;
  const totalTextHeight = lines.length * lineHeight;
  const startY = (height - totalTextHeight) / 2 + fontSize;

  const linesSvg = lines
    .map(
      (line, i) =>
        `<text x="256" y="${startY + i * lineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" fill="white" text-anchor="middle" filter="url(#shadow)">${escapeXml(line)}</text>`
    )
    .join("\n");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colorPair[0]};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colorPair[1]};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="2" dy="4" stdDeviation="5" flood-color="rgba(0,0,0,0.5)"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" rx="100" ry="100" fill="url(#bg)"/>
  <circle cx="60" cy="60" r="80" fill="rgba(255,255,255,0.12)"/>
  <circle cx="450" cy="450" r="100" fill="rgba(0,0,0,0.1)"/>
  <circle cx="470" cy="60" r="50" fill="rgba(255,255,255,0.08)"/>
  ${linesSvg}
</svg>`;

  return Buffer.from(svg, "utf-8");
}

// ─────────────────────────────────────────────
// Bot factory — lazily created per-request
// ─────────────────────────────────────────────
function createBot(token: string) {
  const bot = new Bot(token);

  // Track every message to build member list
  bot.on("message", async (ctx, next) => {
    const msg = ctx.message;
    if (!msg || !ctx.chat || ctx.chat.type === "private") {
      return next();
    }
    const from = msg.from;
    if (from && !from.is_bot) {
      await trackMember(
        ctx.chat.id,
        from.id,
        from.username,
        from.first_name,
        from.last_name
      );
    }
    return next();
  });

  // Track new members joining
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
        await trackMember(
          ctx.chat.id,
          user.id,
          user.username,
          user.first_name,
          user.last_name
        );
      }
    } else if (
      newStatus.status === "left" ||
      newStatus.status === "kicked"
    ) {
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

  // /start & /help
  bot.command(["start", "help"], async (ctx) => {
    const helpText =
      `🤖 *Bot Multi\\-Fitur Telegram*\n\n` +
      `*Perintah yang tersedia:*\n\n` +
      `👥 *Group Commands:*\n` +
      `/tagall \\- Tag semua member di grup\n` +
      `/tagadmin \\- Tag semua admin di grup\n\n` +
      `⚡ *Tools:*\n` +
      `/ping \\- Cek kecepatan respons bot\n` +
      `/speedtest \\- Tes kecepatan internet server\n\n` +
      `🎨 *Stiker & Gift:*\n` +
      `/sticker \\[teks\\] \\- Buat stiker dari teks\n` +
      `/gift @username \\- Kirim gift ke user\n\n` +
      `ℹ️ *Info:*\n` +
      `/help \\- Tampilkan bantuan ini\n` +
      `/info \\- Info bot dan grup\n\n` +
      `_Bot harus menjadi *admin* di grup untuk fitur tagall\\._ `;

    await ctx.reply(helpText, { parse_mode: "MarkdownV2" });
  });

  // /ping
  bot.command("ping", async (ctx) => {
    const start = Date.now();
    const sent = await ctx.reply("🏓 Pong! Mengukur latency...");
    const latency = Date.now() - start;

    await ctx.api.editMessageText(
      ctx.chat.id,
      sent.message_id,
      `🏓 *Pong\\!*\n\n` +
        `⚡ Latency: \`${latency}ms\`\n` +
        `🕐 Waktu: \`${escapeMarkdownV2(new Date().toLocaleTimeString("id-ID"))}\``,
      { parse_mode: "MarkdownV2" }
    );

    await logCommand(ctx.chat.id, ctx.from?.id, "ping", `${latency}ms`);
  });

  // /speedtest
  bot.command("speedtest", async (ctx) => {
    const msg = await ctx.reply(
      "🌐 Menjalankan speedtest... Mohon tunggu ⏳\n_(Ini mungkin memerlukan 10\\-20 detik)_",
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

      await logCommand(
        ctx.chat.id,
        ctx.from?.id,
        "speedtest",
        JSON.stringify(results)
      );
    } catch (e) {
      console.error("speedtest error:", e);
      await ctx.api
        .editMessageText(
          ctx.chat.id,
          msg.message_id,
          "❌ Gagal menjalankan speedtest\\. Silakan coba lagi\\.",
          { parse_mode: "MarkdownV2" }
        )
        .catch(() => null);
    }
  });

  // /tagall
  bot.command("tagall", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") {
      await ctx.reply("❌ Perintah ini hanya bisa digunakan di grup!");
      return;
    }

    const from = ctx.from;
    if (!from) return;

    try {
      const chatMember = await ctx.api.getChatMember(ctx.chat.id, from.id);
      if (
        chatMember.status !== "administrator" &&
        chatMember.status !== "creator"
      ) {
        await ctx.reply("❌ Hanya admin yang bisa menggunakan perintah ini!");
        return;
      }
    } catch {
      await ctx.reply("❌ Gagal memeriksa status admin.");
      return;
    }

    const processingMsg = await ctx.reply(
      "⏳ Mengumpulkan daftar member..."
    );

    try {
      const admins = await ctx.api.getChatAdministrators(ctx.chat.id);
      const adminUserIds = new Set(admins.map((a) => a.user.id));

      for (const admin of admins) {
        if (!admin.user.is_bot) {
          await trackMember(
            ctx.chat.id,
            admin.user.id,
            admin.user.username,
            admin.user.first_name,
            admin.user.last_name
          );
        }
      }

      const allMembers = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.chatId, ctx.chat.id),
            eq(groupMembers.isActive, true)
          )
        );

      if (allMembers.length === 0) {
        await ctx.api.editMessageText(
          ctx.chat.id,
          processingMsg.message_id,
          "⚠️ Belum ada member yang tercatat\\.\nTunggu member mengirim pesan terlebih dahulu\\.",
          { parse_mode: "MarkdownV2" }
        );
        return;
      }

      await ctx.api.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        `📢 *Tag All Member* \\(${allMembers.length} orang\\)`,
        { parse_mode: "MarkdownV2" }
      );

      const chunkSize = 5;
      for (let i = 0; i < allMembers.length; i += chunkSize) {
        const chunk = allMembers.slice(i, i + chunkSize);
        const entities: MessageEntity[] = [];
        let text = i === 0 ? "👥 " : "";
        let offset = [...text].length;

        for (const member of chunk) {
          const name =
            member.firstName || member.username || `User${member.userId}`;
          const isAdmin = adminUserIds.has(member.userId);
          const displayName = isAdmin ? `👑${name}` : name;
          entities.push({
            type: "text_mention",
            offset,
            length: [...displayName].length,
            user: {
              id: member.userId,
              is_bot: false,
              first_name: member.firstName || displayName,
            },
          });
          text += displayName + " ";
          offset += [...displayName].length + 1;
        }

        await ctx.api.sendMessage(ctx.chat.id, text.trim(), {
          entities,
          reply_to_message_id: ctx.message?.message_id,
        });

        if (i + chunkSize < allMembers.length) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      await logCommand(
        ctx.chat.id,
        from.id,
        "tagall",
        `Tagged ${allMembers.length} members`
      );
    } catch (e) {
      console.error("tagall error:", e);
      await ctx.api
        .editMessageText(
          ctx.chat.id,
          processingMsg.message_id,
          "❌ Gagal melakukan tag all member\\.",
          { parse_mode: "MarkdownV2" }
        )
        .catch(() => null);
    }
  });

  // /tagadmin
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
        const name =
          admin.user.first_name || admin.user.username || "Admin";
        const label =
          admin.status === "creator"
            ? `🏆 ${name} (Owner)`
            : `⭐ ${name} (Admin)`;
        entities.push({
          type: "text_mention",
          offset,
          length: [...label].length,
          user: {
            id: admin.user.id,
            is_bot: false,
            first_name: admin.user.first_name || name,
          },
        });
        text += label + "\n";
        offset += [...label].length + 1;
      }

      await ctx.reply(text.trim(), { entities });
      await logCommand(
        ctx.chat.id,
        ctx.from?.id,
        "tagadmin",
        `${humanAdmins.length} admins`
      );
    } catch (e) {
      console.error("tagadmin error:", e);
      await ctx.reply("❌ Gagal mendapatkan daftar admin.");
    }
  });

  // /sticker
  bot.command("sticker", async (ctx) => {
    const text = ctx.match?.trim();
    if (!text) {
      await ctx.reply(
        "❌ Gunakan: /sticker [teks]\n\nContoh:\n• /sticker Halo Dunia! 😊\n• /sticker Selamat Ulang Tahun 🎉"
      );
      return;
    }

    const processingMsg = await ctx.reply(
      "🎨 Membuat stiker dari teks..."
    );

    try {
      const stickerBuffer = await createTextSticker(text);

      await ctx.api
        .deleteMessage(ctx.chat.id, processingMsg.message_id)
        .catch(() => null);

      await ctx.replyWithDocument(
        new InputFile(stickerBuffer, "sticker.svg"),
        {
          caption:
            `🎨 Stiker: *${escapeMarkdownV2(text)}*\n\nDibuat dengan /sticker`,
          parse_mode: "MarkdownV2",
        }
      );

      await logCommand(
        ctx.chat.id,
        ctx.from?.id,
        "sticker",
        `Created: ${text.substring(0, 50)}`
      );
    } catch (e) {
      console.error("sticker error:", e);
      await ctx.api
        .editMessageText(
          ctx.chat.id,
          processingMsg.message_id,
          "❌ Gagal membuat stiker\\. Coba lagi dengan teks yang lebih pendek\\.",
          { parse_mode: "MarkdownV2" }
        )
        .catch(() => null);
    }
  });

  // /gift
  bot.command("gift", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const replyTo = ctx.message?.reply_to_message;
    const args = ctx.match?.trim();

    let targetUser: {
      id: number;
      first_name: string;
      username?: string;
    } | null = null;

    if (replyTo?.from && !replyTo.from.is_bot) {
      targetUser = replyTo.from;
    } else if (args) {
      const username = args.replace("@", "").trim();
      const found = await db
        .select()
        .from(groupMembers)
        .where(eq(groupMembers.username, username))
        .limit(1);

      if (found.length > 0) {
        targetUser = {
          id: found[0].userId,
          first_name: found[0].firstName || username,
          username: found[0].username ?? undefined,
        };
      }
    }

    if (!targetUser) {
      await ctx.reply(
        "❌ *Cara penggunaan:*\n\n" +
          "• Reply pesan seseorang lalu ketik /gift\n" +
          "• /gift @username\n\n" +
          "⚠️ Fitur gift memerlukan Telegram Stars di saldo bot\\.",
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    const processingMsg = await ctx.reply(
      `🎁 Memproses gift untuk ${targetUser.first_name}...`
    );

    try {
      const giftsResponse = await fetch(
        `https://api.telegram.org/bot${token}/getAvailableGifts`
      );
      const giftsData = (await giftsResponse.json()) as {
        ok: boolean;
        result?: {
          gifts: Array<{
            id: string;
            sticker?: { emoji?: string };
            star_count: number;
            total_count?: number;
            remaining_count?: number;
          }>;
        };
      };

      if (!giftsData.ok || !giftsData.result?.gifts?.length) {
        await ctx.api.editMessageText(
          ctx.chat.id,
          processingMsg.message_id,
          `🎁 *Info Gift untuk ${escapeMarkdownV2(targetUser.first_name)}*\n\n` +
            `⚠️ Tidak ada gift yang tersedia saat ini\\.\n` +
            `Bot memerlukan saldo Telegram Stars untuk mengirim gift\\.\n\n` +
            `💡 Isi saldo Stars bot via @BotFather`,
          { parse_mode: "MarkdownV2" }
        );
        return;
      }

      const availableGifts = giftsData.result.gifts.filter(
        (g) =>
          !g.total_count ||
          (g.remaining_count !== undefined && g.remaining_count > 0)
      );

      if (availableGifts.length === 0) {
        throw new Error("No available gifts with remaining stock");
      }

      const cheapestGift = availableGifts.sort(
        (a, b) => a.star_count - b.star_count
      )[0];

      const sendGiftResponse = await fetch(
        `https://api.telegram.org/bot${token}/sendGift`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: targetUser.id,
            gift_id: cheapestGift.id,
            text: `🎁 Hadiah dari ${from.first_name}! Semoga harimu menyenangkan! ✨`,
          }),
        }
      );

      const sendResult = (await sendGiftResponse.json()) as {
        ok: boolean;
        description?: string;
      };

      if (sendResult.ok) {
        await ctx.api.editMessageText(
          ctx.chat.id,
          processingMsg.message_id,
          `🎁 *Gift Berhasil Dikirim\\!*\n\n` +
            `Dari: ${escapeMarkdownV2(from.first_name)}\n` +
            `Untuk: ${escapeMarkdownV2(targetUser.first_name)}\n` +
            `Hadiah: ${cheapestGift.sticker?.emoji || "🎁"} \\(${cheapestGift.star_count} ⭐\\)\n\n` +
            `✨ Semoga harinya menyenangkan\\!`,
          { parse_mode: "MarkdownV2" }
        );

        await logCommand(
          ctx.chat.id,
          from.id,
          "gift",
          `Gift ${cheapestGift.id} → user ${targetUser.id}`
        );
      } else {
        throw new Error(sendResult.description || "Gift send failed");
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error("gift error:", e);

      await ctx.api
        .editMessageText(
          ctx.chat.id,
          processingMsg.message_id,
          `🎁 *Gift untuk ${escapeMarkdownV2(targetUser.first_name)}*\n\n` +
            `⚠️ Gagal mengirim gift otomatis\\.\n` +
            `_Error: ${escapeMarkdownV2(errorMsg)}_\n\n` +
            `💡 *Cara manual:* Buka profil ${escapeMarkdownV2(
              targetUser.username
                ? "@" + targetUser.username
                : targetUser.first_name
            )} → Kirim Gift`,
          { parse_mode: "MarkdownV2" }
        )
        .catch(() => null);
    }
  });

  // /info
  bot.command("info", async (ctx) => {
    try {
      const chat = ctx.chat;
      const botInfo = await ctx.api.getMe();
      let memberCount = 0;
      let dbMemberCount = 0;

      if (chat.type !== "private") {
        try {
          memberCount = await ctx.api.getChatMemberCount(chat.id);
        } catch {
          // ignore
        }

        const dbMembers = await db
          .select()
          .from(groupMembers)
          .where(
            and(
              eq(groupMembers.chatId, chat.id),
              eq(groupMembers.isActive, true)
            )
          );
        dbMemberCount = dbMembers.length;
      }

      const chatTitle =
        "title" in chat ? chat.title : "Private Chat";

      await ctx.reply(
        `ℹ️ *Informasi Bot & Grup*\n\n` +
          `🤖 *Bot:* @${escapeMarkdownV2(botInfo.username || "unknown")}\n` +
          `💬 *Grup:* ${escapeMarkdownV2(chatTitle || "N/A")}\n` +
          `👥 *Total Member:* ${memberCount}\n` +
          `📊 *Member Tercatat:* ${dbMemberCount}\n` +
          `🆔 *Chat ID:* \`${chat.id}\`\n` +
          `⏰ *Waktu Server:* ${escapeMarkdownV2(
            new Date().toLocaleString("id-ID")
          )}`,
        { parse_mode: "MarkdownV2" }
      );

      await logCommand(
        ctx.chat.id,
        ctx.from?.id,
        "info",
        `Chat: ${chat.id}`
      );
    } catch (e) {
      console.error("info error:", e);
      await ctx.reply("❌ Gagal mendapatkan informasi.");
    }
  });

  return bot;
}

// ─────────────────────────────────────────────
// Webhook handler — exported for API route
// ─────────────────────────────────────────────
export function getBotWebhookCallback() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return null;
  }
  const bot = createBot(token);
  return webhookCallback(bot, "std/http");
}
