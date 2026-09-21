import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groupMembers } from "@/db/schema";
import { eq, desc, like, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const chatId = req.nextUrl.searchParams.get("chatId");
  const search = req.nextUrl.searchParams.get("search");

  try {
    let query = db.select().from(groupMembers).$dynamic();

    if (chatId) {
      query = query.where(eq(groupMembers.chatId, chatId));
    }

    if (search) {
      query = query.where(like(groupMembers.firstName, `%${search}%`));
    }

    const members = await query.orderBy(desc(groupMembers.xpPoints)).limit(50);

    return NextResponse.json({ ok: true, data: members });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
