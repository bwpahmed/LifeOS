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
}

export async function currentWorkspace(
  client: SupabaseClient = supabaseBrowser()
): Promise<WorkspaceContext | null> {
  const user = await sessionUser(client);
  if (!user) return null;

  const options = await listWorkspaces(client);
  if (!options.length) return null;

  const { data: pref, error: prefError } = await client
    .from("user_settings")
    .select("settings")
    .eq("user_id", user.id)
    .maybeSingle();
  if (prefError) throw prefError;

  const settings =
    pref?.settings && typeof pref.settings === "object" && !Array.isArray(pref.settings)
      ? (pref.settings as Record<string, unknown>)
      : {};
  const selected = typeof settings.selected_workspace_id === "string"
    ? settings.selected_workspace_id
    : "";

  const ctx = options.find((x) => x.workspaceId === selected) || options[0];

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

  return {
    user,
    workspaceId: ctx.workspaceId,
    role: ctx.role,
    modules: ctx.modules,
  };
}
