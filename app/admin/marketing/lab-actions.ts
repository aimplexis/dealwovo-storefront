"use server";
import {createSupabaseServer} from "../../../src/lib/supabase/server";
import {channels,themes,buildBrief,contentEnabled,generateContent,type Channel,type Theme} from "../../../src/lib/marketing/ai-content";
export type LabState={text:string;status:string};
export async function generateLabContent(_:LabState,form:FormData):Promise<LabState>{
 const db=await createSupabaseServer();if(!db)return {text:"",status:"Sign in required."};
 const {data:{user}}=await db.auth.getUser();if(!user)return {text:"",status:"Sign in required."};
 const {data:member}=await db.from("catalog_admins").select("role").eq("user_id",user.id).maybeSingle();
 if(member?.role!=="owner")return {text:"",status:"Owner access required."};
 const channel=String(form.get("channel")) as Channel,theme=String(form.get("theme")) as Theme;
 if(!channels.includes(channel)||!themes.includes(theme))return {text:"",status:"Invalid brief."};
 const {data:calendar,error}=await db.rpc("marketing_season_preview");
 const event=Array.isArray(calendar)?calendar.find(e=>e.days_until<=e.prep_days):null;
 const brief={channel,theme,occasion:!error&&event?String(event.event_name).slice(0,100):"Evergreen editorial"};
 if(form.get("mode")!=="live")return {text:buildBrief(brief),status:"Brief preview only — no model called."};
 if(!contentEnabled()||form.get("confirm")!=="yes")return {text:"",status:"Live generation disabled or consent missing."};
 const {data:allowed,error:reserveError}=await db.rpc("reserve_marketing_ai_attempt");
 if(reserveError||allowed!==true)return {text:"",status:"Request allowance unavailable or exhausted."};
 try{return {text:await generateContent(brief),status:"Unverified AI draft — private, unsaved; human review required."};}catch{return {text:"",status:"Generation failed. Attempt counted; no automatic retry."};}
}
