"use server";

import { and, desc, gte, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, events } from "@/lib/db";
import { sendMail } from "@/lib/email/send";
import { adminRecoverMail } from "@/lib/email/templates";
import { todayLt } from "@/lib/format";
import { adminLink, recentEmails } from "@/lib/queries";
import { emailSchema, str } from "@/lib/validation";

const DONE = "Jei šiuo adresu yra sukurtų progų, netrukus gausite laišką su nuorodomis.";

export async function recoverAdmin(fd: FormData) {
  const email = emailSchema.safeParse(str(fd, "email"));
  if (!email.success) redirect(`/recover?${new URLSearchParams({ m: email.error.issues[0].message, t: "err" })}`);
  // Same answer whether or not events exist, so addresses cannot be probed.
  if ((await recentEmails({ recipient: email.data, kind: "recover" })) < 3) {
    const list = await db()
      .select()
      .from(events)
      .where(and(sql`lower(${events.hostEmail}) = ${email.data}`, gte(events.exchangeDate, todayLt())))
      .orderBy(desc(events.createdAt))
      .limit(20);
    if (list.length)
      await sendMail(
        adminRecoverMail(
          list[0],
          email.data,
          list.map((e) => ({ title: e.title, link: adminLink(e.id) })),
        ),
        { kind: "recover" },
      );
  }
  redirect(`/recover?${new URLSearchParams({ m: DONE, t: "ok" })}`);
}
