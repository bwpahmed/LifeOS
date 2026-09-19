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

const CACHE = "lifeos_workspace_ctx_v1";
const SELECTED = "lifeos_selected_workspace_v1";

function cached(user: User): WorkspaceContext | null {
  try {
    const raw = localStorage.getItem(CACHE);
    if (!raw) return null;
    const x = JSON.parse(raw) as { userId: string; workspaceId: string; role: string; modules: string[] };
    if (x.userId !== user.id || !x.workspaceId) return null;
    return { user, workspaceId: x.workspaceId, role: x.role || "member", modules: x.modules || [] };
  } catch { return null; }
}

async function sessionUser(client: SupabaseClient): Promise<User | null> {
  try {
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data.user;
  } catch {
    const { data } = await client.auth.getSession();
    return data.session?.user || null;
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
  const names = new Map((spaces || []).map((w) => [String(w.id), { name: String(w.name || "LifeOS"), type: String(w.type || "personal") }]));
  return (memberships || []).map((m) => ({
    user,
    workspaceId: String(m.workspace_id),
    role: String(m.role || "member"),
    modules: Array.isArray(m.modules) ? m.modules.map(String) : [],
    name: names.get(String(m.workspace_id))?.name || "LifeOS",
    type: names.get(String(m.workspace_id))?.type || "personal",
  }));
}

export function selectWorkspace(workspaceId: string) {
  try {
    localStorage.setItem(SELECTED, workspaceId);
    localStorage.removeItem(CACHE);
  } catch {}
}

export async function currentWorkspace(
  client: SupabaseClient = supabaseBrowser()
): Promise<WorkspaceContext | null> {
  const user = await sessionUser(client);
  if (!user) return null;

  try {
    const options = await listWorkspaces(client);
    if (!options.length) return null;
    let selected = "";
    try { selected = localStorage.getItem(SELECTED) || ""; } catch {}
    const ctx = options.find((x) => x.workspaceId === selected) || options[0];
    try {
      localStorage.setItem(SELECTED, ctx.workspaceId);
      localStorage.setItem(CACHE, JSON.stringify({
        userId: user.id, workspaceId: ctx.workspaceId, role: ctx.role, modules: ctx.modules,
      }));
    } catch {}
    return { user, workspaceId: ctx.workspaceId, role: ctx.role, modules: ctx.modules };
  } catch {
    return typeof localStorage !== "undefined" ? cached(user) : null;
  }
}
