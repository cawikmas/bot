import { NextResponse } from "next/server";
import { db } from "@/db";
import { botStats, groupMembers, groupSettings } from "@/db/schema";
import { desc, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const recentStats = await db.select().from(botStats).orderBy(desc(botStats.date)).limit(7);
    const totalUsers = await db.select({ count: count() }).from(groupMembers);
    const totalGroups = await db.select({ count: count() }).from(groupSettings);

    const allChatIds = await db.select({ chatId: groupMembers.chatId }).from(groupMembers);
    const uniqueGroups = new Set(allChatIds.map(r => r.chatId)).size;

    return NextResponse.json({
      recentStats,
      totalUsers: totalUsers[0]?.count ?? 0,
      totalGroups: uniqueGroups,
      botVersion: "3.0.0",
      uptime: process.uptime(),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
