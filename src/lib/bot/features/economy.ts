import { Bot } from "grammy";
import { db } from "@/db";
import { groupMembers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { safeReply, formatNumber, randomInt } from "../helpers";
import { getMember } from "../memberTracker";

const DAILY_AMOUNT = 100;
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function registerEconomyCommands(bot: Bot) {
  // ─── /daily ──────────────────────────────────────────────────────────────
  bot.command("daily", async (ctx) => {
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

    // Check streak
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

  // ─── /balance ────────────────────────────────────────────────────────────
  bot.command("balance", async (ctx) => {
    const chatId = String(ctx.chat!.id);
    const userId = String(ctx.from!.id);
    const member = await getMember(chatId, userId);

    if (!member) return safeReply(ctx, "❌ Kirim pesan dulu di grup!");

    await safeReply(ctx,
      `💰 *Saldo Koin*\n\n` +
      `👤 ${ctx.from!.first_name}\n` +
      `🪙 Koin: *${formatNumber(member.coins ?? 0)}*\n` +
      `🔥 Streak: *${member.streak ?? 0} hari*\n` +
      `⭐ XP: *${formatNumber(member.xpPoints ?? 0)}*`
    );
  });

  // ─── /transfer ───────────────────────────────────────────────────────────
  bot.command("transfer", async (ctx) => {
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

  // ─── /richlist ───────────────────────────────────────────────────────────
  bot.command("richlist", async (ctx) => {
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

  // ─── /gamble ─────────────────────────────────────────────────────────────
  bot.command("gamble", async (ctx) => {
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

  // ─── /give ───────────────────────────────────────────────────────────────
  bot.command("give", async (ctx) => {
    // alias transfer
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
}
