"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "../../marketing/visual/access";
const base="/admin/deals/daily",uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str=(f:FormData,k:string)=>String(f.get(k)??"").trim();
export async function createDailyDeal(f:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const id=str(f,"offer"),day=str(f,"day"),start=str(f,"start"),end=str(f,"end"),note=str(f,"note");
 if(!uuid.test(id)||!/^\d{4}-\d{2}-\d{2}$/.test(day)||![start,end].every(v=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v))||note.length<30||note.length>1200||f.get("confirm")!=="yes")redirect(base+"?notice=invalid");
 const {error}=await a.db.rpc("create_daily_deal",{p_offer:id,p_day:day,p_start:start+":00Z",p_end:end+":00Z",p_note:note});if(error)redirect(base+"?notice=error");
 revalidatePath("/");revalidatePath("/deals");redirect(base+"?notice=saved");
}
export async function revokeDailyDeal(f:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const id=str(f,"id");if(!uuid.test(id)||f.get("confirm")!=="yes")redirect(base+"?notice=invalid");
 const {data,error}=await a.db.rpc("revoke_daily_deal",{p_id:id});if(error||data!==true)redirect(base+"?notice=error");
 revalidatePath("/");revalidatePath("/deals");redirect(base+"?notice=revoked");
}
