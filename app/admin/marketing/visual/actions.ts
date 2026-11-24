"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "./access";
import {validCreative} from "../../../../src/lib/marketing/visual-template";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const done=(n:string):never=>redirect("/admin/marketing/visual?notice="+encodeURIComponent(n));
async function owner(){const a=await visualAccess();if(!a.ok)redirect("/admin/login");return a.db;}
export async function createVisual(form:FormData){
 const db=await owner(),c=validCreative(form.get("theme"),form.get("format"),form.get("palette"));
 if(!c)return done("invalid");
 const {data,error}=await db.from("marketing_visual_assets").insert(c).select("id").single();
 if(error||!data)return done("error");
 revalidatePath("/admin/marketing/visual");return done("created");
}
export async function reviewVisual(form:FormData){
 const db=await owner(),id=String(form.get("id")??""),status=String(form.get("status")??"");
 if(!uuid.test(id)||!["reviewed","archived"].includes(status))return done("invalid");
 if(status==="reviewed"&&form.get("confirm")!=="yes")return done("confirm");
 const {data,error}=await db.from("marketing_visual_assets").update({status}).eq("id",id).in("status",status==="reviewed"?["draft"]:["draft","reviewed"]).select("id").maybeSingle();
 if(error||!data)return done("error");
 revalidatePath("/admin/marketing/visual");return done(status);
}
