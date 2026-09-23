import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabaseBrowser } from "./client";

export interface WorkspaceContext {
  user: User;
  workspaceId: string;
  role: string;
  modules: string[];
}

export interface WorkspaceOption extends WorkspaceContext {
  name: string;
  type: string;
}

const WORKSPACE_CACHE_MS = 5 * 60 * 1000;
let workspaceCache: { userId: string; ctx: WorkspaceContext; expiresAt: number } | null = null;
const inflightWorkspace = new Map<string, Promise<WorkspaceContext | null>>();

function nowMs() {
  return Date.now();
}

export function clearWorkspaceCache() {
  workspaceCache = null;
  inflightWorkspace.clear();
}

export function peekWorkspaceContext(userId?: string): WorkspaceContext | null {
  if (!workspaceCache || workspaceCache.expiresAt <= nowMs()) {
    workspaceCache = null;
    return null;
  }
  if (userId && workspaceCache.userId !== userId) return null;
  return workspaceCache.ctx;
}

async function sessionUser(client: SupabaseClient): Promise<User | null> {
  try {
    const { data } = await client.auth.getSession();
    if (data.session?.user) return data.session.user;
  } catch {}

  try {
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data.user;
  } catch {
    return null;
  }
}

export async function listWorkspaces(
  client: SupabaseClient = supabaseBrowser()
): Promise<WorkspaceOption[]> {
  const user = await sessionUser(client);
  if (!user) return [];

  const { data: memberships, error } = await client
    .from("workspace_members")
    .select("workspace_id,role,modules")
    .eq("user_id", user.id);
  if (error) throw error;

  const ids = (memberships || []).map((m) => String(m.workspace_id));
  if (!ids.length) return [];

  const { data: spaces, error: spaceError } = await client
    .from("workspaces")
    .select("id,name,type")
    .in("id", ids);
  if (spaceError) throw spaceError;

  const names = new Map(
    (spaces || []).map((w) => [
      String(w.id),
      { name: String(w.name || "LifeOS"), type: String(w.type || "personal") },
    ])
  );

  return (memberships || []).map((m) => ({
    user,
    workspaceId: String(m.workspace_id),
    role: String(m.role || "member"),
    modules: Array.isArray(m.modules) ? m.modules.map(String) : [],
    name: names.get(String(m.workspace_id))?.name || "LifeOS",
    type: names.get(String(m.workspace_id))?.type || "personal",
  }));
}

export async function selectWorkspace(
  workspaceId: string,
  client: SupabaseClient = supabaseBrowser()
) {
  const user = await sessionUser(client);
  if (!user) throw new Error("Sign in first.");

  const { data: existing, error: readError } = await client
    .from("user_settings")
    .select("settings")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) throw readError;

  const settings =
    existing?.settings && typeof existing.settings === "object" && !Array.isArray(existing.settings)
      ? { ...(existing.settings as Record<string, unknown>) }
      : {};

  const { error } = await client.from("user_settings").upsert(
    {
      user_id: user.id,
      settings: { ...settings, selected_workspace_id: workspaceId },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
  clearWorkspaceCache();
}

export async function currentWorkspace(
  client: SupabaseClient = supabaseBrowser()
): Promise<WorkspaceContext | null> {
  const user = await sessionUser(client);
  if (!user) {
    clearWorkspaceCache();
    return null;
  }

  const cached = peekWorkspaceContext(user.id);
  if (cached) return cached;

  const active = inflightWorkspace.get(user.id);
  if (active) return active;

  const pending = (async () => {
    const [members, pref] = await Promise.all([
      client
        .from("workspace_members")
        .select("workspace_id,role,modules")
        .eq("user_id", user.id),
      client
        .from("user_settings")
        .select("settings")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (members.error) throw members.error;
    if (pref.error) throw pref.error;

    const rows = members.data || [];
    if (!rows.length) return null;

    const settings =
      pref.data?.settings &&
      typeof pref.data.settings === "object" &&
      !Array.isArray(pref.data.settings)
        ? (pref.data.settings as Record<string, unknown>)
        : {};

    const selected =
      typeof settings.selected_workspace_id === "string"
        ? settings.selected_workspace_id
        : "";

    const membership =
      rows.find((row) => String(row.workspace_id) === selected) || rows[0];

    const ctx: WorkspaceContext = {
      user,
      workspaceId: String(membership.workspace_id),
      role: String(membership.role || "member"),
      modules: Array.isArray(membership.modules) ? membership.modules.map(String) : [],
    };

    workspaceCache = {
      userId: user.id,
      ctx,
      expiresAt: nowMs() + WORKSPACE_CACHE_MS,
    };

    if (selected !== ctx.workspaceId) {
      const { error } = await client.from("user_settings").upsert(
        {
          user_id: user.id,
          settings: { ...settings, selected_workspace_id: ctx.workspaceId },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;
    }

    return ctx;
  })();

  inflightWorkspace.set(user.id, pending);
  try {
    return await pending;
  } finally {
    inflightWorkspace.delete(user.id);
  }
}
