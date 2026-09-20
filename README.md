# 🤖 TeleBot Pro — Bot Telegram Multi-Fitur

Bot Telegram lengkap dengan fitur-fitur canggih yang bisa di-deploy ke **Vercel** dan **GitHub**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/your-repo)

## ✨ Fitur

| Fitur | Perintah | Deskripsi |
|-------|----------|-----------|
| 👥 Tag All Member | `/tagall` | Tag semua member aktif di grup (admin only) |
| 👑 Tag Admin | `/tagadmin` | Mention semua admin & owner grup |
| 🏓 Ping Tool | `/ping` | Ukur latency bot secara real-time |
| 🚀 Speed Test | `/speedtest` | Tes kecepatan internet server via Cloudflare |
| 🎨 Buat Stiker | `/sticker [teks]` | Buat stiker SVG dari teks dengan gradien |
| 🎁 Kirim Gift | `/gift @username` | Kirim gift Telegram ke member grup |
| ℹ️ Info | `/info` | Tampilkan info bot dan grup |

## 🚀 Quick Deploy ke Vercel

### 1. Fork Repository
```bash
git clone https://github.com/your-username/telebot-pro.git
cd telebot-pro
npm install
```

### 2. Buat Bot di BotFather
1. Chat ke [@BotFather](https://t.me/BotFather)
2. Ketik `/newbot` dan ikuti instruksi
3. Salin token yang diberikan

### 3. Setup Environment Variables

Buat file `.env.local`:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
BOT_USERNAME=your_bot_username
DATABASE_URL=postgresql://user:password@host:5432/dbname
SETUP_SECRET=your_random_secret_here
```

### 4. Push ke GitHub & Deploy ke Vercel

1. Push kode ke GitHub repository
2. Buka [Vercel Dashboard](https://vercel.com/new)
3. Import GitHub repository
4. Tambahkan Environment Variables di Vercel Settings
5. Deploy!

### 5. Setup Webhook Bot

Setelah deploy, jalankan setup webhook:
```bash
curl https://your-app.vercel.app/api/setup-webhook?secret=your_random_secret_here
```

### 6. Tambahkan Bot ke Grup

1. Buka grup Telegram
2. Tambahkan bot sebagai **admin**
3. Berikan permission: `Delete messages`, `Invite users`
4. Ketik `/start` di grup

## 🛠️ Setup GitHub Actions (Opsional)

Tambahkan secrets di GitHub repository:
- `VERCEL_TOKEN` — Token dari Vercel Settings
- `VERCEL_ORG_ID` — Organization ID dari Vercel
- `VERCEL_PROJECT_ID` — Project ID dari Vercel
- `TELEGRAM_BOT_TOKEN` — Token bot Telegram
- `DATABASE_URL` — URL database PostgreSQL
- `SETUP_SECRET` — Secret untuk setup webhook
- `BOT_USERNAME` — Username bot

## 📊 Dashboard

Akses dashboard monitoring bot di: `https://your-app.vercel.app/dashboard`

## 🔧 Teknologi

- **Next.js 15** (App Router) — Framework
- **grammY** — Telegram Bot Framework
- **Drizzle ORM** — Database ORM
- **PostgreSQL** — Database
- **Vercel** — Hosting & Serverless Functions
- **Tailwind CSS** — Styling

## 📋 Cara Kerja Tag All Member

Bot Telegram Bot API tidak mendukung `getChatMembers()` untuk semua member. Solusinya:
1. Bot mencatat setiap member yang mengirim pesan di grup
2. Data disimpan di PostgreSQL
3. Saat `/tagall` dipanggil, bot mention semua member yang tercatat
4. Admin juga dicek via `getChatAdministrators()` API

## 🎨 Fitur Stiker

Stiker dibuat sebagai file SVG dengan:
- Background gradien warna acak
- Teks dengan font tebal dan shadow
- Auto-wrap teks panjang
- Ukuran 512x512px (standar Telegram stiker)

## 🎁 Fitur Gift

Bot dapat mengirim gift Telegram Stars secara otomatis menggunakan API `sendGift`. Memerlukan:
- Bot memiliki saldo Telegram Stars
- Target user adalah member aktif grup

## 📄 License

MIT License — Bebas digunakan dan dimodifikasi.
