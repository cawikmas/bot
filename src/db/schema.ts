import { pgTable, serial, bigint, text, timestamp, boolean, varchar } from "drizzle-orm/pg-core";

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

export const botLogs = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }).notNull(),
  userId: bigint("user_id", { mode: "number" }),
  command: varchar("command", { length: 100 }).notNull(),
  result: text("result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
