"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "../visual/access";
const base="/admin/marketing/social";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const done=(n:string):never=>redirect(base+"?notice="+n);
async function owner(){const a=await visualAccess();if(!a.ok)redirect("/admin/login");return a.db;}
export async function createPlan(f:FormData){
 const db=await owner(),draft_id=String(f.get("draft_id")??""),asset_id=String(f.get("asset_id")??""),planned_on=String(f.get("planned_on")??"");
 if(!uuid.test(draft_id)||!uuid.test(asset_id)||!/^\d{4}-\d{2}-\d{2}$/.test(planned_on))return done("invalid");
 const {data,error}=await db.from("marketing_social_plans").insert({draft_id,asset_id,planned_on}).select("id").single();
 if(error||!data)return done("error");
 revalidatePath(base);return done("created");
}
export async function reviewPlan(f:FormData){
 const db=await owner(),id=String(f.get("id")??""),status=String(f.get("status")??"");
 if(!uuid.test(id)||!["prepared","archived"].includes(status))return done("invalid");
 if(status==="prepared"&&f.get("confirm")!=="yes")return done("confirm");
 const {data,error}=await db.from("marketing_social_plans").update({status}).eq("id",id).in("status",status==="prepared"?["planned"]:["planned","prepared"]).select("id").maybeSingle();
 if(error||!data)return done("error");
 revalidatePath(base);return done(status);
}
