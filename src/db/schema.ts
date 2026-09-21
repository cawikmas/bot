import {
  pgTable,
  serial,
  bigint,
  text,
  timestamp,
  boolean,
  varchar,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

// ─── Tabel: Member Grup ───────────────────────────────────────────────────────
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }).notNull(),
  userId: bigint("user_id", { mode: "number" }).notNull(),
  username: varchar("username", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Tabel: Log Perintah ──────────────────────────────────────────────────────
export const botLogs = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }).notNull(),
  userId: bigint("user_id", { mode: "number" }),
  command: varchar("command", { length: 100 }).notNull(),
  result: text("result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Tabel: Pesan Terjadwal ───────────────────────────────────────────────────
export const scheduledMessages = pgTable("scheduled_messages", {
  id: serial("id").primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }).notNull(),
  message: text("message").notNull(),
  cronExpression: varchar("cron_expression", { length: 100 }),
  scheduledAt: timestamp("scheduled_at"),
  isActive: boolean("is_active").default(true).notNull(),
  isSent: boolean("is_sent").default(false).notNull(),
  createdBy: bigint("created_by", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Tabel: Peringatan / Warn ─────────────────────────────────────────────────
export const userWarnings = pgTable("user_warnings", {
  id: serial("id").primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }).notNull(),
  userId: bigint("user_id", { mode: "number" }).notNull(),
  reason: text("reason"),
  warnedBy: bigint("warned_by", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Tabel: Kata Terlarang ────────────────────────────────────────────────────
export const bannedWords = pgTable("banned_words", {
  id: serial("id").primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }).notNull(),
  word: varchar("word", { length: 255 }).notNull(),
  addedBy: bigint("added_by", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Tabel: Polling / Survei ──────────────────────────────────────────────────
export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }).notNull(),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  votes: jsonb("votes").$type<Record<string, number[]>>().default({}),
  createdBy: bigint("created_by", { mode: "number" }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

// ─── Tabel: Catatan / Notes ───────────────────────────────────────────────────
export const groupNotes = pgTable("group_notes", {
  id: serial("id").primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }).notNull(),
  key: varchar("key", { length: 100 }).notNull(),
  content: text("content").notNull(),
  addedBy: bigint("added_by", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Tabel: Statistik Pengguna ────────────────────────────────────────────────
export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }).notNull(),
  userId: bigint("user_id", { mode: "number" }).notNull(),
  messageCount: integer("message_count").default(0).notNull(),
  commandCount: integer("command_count").default(0).notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Tabel: Welcome Message per Grup ─────────────────────────────────────────
export const groupSettings = pgTable("group_settings", {
  id: serial("id").primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }).notNull().unique(),
  welcomeMessage: text("welcome_message"),
  welcomeEnabled: boolean("welcome_enabled").default(true).notNull(),
  antiSpamEnabled: boolean("anti_spam_enabled").default(false).notNull(),
  maxWarnings: integer("max_warnings").default(3).notNull(),
  language: varchar("language", { length: 10 }).default("id").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
