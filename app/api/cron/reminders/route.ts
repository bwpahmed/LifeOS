import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendWebPush, type PushKeys } from "@/lib/push";

function localParts(tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return { date: `${v.year}-${v.month}-${v.day}`, hour: Number(v.hour), minute: Number(v.minute) };
}

function privateBody(kind: string, title: string) {
  if (kind === "Health" || kind === "Self-control") return "A private LifeOS item needs attention.";
  if (kind === "Money") return "A money follow-up is due.";
  return title;
}

async function alreadySent(admin: ReturnType<typeof supabaseAdmin>, userId: string, table: string, refId: string, hours: number) {
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const { data } = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("ref_table", table)
    .eq("ref_id", refId)
    .gte("created_at", since)
    .limit(1);
  return Boolean(data?.length);
}

async function deliver(admin: ReturnType<typeof supabaseAdmin>, opts: {
  userId: string; workspaceId: string; title: string; body: string; severity: string;
  refTable: string; refId: string; url: string; dedupeHours: number;
}) {
  if (await alreadySent(admin, opts.userId, opts.refTable, opts.refId, opts.dedupeHours)) return { created: 0, pushed: 0 };

  const { error: insertError } = await admin.from("notifications").insert({
    workspace_id: opts.workspaceId,
    user_id: opts.userId,
    title: opts.title,
    body: opts.body,
    severity: opts.severity,
    ref_table: opts.refTable,
    ref_id: opts.refId,
  });
  if (insertError) throw insertError;

  const { data: subs, error: subsError } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,keys")
    .eq("user_id", opts.userId);
  if (subsError) throw subsError;

  let pushed = 0;
  for (const sub of subs || []) {
    try {
      const result = await sendWebPush({
        endpoint: sub.endpoint,
        keys: sub.keys as PushKeys,
        payload: { title: opts.title, body: opts.body, url: opts.url, tag: `${opts.refTable}-${opts.refId}` },
      });
      if (result.ok) pushed += 1;
      if (result.status === 404 || result.status === 410) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
      }
    } catch {
      // Keep the in-app notification even if one push endpoint fails.
    }
  }
  return { created: 1, pushed };
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const { data: subscriptions, error: subError } = await admin
    .from("push_subscriptions")
    .select("user_id")
    .limit(5000);
  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 });

  const users = [...new Set((subscriptions || []).map((s) => s.user_id))];
  let created = 0, pushed = 0, checkedUsers = 0;

  for (const userId of users) {
    checkedUsers += 1;
    const [{ data: profile }, { data: memberships, error: memberError }] = await Promise.all([
      admin.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
      admin.from("workspace_members").select("workspace_id").eq("user_id", userId),
    ]);
    if (memberError) continue;
    const tz = profile?.timezone || "Asia/Dubai";
    const local = localParts(tz);
    const workspaceIds = (memberships || []).map((m) => m.workspace_id);
    if (!workspaceIds.length) continue;

    const [{ data: tasks }, { data: money }, { data: family }, { data: docs }] = await Promise.all([
      admin.from("tasks")
        .select("id,workspace_id,name,area,importance,deadline,reminder_time,status")
        .in("workspace_id", workspaceIds)
        .eq("deadline", local.date)
        .not("status", "in", '("Completed","Cancelled")'),
      admin.from("receivables")
        .select("id,workspace_id,name,next_followup,status")
        .in("workspace_id", workspaceIds)
        .lte("next_followup", local.date)
        .neq("status", "Paid"),
      admin.from("family_tasks")
        .select("id,workspace_id,title,due_date,status")
        .in("workspace_id", workspaceIds)
        .eq("due_date", local.date)
        .neq("status", "Completed"),
      admin.from("migration_documents")
        .select("id,workspace_id,name,expiry_date,status")
        .in("workspace_id", workspaceIds)
        .neq("status", "Ready")
        .gte("expiry_date", local.date),
    ]);

    for (const task of tasks || []) {
      const reminderHour = Number(String(task.reminder_time || "09:00").slice(0, 2));
      if (local.hour !== reminderHour) continue;
      const r = await deliver(admin, {
        userId, workspaceId: task.workspace_id, title: "LifeOS task reminder",
        body: privateBody(task.area || "", task.name), severity: Number(task.importance || 3) >= 5 ? "critical" : Number(task.importance || 3) >= 4 ? "important" : "normal",
        refTable: "tasks", refId: task.id, url: "/today", dedupeHours: 2,
      });
      created += r.created; pushed += r.pushed;
    }

    if (local.hour === 9) {
      for (const rec of money || []) {
        const r = await deliver(admin, {
          userId, workspaceId: rec.workspace_id, title: "LifeOS money follow-up",
          body: "A money follow-up is due.", severity: "important",
          refTable: "receivables", refId: rec.id, url: "/money", dedupeHours: 20,
        });
        created += r.created; pushed += r.pushed;
      }
    }

    if (local.hour === 8) {
      for (const item of family || []) {
        const r = await deliver(admin, {
          userId, workspaceId: item.workspace_id, title: "LifeOS family reminder",
          body: item.title, severity: "normal",
          refTable: "family_tasks", refId: item.id, url: "/family", dedupeHours: 20,
        });
        created += r.created; pushed += r.pushed;
      }
    }

    if (local.hour === 9) {
      const todayMs = new Date(local.date + "T12:00:00Z").getTime();
      for (const doc of docs || []) {
        if (!doc.expiry_date) continue;
        const days = Math.round((new Date(doc.expiry_date + "T12:00:00Z").getTime() - todayMs) / 86400000);
        if (![30, 14, 7, 3, 1, 0].includes(days)) continue;
        const r = await deliver(admin, {
          userId, workspaceId: doc.workspace_id, title: "LifeOS document reminder",
          body: `${doc.name} expires in ${days} day${days === 1 ? "" : "s"}.`, severity: days <= 3 ? "critical" : "important",
          refTable: "migration_documents", refId: doc.id, url: "/europe", dedupeHours: 20,
        });
        created += r.created; pushed += r.pushed;
      }
    }
  }

  return NextResponse.json({ ok: true, checkedUsers, created, pushed });
}
