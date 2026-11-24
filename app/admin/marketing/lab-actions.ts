"use server";
import {createSupabaseServer} from "../../../src/lib/supabase/server";
import {contentEnabled,generateContent} from "../../../src/lib/marketing/ai-content";
import {runLabRequest,type LabState} from "../../../src/lib/marketing/content-brief";
export type {LabState} from "../../../src/lib/marketing/content-brief";
export async function generateLabContent(_:LabState,form:FormData):Promise<LabState>{
 const db=await createSupabaseServer();if(!db)return {text:"",status:"Sign in required."};
 const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user)return {text:"",status:"Sign in required."};
 const {data:member,error:memberError}=await db.from("catalog_admins").select("role").eq("user_id",user.id).maybeSingle();
 if(memberError||member?.role!=="owner")return {text:"",status:"Owner access required."};
 return runLabRequest({channel:form.get("channel"),theme:form.get("theme"),mode:form.get("mode"),confirm:form.get("confirm")},{
  calendar:async()=>{const {data,error}=await db.rpc("marketing_season_preview");return error?null:data;},
  enabled:contentEnabled,
  reserve:async()=>{const {data,error}=await db.rpc("reserve_marketing_ai_attempt");return !error&&data===true;},
  generate:generateContent
 });
}
