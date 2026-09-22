import { Bot } from "grammy";
import { db } from "@/db";
import { groupMembers, warns, groupSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdmin, safeReply, parseDuration } from "../helpers";
import { getMember } from "../memberTracker";

export function registerModerationCommands(bot: Bot) {
  // ─── /ban ─────────────────────────────────────────────────────────────
  bot.command("ban", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin yang bisa menggunakan perintah ini.");
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return safeReply(ctx, "⚠️ Balas pesan member yang ingin di-ban.");
    if (await isAdmin(ctx, target.id)) return safeReply(ctx, "❌ Tidak bisa ban admin.");
    const reason = ctx.match || "Tidak ada alasan";
    try {
      await ctx.banChatMember(target.id);
      const name = target.first_name || target.username || "User";
      await ctx.reply(`🚫 *${name}* telah di-ban.\n📋 Alasan: ${reason}`, { parse_mode: "Markdown" });
      await db.update(groupMembers)
        .set({ isBanned: true })
        .where(and(
          eq(groupMembers.chatId, String(ctx.chat!.id)),
          eq(groupMembers.userId, String(target.id))
        ));
    } catch {
      safeReply(ctx, "❌ Gagal ban user. Pastikan bot adalah admin.");
    }
  });

  // ─── /unban ───────────────────────────────────────────────────────────
  bot.command("unban", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return safeReply(ctx, "⚠️ Balas pesan member yang ingin di-unban.");
    try {
      await ctx.unbanChatMember(target.id);
      await db.update(groupMembers)
        .set({ isBanned: false })
        .where(and(
          eq(groupMembers.chatId, String(ctx.chat!.id)),
          eq(groupMembers.userId, String(target.id))
        ));
      await ctx.reply(`✅ *${target.first_name}* telah di-unban.`, { parse_mode: "Markdown" });
    } catch {
      safeReply(ctx, "❌ Gagal unban user.");
    }
  });

  // ─── /mute ────────────────────────────────────────────────────────────
  bot.command("mute", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return safeReply(ctx, "⚠️ Balas pesan member yang ingin di-mute.");
    const args = (ctx.match || "").trim().split(" ");
    const duration = args[0] ? parseDuration(args[0]) : null;
    const reason = duration ? args.slice(1).join(" ") : args.join(" ");
    const untilDate = duration ? Math.floor((Date.now() + duration) / 1000) : undefined;
    try {
      await ctx.api.restrictChatMember(ctx.chat!.id, target.id, {
        can_send_messages: false,
        can_send_audios: false,
        can_send_documents: false,
        can_send_photos: false,
        can_send_videos: false,
        can_send_video_notes: false,
        can_send_voice_notes: false,
        can_send_polls: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
      }, { until_date: untilDate } as Record<string, unknown> as never);
      const durationText = duration ? `selama ${args[0]}` : "permanen";
      await ctx.reply(
        `🔇 *${target.first_name}* di-mute ${durationText}.\n📋 Alasan: ${reason || "Tidak ada"}`,
        { parse_mode: "Markdown" }
      );
    } catch {
      safeReply(ctx, "❌ Gagal mute user.");
    }
  });

  // ─── /unmute ──────────────────────────────────────────────────────────
  bot.command("unmute", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return safeReply(ctx, "⚠️ Balas pesan member yang ingin di-unmute.");
    try {
      await ctx.api.restrictChatMember(ctx.chat!.id, target.id, {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
      });
      await ctx.reply(`🔊 *${target.first_name}* telah di-unmute.`, { parse_mode: "Markdown" });
    } catch {
      safeReply(ctx, "❌ Gagal unmute user.");
    }
  });

  // ─── /kick ────────────────────────────────────────────────────────────
  bot.command("kick", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return safeReply(ctx, "⚠️ Balas pesan member yang ingin di-kick.");
    if (await isAdmin(ctx, target.id)) return safeReply(ctx, "❌ Tidak bisa kick admin.");
    try {
      await ctx.banChatMember(target.id);
      await ctx.unbanChatMember(target.id);
      const reason = ctx.match || "Tidak ada alasan";
      await ctx.reply(`👟 *${target.first_name}* telah di-kick.\n📋 Alasan: ${reason}`, { parse_mode: "Markdown" });
    } catch {
      safeReply(ctx, "❌ Gagal kick user.");
    }
  });

  // ─── /warn ────────────────────────────────────────────────────────────
  bot.command("warn", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return safeReply(ctx, "⚠️ Balas pesan member yang ingin di-warn.");
    const chatId = String(ctx.chat!.id);
    const userId = String(target.id);
    const reason = ctx.match || "Tidak ada alasan";

    await db.insert(warns).values({
      chatId,
      userId,
      reason,
      warnedBy: String(ctx.from!.id),
    });

    const member = await getMember(chatId, userId);
    const totalWarns = (member?.warnings ?? 0) + 1;

    await db.update(groupMembers)
      .set({ warnings: totalWarns })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));

    const settings = await db.select().from(groupSettings).where(eq(groupSettings.chatId, chatId)).limit(1);
    const maxWarns = settings[0]?.maxWarnings ?? 3;

    let extra = "";
    if (totalWarns >= maxWarns) {
      try {
        await ctx.banChatMember(target.id);
        extra = `\n🚫 Auto-ban karena mencapai ${maxWarns} peringatan!`;
      } catch { /* ignore */ }
    }

    await ctx.reply(
      `⚠️ *${target.first_name}* mendapat peringatan!\n📋 Alasan: ${reason}\n📊 Total: ${totalWarns}/${maxWarns}${extra}`,
      { parse_mode: "Markdown" }
    );
  });

  // ─── /warns ───────────────────────────────────────────────────────────
  bot.command("warns", async (ctx) => {
    const target = ctx.message?.reply_to_message?.from ?? ctx.from;
    if (!target) return;
    const chatId = String(ctx.chat!.id);
    const userId = String(target.id);
    const warnList = await db.select().from(warns)
      .where(and(eq(warns.chatId, chatId), eq(warns.userId, userId)));

    if (warnList.length === 0) {
      return safeReply(ctx, `✅ *${target.first_name}* belum pernah di-warn.`);
    }

    const list = warnList.map((w, i) =>
      `${i + 1}. ${w.reason ?? "Tidak ada alasan"} — ${w.createdAt?.toLocaleDateString("id-ID") ?? ""}`
    ).join("\n");

    await ctx.reply(
      `⚠️ *Daftar Peringatan - ${target.first_name}*\n\n${list}\n\nTotal: ${warnList.length} peringatan`,
      { parse_mode: "Markdown" }
    );
  });

  // ─── /unwarn ──────────────────────────────────────────────────────────
  bot.command("unwarn", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return safeReply(ctx, "⚠️ Balas pesan member.");
    const chatId = String(ctx.chat!.id);
    const userId = String(target.id);
    const latest = await db.select().from(warns)
      .where(and(eq(warns.chatId, chatId), eq(warns.userId, userId)));
    if (latest.length === 0) return safeReply(ctx, "✅ Tidak ada warn untuk dihapus.");
    await db.delete(warns).where(eq(warns.id, latest[latest.length - 1].id));

    const member = await getMember(chatId, userId);
    const newWarns = Math.max(0, (member?.warnings ?? 1) - 1);
    await db.update(groupMembers)
      .set({ warnings: newWarns })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));

    await ctx.reply(`✅ 1 peringatan *${target.first_name}* telah dihapus.`, { parse_mode: "Markdown" });
  });

  // ─── /purge ───────────────────────────────────────────────────────────
  bot.command("purge", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const replyMsg = ctx.message?.reply_to_message;
    if (!replyMsg) return safeReply(ctx, "⚠️ Balas pesan pertama yang ingin dihapus.");
    const fromId = replyMsg.message_id;
    const toId = ctx.message!.message_id;
    const ids: number[] = [];
    for (let i = fromId; i <= toId; i++) ids.push(i);
    try {
      // Delete in batches of 100
      for (let i = 0; i < ids.length; i += 100) {
        await ctx.api.deleteMessages(ctx.chat!.id, ids.slice(i, i + 100));
      }
      const notice = await ctx.reply(`🗑️ ${ids.length} pesan telah dihapus!`);
      setTimeout(() => ctx.api.deleteMessage(ctx.chat!.id, notice.message_id).catch(() => {}), 3000);
    } catch {
      safeReply(ctx, "❌ Gagal menghapus pesan. Pastikan bot punya izin delete messages.");
    }
  });

  // ─── /pin ─────────────────────────────────────────────────────────────
  bot.command("pin", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const replyMsg = ctx.message?.reply_to_message;
    if (!replyMsg) return safeReply(ctx, "⚠️ Balas pesan yang ingin di-pin.");
    try {
      await ctx.pinChatMessage(replyMsg.message_id);
      await ctx.reply("📌 Pesan telah di-pin!");
    } catch {
      safeReply(ctx, "❌ Gagal pin pesan.");
    }
  });

  // ─── /unpin ───────────────────────────────────────────────────────────
  bot.command("unpin", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    try {
      await ctx.unpinAllChatMessages();
      await ctx.reply("📌 Semua pesan pin telah dihapus!");
    } catch {
      safeReply(ctx, "❌ Gagal unpin pesan.");
    }
  });

  // ─── /promote ─────────────────────────────────────────────────────────
  bot.command("promote", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return safeReply(ctx, "⚠️ Balas pesan member yang ingin di-promote.");
    try {
      await ctx.api.promoteChatMember(ctx.chat!.id, target.id, {
        can_manage_chat: true,
        can_delete_messages: true,
        can_manage_video_chats: true,
        can_restrict_members: true,
        can_promote_members: false,
        can_change_info: true,
        can_invite_users: true,
        can_pin_messages: true,
      });
      await ctx.reply(`👑 *${target.first_name}* telah dipromote menjadi admin!`, { parse_mode: "Markdown" });
    } catch {
      safeReply(ctx, "❌ Gagal promote user.");
    }
  });

  // ─── /demote ──────────────────────────────────────────────────────────
  bot.command("demote", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return safeReply(ctx, "⚠️ Balas pesan admin yang ingin di-demote.");
    try {
      await ctx.api.promoteChatMember(ctx.chat!.id, target.id, {
        can_manage_chat: false,
        can_delete_messages: false,
        can_manage_video_chats: false,
        can_restrict_members: false,
        can_promote_members: false,
        can_change_info: false,
        can_invite_users: false,
        can_pin_messages: false,
      });
      await ctx.reply(`⬇️ *${target.first_name}* telah di-demote.`, { parse_mode: "Markdown" });
    } catch {
      safeReply(ctx, "❌ Gagal demote user.");
    }
  });

  // ─── /slowmode ────────────────────────────────────────────────────────
  bot.command("slowmode", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const seconds = parseInt(ctx.match || "0");
    if (isNaN(seconds) || seconds < 0 || seconds > 900) {
      return safeReply(ctx, "⏱️ Gunakan: /slowmode [0-900 detik]\nContoh: /slowmode 30\n/slowmode 0 untuk nonaktifkan");
    }
    try {
      if (seconds === 0) {
        await ctx.reply("⏱️ Slow mode dinonaktifkan.\n_Catatan: Atur slow mode manual di pengaturan grup._", { parse_mode: "Markdown" });
      } else {
        await ctx.reply(`⏱️ Slow mode *${seconds} detik* telah diatur.\n_Atur slow mode manual di pengaturan grup Telegram._`, { parse_mode: "Markdown" });
      }
    } catch {
      safeReply(ctx, "❌ Gagal mengatur slow mode.");
    }
  });

  // ─── /silence ─────────────────────────────────────────────────────────
  bot.command("silence", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return safeReply(ctx, "⚠️ Balas pesan member yang ingin di-silence.");
    const chatId = String(ctx.chat!.id);
    const userId = String(target.id);
    await db.update(groupMembers)
      .set({ isSilenced: true })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));
    await ctx.reply(`🤫 *${target.first_name}* telah di-silence. Pesan mereka akan dihapus otomatis.`, { parse_mode: "Markdown" });
  });

  // ─── /unsilence ───────────────────────────────────────────────────────
  bot.command("unsilence", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return safeReply(ctx, "⚠️ Balas pesan member yang ingin di-unsilence.");
    const chatId = String(ctx.chat!.id);
    const userId = String(target.id);
    await db.update(groupMembers)
      .set({ isSilenced: false })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));
    await ctx.reply(`🔊 *${target.first_name}* telah di-unsilence.`, { parse_mode: "Markdown" });
  });

  // ─── Silence middleware ───────────────────────────────────────────────
  bot.on("message", async (ctx, next) => {
    if (ctx.chat.type === "private") return next();
    const userId = String(ctx.from?.id);
    const chatId = String(ctx.chat.id);
    try {
      const member = await db.select({ isSilenced: groupMembers.isSilenced })
        .from(groupMembers)
        .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)))
        .limit(1);
      if (member[0]?.isSilenced) {
        await ctx.deleteMessage().catch(() => {});
        return;
      }
    } catch { /* ignore */ }
    return next();
  });

  // ─── /settitle ────────────────────────────────────────────────────────
  bot.command("settitle", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return safeReply(ctx, "⚠️ Balas pesan member + ketik judul.\nContoh: /settitle Moderator");
    const title = ctx.match || "";
    if (!title) return safeReply(ctx, "⚠️ Ketik judul. Contoh: /settitle Moderator");
    const chatId = String(ctx.chat!.id);
    const userId = String(target.id);
    await db.update(groupMembers)
      .set({ customTitle: title })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));
    try {
      await ctx.api.setChatAdministratorCustomTitle(ctx.chat!.id, target.id, title);
    } catch { /* ignore if not admin */ }
    await ctx.reply(`✅ Judul *${target.first_name}* diset ke: *${title}*`, { parse_mode: "Markdown" });
  });
}
