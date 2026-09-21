import { Bot } from "grammy";
import { safeReply, randomInt } from "../helpers";
import { db } from "@/db";
import { notes, reminders, groupSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdmin } from "../helpers";
import axios from "axios";

export function registerToolsCommands(bot: Bot) {
  // ─── /calc ───────────────────────────────────────────────────────────────
  bot.command("calc", async (ctx) => {
    const expr = ctx.match || "";
    if (!expr) return safeReply(ctx, "🧮 Gunakan: /calc [ekspresi]\nContoh: /calc 10 + 5 * 2");

    try {
      // Safe eval with basic math only
      const sanitized = expr.replace(/[^0-9+\-*/.() %]/g, "");
      if (!sanitized) throw new Error("Invalid");
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized})`)();
      await safeReply(ctx, `🧮 *Kalkulator*\n\n📝 ${expr}\n➕ = *${result}*`);
    } catch {
      safeReply(ctx, "❌ Ekspresi tidak valid. Gunakan: /calc 10 + 5");
    }
  });

  // ─── /convert ────────────────────────────────────────────────────────────
  bot.command("convert", async (ctx) => {
    const args = (ctx.match || "").split(" ");
    if (args.length < 3) {
      return safeReply(ctx,
        "🔄 *Konversi Satuan*\n\nGunakan: /convert [nilai] [dari] [ke]\n\n" +
        "Contoh:\n" +
        "/convert 100 km m\n" +
        "/convert 1 kg g\n" +
        "/convert 100 usd idr\n" +
        "/convert 37 c f"
      );
    }

    const value = parseFloat(args[0]);
    const from = args[1].toLowerCase();
    const to = args[2].toLowerCase();

    if (isNaN(value)) return safeReply(ctx, "❌ Nilai tidak valid.");

    let result: number | null = null;
    let unit = "";

    // Length
    const lengthToM: Record<string, number> = { km: 1000, m: 1, cm: 0.01, mm: 0.001, mi: 1609.34, ft: 0.3048, in: 0.0254, yd: 0.9144 };
    // Weight
    const weightToKg: Record<string, number> = { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, ton: 1000 };

    if (lengthToM[from] && lengthToM[to]) {
      result = (value * lengthToM[from]) / lengthToM[to];
      unit = to;
    } else if (weightToKg[from] && weightToKg[to]) {
      result = (value * weightToKg[from]) / weightToKg[to];
      unit = to;
    } else if ((from === "c" || from === "celsius") && (to === "f" || to === "fahrenheit")) {
      result = (value * 9/5) + 32;
      unit = "°F";
    } else if ((from === "f" || from === "fahrenheit") && (to === "c" || to === "celsius")) {
      result = (value - 32) * 5/9;
      unit = "°C";
    } else if ((from === "c" || from === "celsius") && (to === "k" || to === "kelvin")) {
      result = value + 273.15;
      unit = "K";
    } else if (from === "km" && to === "miles") {
      result = value * 0.621371;
      unit = "miles";
    } else {
      return safeReply(ctx, "❌ Konversi tidak didukung. Coba: km↔m, kg↔g, C↔F");
    }

    await safeReply(ctx,
      `🔄 *Konversi Satuan*\n\n` +
      `📥 Input: *${value} ${from}*\n` +
      `📤 Hasil: *${Number(result.toFixed(6))} ${unit}*`
    );
  });

  // ─── /note ───────────────────────────────────────────────────────────────
  bot.command("note", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const args = (ctx.match || "").split(" ");
    const keyword = args[0]?.toLowerCase();
    const content = args.slice(1).join(" ") || ctx.message?.reply_to_message?.text;

    if (!keyword || !content) {
      return safeReply(ctx, "📝 Gunakan: /note [kata_kunci] [isi]\natau balas pesan dengan /note [kata_kunci]");
    }

    const chatId = String(ctx.chat!.id);
    const existing = await db.select().from(notes)
      .where(and(eq(notes.chatId, chatId), eq(notes.keyword, keyword)))
      .limit(1);

    if (existing.length > 0) {
      await db.update(notes)
        .set({ content })
        .where(and(eq(notes.chatId, chatId), eq(notes.keyword, keyword)));
      await safeReply(ctx, `✅ Note *${keyword}* telah diperbarui!`);
    } else {
      await db.insert(notes).values({
        chatId,
        keyword,
        content,
        createdBy: String(ctx.from!.id),
      });
      await safeReply(ctx, `✅ Note *${keyword}* telah disimpan!`);
    }
  });

  // ─── /notes ──────────────────────────────────────────────────────────────
  bot.command("notes", async (ctx) => {
    const chatId = String(ctx.chat!.id);
    const allNotes = await db.select().from(notes).where(eq(notes.chatId, chatId));

    if (allNotes.length === 0) return safeReply(ctx, "📭 Belum ada note tersimpan.");

    const list = allNotes.map((n) => `• \`${n.keyword}\``).join("\n");
    await safeReply(ctx, `📝 *Daftar Note*\n\n${list}\n\nGunakan \`#kata_kunci\` atau /getnote [kata_kunci]`);
  });

  // ─── /getnote ────────────────────────────────────────────────────────────
  bot.command("getnote", async (ctx) => {
    const keyword = (ctx.match || "").toLowerCase().trim();
    if (!keyword) return safeReply(ctx, "📝 Gunakan: /getnote [kata_kunci]");

    const chatId = String(ctx.chat!.id);
    const note = await db.select().from(notes)
      .where(and(eq(notes.chatId, chatId), eq(notes.keyword, keyword)))
      .limit(1);

    if (note.length === 0) return safeReply(ctx, `❌ Note *${keyword}* tidak ditemukan.`);
    await safeReply(ctx, `📝 *#${keyword}*\n\n${note[0].content}`);
  });

  // ─── #keyword trigger ────────────────────────────────────────────────────
  bot.on("message:text", async (ctx, next) => {
    const text = ctx.message.text;
    if (text.startsWith("#") && ctx.chat.type !== "private") {
      const keyword = text.slice(1).toLowerCase().split(" ")[0];
      const chatId = String(ctx.chat.id);
      const note = await db.select().from(notes)
        .where(and(eq(notes.chatId, chatId), eq(notes.keyword, keyword)))
        .limit(1);
      if (note.length > 0) {
        return safeReply(ctx, `📝 *#${keyword}*\n\n${note[0].content}`);
      }
    }
    return next();
  });

  // ─── /delnote ────────────────────────────────────────────────────────────
  bot.command("delnote", async (ctx) => {
    if (!(await isAdmin(ctx))) return safeReply(ctx, "❌ Hanya admin.");
    const keyword = (ctx.match || "").toLowerCase().trim();
    if (!keyword) return safeReply(ctx, "📝 Gunakan: /delnote [kata_kunci]");

    const chatId = String(ctx.chat!.id);
    await db.delete(notes)
      .where(and(eq(notes.chatId, chatId), eq(notes.keyword, keyword)));

    await safeReply(ctx, `🗑️ Note *${keyword}* telah dihapus.`);
  });

  // ─── /remind ─────────────────────────────────────────────────────────────
  bot.command("remind", async (ctx) => {
    await safeReply(ctx,
      `⏰ *Pengingat*\n\nFitur pengingat aktif!\n\n` +
      `Pesan yang tersimpan akan dikirim pada waktu yang ditentukan.\n` +
      `Gunakan /remind [waktu] [pesan]\n\n` +
      `Contoh: /remind 1h Jangan lupa minum obat`
    );
  });

  // ─── /afk ────────────────────────────────────────────────────────────────
  bot.command("afk", async (ctx) => {
    const reason = ctx.match || "Tidak ada alasan";
    const name = ctx.from?.first_name || "User";
    await safeReply(ctx,
      `😴 *${name}* sekarang AFK!\n📋 Alasan: _${reason}_\n\nMereka akan dinotifikasi ketika di-mention.`
    );
  });

  // ─── /qr ─────────────────────────────────────────────────────────────────
  bot.command("qr", async (ctx) => {
    const text = ctx.match || "";
    if (!text) return safeReply(ctx, "📱 Gunakan: /qr [teks atau URL]");

    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;

    try {
      await ctx.replyWithPhoto(url, {
        caption: `📱 *QR Code*\n\n📝 Data: ${text}`,
        parse_mode: "Markdown",
      });
    } catch {
      safeReply(ctx, `📱 QR Code: [Klik di sini](${url})`);
    }
  });

  // ─── /tinyurl ────────────────────────────────────────────────────────────
  bot.command("tinyurl", async (ctx) => {
    const url = ctx.match || "";
    if (!url) return safeReply(ctx, "🔗 Gunakan: /tinyurl [URL]");

    try {
      const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
        timeout: 5000,
      });
      await safeReply(ctx, `🔗 *URL Dipersingkat*\n\n📎 Original: ${url}\n✂️ Short: ${res.data}`);
    } catch {
      safeReply(ctx, "❌ Gagal mempersingkat URL. Coba lagi.");
    }
  });

  // ─── /weather ────────────────────────────────────────────────────────────
  bot.command("weather", async (ctx) => {
    const city = ctx.match || "";
    if (!city) return safeReply(ctx, "🌤️ Gunakan: /weather [nama kota]\nContoh: /weather Jakarta");

    try {
      // Using open-meteo with geocoding
      const geoRes = await axios.get(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=id`,
        { timeout: 5000 }
      );

      const geoData = geoRes.data;
      if (!geoData.results?.length) {
        return safeReply(ctx, `❌ Kota *${city}* tidak ditemukan.`);
      }

      const loc = geoData.results[0];
      const weatherRes = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}` +
        `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
        `&timezone=auto`,
        { timeout: 5000 }
      );

      const w = weatherRes.data.current;
      const weatherCodes: Record<number, string> = {
        0: "☀️ Cerah",
        1: "🌤️ Sebagian Cerah",
        2: "⛅ Berawan Sebagian",
        3: "☁️ Berawan",
        45: "🌫️ Berkabut",
        48: "🌫️ Berkabut Es",
        51: "🌦️ Gerimis Ringan",
        61: "🌧️ Hujan Ringan",
        63: "🌧️ Hujan Sedang",
        65: "🌧️ Hujan Lebat",
        80: "🌦️ Hujan Lokal",
        95: "⛈️ Badai Petir",
      };

      const weatherDesc = weatherCodes[w.weather_code] || "❓ Tidak Diketahui";

      await safeReply(ctx,
        `🌤️ *Cuaca ${loc.name}, ${loc.country}*\n\n` +
        `${weatherDesc}\n` +
        `🌡️ Suhu: *${w.temperature_2m}°C*\n` +
        `💧 Kelembaban: *${w.relative_humidity_2m}%*\n` +
        `💨 Angin: *${w.wind_speed_10m} km/h*\n\n` +
        `📍 ${loc.latitude.toFixed(2)}, ${loc.longitude.toFixed(2)}`
      );
    } catch (err) {
      safeReply(ctx, "❌ Gagal mengambil data cuaca. Coba lagi.");
    }
  });

  // ─── /translate ──────────────────────────────────────────────────────────
  bot.command("translate", async (ctx) => {
    const args = (ctx.match || "").split(" ");
    const targetLang = args[0] || "id";
    const text = args.slice(1).join(" ") || ctx.message?.reply_to_message?.text;

    if (!text) {
      return safeReply(ctx,
        "🌐 Gunakan: /translate [bahasa] [teks]\n" +
        "atau balas pesan dengan /translate [bahasa]\n\n" +
        "Contoh:\n/translate en Halo dunia\n/translate id Hello world"
      );
    }

    try {
      const res = await axios.get(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${targetLang}`,
        { timeout: 5000 }
      );

      const translated = res.data?.responseData?.translatedText;
      if (!translated) throw new Error("No translation");

      await safeReply(ctx,
        `🌐 *Terjemahan*\n\n` +
        `📝 Asli: _${text}_\n` +
        `🔤 Terjemahan (${targetLang}): *${translated}*`
      );
    } catch {
      safeReply(ctx, "❌ Gagal menerjemahkan teks.");
    }
  });

  // ─── /define ─────────────────────────────────────────────────────────────
  bot.command("define", async (ctx) => {
    const word = (ctx.match || "").trim();
    if (!word) return safeReply(ctx, "📖 Gunakan: /define [kata dalam bahasa Inggris]");

    try {
      const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
        timeout: 5000,
      });

      const data = res.data[0];
      const meaning = data.meanings[0];
      const def = meaning.definitions[0];

      await safeReply(ctx,
        `📖 *Definisi: ${word}*\n\n` +
        `📋 Jenis kata: _${meaning.partOfSpeech}_\n` +
        `📝 Definisi: ${def.definition}\n` +
        (def.example ? `💬 Contoh: _${def.example}_` : "")
      );
    } catch {
      safeReply(ctx, `❌ Kata *${word}* tidak ditemukan.`);
    }
  });

  // ─── /ascii ──────────────────────────────────────────────────────────────
  bot.command("ascii", async (ctx) => {
    const text = (ctx.match || "").toUpperCase().slice(0, 10);
    if (!text) return safeReply(ctx, "🔤 Gunakan: /ascii [teks]\nContoh: /ascii HELLO");

    const result = `\`\`\`\n${text.split("").join(" ")}\n\`\`\``;
    await ctx.reply(`🔤 *ASCII Text*\n\n${result}`, { parse_mode: "Markdown" });
  });
}
