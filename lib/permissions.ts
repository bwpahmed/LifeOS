// Workspace RBAC (mirrored in RLS): Owner > Admin > Member > Viewer,
// plus per-module grants, e.g. Wife: family/baby/calendar but not private health/self-control/journal.

export type Role = "owner" | "admin" | "member" | "viewer";
export type Module =
  | "tasks" | "money" | "health" | "self_control" | "journal"
  | "family" | "baby" | "calendar" | "europe" | "business";

export const PRIVATE_MODULES: Module[] = ["health", "self_control", "journal"];

export function canWrite(role: Role): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

export function canSeeModule(role: Role, module: Module, grants: Module[] = []): boolean {
  if (role === "owner" || role === "admin") return true;
  if (grants.includes(module)) return true;
  if ((role === "member" || role === "viewer") && (PRIVATE_MODULES as string[]).includes(module)) return false;
  return role === "member";
}
