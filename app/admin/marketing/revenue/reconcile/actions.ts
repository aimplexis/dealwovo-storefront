"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "../../visual/access";
import {parseAwinStatement} from "../../../../../src/lib/affiliate/awin-statement";
const base="/admin/marketing/revenue/reconcile",uid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function reconcileStatement(f:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const source=String(f.get("source")??""),ref=String(f.get("statement_ref")??"").trim(),on=String(f.get("statement_on")??""),file=f.get("file");
 if(!uid.test(source)||f.get("confirm")!=="yes"||!(file instanceof File)||file.size<1||file.size>102400)redirect(base+"?notice=invalid");
 const {data:s,error}=await a.db.from("catalog_feed_sources").select("awin_advertiser_id").eq("id",source).eq("status","authorized").eq("provider","awin").maybeSingle();
 if(error||!s?.awin_advertiser_id)redirect(base+"?notice=invalid");
 let rows:ReturnType<typeof parseAwinStatement>;try{rows=parseAwinStatement(await file.text(),source,ref,on,s.awin_advertiser_id,new Date().toISOString().slice(0,10));}catch{redirect(base+"?notice=invalid");}
 const {data,error:e}=await a.db.rpc("reconcile_awin_statement",{p_source:source,p_ref:ref,p_on:on,p_rows:rows});
 if(e||!data?.run)redirect(base+"?notice=error");
 revalidatePath(base);revalidatePath("/admin/marketing/revenue");redirect(base+"?notice=recorded");
}
