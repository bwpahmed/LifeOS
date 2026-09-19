import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabaseBrowser } from "./client";

export interface WorkspaceContext {
  user: User;
  workspaceId: string;
  role: string;
  modules: string[];
}

const CACHE = "lifeos_workspace_ctx_v1";

function cached(user: User): WorkspaceContext | null {
  try {
    const raw = localStorage.getItem(CACHE);
    if (!raw) return null;
    const x = JSON.parse(raw) as { userId: string; workspaceId: string; role: string; modules: string[] };
    if (x.userId !== user.id || !x.workspaceId) return null;
    return { user, workspaceId: x.workspaceId, role: x.role || "member", modules: x.modules || [] };
  } catch { return null; }
}

export async function currentWorkspace(
  client: SupabaseClient = supabaseBrowser()
): Promise<WorkspaceContext | null> {
  let user: User | null = null;
  try {
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError) throw authError;
    user = auth.user;
  } catch {
    const { data } = await client.auth.getSession();
    user = data.session?.user || null;
    if (user && typeof localStorage !== "undefined") return cached(user);
    return null;
  }

  if (!user) return null;

  try {
    const { data, error } = await client
      .from("workspace_members")
      .select("workspace_id, role, modules")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const ctx = {
      user,
      workspaceId: data.workspace_id as string,
      role: String(data.role || "member"),
      modules: Array.isArray(data.modules) ? data.modules : [],
    };
    try {
      localStorage.setItem(CACHE, JSON.stringify({
        userId: user.id, workspaceId: ctx.workspaceId, role: ctx.role, modules: ctx.modules,
      }));
    } catch {}
    return ctx;
  } catch {
    return typeof localStorage !== "undefined" ? cached(user) : null;
  }
}
