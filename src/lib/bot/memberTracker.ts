import { db } from "@/db";
import { groupMembers, groupSettings, botStats } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { todayKey, xpToLevel } from "./helpers";
import { Context } from "grammy";

// ─── Track Member ─────────────────────────────────────────────────────────────
export async function trackMember(ctx: Context) {
  const user = ctx.from;
  const chat = ctx.chat;
  if (!user || !chat || chat.type === "private") return;

  const chatId = String(chat.id);
  const userId = String(user.id);

  try {
    const existing = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)))
      .limit(1);

    const xpGain = Math.floor(Math.random() * 5) + 1;

    if (existing.length === 0) {
      await db.insert(groupMembers).values({
        chatId,
        userId,
        username: user.username ?? null,
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null,
        isBot: user.is_bot,
        messageCount: 1,
        xpPoints: xpGain,
        level: 1,
        coins: 1,
        lastSeenAt: new Date(),
      });
    } else {
      const current = existing[0];
      const newXp = (current.xpPoints ?? 0) + xpGain;
      const newLevel = xpToLevel(newXp);
      const leveledUp = newLevel > (current.level ?? 1);

      await db
        .update(groupMembers)
        .set({
          username: user.username ?? current.username,
          firstName: user.first_name ?? current.firstName,
          lastName: user.last_name ?? current.lastName,
          messageCount: sql`${groupMembers.messageCount} + 1`,
          xpPoints: newXp,
          level: newLevel,
          lastSeenAt: new Date(),
        })
        .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));

      // Level up notification
      if (leveledUp) {
        const name = user.first_name || user.username || "Member";
        try {
          await ctx.reply(
            `🎉 Selamat *${name}*! Kamu naik ke *Level ${newLevel}*! ⬆️`,
            { parse_mode: "Markdown" }
          );
        } catch {
          // ignore
        }
      }
    }

    // Update group settings (ensure record exists)
    const gs = await db
      .select()
      .from(groupSettings)
      .where(eq(groupSettings.chatId, chatId))
      .limit(1);

    if (gs.length === 0) {
      await db.insert(groupSettings).values({
        chatId,
        chatTitle: "title" in chat ? chat.title : null,
      });
    }

    // Update bot stats
    const today = todayKey();
    const stats = await db
      .select()
      .from(botStats)
      .where(eq(botStats.date, today))
      .limit(1);

    if (stats.length === 0) {
      await db.insert(botStats).values({
        date: today,
        totalMessages: 1,
        totalCommands: 0,
      });
    } else {
      await db
        .update(botStats)
        .set({ totalMessages: sql`${botStats.totalMessages} + 1`, updatedAt: new Date() })
        .where(eq(botStats.date, today));
    }
  } catch (err) {
    console.error("trackMember error:", err);
  }
}

// ─── Get Members ─────────────────────────────────────────────────────────────
export async function getGroupMembers(chatId: string) {
  return db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.isBanned, false)));
}

// ─── Get Member ──────────────────────────────────────────────────────────────
export async function getMember(chatId: string, userId: string) {
  const rows = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Get or Create Settings ───────────────────────────────────────────────────
export async function getOrCreateSettings(chatId: string, chatTitle?: string) {
  const existing = await db
    .select()
    .from(groupSettings)
    .where(eq(groupSettings.chatId, chatId))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [created] = await db
    .insert(groupSettings)
    .values({ chatId, chatTitle: chatTitle ?? null })
    .returning();
  return created;
}
