import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendWebPush, type PushKeys } from "@/lib/push";
import { isInQuietHours } from "@/lib/timezone";
import { escalation } from "@/lib/money";
import { createDailyBackup } from "@/lib/server-backup";

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

async function redeliverSnoozed(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  const now = new Date().toISOString();
  const { data: due } = await admin
    .from("notifications")
    .select("id,title,body,ref_table,ref_id,snoozed_until")
    .eq("user_id", userId)
    .is("read_at", null)
    .not("snoozed_until", "is", null)
    .lte("snoozed_until", now)
    .limit(50);
  if (!due?.length) return 0;

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,keys")
    .eq("user_id", userId);

  let pushed = 0;
  for (const n of due) {
    const url =
      n.ref_table === "tasks" ? "/today"
      : n.ref_table === "receivables" ? "/money"
      : n.ref_table === "family_tasks" ? "/family"
      : n.ref_table === "migration_documents" ? "/europe"
      : n.ref_table === "health_routines" ? "/health-planner"
      : "/notifications";
    for (const sub of subs || []) {
      try {
        const result = await sendWebPush({
          endpoint: sub.endpoint,
          keys: sub.keys as PushKeys,
          payload: { title: n.title, body: n.body, url, tag: `notification-${n.id}` },
        });
        if (result.ok) pushed += 1;
        if (result.status === 404 || result.status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      } catch {}
    }
    await admin.from("notifications").update({ snoozed_until: null }).eq("id", n.id);
  }
  return pushed;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dailyMode =
    url.searchParams.get("mode") === "daily" ||
    request.headers.get("x-vercel-cron-schedule") === "0 5 * * *";
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const { data: memberUsers, error: memberUsersError } = await admin
    .from("workspace_members")
    .select("user_id")
    .limit(5000);
  if (memberUsersError) return NextResponse.json({ error: memberUsersError.message }, { status: 500 });

  const users = Array.from(new Set((memberUsers || []).map((m) => String(m.user_id))));
  let created = 0, pushed = 0, checkedUsers = 0, backups = 0;

  for (const userId of users) {
    checkedUsers += 1;
    pushed += await redeliverSnoozed(admin, userId);
    const [{ data: profile }, { data: preferences }, { data: memberships, error: memberError }, { data: dndBlocks }] = await Promise.all([
      admin.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
      admin.from("notification_preferences").select("quiet_start,quiet_end,allow_critical_in_quiet").eq("user_id", userId).maybeSingle(),
      admin.from("workspace_members").select("workspace_id").eq("user_id", userId),
      admin.from("notification_dnd_blocks").select("label,start_time,end_time,days_of_week,active").eq("user_id",userId).eq("active",true),
    ]);
    if (memberError) continue;
    const tz = profile?.timezone || "Asia/Dubai";
    const local = localParts(tz);
    const hm = `${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`;
    const localDateObj = new Date(local.date + "T12:00:00Z");
    const localDow = ((localDateObj.getUTCDay() + 6) % 7) + 1;
    const baseQuiet = isInQuietHours(hm, preferences?.quiet_start || "22:30", preferences?.quiet_end || "07:00");
    const dndActive = (dndBlocks||[]).some((b:any)=>{const days=Array.isArray(b.days_of_week)?b.days_of_week.map(Number):[1,2,3,4,5,6,7];return days.includes(localDow)&&isInQuietHours(hm,String(b.start_time||"00:00"),String(b.end_time||"00:00"));});
    const quiet = baseQuiet || dndActive;
    const allowCritical = Boolean(preferences?.allow_critical_in_quiet);
    const workspaceIds = (memberships || []).map((m) => m.workspace_id);
    if (!workspaceIds.length) continue;

    const [{ data: tasks }, { data: money }, { data: family }, { data: docs }, { data: healthRoutines }] = await Promise.all([
      admin.from("tasks")
        .select("id,workspace_id,name,area,importance,deadline,reminder_time,status")
        .in("workspace_id", workspaceIds)
        .eq("deadline", local.date)
        .not("status", "in", '("Completed","Cancelled")'),
      admin.from("receivables")
        .select("id,workspace_id,name,next_followup,due_date,promise_date,status")
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
      admin.from("health_routines")
        .select("id,workspace_id,kind,title,details,reminder_times,days_of_week,active,start_date,end_date")
        .in("workspace_id", workspaceIds)
        .eq("active", true),
    ]);

    for (const task of tasks || []) {
      const reminderHour = Number(String(task.reminder_time || "09:00").slice(0, 2));
      const escalationHours = Array.from(new Set([reminderHour, 12, 17]))
        .filter((hour) => hour >= reminderHour)
        .sort((a, b) => a - b);
      if (!dailyMode && !escalationHours.includes(local.hour)) continue;

      const baseSeverity = Number(task.importance || 3) >= 5 ? "critical" : Number(task.importance || 3) >= 4 ? "important" : "normal";
      const severity =
        local.hour >= 17 && baseSeverity === "normal" ? "important"
        : local.hour >= 17 && baseSeverity === "important" ? "critical"
        : baseSeverity;
      if (quiet && !(severity === "critical" && allowCritical)) continue;

      const isFollowup = !dailyMode && local.hour !== reminderHour;
      const r = await deliver(admin, {
        userId,
        workspaceId: task.workspace_id,
        title: isFollowup ? "LifeOS task follow-up" : "LifeOS task reminder",
        body: privateBody(task.area || "", task.name),
        severity,
        refTable: "tasks",
        refId: task.id,
        url: "/today",
        dedupeHours: dailyMode ? 20 : 2,
      });
      created += r.created;
      pushed += r.pushed;
    }

    if (dailyMode || (local.hour >= 9 && local.hour <= 18)) {
      const localDayMs = new Date(local.date + "T12:00:00Z").getTime();
      for (const rec of money || []) {
        const dueMs = rec.due_date ? new Date(rec.due_date + "T12:00:00Z").getTime() : localDayMs;
        const overdueDays = rec.due_date ? Math.max(0, Math.floor((localDayMs - dueMs) / 86400000)) : 0;
        const promiseMissed = Boolean(rec.promise_date && rec.promise_date < local.date);
        const level = escalation({ overdueDays, promiseMissed });
        const severity = level === "Critical" ? "critical" : level === "Normal" ? "normal" : "important";
        if (quiet && !(severity === "critical" && allowCritical)) continue;
        const dedupeHours = level === "Critical" ? 5 : level === "High" ? 10 : 20;
        const r = await deliver(admin, {
          userId,
          workspaceId: rec.workspace_id,
          title: level === "Critical" ? "LifeOS urgent money follow-up" : "LifeOS money follow-up",
          body: "A money follow-up is due.",
          severity,
          refTable: "receivables",
          refId: rec.id,
          url: "/money",
          dedupeHours,
        });
        created += r.created;
        pushed += r.pushed;
      }
    }

    if ((dailyMode || local.hour === 8) && !quiet) {
      for (const item of family || []) {
        const r = await deliver(admin, {
          userId, workspaceId: item.workspace_id, title: "LifeOS family reminder",
          body: item.title, severity: "normal",
          refTable: "family_tasks", refId: item.id, url: "/family", dedupeHours: 20,
        });
        created += r.created; pushed += r.pushed;
      }
    }


    for (const routine of healthRoutines || []) {
      if (routine.start_date && routine.start_date > local.date) continue;
      if (routine.end_date && routine.end_date < local.date) continue;
      const days = Array.isArray(routine.days_of_week) ? routine.days_of_week.map(Number) : [1,2,3,4,5,6,7];
      if (!days.includes(localDow)) continue;
      const times = Array.isArray(routine.reminder_times) ? routine.reminder_times.map(String) : [];
      if (!times.length) continue;
      const dueNow = times.some((t) => Number(t.slice(0,2)) === local.hour);
      if (!dailyMode && !dueNow) continue;
      if (quiet) continue;
      const label =
        routine.kind === "water" ? "Water reminder"
        : routine.kind === "medicine" ? "Medicine reminder"
        : routine.kind === "sleep" ? "Sleep reminder"
        : routine.kind === "meal" ? "Meal reminder"
        : "Health reminder";
      const r = await deliver(admin, {
        userId,
        workspaceId: routine.workspace_id,
        title: `LifeOS ${label.toLowerCase()}`,
        body: "A private health routine needs attention.",
        severity: routine.kind === "medicine" ? "important" : "normal",
        refTable: "health_routines",
        refId: routine.id,
        url: "/health-planner",
        dedupeHours: dailyMode ? 20 : 1,
      });
      created += r.created;
      pushed += r.pushed;
    }

    if (dailyMode || local.hour === 9) {
      const todayMs = new Date(local.date + "T12:00:00Z").getTime();
      for (const doc of docs || []) {
        if (!doc.expiry_date) continue;
        const days = Math.round((new Date(doc.expiry_date + "T12:00:00Z").getTime() - todayMs) / 86400000);
        if (![30, 14, 7, 3, 1, 0].includes(days)) continue;
        const severity = days <= 3 ? "critical" : "important";
        if (quiet && !(severity === "critical" && allowCritical)) continue;
        const r = await deliver(admin, {
          userId, workspaceId: doc.workspace_id, title: "LifeOS document reminder",
          body: `${doc.name} expires in ${days} day${days === 1 ? "" : "s"}.`, severity,
          refTable: "migration_documents", refId: doc.id, url: "/europe", dedupeHours: 20,
        });
        created += r.created; pushed += r.pushed;
      }
    }

    if(dailyMode){for(const workspaceId of workspaceIds){try{await createDailyBackup(admin,userId,String(workspaceId),local.date);backups+=1;}catch{ /* Reminders should still complete if one backup fails. */ }}}
  }

  return NextResponse.json({ ok: true, mode: dailyMode ? "daily" : "hourly", checkedUsers, created, pushed, backups });
}
