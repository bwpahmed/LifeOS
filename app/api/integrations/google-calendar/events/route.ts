import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { googleConfigured,validGoogleAccessToken,type GoogleConnectionRow } from "@/lib/google-calendar";

export async function GET(request:Request){
  try{
    if(!googleConfigured())return NextResponse.json({configured:false,connected:false,events:[]});
    const sb=await supabaseServer();
    const auth=await sb.auth.getUser();
    if(!auth.data.user)return NextResponse.json({error:"Sign in first."},{status:401});
    const{data,error}=await sb.from("external_connections")
      .select("id,account_email,access_token_enc,refresh_token_enc,token_expires_at,workspace_id,user_id")
      .eq("user_id",auth.data.user.id).eq("provider","google_calendar").maybeSingle();
    if(error)throw error;
    if(!data)return NextResponse.json({configured:true,connected:false,events:[]});
    const connection=data as GoogleConnectionRow;
    const token=await validGoogleAccessToken(connection,async changes=>{
      const q=await sb.from("external_connections").update(changes).eq("id",connection.id);
      if(q.error)throw q.error;
    });
    const url=new URL(request.url);
    const from=url.searchParams.get("from")||new Date().toISOString();
    const to=url.searchParams.get("to")||new Date(Date.now()+30*86400000).toISOString();

    const calRes=await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader&maxResults=20",{
      headers:{Authorization:"Bearer "+token},cache:"no-store"
    });
    const calJson=await calRes.json();
    if(!calRes.ok)throw new Error(calJson.error?.message||"Could not read Google calendars");
    const calendars=(calJson.items||[]).filter((x:any)=>x.primary||x.accessRole==="owner").slice(0,5);

    const groups=await Promise.all(calendars.map(async(cal:any)=>{
      const params=new URLSearchParams({
        timeMin:from,timeMax:to,singleEvents:"true",orderBy:"startTime",maxResults:"100"
      });
      const res=await fetch("https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(cal.id)+"/events?"+params.toString(),{
        headers:{Authorization:"Bearer "+token},cache:"no-store"
      });
      const json=await res.json();
      if(!res.ok)return[];
      return(json.items||[]).filter((e:any)=>e.status!=="cancelled").map((e:any)=>({
        id:"google-"+cal.id+"-"+e.id,
        googleEventId:e.id,calendarId:cal.id,calendarName:cal.summary||cal.id,
        title:e.summary||"(No title)",start:e.start?.dateTime||e.start?.date,
        end:e.end?.dateTime||e.end?.date,allDay:Boolean(e.start?.date&&!e.start?.dateTime),
        url:e.htmlLink||null
      }));
    }));
    return NextResponse.json({configured:true,connected:true,accountEmail:connection.account_email,events:groups.flat()});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:"Google Calendar sync failed"},{status:500});
  }
}
