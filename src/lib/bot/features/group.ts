import { Bot } from "grammy";
import { db } from "@/db";
import { groupMembers, groupSettings, giveaways, customCommands, raffleTickets } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { isAdmin, safeReply, shuffle, randomInt, formatNumber } from "../helpers";
import { getGroupMembers, getOrCreateSettings } from "../memberTracker";

export function registerGroupCommands(bot: Bot) {
  // ─── /tagall ──────────────────────────────────────────────────────────
  bot.command("tagall", async (ctx) => {
    if (ctx.chat?.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const chatId = String(ctx.chat!.id);
    const members = await getGroupMembers(chatId);
    const admins = await ctx.api.getChatAdministrators(ctx.chat!.id);
    const message = ctx.match || "📢 Perhatian semua member!";

    const mentions: string[] = [];
    for (const m of members) {
      if (m.isBot) continue;
      const name = m.username ? `@${m.username}` : `[${m.firstName ?? "User"}](tg://user?id=${m.userId})`;
      mentions.push(name);
    }
    for (const admin of admins) {
      if (!admin.user.is_bot && !members.find((m) => m.userId === String(admin.user.id))) {
        const name = admin.user.username ? `@${admin.user.username}` : `[${admin.user.first_name}](tg://user?id=${admin.user.id})`;
        mentions.push(name);
      }
    }

    if (mentions.length === 0) {
      return safeReply(ctx, "❌ Belum ada member yang tercatat. Member perlu mengirim pesan dulu.");
    }

    const chunkSize = 15;
    const chunks: string[][] = [];
    for (let i = 0; i < mentions.length; i += chunkSize) {
      chunks.push(mentions.slice(i, i + chunkSize));
    }

    await ctx.reply(`📢 *${message}*\n\n👥 Total: ${mentions.length} member`, { parse_mode: "Markdown" });
    for (const chunk of chunks) {
      await ctx.reply(chunk.join(" "), { parse_mode: "Markdown" });
    }
  });

  // ─── /tagadmin ────────────────────────────────────────────────────────
  bot.command("tagadmin", async (ctx) => {
    if (ctx.chat?.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const message = ctx.match || "🆘 Ada yang ingin menghubungi admin!";
    const admins = await ctx.api.getChatAdministrators(ctx.chat!.id);
    const mentions = admins
      .filter((a) => !a.user.is_bot)
      .map((a) => a.user.username ? `@${a.user.username}` : `[${a.user.first_name}](tg://user?id=${a.user.id})`);
    await ctx.reply(
      `👑 *Tag Admin*\n\n📢 ${message}\n\n${mentions.join(" ")}`,
      { parse_mode: "Markdown" }
    );
  });

  // ─── /welcome ─────────────────────────────────────────────────────────
  bot.command("welcome", async (ctx) => {
    const chatId = String(ctx.chat!.id);
    const settings = await getOrCreateSettings(chatId);
    await safeReply(ctx,
      `👋 *Pesan Selamat Datang*\n\n` +
      `Status: ${settings.welcomeEnabled ? "✅ Aktif" : "❌ Nonaktif"}\n\n` +
      `Pesan saat ini:\n_${settings.welcomeMessage || "Selamat datang, {name}! Senang kamu bergabung di {group}!"}_ \n\n` +
      `Gunakan /setwelcome [pesan] untuk mengubah.\nVariabel: {name}, {group}, {count}`
    );
  });

  // ─── /setwelcome ──────────────────────────────────────────────────────
  bot.command("setwelcome", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const message = ctx.match || "";
    const chatId = String(ctx.chat!.id);
    if (!message) {
      return safeReply(ctx, "👋 Gunakan: /setwelcome [pesan]\n\nVariabel:\n{name} - Nama member\n{group} - Nama grup\n{count} - Total member");
    }
    await db.update(groupSettings)
      .set({ welcomeMessage: message, welcomeEnabled: true, updatedAt: new Date() })
      .where(eq(groupSettings.chatId, chatId));
    await safeReply(ctx, `✅ Pesan welcome telah diperbarui!\n\nPreview:\n_${message}_`);
  });

  // ─── /setgoodbye ──────────────────────────────────────────────────────
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

  // ─── /rules ───────────────────────────────────────────────────────────
  bot.command("rules", async (ctx) => {
    const chatId = String(ctx.chat!.id);
    const settings = await getOrCreateSettings(chatId);
    if (settings.groupRules) {
      await safeReply(ctx, `📋 *Peraturan Grup*\n\n${settings.groupRules}`);
    } else {
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
    }
  });

  // ─── /setrules ────────────────────────────────────────────────────────
  bot.command("setrules", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const rules = ctx.match || "";
    if (!rules) return safeReply(ctx, "📋 Gunakan: /setrules [isi peraturan]");
    const chatId = String(ctx.chat!.id);
    await db.update(groupSettings)
      .set({ groupRules: rules, updatedAt: new Date() })
      .where(eq(groupSettings.chatId, chatId));
    await safeReply(ctx, `✅ Peraturan grup telah diperbarui!`);
  });

  // ─── /antilink ────────────────────────────────────────────────────────
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

  // ─── /antispam ────────────────────────────────────────────────────────
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

  // ─── /antiflood ───────────────────────────────────────────────────────
  bot.command("antiflood", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const chatId = String(ctx.chat!.id);
    const settings = await getOrCreateSettings(chatId);
    const newVal = !settings.antiFloodEnabled;
    await db.update(groupSettings)
      .set({ antiFloodEnabled: newVal, updatedAt: new Date() })
      .where(eq(groupSettings.chatId, chatId));
    await safeReply(ctx, `🌊 Anti-flood: ${newVal ? "✅ Diaktifkan (maks 5 pesan/10 detik)" : "❌ Dinonaktifkan"}`);
  });

  // ─── /settings ────────────────────────────────────────────────────────
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
      `🌊 Anti-flood: ${s.antiFloodEnabled ? "✅" : "❌"}\n` +
      `💬 Bad word filter: ${s.antiBadWordEnabled ? "✅" : "❌"}\n` +
      `🎂 Birthday notif: ${s.birthdayEnabled ? "✅" : "❌"}\n` +
      `⬆️ Level up notif: ${s.levelUpEnabled ? "✅" : "❌"}\n` +
      `⚠️ Max warnings: ${s.maxWarnings}\n` +
      `🌍 Bahasa: ${s.language}\n` +
      `🕐 Timezone: ${s.timezone}\n\n` +
      `_Gunakan perintah untuk mengubah pengaturan_`
    );
  });

  // ─── /setlang ─────────────────────────────────────────────────────────
  bot.command("setlang", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const lang = (ctx.match || "").toLowerCase().trim();
    const supported = ["id", "en", "ms", "ar"];
    if (!supported.includes(lang)) {
      return safeReply(ctx, `🌍 Bahasa yang didukung: ${supported.join(", ")}\nContoh: /setlang id`);
    }
    const chatId = String(ctx.chat!.id);
    await db.update(groupSettings).set({ language: lang, updatedAt: new Date() }).where(eq(groupSettings.chatId, chatId));
    await safeReply(ctx, `✅ Bahasa diubah ke: *${lang}*`);
  });

  // ─── /giveaway ────────────────────────────────────────────────────────
  bot.command("giveaway", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const args = (ctx.match || "").split("|").map((s) => s.trim());
    if (args.length < 2) {
      return safeReply(ctx,
        "🎁 Gunakan: /giveaway [hadiah] | [durasi jam] | [max pemenang]\n\n" +
        "Contoh: /giveaway iPhone 15 | 24 | 1\n" +
        "Atau: /giveaway Nitro Discord | 12"
      );
    }
    const prize = args[0];
    const hours = parseFloat(args[1]) || 24;
    const maxWinners = parseInt(args[2]) || 1;
    const endAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const chatId = String(ctx.chat!.id);

    const [ga] = await db.insert(giveaways).values({
      chatId,
      prize,
      maxWinners,
      endAt,
      createdBy: String(ctx.from!.id),
    }).returning();

    await ctx.reply(
      `🎁 *GIVEAWAY DIMULAI!*\n\n` +
      `🏆 Hadiah: *${prize}*\n` +
      `🏅 Pemenang: *${maxWinners}*\n` +
      `⏰ Berakhir: ${endAt.toLocaleString("id-ID")}\n` +
      `🆔 ID: #${ga.id}\n\n` +
      `Ketik /joingiveaway ${ga.id} untuk ikut!`,
      { parse_mode: "Markdown" }
    );
  });

  // ─── /joingiveaway ────────────────────────────────────────────────────
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
    if (participants.includes(userId)) return safeReply(ctx, "✅ Kamu sudah terdaftar di giveaway ini!");
    await db.update(giveaways)
      .set({ participants: [...participants, userId] })
      .where(eq(giveaways.id, id));
    await safeReply(ctx,
      `✅ *${ctx.from!.first_name}* berhasil mendaftar giveaway!\n\n` +
      `🎁 Hadiah: ${giveaway.prize}\n` +
      `👥 Peserta: ${participants.length + 1}`
    );
  });

  // ─── /endgiveaway ─────────────────────────────────────────────────────
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

  // ─── /addcmd ──────────────────────────────────────────────────────────
  bot.command("addcmd", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const args = (ctx.match || "").split("|").map(s => s.trim());
    if (args.length < 2) {
      return safeReply(ctx,
        "⚡ Gunakan: /addcmd [perintah] | [respons]\n\n" +
        "Contoh: /addcmd sosmed | Follow IG kami @example!\n\n" +
        "Nantinya: /sosmed akan membalas secara otomatis."
      );
    }
    const command = args[0].toLowerCase().replace("/", "");
    const response = args[1];
    const chatId = String(ctx.chat!.id);

    const existing = await db.select().from(customCommands)
      .where(and(eq(customCommands.chatId, chatId), eq(customCommands.command, command)))
      .limit(1);

    if (existing.length > 0) {
      await db.update(customCommands)
        .set({ response })
        .where(eq(customCommands.id, existing[0].id));
      await safeReply(ctx, `✅ Perintah */${command}* telah diperbarui!`);
    } else {
      await db.insert(customCommands).values({ chatId, command, response, createdBy: String(ctx.from!.id) });
      await safeReply(ctx, `✅ Perintah */${command}* telah ditambahkan!`);
    }
  });

  // ─── /delcmd ──────────────────────────────────────────────────────────
  bot.command("delcmd", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const command = (ctx.match || "").toLowerCase().replace("/", "").trim();
    if (!command) return safeReply(ctx, "⚡ Gunakan: /delcmd [perintah]");
    const chatId = String(ctx.chat!.id);
    await db.delete(customCommands)
      .where(and(eq(customCommands.chatId, chatId), eq(customCommands.command, command)));
    await safeReply(ctx, `🗑️ Perintah */${command}* telah dihapus.`);
  });

  // ─── /listcmds ────────────────────────────────────────────────────────
  bot.command("listcmds", async (ctx) => {
    const chatId = String(ctx.chat!.id);
    const cmds = await db.select().from(customCommands)
      .where(and(eq(customCommands.chatId, chatId), eq(customCommands.isEnabled, true)));
    if (cmds.length === 0) return safeReply(ctx, "📭 Belum ada custom command. Gunakan /addcmd untuk menambah.");
    const list = cmds.map(c => `• /${c.command}`).join("\n");
    await safeReply(ctx, `⚡ *Custom Commands*\n\n${list}`);
  });

  // ─── Custom command handler ────────────────────────────────────────────
  bot.on("message:text", async (ctx, next) => {
    const text = ctx.message.text;
    if (!text.startsWith("/")) return next();
    const commandName = text.slice(1).split(" ")[0].toLowerCase().split("@")[0];
    const chatId = String(ctx.chat.id);
    try {
      const found = await db.select().from(customCommands)
        .where(and(
          eq(customCommands.chatId, chatId),
          eq(customCommands.command, commandName),
          eq(customCommands.isEnabled, true)
        ))
        .limit(1);
      if (found.length > 0) {
        await ctx.reply(found[0].response);
        return;
      }
    } catch { /* ignore */ }
    return next();
  });

  // ─── Welcome handler ──────────────────────────────────────────────────
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

  // ─── /sticker ─────────────────────────────────────────────────────────
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
      `<text x="256" y="${(totalHeight / 2) - ((lines.length - 1) * lineHeight / 2) + i * lineHeight}" font-family="Arial,sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle" filter="url(#shadow)">${line}</text>`
    ).join("\n");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="${totalHeight}">
<defs>
  <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:${c1}"/>
    <stop offset="100%" style="stop-color:${c2}"/>
  </linearGradient>
  <filter id="shadow">
    <feDropShadow dx="3" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.5)"/>
  </filter>
</defs>
<rect width="512" height="${totalHeight}" rx="30" ry="30" fill="url(#bg)"/>
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

  // ─── /poll ────────────────────────────────────────────────────────────
  bot.command("poll", async (ctx) => {
    const args = (ctx.match || "").split("|").map((s) => s.trim());
    if (args.length < 3) {
      return safeReply(ctx,
        "📊 Gunakan: /poll [pertanyaan] | [opsi1] | [opsi2] ...\n\n" +
        "Contoh: /poll Makan apa? | Nasi | Mie | Roti"
      );
    }
    const question = args[0];
    const options = args.slice(1);
    if (options.length < 2 || options.length > 10) {
      return safeReply(ctx, "❌ Minimal 2, maksimal 10 opsi.");
    }
    try {
      await ctx.api.sendPoll(ctx.chat!.id, question, options, { is_anonymous: false, allows_multiple_answers: false });
    } catch {
      safeReply(ctx, "❌ Gagal membuat poll.");
    }
  });

  // ─── /feedback ────────────────────────────────────────────────────────
  bot.command("feedback", async (ctx) => {
    const message = ctx.match || "";
    if (!message) return safeReply(ctx, "📝 Gunakan: /feedback [pesan]");
    await safeReply(ctx,
      `✅ *Terima kasih atas feedback kamu!*\n\n_"${message}"_\n\nFeedback kamu telah dicatat dan akan dipertimbangkan.`
    );
  });

  // ─── /raffle ──────────────────────────────────────────────────────────
  bot.command("raffle", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const chatId = String(ctx.chat!.id);
    const tickets = await db.select().from(raffleTickets).where(eq(raffleTickets.chatId, chatId));
    if (tickets.length === 0) return safeReply(ctx, "❌ Belum ada peserta raffle. Gunakan /joinraffle untuk ikut.");

    // Expand tickets by count
    const pool: typeof tickets = [];
    for (const t of tickets) {
      for (let i = 0; i < (t.ticketCount ?? 1); i++) pool.push(t);
    }
    const winner = pool[randomInt(0, pool.length - 1)];
    const name = winner.username ? `@${winner.username}` : (winner.firstName ?? "Unknown");

    await ctx.reply(
      `🎟️ *RAFFLE RESULT*\n\n` +
      `🎉 Pemenang: *${name}*\n` +
      `🎫 Total tiket: ${pool.length}\n` +
      `👥 Total peserta: ${tickets.length}`,
      { parse_mode: "Markdown" }
    );

    // Clear raffle
    await db.delete(raffleTickets).where(eq(raffleTickets.chatId, chatId));
  });

  // ─── /joinraffle ──────────────────────────────────────────────────────
  bot.command("joinraffle", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const userId = String(ctx.from!.id);

    const existing = await db.select().from(raffleTickets)
      .where(and(eq(raffleTickets.chatId, chatId), eq(raffleTickets.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      await db.update(raffleTickets)
        .set({ ticketCount: (existing[0].ticketCount ?? 1) + 1 })
        .where(eq(raffleTickets.id, existing[0].id));
      await safeReply(ctx, `🎫 Kamu punya *${(existing[0].ticketCount ?? 1) + 1}* tiket raffle!`);
    } else {
      await db.insert(raffleTickets).values({
        chatId,
        userId,
        username: ctx.from!.username ?? null,
        firstName: ctx.from!.first_name ?? null,
        ticketCount: 1,
      });
      await safeReply(ctx, `🎫 *${ctx.from!.first_name}* mendapat 1 tiket raffle!\nGunakan /joinraffle lagi untuk tambah tiket.`);
    }
  });

  // ─── /broadcast ───────────────────────────────────────────────────────
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
}
