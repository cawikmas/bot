import {
  pgTable,
  bigint,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  serial,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Group Members ───────────────────────────────────────────────────────────
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  userId: text("user_id").notNull(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  isBot: boolean("is_bot").default(false),
  messageCount: integer("message_count").default(0),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  isBanned: boolean("is_banned").default(false),
  isMuted: boolean("is_muted").default(false),
  muteUntil: timestamp("mute_until"),
  warnings: integer("warnings").default(0),
  xpPoints: integer("xp_points").default(0),
  level: integer("level").default(1),
  coins: integer("coins").default(0),
  streak: integer("streak").default(0),
  lastDailyAt: timestamp("last_daily_at"),
});

// ─── Group Settings ───────────────────────────────────────────────────────────
export const groupSettings = pgTable("group_settings", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull().unique(),
  chatTitle: text("chat_title"),
  welcomeEnabled: boolean("welcome_enabled").default(true),
  welcomeMessage: text("welcome_message"),
  goodbyeEnabled: boolean("goodbye_enabled").default(true),
  goodbyeMessage: text("goodbye_message"),
  antiSpamEnabled: boolean("anti_spam_enabled").default(false),
  antiLinkEnabled: boolean("anti_link_enabled").default(false),
  antiBadWordEnabled: boolean("anti_bad_word_enabled").default(false),
  badWords: text("bad_words").array().default([]),
  maxWarnings: integer("max_warnings").default(3),
  autoDeleteCommand: boolean("auto_delete_command").default(false),
  language: varchar("language", { length: 10 }).default("id"),
  timezone: varchar("timezone", { length: 50 }).default("Asia/Jakarta"),
  captchaEnabled: boolean("captcha_enabled").default(false),
  slowModeSeconds: integer("slow_mode_seconds").default(0),
  maxMessageLength: integer("max_message_length").default(0),
  logChannelId: text("log_channel_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Messages Log ─────────────────────────────────────────────────────────────
export const messagesLog = pgTable("messages_log", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  userId: text("user_id").notNull(),
  messageId: text("message_id"),
  messageText: text("message_text"),
  messageType: varchar("message_type", { length: 30 }).default("text"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Notes ────────────────────────────────────────────────────────────────────
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  keyword: text("keyword").notNull(),
  content: text("content").notNull(),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Warns ────────────────────────────────────────────────────────────────────
export const warns = pgTable("warns", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  userId: text("user_id").notNull(),
  reason: text("reason"),
  warnedBy: text("warned_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Polls ────────────────────────────────────────────────────────────────────
export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  question: text("question").notNull(),
  options: text("options").array().notNull(),
  votes: jsonb("votes").default({}),
  createdBy: text("created_by"),
  isOpen: boolean("is_open").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  closedAt: timestamp("closed_at"),
});

// ─── Reminders ────────────────────────────────────────────────────────────────
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  userId: text("user_id").notNull(),
  message: text("message").notNull(),
  remindAt: timestamp("remind_at").notNull(),
  isSent: boolean("is_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── AFK ─────────────────────────────────────────────────────────────────────
export const afkUsers = pgTable("afk_users", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  userId: text("user_id").notNull(),
  reason: text("reason"),
  afkSince: timestamp("afk_since").defaultNow(),
  isAfk: boolean("is_afk").default(true),
});

// ─── Captcha ──────────────────────────────────────────────────────────────────
export const captchaQueue = pgTable("captcha_queue", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  userId: text("user_id").notNull(),
  answer: text("answer").notNull(),
  attempts: integer("attempts").default(0),
  verified: boolean("verified").default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Bot Stats ────────────────────────────────────────────────────────────────
export const botStats = pgTable("bot_stats", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  totalMessages: integer("total_messages").default(0),
  totalCommands: integer("total_commands").default(0),
  totalGroups: integer("total_groups").default(0),
  totalUsers: integer("total_users").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Scheduled Broadcasts ─────────────────────────────────────────────────────
export const broadcasts = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  targetChatIds: text("target_chat_ids").array().notNull(),
  scheduledAt: timestamp("scheduled_at"),
  isSent: boolean("is_sent").default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Custom Commands ──────────────────────────────────────────────────────────
export const customCommands = pgTable("custom_commands", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  command: text("command").notNull(),
  response: text("response").notNull(),
  isEnabled: boolean("is_enabled").default(true),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Giveaways ────────────────────────────────────────────────────────────────
export const giveaways = pgTable("giveaways", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  prize: text("prize").notNull(),
  maxWinners: integer("max_winners").default(1),
  participants: text("participants").array().default([]),
  winners: text("winners").array().default([]),
  endAt: timestamp("end_at").notNull(),
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Quotes ───────────────────────────────────────────────────────────────────
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  userId: text("user_id").notNull(),
  username: text("username"),
  text: text("text").notNull(),
  savedBy: text("saved_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Feedback ─────────────────────────────────────────────────────────────────
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  userId: text("user_id").notNull(),
  message: text("message").notNull(),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Bank / Investment ────────────────────────────────────────────────────────
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  userId: text("user_id").notNull(),
  savings: integer("savings").default(0),
  investedAmount: integer("invested_amount").default(0),
  investedAt: timestamp("invested_at"),
  loanAmount: integer("loan_amount").default(0),
  loanDueAt: timestamp("loan_due_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```[cite: 1]

export type GroupMember = typeof groupMembers.$inferSelect;
export type GroupSettings = typeof groupSettings.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Warn = typeof warns.$inferSelect;
export type Poll = typeof polls.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type AfkUser = typeof afkUsers.$inferSelect;
export type CustomCommand = typeof customCommands.$inferSelect;
export type Giveaway = typeof giveaways.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type BankAccount = typeof bankAccounts.$inferSelect;
```[cite: 1]
