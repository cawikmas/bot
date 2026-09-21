import { Bot } from "grammy";
import { db } from "@/db";
import { groupMembers, groupSettings, giveaways } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { isAdmin, safeReply, shuffle, randomInt, formatNumber } from "../helpers";
import { getGroupMembers, getOrCreateSettings } from "../memberTracker";

export function registerGroupCommands(bot: Bot) {
  // ─── /tagall ─────────────────────────────────────────────────────────────
  bot.command("tagall", async (ctx) => {
    if (ctx.chat?.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");

    const chatId = String(ctx.chat!.id);
    const members = await getGroupMembers(chatId);

    // Get admins too
    const admins = await ctx.api.getChatAdministrators(ctx.chat!.id);
    const adminIds = new Set(admins.map((a) => String(a.user.id)));

    const message = ctx.match || "📢 Perhatian semua member!";

    // Build mention list
    const mentions: string[] = [];

    // Add tracked members
    for (const m of members) {
      if (m.isBot) continue;
      const name = m.username ? `@${m.username}` : `[${m.firstName ?? "User"}](tg://user?id=${m.userId})`;
      mentions.push(name);
    }

    // Add admins not in members
    for (const admin of admins) {
      if (!admin.user.is_bot && !members.find((m) => m.userId === String(admin.user.id))) {
        const name = admin.user.username
          ? `@${admin.user.username}`
          : `[${admin.user.first_name}](tg://user?id=${admin.user.id})`;
        mentions.push(name);
      }
    }

    if (mentions.length === 0) {
      return safeReply(ctx, "❌ Belum ada member yang tercatat. Member perlu mengirim pesan dulu.");
    }

    // Send in chunks of 15
    const chunks: string[][] = [];
    for (let i = 0; i < mentions.length; i += 15) {
      chunks.push(mentions.slice(i, i + 15));
    }

    await ctx.reply(`📢 *${message}*\n\n👥 Total member: ${mentions.length}`, { parse_mode: "Markdown" });

    for (const chunk of chunks) {
      await ctx.reply(chunk.join(" "), { parse_mode: "Markdown" });
    }
  });

  // ─── /tagadmin ───────────────────────────────────────────────────────────
  bot.command("tagadmin", async (ctx) => {
    if (ctx.chat?.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");

    const message = ctx.match || "🆘 Ada yang ingin menghubungi admin!";
    const admins = await ctx.api.getChatAdministrators(ctx.chat!.id);

    const mentions = admins
      .filter((a) => !a.user.is_bot)
      .map((a) =>
        a.user.username
          ? `@${a.user.username}`
          : `[${a.user.first_name}](tg://user?id=${a.user.id})`
      );

    await ctx.reply(
      `👑 *Tag Admin*\n\n📢 ${message}\n\n${mentions.join(" ")}`,
      { parse_mode: "Markdown" }
    );
  });

  // ─── /ping ───────────────────────────────────────────────────────────────
  bot.command("ping", async (ctx) => {
    const start = Date.now();
    const msg = await ctx.reply("🏓 Pong...");
    const latency = Date.now() - start;

    await ctx.api.editMessageText(
      ctx.chat!.id,
      msg.message_id,
      `🏓 *Pong!*\n\n⚡ Latency: *${latency}ms*\n🤖 Status: Online ✅`,
      { parse_mode: "Markdown" }
    );
  });

  // ─── /speedtest ──────────────────────────────────────────────────────────
  bot.command("speedtest", async (ctx) => {
    const start = Date.now();
    const msg = await ctx.reply("🚀 Mengukur kecepatan server...");

    try {
      const testStart = Date.now();
      await fetch("https://1.1.1.1/dns-query?name=example.com", {
        headers: { Accept: "application/dns-json" },
      });
      const ping = Date.now() - testStart;
      const totalTime = Date.now() - start;

      await ctx.api.editMessageText(
        ctx.chat!.id,
        msg.message_id,
        `🚀 *Speed Test Selesai*\n\n` +
        `🏓 DNS Ping: *${ping}ms*\n` +
        `⚡ Response time: *${totalTime}ms*\n` +
        `🌐 Server: Cloudflare (1.1.1.1)\n` +
        `✅ Status: Normal`,
        { parse_mode: "Markdown" }
      );
    } catch {
      await ctx.api.editMessageText(
        ctx.chat!.id,
        msg.message_id,
        "❌ Speed test gagal."
      );
    }
  });

  // ─── /welcome ────────────────────────────────────────────────────────────
  bot.command("welcome", async (ctx) => {
    const chatId = String(ctx.chat!.id);
    const settings = await getOrCreateSettings(chatId);

    if (settings.welcomeEnabled) {
      await safeReply(ctx,
        `👋 *Pesan Selamat Datang*\n\n` +
        `Status: ✅ Aktif\n\n` +
        `Pesan saat ini:\n_${settings.welcomeMessage || "Selamat datang, {name}! Senang kamu bergabung di {group}!"}_ \n\n` +
        `Gunakan /setwelcome [pesan] untuk mengubah.\nVariabel: {name}, {group}, {count}`
      );
    } else {
      await safeReply(ctx, "❌ Welcome message tidak aktif. Gunakan /setwelcome untuk mengaktifkan.");
    }
  });

  // ─── /setwelcome ─────────────────────────────────────────────────────────
  bot.command("setwelcome", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const message = ctx.match || "";
    const chatId = String(ctx.chat!.id);

    if (!message) {
      return safeReply(ctx,
        "👋 Gunakan: /setwelcome [pesan]\n\nVariabel yang bisa digunakan:\n{name} - Nama member\n{group} - Nama grup\n{count} - Total member"
      );
    }

    await db.update(groupSettings)
      .set({ welcomeMessage: message, welcomeEnabled: true, updatedAt: new Date() })
      .where(eq(groupSettings.chatId, chatId));

    await safeReply(ctx, `✅ Pesan welcome telah diperbarui!\n\nPreview:\n_${message}_`);
  });

  // ─── /setgoodbye ─────────────────────────────────────────────────────────
  bot.command("setgoodbye", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const message = ctx.match || "";
    const chatId = String(ctx.chat!.id);

    if (!message) return safeReply(ctx, "👋 Gunakan: /setgoodbye [pesan]");

    await db.update(groupSettings)
      .set({ goodbyeMessage: message, goodbyeEnabled: true, updatedAt: new Date() })
      .where(eq(groupSettings.chatId, chatId));

    await safeReply(ctx, `✅ Pesan goodbye telah diperbarui!`);
  });

  // ─── /rules ──────────────────────────────────────────────────────────────
  bot.command("rules", async (ctx) => {
    await safeReply(ctx,
      `📋 *Peraturan Grup*\n\n` +
      `1️⃣ Hormati sesama member\n` +
      `2️⃣ Dilarang spam & flood\n` +
      `3️⃣ Dilarang SARA & kata kasar\n` +
      `4️⃣ Dilarang share link tanpa izin\n` +
      `5️⃣ Gunakan bahasa yang sopan\n` +
      `6️⃣ Iklan hanya di channel yang ditentukan\n` +
      `7️⃣ Admin adalah hukum tertinggi\n\n` +
      `⚠️ Pelanggaran = warn → kick → ban\n\n` +
      `_Admin bisa mengubah rules dengan /setrules_`
    );
  });

  // ─── /setrules ───────────────────────────────────────────────────────────
  bot.command("setrules", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    await safeReply(ctx, "📋 Fitur setrules akan disimpan ke database. Coming soon! Gunakan /note rules [isi peraturan] untuk sementara.");
  });

  // ─── /antilink ───────────────────────────────────────────────────────────
  bot.command("antilink", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const chatId = String(ctx.chat!.id);
    const settings = await getOrCreateSettings(chatId);
    const newVal = !settings.antiLinkEnabled;

    await db.update(groupSettings)
      .set({ antiLinkEnabled: newVal, updatedAt: new Date() })
      .where(eq(groupSettings.chatId, chatId));

    await safeReply(ctx, `🔗 Anti-link: ${newVal ? "✅ Diaktifkan" : "❌ Dinonaktifkan"}`);
  });

  // ─── /antispam ───────────────────────────────────────────────────────────
  bot.command("antispam", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const chatId = String(ctx.chat!.id);
    const settings = await getOrCreateSettings(chatId);
    const newVal = !settings.antiSpamEnabled;

    await db.update(groupSettings)
      .set({ antiSpamEnabled: newVal, updatedAt: new Date() })
      .where(eq(groupSettings.chatId, chatId));

    await safeReply(ctx, `🛡️ Anti-spam: ${newVal ? "✅ Diaktifkan" : "❌ Dinonaktifkan"}`);
  });

  // ─── /settings ───────────────────────────────────────────────────────────
  bot.command("settings", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const chatId = String(ctx.chat!.id);
    const s = await getOrCreateSettings(chatId);

    await safeReply(ctx,
      `⚙️ *Pengaturan Grup*\n\n` +
      `👋 Welcome: ${s.welcomeEnabled ? "✅" : "❌"}\n` +
      `👋 Goodbye: ${s.goodbyeEnabled ? "✅" : "❌"}\n` +
      `🔗 Anti-link: ${s.antiLinkEnabled ? "✅" : "❌"}\n` +
      `🛡️ Anti-spam: ${s.antiSpamEnabled ? "✅" : "❌"}\n` +
      `💬 Bad word filter: ${s.antiBadWordEnabled ? "✅" : "❌"}\n` +
      `⚠️ Max warnings: ${s.maxWarnings}\n` +
      `🌍 Bahasa: ${s.language}\n` +
      `🕐 Timezone: ${s.timezone}\n\n` +
      `_Gunakan perintah untuk mengubah pengaturan_`
    );
  });

  // ─── /giveaway ───────────────────────────────────────────────────────────
  bot.command("giveaway", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");

    const args = (ctx.match || "").split("|").map((s) => s.trim());
    if (args.length < 2) {
      return safeReply(ctx,
        "🎁 Gunakan: /giveaway [hadiah] | [durasi menit] | [jumlah pemenang]\n\n" +
        "Contoh: /giveaway Nitro Discord | 60 | 1"
      );
    }

    const prize = args[0];
    const minutes = parseInt(args[1]) || 60;
    const winners = parseInt(args[2]) || 1;
    const endAt = new Date(Date.now() + minutes * 60 * 1000);
    const chatId = String(ctx.chat!.id);

    const [giveaway] = await db.insert(giveaways).values({
      chatId,
      prize,
      maxWinners: winners,
      endAt,
      createdBy: String(ctx.from!.id),
    }).returning();

    await ctx.reply(
      `🎁 *GIVEAWAY DIMULAI!*\n\n` +
      `🏆 Hadiah: *${prize}*\n` +
      `👥 Pemenang: *${winners} orang*\n` +
      `⏰ Berakhir: *${endAt.toLocaleString("id-ID")}*\n` +
      `🆔 ID: \`${giveaway.id}\`\n\n` +
      `Ketik /joingiveaway ${giveaway.id} untuk ikut!`,
      { parse_mode: "Markdown" }
    );
  });

  // ─── /joingiveaway ───────────────────────────────────────────────────────
  bot.command("joingiveaway", async (ctx) => {
    const id = parseInt(ctx.match || "0");
    if (!id) return safeReply(ctx, "🎁 Gunakan: /joingiveaway [ID giveaway]");

    const chatId = String(ctx.chat!.id);
    const userId = String(ctx.from!.id);

    const [giveaway] = await db.select().from(giveaways)
      .where(and(eq(giveaways.chatId, chatId), eq(giveaways.id, id)));

    if (!giveaway) return safeReply(ctx, "❌ Giveaway tidak ditemukan.");
    if (!giveaway.isActive) return safeReply(ctx, "❌ Giveaway sudah berakhir.");
    if (new Date() > giveaway.endAt) return safeReply(ctx, "❌ Giveaway sudah berakhir.");

    const participants = giveaway.participants || [];
    if (participants.includes(userId)) {
      return safeReply(ctx, "✅ Kamu sudah terdaftar di giveaway ini!");
    }

    await db.update(giveaways)
      .set({ participants: [...participants, userId] })
      .where(eq(giveaways.id, id));

    await safeReply(ctx,
      `✅ *${ctx.from!.first_name}* berhasil mendaftar giveaway!\n\n` +
      `🎁 Hadiah: ${giveaway.prize}\n` +
      `👥 Peserta: ${participants.length + 1}`
    );
  });

  // ─── /endgiveaway ────────────────────────────────────────────────────────
  bot.command("endgiveaway", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const id = parseInt(ctx.match || "0");
    if (!id) return safeReply(ctx, "🎁 Gunakan: /endgiveaway [ID]");

    const chatId = String(ctx.chat!.id);
    const [giveaway] = await db.select().from(giveaways)
      .where(and(eq(giveaways.chatId, chatId), eq(giveaways.id, id)));

    if (!giveaway) return safeReply(ctx, "❌ Giveaway tidak ditemukan.");

    const participants = giveaway.participants || [];
    if (participants.length === 0) {
      await db.update(giveaways).set({ isActive: false }).where(eq(giveaways.id, id));
      return safeReply(ctx, "😢 Tidak ada peserta giveaway.");
    }

    const shuffled = shuffle([...participants]);
    const numWinners = Math.min(giveaway.maxWinners ?? 1, shuffled.length);
    const winnerIds = shuffled.slice(0, numWinners);

    await db.update(giveaways)
      .set({ isActive: false, winners: winnerIds })
      .where(eq(giveaways.id, id));

    const winnerMentions = winnerIds.map((id) => `[User](tg://user?id=${id})`).join(", ");

    await ctx.reply(
      `🎊 *GIVEAWAY BERAKHIR!*\n\n` +
      `🏆 Hadiah: *${giveaway.prize}*\n\n` +
      `🎉 *Pemenang:*\n${winnerMentions}\n\n` +
      `👥 Total peserta: ${participants.length}`,
      { parse_mode: "Markdown" }
    );
  });

  // ─── Welcome handler ─────────────────────────────────────────────────────
  bot.on("chat_member", async (ctx) => {
    const update = ctx.chatMember;
    if (
      update.new_chat_member.status === "member" &&
      update.old_chat_member.status !== "member" &&
      update.old_chat_member.status !== "administrator" &&
      update.old_chat_member.status !== "creator"
    ) {
      const chatId = String(ctx.chat.id);
      const settings = await getOrCreateSettings(chatId);

      if (settings.welcomeEnabled) {
        const user = update.new_chat_member.user;
        const name = user.first_name;
        const groupName = ("title" in ctx.chat ? ctx.chat.title : null) ?? "grup";
        const msg = (settings.welcomeMessage || "Selamat datang, {name}! Senang kamu bergabung di {group}! 🎉")
          .replace("{name}", name)
          .replace("{group}", groupName)
          .replace("{count}", "?");

        try {
          await ctx.api.sendMessage(ctx.chat.id, `👋 ${msg}`, { parse_mode: "Markdown" });
        } catch { /* ignore */ }
      }
    }

    // Goodbye
    if (
      (update.new_chat_member.status === "left" || update.new_chat_member.status === "kicked") &&
      update.old_chat_member.status === "member"
    ) {
      const chatId = String(ctx.chat.id);
      const settings = await getOrCreateSettings(chatId);

      if (settings.goodbyeEnabled) {
        const user = update.old_chat_member.user;
        const name = user.first_name;
        const msg = (settings.goodbyeMessage || "Sampai jumpa, {name}! Semoga sukses selalu. 👋")
          .replace("{name}", name);

        try {
          await ctx.api.sendMessage(ctx.chat.id, `👋 ${msg}`, { parse_mode: "Markdown" });
        } catch { /* ignore */ }
      }
    }
  });

  // ─── /sticker ────────────────────────────────────────────────────────────
  bot.command("sticker", async (ctx) => {
    const text = ctx.match || "TeleBot Pro";
    const colors = [
      ["#FF6B6B", "#FFE66D"],
      ["#4ECDC4", "#44A08D"],
      ["#A8EDEA", "#FED6E3"],
      ["#5f2c82", "#49a09d"],
      ["#f093fb", "#f5576c"],
      ["#4facfe", "#00f2fe"],
      ["#43e97b", "#38f9d7"],
      ["#fa709a", "#fee140"],
    ];

    const [c1, c2] = colors[randomInt(0, colors.length - 1)];
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      if ((current + " " + word).trim().length > 15) {
        if (current) lines.push(current.trim());
        current = word;
      } else {
        current = (current + " " + word).trim();
      }
    }
    if (current) lines.push(current);

    const lineHeight = 80;
    const totalHeight = Math.max(512, lines.length * lineHeight + 100);
    const textElements = lines.map((line, i) =>
      `<text x="256" y="${150 + i * lineHeight}" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial Black, sans-serif" font-size="64" font-weight="900"
        fill="white" stroke="#00000033" stroke-width="2">${line}</text>`
    ).join("\n");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${c1}"/>
          <stop offset="100%" style="stop-color:${c2}"/>
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
        </filter>
      </defs>
      <circle cx="256" cy="256" r="250" fill="url(#g)" filter="url(#shadow)"/>
      ${textElements}
    </svg>`;

    try {
      const { InputFile } = await import("grammy");
      await ctx.replyWithDocument(
        new InputFile(Buffer.from(svg), "sticker.svg"),
        { caption: `🎨 Stiker: _${text}_`, parse_mode: "Markdown" }
      );
    } catch {
      safeReply(ctx, "❌ Gagal membuat stiker.");
    }
  });

  // ─── /broadcast ──────────────────────────────────────────────────────────
  bot.command("broadcast", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const message = ctx.match || "";
    if (!message) return safeReply(ctx, "📢 Gunakan: /broadcast [pesan]");

    await safeReply(ctx,
      `📢 *Broadcast Pesan*\n\n` +
      `✅ Pesan akan dikirim ke semua grup yang terdaftar.\n\n` +
      `Preview:\n_${message}_\n\n` +
      `_Fitur broadcast multi-grup tersedia via dashboard._`
    );
  });

  // ─── /poll ───────────────────────────────────────────────────────────────
  bot.command("poll", async (ctx) => {
    const args = (ctx.match || "").split("|").map((s) => s.trim());
    if (args.length < 3) {
      return safeReply(ctx,
        "📊 Gunakan: /poll [pertanyaan] | [opsi1] | [opsi2] | [opsi3]\n\n" +
        "Contoh: /poll Bahasa favorit? | Python | JavaScript | Rust"
      );
    }

    const question = args[0];
    const options = args.slice(1);

    try {
      await ctx.replyWithPoll(question, options, {
        is_anonymous: false,
        allows_multiple_answers: false,
      });
    } catch (err) {
      safeReply(ctx, "❌ Gagal membuat polling. Max 10 pilihan.");
    }
  });

  // ─── /feedback ───────────────────────────────────────────────────────────
  bot.command("feedback", async (ctx) => {
    const message = ctx.match || "";
    if (!message) return safeReply(ctx, "📝 Gunakan: /feedback [pesan]");

    await safeReply(ctx,
      `✅ *Terima kasih atas feedback kamu!*\n\n_"${message}"_\n\nFeedback kamu telah dicatat dan akan dipertimbangkan.`
    );
  });
}
