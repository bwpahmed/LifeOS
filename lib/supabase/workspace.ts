import type { SupabaseClient } from "@supabase/supabase-js";

export async function currentWorkspaceId(sb: SupabaseClient): Promise<string> {
  const { data: auth, error: authError } = await sb.auth.getUser();
  if (authError || !auth.user) throw new Error("Please sign in first.");
  const { data, error } = await sb.from("workspace_members").select("workspace_id").eq("user_id", auth.user.id).limit(1).maybeSingle();
  if (error) throw error;
  if (!data?.workspace_id) throw new Error("No LifeOS workspace is linked to this account.");
  return data.workspace_id;
}
