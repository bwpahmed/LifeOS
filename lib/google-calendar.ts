import "server-only";
import crypto from "node:crypto";

function keyMaterial(){
  const raw=process.env.GOOGLE_CALENDAR_TOKEN_KEY||"";
  if(!raw) throw new Error("GOOGLE_CALENDAR_TOKEN_KEY is not configured");
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(value:string){
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv("aes-256-gcm",keyMaterial(),iv);
  const encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  const tag=cipher.getAuthTag();
  return [iv.toString("base64url"),tag.toString("base64url"),encrypted.toString("base64url")].join(".");
}

export function decryptSecret(value:string){
  const[ivS,tagS,dataS]=value.split(".");
  if(!ivS||!tagS||!dataS)throw new Error("Invalid encrypted token");
  const decipher=crypto.createDecipheriv("aes-256-gcm",keyMaterial(),Buffer.from(ivS,"base64url"));
  decipher.setAuthTag(Buffer.from(tagS,"base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataS,"base64url")),decipher.final()]).toString("utf8");
}

export function googleConfigured(){
  return Boolean(process.env.GOOGLE_CALENDAR_CLIENT_ID&&process.env.GOOGLE_CALENDAR_CLIENT_SECRET&&process.env.GOOGLE_CALENDAR_TOKEN_KEY);
}

export function googleRedirectUri(origin:string){
  return process.env.GOOGLE_CALENDAR_REDIRECT_URI||origin.replace(/\/$/,"")+"/api/integrations/google-calendar/callback";
}

export function signState(payload:Record<string,string>){
  const secret=process.env.GOOGLE_CALENDAR_TOKEN_KEY;
  if(!secret)throw new Error("Google Calendar token key is not configured");
  const body=Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig=crypto.createHmac("sha256",secret).update(body).digest("base64url");
  return body+"."+sig;
}

export function verifyState(token:string){
  const[body,sig]=token.split(".");
  const secret=process.env.GOOGLE_CALENDAR_TOKEN_KEY;
  if(!body||!sig||!secret)throw new Error("Invalid OAuth state");
  const expected=crypto.createHmac("sha256",secret).update(body).digest("base64url");
  if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new Error("Invalid OAuth state");
  return JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as {userId:string;workspaceId:string;next:string};
}


export type GoogleConnectionRow={
  id:string;account_email:string|null;access_token_enc:string|null;refresh_token_enc:string|null;
  token_expires_at:string|null;workspace_id:string;user_id:string
};

export async function validGoogleAccessToken(
  connection:GoogleConnectionRow,
  update:(changes:Record<string,unknown>)=>Promise<void>
){
  if(connection.access_token_enc&&connection.token_expires_at&&new Date(connection.token_expires_at).getTime()>Date.now()+60_000){
    return decryptSecret(connection.access_token_enc);
  }
  if(!connection.refresh_token_enc)throw new Error("Google Calendar refresh token is missing. Reconnect Calendar.");
  const refresh=decryptSecret(connection.refresh_token_enc);
  const response=await fetch("https://oauth2.googleapis.com/token",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({
      client_id:process.env.GOOGLE_CALENDAR_CLIENT_ID||"",
      client_secret:process.env.GOOGLE_CALENDAR_CLIENT_SECRET||"",
      refresh_token:refresh,grant_type:"refresh_token"
    }),cache:"no-store"
  });
  const token=await response.json();
  if(!response.ok||!token.access_token)throw new Error(token.error_description||token.error||"Could not refresh Google Calendar access");
  const expiresAt=new Date(Date.now()+Number(token.expires_in||3600)*1000).toISOString();
  await update({access_token_enc:encryptSecret(token.access_token),token_expires_at:expiresAt,updated_at:new Date().toISOString()});
  return String(token.access_token);
}
