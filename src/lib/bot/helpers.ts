import { Context } from "grammy";

// ─── Format User ────────────────────────────────────────────────────────────
export function formatUser(ctx: Context): string {
  const user = ctx.from;
  if (!user) return "Unknown";
  if (user.username) return `@${user.username}`;
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return `[${name}](tg://user?id=${user.id})`;
}

// ─── Get Username Display ──────────────────────────────────────────────────
export function getUserDisplay(
  firstName?: string | null,
  lastName?: string | null,
  username?: string | null
): string {
  if (username) return `@${username}`;
  return [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
}

// ─── Format Duration ──────────────────────────────────────────────────────
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}h ${hours % 24}j`;
  if (hours > 0) return `${hours}j ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}d`;
  return `${seconds}d`;
}

// ─── Parse Duration String ─────────────────────────────────────────────────
export function parseDuration(str: string): number | null {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
}

// ─── Is Admin Check ────────────────────────────────────────────────────────
export async function isAdmin(ctx: Context, userId?: number): Promise<boolean> {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return false;
    const uid = userId ?? ctx.from?.id;
    if (!uid) return false;
    const member = await ctx.api.getChatMember(chatId, uid);
    return ["administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

// ─── Escape Markdown ──────────────────────────────────────────────────────
export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, "\\$&");
}

// ─── Random Number ────────────────────────────────────────────────────────
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Shuffle Array ────────────────────────────────────────────────────────
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Calculate Level from XP ──────────────────────────────────────────────
export function xpToLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function levelToXp(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────
export function progressBar(current: number, max: number, length = 10): string {
  const safeMax = max <= 0 ? 1 : max;
  const filled = Math.min(length, Math.round((current / safeMax) * length));
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

// ─── Today Date Key ───────────────────────────────────────────────────────
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Chunk Array ──────────────────────────────────────────────────────────
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ─── Safe Reply ───────────────────────────────────────────────────────────
export async function safeReply(
  ctx: Context,
  text: string,
  opts?: Record<string, unknown>
) {
  try {
    return await ctx.reply(text, { parse_mode: "Markdown", ...opts });
  } catch (err) {
    console.error("safeReply error:", err);
  }
}

// ─── Format Number ────────────────────────────────────────────────────────
export function formatNumber(n: number): string {
  return n.toLocaleString("id-ID");
}

// ─── Time Ago ─────────────────────────────────────────────────────────────
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds} detik lalu`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

// ─── Zodiac From Date ─────────────────────────────────────────────────────
export function getZodiac(day: number, month: number): string {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "♈ Aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "♉ Taurus";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "♊ Gemini";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "♋ Cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "♌ Leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "♍ Virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "♎ Libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "♏ Scorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "♐ Sagittarius";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "♑ Capricorn";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "♒ Aquarius";
  return "♓ Pisces";
}

// ─── Capitalize ──────────────────────────────────────────────────────────
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
