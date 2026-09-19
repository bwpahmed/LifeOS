import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabaseBrowser } from "./client";

export interface WorkspaceContext {
  user: User;
  workspaceId: string;
  role: string;
  modules: string[];
}

export async function currentWorkspace(
  client: SupabaseClient = supabaseBrowser()
): Promise<WorkspaceContext | null> {
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return null;

  const { data, error } = await client
    .from("workspace_members")
    .select("workspace_id, role, modules")
    .eq("user_id", auth.user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    user: auth.user,
    workspaceId: data.workspace_id as string,
    role: String(data.role || "member"),
    modules: Array.isArray(data.modules) ? data.modules : [],
  };
}
