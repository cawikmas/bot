import { Bot } from "grammy";
import { safeReply, randomInt, shuffle, capitalize } from "../helpers";
import { db } from "@/db";
import { quotes, wordGames, marriages, groupMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getMember } from "../memberTracker";

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
  "Apa perbedaan programmer junior dan senior? Junior bilang 'ini tidak mungkin', senior bilang 'ini akan butuh waktu'! 👨‍💻",
  "Kenapa frontend developer takut gelap? Karena tidak ada light mode! 🌙",
  "Apa kata database saat lapar? 'INSERT food INTO mouth'! 🍔",
  "Kenapa git blame populer? Karena semua orang butuh kambing hitam! 🐐",
  "Apa bedanya bug dan feature? Tergantung siapa yang bayar! 💰",
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
  "🔮 Masa depan tidak jelas.",
  "✅ Kemungkinan besar ya!",
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
  { q: "Berapa jumlah warna pelangi?", a: "7" },
  { q: "Apa nama planet terbesar di tata surya?", a: "Jupiter" },
  { q: "Siapa pencipta lampu listrik?", a: "Thomas Edison" },
  { q: "Apa ibu kota Jepang?", a: "Tokyo" },
  { q: "Berapa sisi yang dimiliki segi enam?", a: "6" },
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
  { text: "Berani bermimpi besar, berani bekerja keras, berani gagal.", author: "Unknown" },
  { text: "Hidup terlalu singkat untuk punya pikiran negatif.", author: "Unknown" },
];

const WORD_GAME_WORDS = [
  "meja", "kursi", "pintu", "jendela", "atap", "lantai", "dinding", "tangga",
  "pohon", "bunga", "daun", "akar", "batang", "buah", "biji", "ranting",
  "kucing", "anjing", "burung", "ikan", "sapi", "kambing", "ayam", "bebek",
  "nasi", "mie", "roti", "telur", "daging", "sayur", "buah", "susu",
  "buku", "pena", "kertas", "pensil", "penghapus", "penggaris", "tas", "sepatu",
];

export function registerFunCommands(bot: Bot) {
  // ─── /dice ────────────────────────────────────────────────────────────
  bot.command("dice", async (ctx) => {
    const result = randomInt(1, 6);
    const emoji = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][result - 1];
    await safeReply(ctx, `🎲 *Dadu Dilempar!*\n\nHasilnya: ${emoji} *${result}*`);
  });

  // ─── /flip ────────────────────────────────────────────────────────────
  bot.command("flip", async (ctx) => {
    const result = Math.random() < 0.5 ? "HEADS 🦅" : "TAILS 🪙";
    await safeReply(ctx, `🪙 *Lempar Koin!*\n\nHasilnya: *${result}*`);
  });

  // ─── /8ball ───────────────────────────────────────────────────────────
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

  // ─── /rps ─────────────────────────────────────────────────────────────
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
      // Award XP/coins
      if (ctx.chat.type !== "private") {
        const chatId = String(ctx.chat!.id);
        const userId = String(ctx.from!.id);
        try {
          await db.update(groupMembers)
            .set({ coins: sql`${groupMembers.coins} + 5`, totalGameWins: sql`${groupMembers.totalGameWins} + 1` })
            .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));
        } catch { /* ignore */ }
      }
    } else if (userInput !== botChoice) {
      result = "😢 Kamu Kalah!";
      if (ctx.chat.type !== "private") {
        const chatId = String(ctx.chat!.id);
        const userId = String(ctx.from!.id);
        try {
          await db.update(groupMembers)
            .set({ totalGameLosses: sql`${groupMembers.totalGameLosses} + 1` })
            .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));
        } catch { /* ignore */ }
      }
    }
    await safeReply(ctx,
      `✊ *Suit!*\n\n` +
      `👤 Kamu: ${choices[userInput]} ${userInput}\n` +
      `🤖 Bot: ${choices[botChoice]} ${botChoice}\n\n` +
      `*${result}*${result.includes("Menang") ? " (+5 koin)" : ""}`
    );
  });

  // ─── /joke ────────────────────────────────────────────────────────────
  bot.command("joke", async (ctx) => {
    const joke = JOKES[randomInt(0, JOKES.length - 1)];
    await safeReply(ctx, `😄 *Humor Hari Ini*\n\n${joke}`);
  });

  // ─── /quote ───────────────────────────────────────────────────────────
  bot.command("quote", async (ctx) => {
    const q = INSPIRATIONAL_QUOTES[randomInt(0, INSPIRATIONAL_QUOTES.length - 1)];
    await safeReply(ctx, `💭 *Quote Inspirasi*\n\n_"${q.text}"_\n\n— *${q.author}*`);
  });

  // ─── /trivia ──────────────────────────────────────────────────────────
  bot.command("trivia", async (ctx) => {
    const t = TRIVIA_LIST[randomInt(0, TRIVIA_LIST.length - 1)];
    await safeReply(ctx,
      `🧩 *TRIVIA*\n\n` +
      `❓ ${t.q}\n\n` +
      `_Jawab dalam chat! Ketik /triviaanswer untuk lihat jawaban._`
    );
    await ctx.reply(`||Jawaban: ${t.a}||`, { parse_mode: "MarkdownV2" });
  });

  // ─── /math ────────────────────────────────────────────────────────────
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

  // ─── /savequote ───────────────────────────────────────────────────────
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

  // ─── /randomquote ─────────────────────────────────────────────────────
  bot.command("randomquote", async (ctx) => {
    const chatId = String(ctx.chat!.id);
    const all = await db.select().from(quotes).where(eq(quotes.chatId, chatId));
    if (all.length === 0) return safeReply(ctx, "📭 Belum ada quote tersimpan. Gunakan /savequote!");
    const q = all[randomInt(0, all.length - 1)];
    const name = q.username ? `@${q.username}` : "Unknown";
    await safeReply(ctx, `💬 *Quote Random*\n\n_"${q.text}"_\n\n— ${name}`);
  });

  // ─── /choose ──────────────────────────────────────────────────────────
  bot.command("choose", async (ctx) => {
    const input = ctx.match || "";
    const options = input.split(",").map((s) => s.trim()).filter(Boolean);
    if (options.length < 2) return safeReply(ctx, "🎲 Gunakan: /choose [opsi1], [opsi2], ...\nContoh: /choose Pizza, Burger, Sushi");
    const chosen = options[randomInt(0, options.length - 1)];
    await safeReply(ctx, `🎲 *Pilihan Acak*\n\nOpsi: ${options.map(o => `_${o}_`).join(", ")}\n\n🎯 Dipilih: *${chosen}*`);
  });

  // ─── /reverse ─────────────────────────────────────────────────────────
  bot.command("reverse", async (ctx) => {
    const text = ctx.match || ctx.message?.reply_to_message?.text;
    if (!text) return safeReply(ctx, "📝 Gunakan: /reverse [teks]");
    const reversed = text.split("").reverse().join("");
    await safeReply(ctx, `🔄 *Teks Terbalik*\n\n${reversed}`);
  });

  // ─── /mock ────────────────────────────────────────────────────────────
  bot.command("mock", async (ctx) => {
    const text = ctx.match || ctx.message?.reply_to_message?.text;
    if (!text) return safeReply(ctx, "📝 Gunakan: /mock [teks]");
    const mocked = text.split("").map((c, i) =>
      i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()
    ).join("");
    await safeReply(ctx, `🤪 ${mocked}`);
  });

  // ─── /aesthetic ───────────────────────────────────────────────────────
  bot.command("aesthetic", async (ctx) => {
    const text = ctx.match || "";
    if (!text) return safeReply(ctx, "✨ Gunakan: /aesthetic [teks]");
    const aesthetic = text.split("").join(" ").toUpperCase();
    await safeReply(ctx, `✨ ${aesthetic}`);
  });

  // ─── /slots ───────────────────────────────────────────────────────────
  bot.command("slots", async (ctx) => {
    const bet = parseInt(ctx.match || "0");
    if (isNaN(bet) || bet < 10) return safeReply(ctx, "🎰 Gunakan: /slots [jumlah]\nMinimum bet: 10 koin\nContoh: /slots 50");

    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const userId = String(ctx.from!.id);

    const member = await getMember(chatId, userId);
    if (!member || (member.coins ?? 0) < bet) {
      return safeReply(ctx, `❌ Koin tidak cukup! Kamu punya *${member?.coins ?? 0}* koin.`);
    }

    const symbols = ["🍒", "🍋", "🍊", "🍇", "💎", "⭐", "7️⃣"];
    const s1 = symbols[randomInt(0, symbols.length - 1)];
    const s2 = symbols[randomInt(0, symbols.length - 1)];
    const s3 = symbols[randomInt(0, symbols.length - 1)];

    let multiplier = 0;
    let result = "😢 Tidak ada kecocokan!";

    if (s1 === s2 && s2 === s3) {
      if (s1 === "7️⃣") { multiplier = 10; result = "🎊 JACKPOT! 777!"; }
      else if (s1 === "💎") { multiplier = 5; result = "💎 JACKPOT DIAMOND!"; }
      else { multiplier = 3; result = "🎉 TRIPLE MATCH!"; }
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
      multiplier = 1.5;
      result = "✅ Dua sama!";
    }

    const winAmount = Math.floor(bet * multiplier);
    const change = winAmount - bet;
    const newCoins = (member.coins ?? 0) + change;

    await db.update(groupMembers)
      .set({ coins: newCoins, totalGameWins: sql`${groupMembers.totalGameWins} + ${multiplier > 0 ? 1 : 0}` })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));

    await safeReply(ctx,
      `🎰 *SLOT MACHINE*\n\n` +
      `┌─────────────┐\n` +
      `│  ${s1} │ ${s2} │ ${s3}  │\n` +
      `└─────────────┘\n\n` +
      `${result}\n` +
      (multiplier > 0
        ? `💰 Menang: +*${winAmount}* koin (${multiplier}x)`
        : `💸 Kalah: -*${bet}* koin`) +
      `\n💎 Saldo: *${newCoins}* koin`
    );
  });

  // ─── /marry ───────────────────────────────────────────────────────────
  bot.command("marry", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return safeReply(ctx, "💍 Balas pesan seseorang untuk melamar!\nContoh: Balas pesan + /marry");
    if (target.is_bot) return safeReply(ctx, "❌ Tidak bisa melamar bot!");
    if (target.id === ctx.from!.id) return safeReply(ctx, "❌ Tidak bisa melamar diri sendiri!");

    const chatId = String(ctx.chat!.id);
    const userId1 = String(ctx.from!.id);
    const userId2 = String(target.id);

    // Check existing marriage
    const existing = await db.select().from(marriages)
      .where(and(
        eq(marriages.chatId, chatId),
        eq(marriages.isActive, true)
      ));

    const alreadyMarried = existing.find(
      m => (m.userId1 === userId1 || m.userId2 === userId1 ||
             m.userId1 === userId2 || m.userId2 === userId2)
    );

    if (alreadyMarried) {
      return safeReply(ctx, "💔 Salah satu dari kalian sudah menikah!");
    }

    // Check coins
    const proposer = await getMember(chatId, userId1);
    if (!proposer || (proposer.coins ?? 0) < 500) {
      return safeReply(ctx, "❌ Pernikahan membutuhkan *500 koin*! Kamu tidak punya cukup koin.");
    }

    await db.insert(marriages).values({ chatId, userId1, userId2 });
    await db.update(groupMembers)
      .set({ coins: (proposer.coins ?? 0) - 500 })
      .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId1)));

    await ctx.reply(
      `💍 *Pernikahan!*\n\n` +
      `💒 [${ctx.from!.first_name}](tg://user?id=${userId1}) menikah dengan [${target.first_name}](tg://user?id=${userId2})!\n\n` +
      `💐 Selamat atas pernikahan kalian!\n` +
      `💸 Biaya: 500 koin`,
      { parse_mode: "Markdown" }
    );
  });

  // ─── /divorce ─────────────────────────────────────────────────────────
  bot.command("divorce", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const userId = String(ctx.from!.id);

    const marriage = await db.select().from(marriages)
      .where(and(eq(marriages.chatId, chatId), eq(marriages.isActive, true)));

    const myMarriage = marriage.find(m => m.userId1 === userId || m.userId2 === userId);
    if (!myMarriage) return safeReply(ctx, "💔 Kamu tidak sedang menikah.");

    await db.update(marriages)
      .set({ isActive: false })
      .where(eq(marriages.id, myMarriage.id));

    await safeReply(ctx, "💔 Perceraian telah diproses. Semoga kalian baik-baik saja.");
  });

  // ─── /partner ─────────────────────────────────────────────────────────
  bot.command("partner", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    const userId = String(ctx.from!.id);

    const marriages_list = await db.select().from(marriages)
      .where(and(eq(marriages.chatId, chatId), eq(marriages.isActive, true)));

    const myMarriage = marriages_list.find(m => m.userId1 === userId || m.userId2 === userId);
    if (!myMarriage) return safeReply(ctx, "💔 Kamu belum menikah.");

    const partnerId = myMarriage.userId1 === userId ? myMarriage.userId2 : myMarriage.userId1;
    const partner = await getMember(chatId, partnerId);
    const partnerName = partner?.username ? `@${partner.username}` : (partner?.firstName ?? "Unknown");
    const since = myMarriage.marriedAt ? `\n💒 Sejak: ${myMarriage.marriedAt.toLocaleDateString("id-ID")}` : "";

    await safeReply(ctx, `💑 *Pasangan Kamu*\n\n👤 ${partnerName}${since}`);
  });

  // ─── /wordchain ───────────────────────────────────────────────────────
  bot.command("wordchain", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);

    const existing = await db.select().from(wordGames)
      .where(and(eq(wordGames.chatId, chatId), eq(wordGames.isActive, true)))
      .limit(1);

    if (existing.length > 0) {
      return safeReply(ctx,
        `🔤 *Word Chain sedang berlangsung!*\n\n` +
        `📝 Kata saat ini: *${existing[0].currentWord}*\n` +
        `👤 Giliran: [User](tg://user?id=${existing[0].currentUserId})\n\n` +
        `Ketik kata yang dimulai dengan huruf *${(existing[0].currentWord || "a").slice(-1).toUpperCase()}*!`
      );
    }

    const startWord = WORD_GAME_WORDS[randomInt(0, WORD_GAME_WORDS.length - 1)];
    await db.insert(wordGames).values({
      chatId,
      gameType: "wordchain",
      currentWord: startWord,
      currentUserId: String(ctx.from!.id),
      usedWords: [startWord],
    });

    await safeReply(ctx,
      `🔤 *Word Chain Dimulai!*\n\n` +
      `📝 Kata pertama: *${startWord}*\n\n` +
      `Ketik kata yang dimulai dengan huruf: *${startWord.slice(-1).toUpperCase()}*\n\n` +
      `_Gunakan /stopwordchain untuk menghentikan permainan._`
    );
  });

  // ─── /stopwordchain ───────────────────────────────────────────────────
  bot.command("stopwordchain", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const chatId = String(ctx.chat!.id);
    await db.update(wordGames)
      .set({ isActive: false })
      .where(and(eq(wordGames.chatId, chatId), eq(wordGames.isActive, true)));
    await safeReply(ctx, "🛑 Word Chain dihentikan!");
  });

  // ─── Word chain handler ───────────────────────────────────────────────
  bot.on("message:text", async (ctx, next) => {
    if (ctx.chat.type === "private") return next();
    const text = ctx.message.text.toLowerCase().trim();
    if (text.startsWith("/")) return next();

    const chatId = String(ctx.chat.id);
    const userId = String(ctx.from!.id);

    try {
      const game = await db.select().from(wordGames)
        .where(and(eq(wordGames.chatId, chatId), eq(wordGames.isActive, true)))
        .limit(1);

      if (game.length > 0 && game[0].gameType === "wordchain") {
        const g = game[0];
        const lastChar = (g.currentWord || "").slice(-1);
        if (text.startsWith(lastChar) && !g.usedWords?.includes(text)) {
          await db.update(wordGames)
            .set({
              currentWord: text,
              currentUserId: userId,
              usedWords: [...(g.usedWords ?? []), text],
              updatedAt: new Date(),
            })
            .where(eq(wordGames.id, g.id));

          // Award coins
          await db.update(groupMembers)
            .set({ coins: sql`${groupMembers.coins} + 2` })
            .where(and(eq(groupMembers.chatId, chatId), eq(groupMembers.userId, userId)));

          await ctx.reply(
            `✅ *${ctx.from!.first_name}* menjawab: *${text}*! (+2 koin)\n` +
            `Kata berikutnya harus dimulai dengan: *${text.slice(-1).toUpperCase()}*`
          );
          return;
        }
      }
    } catch { /* ignore */ }

    return next();
  });

  // ─── /gamestats ───────────────────────────────────────────────────────
  bot.command("gamestats", async (ctx) => {
    if (ctx.chat.type === "private") return safeReply(ctx, "❌ Hanya untuk grup.");
    const target = ctx.message?.reply_to_message?.from ?? ctx.from;
    if (!target) return;
    const chatId = String(ctx.chat!.id);
    const userId = String(target.id);
    const member = await getMember(chatId, userId);
    if (!member) return safeReply(ctx, "❌ Data tidak ditemukan.");

    const wins = member.totalGameWins ?? 0;
    const losses = member.totalGameLosses ?? 0;
    const total = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    await safeReply(ctx,
      `🎮 *Game Stats - ${target.first_name}*\n\n` +
      `🏆 Menang: *${wins}*\n` +
      `💀 Kalah: *${losses}*\n` +
      `📊 Win Rate: *${winRate}%*\n` +
      `🎯 Total Game: *${total}*`
    );
  });

  // ─── /encode ──────────────────────────────────────────────────────────
  bot.command("encode", async (ctx) => {
    const text = ctx.match || "";
    if (!text) return safeReply(ctx, "🔐 Gunakan: /encode [teks]\nMengubah teks ke Base64");
    const encoded = Buffer.from(text).toString("base64");
    await safeReply(ctx, `🔐 *Encode Base64*\n\n📝 Asli: ${text}\n🔑 Encoded:\n\`${encoded}\``);
  });

  // ─── /decode ──────────────────────────────────────────────────────────
  bot.command("decode", async (ctx) => {
    const text = ctx.match || "";
    if (!text) return safeReply(ctx, "🔓 Gunakan: /decode [base64]\nMengubah Base64 ke teks");
    try {
      const decoded = Buffer.from(text, "base64").toString("utf-8");
      await safeReply(ctx, `🔓 *Decode Base64*\n\n🔑 Encoded: ${text}\n📝 Decoded:\n\`${decoded}\``);
    } catch {
      safeReply(ctx, "❌ Teks bukan Base64 yang valid.");
    }
  });

  // ─── /tebak ───────────────────────────────────────────────────────────
  bot.command("tebak", async (ctx) => {
    const number = randomInt(1, 100);
    await safeReply(ctx,
      `🔢 *Tebak Angka!*\n\n` +
      `Aku menebak angka antara *1-100*\n\n` +
      `||Jawabannya: ${number}||\n\n` +
      `_Klik spoiler untuk lihat jawaban!_`
    );
    await ctx.reply(`||${number}||`, { parse_mode: "MarkdownV2" });
  });

  // ─── /fortune ─────────────────────────────────────────────────────────
  bot.command("fortune", async (ctx) => {
    const fortunes = [
      "🌟 Keberuntungan besar menunggumu hari ini!",
      "💰 Rezeki akan datang dari arah yang tidak terduga.",
      "❤️ Cinta sejati akan datang ketika kamu tidak mengharapkannya.",
      "🚀 Hari ini adalah hari yang tepat untuk memulai sesuatu yang baru.",
      "⚠️ Berhati-hatilah dalam mengambil keputusan hari ini.",
      "🌈 Setelah hujan pasti ada pelangi. Tetap sabar!",
      "🎯 Fokus pada tujuanmu dan sukses pasti datang.",
      "🍀 Keberuntunganmu sedang dalam perjalanan menuju kamu.",
      "💪 Hari ini adalah hari dimana kerja kerasmu terbayar.",
      "🌙 Mimpimu memberikan petunjuk tentang masa depanmu.",
    ];
    const fortune = fortunes[randomInt(0, fortunes.length - 1)];
    const luck = randomInt(1, 100);
    const luckEmoji = luck >= 80 ? "🍀" : luck >= 60 ? "⭐" : luck >= 40 ? "🌟" : luck >= 20 ? "🌙" : "💫";

    await safeReply(ctx,
      `🔮 *Fortune Cookie*\n\n` +
      `${fortune}\n\n` +
      `${luckEmoji} Tingkat keberuntungan hari ini: *${luck}%*`
    );
  });
}
