import { NextResponse } from "next/server";
import { db } from "@/db";
import { botStats, groupMembers, groupSettings } from "@/db/schema";
import { desc, count, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const recentStats = await db
      .select()
      .from(botStats)
      .orderBy(desc(botStats.date))
      .limit(7);

    const totalUsersResult = await db
      .select({ count: count() })
      .from(groupMembers);

    const uniqueGroupsResult = await db
      .select({ chatId: groupMembers.chatId })
      .from(groupMembers)
      .groupBy(groupMembers.chatId);

    const topMembersResult = await db
      .select()
      .from(groupMembers)
      .orderBy(desc(groupMembers.xpPoints))
      .limit(10);

    const topCoinsResult = await db
      .select()
      .from(groupMembers)
      .orderBy(desc(groupMembers.coins))
      .limit(5);

    return NextResponse.json({
      ok: true,
      data: {
        recentStats,
        totalUsers: totalUsersResult[0]?.count ?? 0,
        totalGroups: uniqueGroupsResult.length,
        topMembers: topMembersResult,
        topCoins: topCoinsResult,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
