export function isPublicPath(path:string){
  return path==="/login" ||
    path.startsWith("/auth/") ||
    path.startsWith("/join") ||
    path.startsWith("/api/") ||
    path==="/offline.html" ||
    path==="/manifest.webmanifest" ||
    path==="/sw.js";
}

export function safeNextPath(raw:string|null|undefined){
  if(!raw)return "/";
  if(!raw.startsWith("/")||raw.startsWith("//")||raw.includes("\\")||/[\r\n]/.test(raw))return "/";
  return raw;
}

export function requestedPath(pathname:string,search:string){
  return safeNextPath(pathname+(search||""));
}
