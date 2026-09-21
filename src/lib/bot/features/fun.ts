import { Bot } from "grammy";
import { safeReply, randomInt, shuffle } from "../helpers";
import { db } from "@/db";
import { quotes } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

const JOKES = [
  "Kenapa programmer selalu bingung? Karena 0 dan 1 tapi tidak pernah biner! 😄",
  "Apa bedanya programmer dan tukang sate? Kalau tukang sate, bumbunya bisa dimakan. Kalau programmer, bumbunya selalu error! 🔥",
  "Kenapa programmer suka kopi? Karena tanpa Java, dia hanya skrip! ☕",
  "Apa yang dikatakan programmer ketika tidur? 'ZZZ... null pointer exception!' 💤",
  "Kenapa website mahal? Karena banyak bayar domain dan tidak dapat kembalian! 🌐",
  "Apa kesamaan programmer dan petani? Keduanya menanam bug! 🐛",
  "Bagaimana caranya bikin teh tanpa gula? Sama seperti coding: pahit dan tidak terasa! 🍵",
  "Kenapa API mirip pacar? Sering minta dokumentasi tapi jarang dipahami! 📚",
  "Apa kata programmer saat hujan? 'Finally... exception ter-catch!' ☔",
  "Kenapa programmer tidak pernah lapar? Karena selalu ada snack di antara loop! 🍿",
];

const BALL_RESPONSES = [
  "✅ Ya, sudah pasti!",
  "✅ Sangat mungkin.",
  "✅ Outlook bagus.",
  "✅ Tanda-tanda menunjukkan ya.",
  "🔮 Sulit diprediksi, coba lagi.",
  "🔮 Tidak bisa dipastikan sekarang.",
  "🔮 Konsentrasi dan tanya ulang.",
  "❌ Jangan berharap.",
  "❌ Jawaban saya tidak.",
  "❌ Prospeknya tidak baik.",
];

const TRIVIA_LIST = [
  { q: "Siapa penemu telepon?", a: "Alexander Graham Bell" },
  { q: "Berapa jumlah provinsi di Indonesia?", a: "38" },
  { q: "Apa ibu kota Australia?", a: "Canberra" },
  { q: "Bahasa pemrograman apa yang digunakan untuk Android?", a: "Kotlin/Java" },
  { q: "Berapa jumlah planet di tata surya?", a: "8" },
  { q: "Siapa yang menciptakan internet?", a: "Tim Berners-Lee" },
  { q: "Apa singkatan dari CPU?", a: "Central Processing Unit" },
  { q: "Berapa detik dalam satu hari?", a: "86400" },
  { q: "Apa bahasa resmi Brazil?", a: "Portugis" },
  { q: "Siapa presiden pertama Indonesia?", a: "Soekarno" },
];

const INSPIRATIONAL_QUOTES = [
  { text: "Kesuksesan adalah hasil dari persiapan, kerja keras, dan belajar dari kegagalan.", author: "Colin Powell" },
  { text: "Jangan tunggu. Waktunya tidak pernah tepat.", author: "Napoleon Hill" },
  { text: "Mimpi kamu harus lebih besar dari rasa takutmu.", author: "Unknown" },
  { text: "Setiap hari adalah kesempatan baru untuk jadi lebih baik.", author: "Unknown" },
  { text: "Kegagalan adalah guru terbaik.", author: "Unknown" },
  { text: "Bukan tentang seberapa keras kamu jatuh, tapi seberapa cepat kamu bangkit.", author: "Unknown" },
  { text: "Mulailah dari mana kamu berada. Gunakan apa yang kamu miliki. Lakukan apa yang kamu bisa.", author: "Arthur Ashe" },
  { text: "Orang sukses tidak menunggu motivasi. Mereka menciptakannya sendiri.", author: "Unknown" },
  { text: "Satu langkah ke depan, tidak peduli seberapa kecil, tetap merupakan kemajuan.", author: "Unknown" },
  { text: "Percayalah pada prosesmu. Setiap hal indah butuh waktu.", author: "Unknown" },
];

export function registerFunCommands(bot: Bot) {
  // ─── /dice ───────────────────────────────────────────────────────────────
  bot.command("dice", async (ctx) => {
    const result = randomInt(1, 6);
    const emoji = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][result - 1];
    await safeReply(ctx, `🎲 *Dadu Dilempar!*\n\nHasilnya: ${emoji} *${result}*`);
  });

  // ─── /flip ───────────────────────────────────────────────────────────────
  bot.command("flip", async (ctx) => {
    const result = Math.random() < 0.5 ? "Heads (Gambar) 👑" : "Tails (Angka) 💰";
    await safeReply(ctx, `🪙 *Lempar Koin!*\n\nHasilnya: *${result}*`);
  });

  // ─── /8ball ──────────────────────────────────────────────────────────────
  bot.command("8ball", async (ctx) => {
    const question = ctx.match;
    if (!question) return safeReply(ctx, "🎱 Gunakan: /8ball [pertanyaan]");
    const response = BALL_RESPONSES[randomInt(0, BALL_RESPONSES.length - 1)];
    await safeReply(ctx,
      `🎱 *Magic 8-Ball*\n\n` +
      `❓ Pertanyaan: _${question}_\n\n` +
      `${response}`
    );
  });

  // ─── /rps ────────────────────────────────────────────────────────────────
  bot.command("rps", async (ctx) => {
    const userInput = (ctx.match || "").toLowerCase().trim();
    const choices: Record<string, string> = { batu: "✊", kertas: "✋", gunting: "✌️" };
    const choiceKeys = Object.keys(choices);

    if (!choiceKeys.includes(userInput)) {
      return safeReply(ctx, "✊✋✌️ Gunakan: /rps [batu|kertas|gunting]");
    }

    const botChoice = choiceKeys[randomInt(0, 2)];
    let result = "🤝 Seri!";

    if (
      (userInput === "batu" && botChoice === "gunting") ||
      (userInput === "kertas" && botChoice === "batu") ||
      (userInput === "gunting" && botChoice === "kertas")
    ) {
      result = "🎉 Kamu Menang!";
    } else if (userInput !== botChoice) {
      result = "😢 Kamu Kalah!";
    }

    await safeReply(ctx,
      `✊ *Suit!*\n\n` +
      `👤 Kamu: ${choices[userInput]} ${userInput}\n` +
      `🤖 Bot: ${choices[botChoice]} ${botChoice}\n\n` +
      `*${result}*`
    );
  });

  // ─── /joke ───────────────────────────────────────────────────────────────
  bot.command("joke", async (ctx) => {
    const joke = JOKES[randomInt(0, JOKES.length - 1)];
    await safeReply(ctx, `😄 *Humor Hari Ini*\n\n${joke}`);
  });

  // ─── /quote ──────────────────────────────────────────────────────────────
  bot.command("quote", async (ctx) => {
    const q = INSPIRATIONAL_QUOTES[randomInt(0, INSPIRATIONAL_QUOTES.length - 1)];
    await safeReply(ctx, `💭 *Quote Inspirasi*\n\n_"${q.text}"_\n\n— *${q.author}*`);
  });

  // ─── /trivia ─────────────────────────────────────────────────────────────
  bot.command("trivia", async (ctx) => {
    const t = TRIVIA_LIST[randomInt(0, TRIVIA_LIST.length - 1)];
    await safeReply(ctx,
      `🧩 *TRIVIA*\n\n` +
      `❓ ${t.q}\n\n` +
      `_Jawab dalam chat! Gunakan /triviaanswer [jawaban] untuk mengungkap._`
    );
    // Store answer temporarily in message
    await ctx.reply(`||Jawaban: ${t.a}||`, { parse_mode: "MarkdownV2" });
  });

  // ─── /math ───────────────────────────────────────────────────────────────
  bot.command("math", async (ctx) => {
    const a = randomInt(1, 50);
    const b = randomInt(1, 50);
    const ops = ["+", "-", "×"];
    const op = ops[randomInt(0, 2)];
    let answer: number;
    if (op === "+") answer = a + b;
    else if (op === "-") answer = a - b;
    else answer = a * b;

    await safeReply(ctx,
      `🧮 *Soal Matematika*\n\n` +
      `❓ Berapa hasil dari: *${a} ${op} ${b}*?\n\n` +
      `_Balas pesan ini dengan jawaban kamu!_`
    );
    await ctx.reply(`||Jawaban: ${answer}||`, { parse_mode: "MarkdownV2" });
  });

  // ─── /savequote ──────────────────────────────────────────────────────────
  bot.command("savequote", async (ctx) => {
    const replyMsg = ctx.message?.reply_to_message;
    if (!replyMsg?.text) return safeReply(ctx, "⚠️ Balas pesan teks yang ingin disimpan sebagai quote.");

    const chatId = String(ctx.chat!.id);
    const author = replyMsg.from;

    await db.insert(quotes).values({
      chatId,
      userId: String(author?.id ?? ctx.from!.id),
      username: author?.username ?? null,
      text: replyMsg.text,
      savedBy: String(ctx.from!.id),
    });

    await safeReply(ctx, `✅ Quote dari *${author?.first_name ?? "Unknown"}* telah disimpan!`);
  });

  // ─── /randomquote ────────────────────────────────────────────────────────
  bot.command("randomquote", async (ctx) => {
    const chatId = String(ctx.chat!.id);
    const all = await db.select().from(quotes).where(eq(quotes.chatId, chatId));

    if (all.length === 0) return safeReply(ctx, "📭 Belum ada quote tersimpan. Gunakan /savequote!");

    const q = all[randomInt(0, all.length - 1)];
    const name = q.username ? `@${q.username}` : "Unknown";

    await safeReply(ctx, `💬 *Quote Random*\n\n_"${q.text}"_\n\n— ${name}`);
  });

  // ─── /choose ─────────────────────────────────────────────────────────────
  bot.command("choose", async (ctx) => {
    const input = ctx.match || "";
    const options = input.split(",").map((s) => s.trim()).filter(Boolean);
    if (options.length < 2) return safeReply(ctx, "🤔 Gunakan: /choose opsi1, opsi2, opsi3");

    const chosen = options[randomInt(0, options.length - 1)];
    await safeReply(ctx, `🎯 *Pilihan Acak*\n\nDari: ${options.map(o => `_${o}_`).join(", ")}\n\n🎲 Dipilih: *${chosen}*`);
  });

  // ─── /reverse ────────────────────────────────────────────────────────────
  bot.command("reverse", async (ctx) => {
    const text = ctx.match || ctx.message?.reply_to_message?.text;
    if (!text) return safeReply(ctx, "📝 Gunakan: /reverse [teks]");
    const reversed = text.split("").reverse().join("");
    await safeReply(ctx, `🔄 *Teks Terbalik*\n\n${reversed}`);
  });

  // ─── /mock ───────────────────────────────────────────────────────────────
  bot.command("mock", async (ctx) => {
    const text = ctx.match || ctx.message?.reply_to_message?.text;
    if (!text) return safeReply(ctx, "📝 Gunakan: /mock [teks]");
    const mocked = text.split("").map((c, i) =>
      i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()
    ).join("");
    await safeReply(ctx, `🤪 ${mocked}`);
  });

  // ─── /aesthetic ──────────────────────────────────────────────────────────
  bot.command("aesthetic", async (ctx) => {
    const text = ctx.match || "";
    if (!text) return safeReply(ctx, "✨ Gunakan: /aesthetic [teks]");
    const aesthetic = text.split("").join(" ").toUpperCase();
    await safeReply(ctx, `✨ ${aesthetic}`);
  });
}
