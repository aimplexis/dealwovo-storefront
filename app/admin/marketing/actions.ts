"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createSupabaseServer} from "../../../src/lib/supabase/server";
async function owner(){
 const db=await createSupabaseServer();if(!db)redirect("/admin/login?status=setup");
 const {data:{user}}=await db.auth.getUser();if(!user)redirect("/admin/login");
 const {data:member}=await db.from("catalog_admins").select("role").eq("user_id",user.id).maybeSingle();
 if(member?.role!=="owner")redirect("/admin/login?status=denied");
 return {db,user};
}
function done(n:string):never{redirect("/admin/marketing?notice="+encodeURIComponent(n))}
export async function generateMarketingDraftsAction(){
 const {db}=await owner();
 const {data,error}=await db.rpc("generate_marketing_drafts_atomic");
 if(error){console.error("marketing_generation_error",error.code);return done("run-error")}
 if(data===0)return done("cooldown");
 if(data!==4)return done("run-error");
 revalidatePath("/admin/marketing");done("generated");
}
export async function reviewMarketingDraftAction(form:FormData){
 const {db,user}=await owner();
 const id=String(form.get("draft_id")??""),status=String(form.get("status")??"");
 if(!/^[a-f0-9-]{36}$/i.test(id)||!["reviewed","archived"].includes(status))return done("invalid");
 const {data,error}=await db.from("marketing_campaign_drafts")
  .update({status,reviewed_by:user.id,reviewed_at:new Date().toISOString()})
  .eq("id",id).eq("status","draft").select("id").maybeSingle();
 if(error||!data){console.error("marketing_review_error",error?.code);return done("review-error")}
 revalidatePath("/admin/marketing");done(status);
}
