import { Bot, webhookCallback } from "grammy";
import { trackMember } from "./memberTracker";
import { registerModerationCommands } from "./features/moderation";
import { registerInfoCommands } from "./features/info";
import { registerFunCommands } from "./features/fun";
import { registerEconomyCommands } from "./features/economy";
import { registerToolsCommands } from "./features/tools";
import { registerGroupCommands } from "./features/group";
import { db } from "@/db";
import { botStats, groupSettings, groupMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { todayKey } from "./helpers";

const token = process.env.TELEGRAM_BOT_TOKEN || "placeholder";

// Singleton bot
const globalForBot = globalThis as typeof globalThis & {
  __telebot?: Bot;
};

export const bot: Bot = globalForBot.__telebot ?? new Bot(token);

if (process.env.NODE_ENV !== "production") {
  globalForBot.__telebot = bot;
}

// ─── Track all messages ───────────────────────────────────────────────
bot.on("message", async (ctx, next) => {
  try {
    await trackMember(ctx);
  } catch { /* ignore */ }
  return next();
});

// ─── Track command usage ──────────────────────────────────────────────
bot.on("message:text", async (ctx, next) => {
  if (ctx.message.text?.startsWith("/")) {
    const today = todayKey();
    try {
      const { sql: sqlRaw } = await import("drizzle-orm");
      await db
        .update(botStats)
        .set({ totalCommands: sqlRaw`${botStats.totalCommands} + 1`, updatedAt: new Date() })
        .where(eq(botStats.date, today));
    } catch { /* ignore */ }
  }
  return next();
});

// ─── Register all feature modules ────────────────────────────────────
registerModerationCommands(bot);
registerInfoCommands(bot);
registerFunCommands(bot);
registerEconomyCommands(bot);
registerToolsCommands(bot);
registerGroupCommands(bot);

// ─── Anti-link middleware ─────────────────────────────────────────────
bot.on("message:text", async (ctx, next) => {
  if (ctx.chat.type === "private") return next();

  const chatId = String(ctx.chat.id);
  const text = ctx.message.text || "";
  const urlPattern = /https?:\/\/\S+|t\.me\/\S+|www\.\S+/i;

  if (!urlPattern.test(text)) return next();

  try {
    const settings = await db.select().from(groupSettings)
      .where(eq(groupSettings.chatId, chatId)).limit(1);

    if (settings[0]?.antiLinkEnabled) {
      const { isAdmin } = await import("./helpers");
      if (await isAdmin(ctx)) return next();

      await ctx.deleteMessage();
      await ctx.reply(
        `🔗 *Anti-Link Aktif*\n\n@${ctx.from?.username ?? ctx.from?.first_name} mengirim link yang tidak diizinkan!`,
        { parse_mode: "Markdown" }
      );
      return;
    }
  } catch { /* ignore */ }

  return next();
});

// ─── Anti bad word middleware ─────────────────────────────────────────
bot.on("message:text", async (ctx, next) => {
  if (ctx.chat.type === "private") return next();
  const chatId = String(ctx.chat.id);
  const text = (ctx.message.text || "").toLowerCase();

  try {
    const settings = await db.select().from(groupSettings)
      .where(eq(groupSettings.chatId, chatId)).limit(1);

    if (settings[0]?.antiBadWordEnabled && settings[0]?.badWords?.length) {
      const { isAdmin } = await import("./helpers");
      if (await isAdmin(ctx)) return next();

      for (const word of settings[0].badWords) {
        if (text.includes(word.toLowerCase())) {
          await ctx.deleteMessage();
          await ctx.reply(`🚫 Kata yang tidak pantas terdeteksi!`, { parse_mode: "Markdown" });
          return;
        }
      }
    }
  } catch { /* ignore */ }

  return next();
});

// ─── Error handler ────────────────────────────────────────────────────
bot.catch((err) => {
  console.error("Bot error:", err);
});

// ─── Export webhook handler ───────────────────────────────────────────
export const handleUpdate = webhookCallback(bot, "std/http");
