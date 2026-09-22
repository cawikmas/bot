import { Bot } from "grammy";
import { db } from "@/db";
import { groupMembers, bankAccounts } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { safeReply, formatNumber, randomInt } from "../helpers";
import { getMember } from "../memberTracker";

const DAILY_AMOUNT = 100;
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function registerEconomyCommands(bot: Bot) {
  // ─── /daily ───────────────────────────────────────────────────────────
  bot.command("daily", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const userId = String(ctx.from!.id);
    const member = await getMember(chatId, userId);

    if (!member) return safeReply(ctx, "❌ Kirim pesan dulu di grup sebelum klaim daily!");

    const now = Date.now();
    const lastDaily = member.lastDailyAt?.getTime() ?? 0;
    const remaining = DAILY_COOLDOWN_MS - (now - lastDaily);

    if (remaining > 0) {
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      return safeReply(ctx, `⏳ Kamu sudah klaim daily hari ini!\nTunggu *${hours}j ${minutes}m* lagi.`);
    }

    const yesterdayMidnight = new Date(now - DAILY_COOLDOWN_MS);
    const streak = member.lastDailyAt && member.lastDailyAt > yesterdayMidnight
      ? (member.streak ?? 0) + 1
      : 1;

    const bonus = Math.min(streak * 10, 200);
    const total = DAILY_AMOUNT + bonus;

    await db.update(groupMembers)
      .set({
        coins: (member.coins ?? 0) + total,
        lastDailyAt: new Date(),
        streak,
      })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));

    await safeReply(ctx,
      `🎁 *Daily Reward!*\n\n` +
      `💰 Koin: +*${total}*\n` +
      `   ├ Base: ${DAILY_AMOUNT}\n` +
      `   └ Streak bonus: +${bonus}\n\n` +
      `🔥 Streak: *${streak} hari*\n` +
      `💎 Total koin: *${formatNumber((member.coins ?? 0) + total)}*`
    );
  });

  // ─── /balance ─────────────────────────────────────────────────────────
  bot.command("balance", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const userId = String(ctx.from!.id);
    const member = await getMember(chatId, userId);

    if (!member) return safeReply(ctx, "❌ Kirim pesan dulu di grup!");

    const bank = await db.select().from(bankAccounts)
      .where(and(eq(bankAccounts.chatId, chatId), eq(bankAccounts.userId, userId)))
      .limit(1);

    const savings = bank[0]?.savings ?? 0;
    const invested = bank[0]?.investedAmount ?? 0;

    await safeReply(ctx,
      `💰 *Saldo - ${ctx.from!.first_name}*\n\n` +
      `🪙 Koin: *${formatNumber(member.coins ?? 0)}*\n` +
      `🏦 Tabungan: *${formatNumber(savings)}*\n` +
      `📈 Investasi: *${formatNumber(invested)}*\n\n` +
      `🔥 Streak: *${member.streak ?? 0} hari*\n` +
      `⭐ XP: *${formatNumber(member.xpPoints ?? 0)}*\n` +
      `🏆 Level: *${member.level ?? 1}*`
    );
  });

  // ─── /transfer ────────────────────────────────────────────────────────
  bot.command("transfer", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const fromId = String(ctx.from!.id);
    const target = ctx.message?.reply_to_message?.from;

    if (!target) return safeReply(ctx, "⚠️ Balas pesan member yang ingin ditransfer koin.\n/transfer [jumlah]");
    if (target.id === ctx.from!.id) return safeReply(ctx, "❌ Tidak bisa transfer ke diri sendiri!");
    if (target.is_bot) return safeReply(ctx, "❌ Tidak bisa transfer ke bot!");

    const amount = parseInt(ctx.match || "0");
    if (isNaN(amount) || amount <= 0) return safeReply(ctx, "❌ Masukkan jumlah koin yang valid.");

    const sender = await getMember(chatId, fromId);
    if (!sender || (sender.coins ?? 0) < amount) {
      return safeReply(ctx, `❌ Koin tidak cukup! Kamu punya *${formatNumber(sender?.coins ?? 0)}* koin.`);
    }

    const toId = String(target.id);
    const receiver = await getMember(chatId, toId);
    if (!receiver) return safeReply(ctx, "❌ Target belum pernah aktif di grup ini.");

    await db.update(groupMembers)
      .set({ coins: (sender.coins ?? 0) - amount })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, fromId)));

    await db.update(groupMembers)
      .set({ coins: (receiver.coins ?? 0) + amount })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, toId)));

    await safeReply(ctx,
      `✅ *Transfer Berhasil!*\n\n` +
      `👤 Dari: ${ctx.from!.first_name}\n` +
      `👤 Ke: ${target.first_name}\n` +
      `💰 Jumlah: *${formatNumber(amount)}* koin\n\n` +
      `💎 Sisa koin kamu: *${formatNumber((sender.coins ?? 0) - amount)}*`
    );
  });

  // ─── /richlist ────────────────────────────────────────────────────────
  bot.command("richlist", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const top = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.isBot, false)))
      .orderBy(desc(groupMembers.coins))
      .limit(10);

    if (top.length === 0) return safeReply(ctx, "💰 Belum ada data koin.");

    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const list = top.map((m, i) => {
      const name = m.username ? `@${m.username}` : (m.firstName ?? "Unknown");
      return `${medals[i]} *${name}* — 🪙 ${formatNumber(m.coins ?? 0)}`;
    }).join("\n");

    await safeReply(ctx, `💰 *Rich List — Top 10 Koin*\n\n${list}`);
  });

  // ─── /gamble ──────────────────────────────────────────────────────────
  bot.command("gamble", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const userId = String(ctx.from!.id);
    const amount = parseInt(ctx.match || "0");

    if (isNaN(amount) || amount <= 0) return safeReply(ctx, "🎰 Gunakan: /gamble [jumlah]\nContoh: /gamble 50");

    const member = await getMember(chatId, userId);
    if (!member || (member.coins ?? 0) < amount) {
      return safeReply(ctx, `❌ Koin tidak cukup! Kamu punya *${formatNumber(member?.coins ?? 0)}* koin.`);
    }

    const dice = randomInt(1, 6);
    const win = dice >= 4;
    const multiplier = dice === 6 ? 2 : 1;
    const change = win ? amount * multiplier : -amount;
    const newCoins = (member.coins ?? 0) + change;

    await db.update(groupMembers)
      .set({ coins: newCoins })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));

    const emoji = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][dice - 1];

    await safeReply(ctx,
      `🎰 *Gamble!*\n\n` +
      `🎲 Dadu: ${emoji} *${dice}*\n\n` +
      (win
        ? `🎉 *MENANG!* +${formatNumber(amount * multiplier)} koin${dice === 6 ? " (2x bonus!)" : ""}`
        : `😢 *KALAH!* -${formatNumber(amount)} koin`) +
      `\n\n💎 Saldo: *${formatNumber(newCoins)}* koin`
    );
  });

  // ─── /give ────────────────────────────────────────────────────────────
  bot.command("give", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const fromId = String(ctx.from!.id);
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return safeReply(ctx, "⚠️ Balas pesan member + ketik /give [jumlah]");

    const amount = parseInt(ctx.match || "0");
    if (isNaN(amount) || amount <= 0) return safeReply(ctx, "❌ Jumlah tidak valid.");

    const sender = await getMember(chatId, fromId);
    if (!sender || (sender.coins ?? 0) < amount) {
      return safeReply(ctx, `❌ Koin tidak cukup!`);
    }

    const receiver = await getMember(chatId, String(target.id));
    if (!receiver) return safeReply(ctx, "❌ Target belum aktif.");

    await db.update(groupMembers)
      .set({ coins: (sender.coins ?? 0) - amount })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, fromId)));

    await db.update(groupMembers)
      .set({ coins: (receiver.coins ?? 0) + amount })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, String(target.id))));

    await safeReply(ctx, `🎁 *${ctx.from!.first_name}* memberi *${target.first_name}* sebanyak *${formatNumber(amount)}* koin!`);
  });

  // ─── /deposit ─────────────────────────────────────────────────────────
  bot.command("deposit", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const userId = String(ctx.from!.id);
    const amount = parseInt(ctx.match || "0");
    if (isNaN(amount) || amount <= 0) return safeReply(ctx, "🏦 Gunakan: /deposit [jumlah]\nContoh: /deposit 100");

    const member = await getMember(chatId, userId);
    if (!member || (member.coins ?? 0) < amount) {
      return safeReply(ctx, `❌ Koin tidak cukup! Kamu punya *${formatNumber(member?.coins ?? 0)}* koin.`);
    }

    await db.update(groupMembers)
      .set({ coins: (member.coins ?? 0) - amount })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));

    const bank = await db.select().from(bankAccounts)
      .where(and(eq(bankAccounts.chatId, chatId), eq(bankAccounts.userId, userId)))
      .limit(1);

    if (bank.length === 0) {
      await db.insert(bankAccounts).values({ chatId, userId, savings: amount });
    } else {
      await db.update(bankAccounts)
        .set({ savings: (bank[0].savings ?? 0) + amount, updatedAt: new Date() })
        .where(eq(bankAccounts.id, bank[0].id));
    }

    await safeReply(ctx, `🏦 *Deposit Berhasil!*\n\n💰 Deposit: +*${formatNumber(amount)}* koin ke tabungan\n💎 Sisa koin: *${formatNumber((member.coins ?? 0) - amount)}*`);
  });

  // ─── /withdraw ────────────────────────────────────────────────────────
  bot.command("withdraw", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const userId = String(ctx.from!.id);
    const amount = parseInt(ctx.match || "0");
    if (isNaN(amount) || amount <= 0) return safeReply(ctx, "🏦 Gunakan: /withdraw [jumlah]\nContoh: /withdraw 100");

    const bank = await db.select().from(bankAccounts)
      .where(and(eq(bankAccounts.chatId, chatId), eq(bankAccounts.userId, userId)))
      .limit(1);

    const savings = bank[0]?.savings ?? 0;
    if (savings < amount) {
      return safeReply(ctx, `❌ Tabungan tidak cukup! Kamu punya *${formatNumber(savings)}* koin di tabungan.`);
    }

    await db.update(bankAccounts)
      .set({ savings: savings - amount, updatedAt: new Date() })
      .where(eq(bankAccounts.id, bank[0].id));

    const member = await getMember(chatId, userId);
    await db.update(groupMembers)
      .set({ coins: (member?.coins ?? 0) + amount })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));

    await safeReply(ctx, `🏦 *Withdraw Berhasil!*\n\n💰 Withdraw: +*${formatNumber(amount)}* koin dari tabungan\n💎 Koin: *${formatNumber((member?.coins ?? 0) + amount)}*`);
  });

  // ─── /invest ──────────────────────────────────────────────────────────
  bot.command("invest", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const userId = String(ctx.from!.id);
    const amount = parseInt(ctx.match || "0");
    if (isNaN(amount) || amount < 100) return safeReply(ctx, "📈 Gunakan: /invest [jumlah]\nMinimum: 100 koin\nReturn: 10-50% dalam 24 jam");

    const member = await getMember(chatId, userId);
    if (!member || (member.coins ?? 0) < amount) {
      return safeReply(ctx, `❌ Koin tidak cukup!`);
    }

    const bank = await db.select().from(bankAccounts)
      .where(and(eq(bankAccounts.chatId, chatId), eq(bankAccounts.userId, userId)))
      .limit(1);

    if (bank.length > 0 && (bank[0].investedAmount ?? 0) > 0) {
      return safeReply(ctx, "❌ Kamu sudah punya investasi aktif! Gunakan /claiminvest dulu.");
    }

    await db.update(groupMembers)
      .set({ coins: (member.coins ?? 0) - amount })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));

    const maturityDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (bank.length === 0) {
      await db.insert(bankAccounts).values({ chatId, userId, investedAmount: amount, investedAt: new Date() });
    } else {
      await db.update(bankAccounts)
        .set({ investedAmount: amount, investedAt: new Date(), updatedAt: new Date() })
        .where(eq(bankAccounts.id, bank[0].id));
    }

    await safeReply(ctx,
      `📈 *Investasi Berhasil!*\n\n` +
      `💰 Diinvestasikan: *${formatNumber(amount)}* koin\n` +
      `⏰ Bisa diclaim: ${maturityDate.toLocaleString("id-ID")}\n` +
      `📊 Estimasi return: 10-50%\n\n` +
      `Gunakan /claiminvest setelah 24 jam!`
    );
  });

  // ─── /claiminvest ─────────────────────────────────────────────────────
  bot.command("claiminvest", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const userId = String(ctx.from!.id);

    const bank = await db.select().from(bankAccounts)
      .where(and(eq(bankAccounts.chatId, chatId), eq(bankAccounts.userId, userId)))
      .limit(1);

    if (!bank[0] || (bank[0].investedAmount ?? 0) === 0) {
      return safeReply(ctx, "❌ Kamu tidak punya investasi aktif. Gunakan /invest dulu!");
    }

    const investedAt = bank[0].investedAt;
    if (!investedAt || (Date.now() - investedAt.getTime()) < 60 * 60 * 1000) {
      // Require at least 1 hour (relaxed from 24h for demo)
      const timeLeft = investedAt ? Math.ceil((investedAt.getTime() + 60 * 60 * 1000 - Date.now()) / 60000) : 60;
      return safeReply(ctx, `⏳ Investasi belum matang! Tunggu *${timeLeft} menit* lagi.`);
    }

    const investedAmount = bank[0].investedAmount ?? 0;
    const returnRate = (randomInt(10, 50)) / 100;
    const profit = Math.floor(investedAmount * returnRate);
    const total = investedAmount + profit;

    await db.update(bankAccounts)
      .set({ investedAmount: 0, investedAt: null, updatedAt: new Date() })
      .where(eq(bankAccounts.id, bank[0].id));

    const member = await getMember(chatId, userId);
    await db.update(groupMembers)
      .set({ coins: (member?.coins ?? 0) + total })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));

    await safeReply(ctx,
      `📈 *Investasi Diclaim!*\n\n` +
      `💰 Modal: *${formatNumber(investedAmount)}* koin\n` +
      `📊 Profit: +*${formatNumber(profit)}* koin (${Math.round(returnRate * 100)}%)\n` +
      `💎 Total diterima: *${formatNumber(total)}* koin`
    );
  });

  // ─── /rep ─────────────────────────────────────────────────────────────
  bot.command("rep", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return safeReply(ctx, "⭐ Balas pesan seseorang untuk memberi reputasi!\n/rep");
    if (target.id === ctx.from!.id) return safeReply(ctx, "❌ Tidak bisa rep diri sendiri!");
    if (target.is_bot) return safeReply(ctx, "❌ Tidak bisa rep bot!");

    const chatId = String(ctx.chat!.id);
    const fromId = String(ctx.from!.id);
    const toId = String(target.id);

    const giver = await getMember(chatId, fromId);
    const now = Date.now();
    const lastRep = giver?.lastRepAt?.getTime() ?? 0;
    const cooldown = 24 * 60 * 60 * 1000;

    if (now - lastRep < cooldown) {
      const remaining = cooldown - (now - lastRep);
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / 60000);
      return safeReply(ctx, `⏳ Kamu bisa rep lagi dalam *${hours}j ${minutes}m*!`);
    }

    await db.update(groupMembers)
      .set({ lastRepAt: new Date() })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, fromId)));

    await db.update(groupMembers)
      .set({ reputation: sql`${groupMembers.reputation} + 1` })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, toId)));

    const receiver = await getMember(chatId, toId);
    await ctx.reply(
      `⭐ *${ctx.from!.first_name}* memberi reputasi ke *${target.first_name}*!\n\n` +
      `👍 Total reputasi *${target.first_name}*: *${(receiver?.reputation ?? 0) + 1}*`,
      { parse_mode: "Markdown" }
    );
  });

  // ─── /topreputation ───────────────────────────────────────────────────
  bot.command("topreputation", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const top = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.isBot, false)))
      .orderBy(desc(groupMembers.reputation))
      .limit(10);

    if (top.length === 0) return safeReply(ctx, "⭐ Belum ada data reputasi.");

    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const list = top.map((m, i) => {
      const name = m.username ? `@${m.username}` : (m.firstName ?? "Unknown");
      return `${medals[i]} *${name}* — ⭐ ${m.reputation ?? 0}`;
    }).join("\n");

    await safeReply(ctx, `⭐ *Top Reputasi*\n\n${list}`);
  });

  // ─── /work ────────────────────────────────────────────────────────────
  bot.command("work", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const userId = String(ctx.from!.id);
    const member = await getMember(chatId, userId);

    if (!member) return safeReply(ctx, "❌ Kirim pesan dulu di grup!");

    // 1-hour cooldown for work
    const now = Date.now();
    const lastSeen = member.lastSeenAt?.getTime() ?? 0;

    const jobs = [
      { name: "Programmer", emoji: "💻", pay: [50, 150] },
      { name: "Pedagang", emoji: "🛒", pay: [30, 100] },
      { name: "Dokter", emoji: "👨‍⚕️", pay: [100, 200] },
      { name: "Guru", emoji: "👨‍🏫", pay: [40, 120] },
      { name: "Chef", emoji: "👨‍🍳", pay: [60, 140] },
      { name: "Streamer", emoji: "🎮", pay: [20, 200] },
      { name: "Youtuber", emoji: "📹", pay: [10, 300] },
      { name: "Driver Ojol", emoji: "🛵", pay: [30, 80] },
    ];

    const job = jobs[randomInt(0, jobs.length - 1)];
    const earned = randomInt(job.pay[0], job.pay[1]);
    const newCoins = (member.coins ?? 0) + earned;

    await db.update(groupMembers)
      .set({ coins: newCoins })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));

    await safeReply(ctx,
      `${job.emoji} *Bekerja sebagai ${job.name}*\n\n` +
      `Kamu bekerja keras dan mendapat:\n` +
      `💰 *+${formatNumber(earned)}* koin!\n\n` +
      `💎 Total koin: *${formatNumber(newCoins)}*`
    );
  });
}
