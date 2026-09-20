import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { sendPushNotification } from "npm:@mmmike/web-push@1.0.1/send";

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  severity: string | null;
  ref_table: string | null;
  push_attempts: number | null;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  keys: { p256dh?: string; auth?: string } | null;
};

function targetUrl(refTable: string | null) {
  if (refTable === "tasks") return "/tasks";
  if (refTable === "receivables") return "/money";
  if (refTable === "family_tasks") return "/family";
  if (refTable === "migration_documents") return "/europe";
  if (refTable === "health_routines") return "/health-planner";
  return "/notifications";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    return Response.json({ error: "Supabase runtime credentials are unavailable" }, { status: 500 });
  }

  const sb = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const cfgQ = await sb.rpc("lifeos_vapid_config");
  if (cfgQ.error) return Response.json({ error: cfgQ.error.message }, { status: 500 });
  const cfg = Array.isArray(cfgQ.data) ? cfgQ.data[0] : cfgQ.data;
  if (!cfg?.public_key || !cfg?.private_key || !cfg?.subject) {
    return Response.json({ error: "VAPID config is missing" }, { status: 503 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const notificationsQ = await sb
    .from("notifications")
    .select("id,user_id,title,body,severity,ref_table,push_attempts")
    .is("push_sent_at", null)
    .is("read_at", null)
    .gte("created_at", cutoff)
    .lt("push_attempts", 12)
    .or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`)
    .order("created_at", { ascending: true })
    .limit(50);

  if (notificationsQ.error) {
    return Response.json({ error: notificationsQ.error.message }, { status: 500 });
  }

  const notifications = (notificationsQ.data || []) as NotificationRow[];
  if (!notifications.length) {
    return Response.json({ ok: true, considered: 0, pushed: 0, staleRemoved: 0 });
  }

  const userIds = Array.from(new Set(notifications.map((n) => n.user_id)));
  const subscriptionsQ = await sb
    .from("push_subscriptions")
    .select("id,user_id,endpoint,keys")
    .in("user_id", userIds);

  if (subscriptionsQ.error) {
    return Response.json({ error: subscriptionsQ.error.message }, { status: 500 });
  }

  const byUser = new Map<string, SubscriptionRow[]>();
  for (const sub of (subscriptionsQ.data || []) as SubscriptionRow[]) {
    const list = byUser.get(sub.user_id) || [];
    list.push(sub);
    byUser.set(sub.user_id, list);
  }

  let pushed = 0;
  let staleRemoved = 0;
  const errors: string[] = [];

  for (const n of notifications) {
    const subs = byUser.get(n.user_id) || [];
    let sentAny = false;
    const notificationErrors: string[] = [];

    for (const sub of subs) {
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) continue;
      try {
        const valid = await sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          {
            title: n.title || "LifeOS",
            body: n.body || "A LifeOS item needs attention.",
            icon: "/icons/icon.svg",
            badge: "/icons/icon.svg",
            tag: "lifeos-" + n.id,
            data: { url: targetUrl(n.ref_table) },
            requireInteraction: String(n.severity || "").toLowerCase() === "critical",
          },
          {
            publicKey: cfg.public_key,
            privateKey: cfg.private_key,
            subject: cfg.subject,
          },
          { ttl: 86400 },
        );

        if (valid) {
          sentAny = true;
        } else {
          const del = await sb.from("push_subscriptions").delete().eq("id", sub.id);
          if (!del.error) staleRemoved += 1;
        }
      } catch (err) {
        notificationErrors.push(err instanceof Error ? err.message : String(err));
      }
    }

    const attempts = Number(n.push_attempts || 0) + 1;
    const update = await sb.from("notifications").update({
      push_attempted_at: nowIso,
      push_attempts: attempts,
      push_sent_at: sentAny ? nowIso : null,
      push_error: sentAny ? null : (notificationErrors[0] || (subs.length ? "No valid push subscription" : "No enabled device subscription")),
    }).eq("id", n.id);

    if (update.error) errors.push(n.id + ": " + update.error.message);
    if (sentAny) pushed += 1;
    else if (notificationErrors.length) errors.push(n.id + ": " + notificationErrors[0]);
  }

  return Response.json({
    ok: errors.length === 0,
    considered: notifications.length,
    pushed,
    staleRemoved,
    errors: errors.slice(0, 10),
  }, { status: errors.length ? 207 : 200 });
});
