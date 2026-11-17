import { lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, emailLog, events } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Daily (Vercel Cron): delete events 30 days after their date, and old logs. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const deleted = await db()
    .delete(events)
    .where(lt(events.exchangeDate, sql`(now() at time zone 'Europe/Vilnius')::date - 30`))
    .returning({ id: events.id });
  await db().delete(emailLog).where(lt(emailLog.createdAt, sql`now() - interval '60 days'`));
  return NextResponse.json({ deletedEvents: deleted.length });
}
