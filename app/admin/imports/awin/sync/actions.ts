"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "../../../marketing/visual/access";
import {parseAwinCSV} from "../../../../../src/lib/catalog/awin-feed";
const base="/admin/imports/awin/sync",uid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const value=(f:FormData,k:string)=>String(f.get(k)??"").trim();
const done=(n:string,run?:string):never=>{revalidatePath(base);revalidatePath("/admin/imports");revalidatePath("/admin");revalidatePath("/shop");redirect(base+"?notice="+n+(run?"&run="+encodeURIComponent(run):""));};
export async function compareFeed(f:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const source=value(f,"source_id"),file=f.get("file");
 if(!uid.test(source)||value(f,"confirm")!=="yes"||!(file instanceof File)||file.size<1||file.size>102400)return done("invalid");
 const {data:s,error}=await a.db.from("catalog_feed_sources").select("awin_publisher_id,awin_advertiser_id").eq("id",source).eq("status","authorized").eq("provider","awin").maybeSingle();
 if(error||!s?.awin_publisher_id||!s.awin_advertiser_id)return done("error");
 let rows:ReturnType<typeof parseAwinCSV>;
 try{rows=parseAwinCSV(await file.text(),{publisher:s.awin_publisher_id,advertiser:s.awin_advertiser_id});}catch{return done("invalidfeed");}
 const {data:run,error:e}=await a.db.rpc("sync_awin_feed",{p_source_id:source,p_rows:rows});
 return done(e||!run?"error":"compared",run?String(run):undefined);
}
export async function reviewSync(f:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const item=value(f,"item"),run=value(f,"run"),decision=value(f,"decision");
 if(!/^[1-9][0-9]{0,15}$/.test(item)||!/^[1-9][0-9]{0,15}$/.test(run)||!["applied","dismissed"].includes(decision)||(decision==="applied"&&value(f,"confirm")!=="yes"))return done("invalid");
 const {data,error}=await a.db.rpc("review_awin_sync_item",{p_item_id:item,p_decision:decision});
 return done(error||data!==true?"stale":decision,run);
}

/** Independently authorize and validate each bounded batch. */
export async function submitBulkBatch(source:string,csv:string,confirmed:boolean):Promise<{ok:true;run:string}|{ok:false;message:string}>{
 const a=await visualAccess();if(!a.ok)return {ok:false,message:"Sign in again before continuing."};
 if(confirmed!==true||typeof source!=="string"||!uid.test(source)||typeof csv!=="string"||new TextEncoder().encode(csv).length>102400)return {ok:false,message:"Invalid batch or confirmation."};
 const {data:s,error}=await a.db.from("catalog_feed_sources").select("awin_publisher_id,awin_advertiser_id").eq("id",source).eq("status","authorized").eq("provider","awin").not("awin_merchant_id","is",null).maybeSingle();
 if(error||!s?.awin_publisher_id||!s.awin_advertiser_id)return {ok:false,message:"Authorized advertiser unavailable."};
 let rows:ReturnType<typeof parseAwinCSV>;
 try{rows=parseAwinCSV(csv,{publisher:s.awin_publisher_id,advertiser:s.awin_advertiser_id});}catch{return {ok:false,message:"Batch validation failed."};}
 const {data:run,error:e}=await a.db.rpc("sync_awin_feed",{p_source_id:source,p_rows:rows});
 if(e||!run)return {ok:false,message:"Comparison not confirmed. Check recent runs before retrying."};
 revalidatePath(base);revalidatePath("/admin/imports");
 return {ok:true,run:String(run)};
}
