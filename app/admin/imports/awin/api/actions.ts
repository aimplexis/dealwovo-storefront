"use server";
import {redirect} from "next/navigation";
import {visualAccess} from "../../../marketing/visual/access";
import {probeAwin} from "../../../../../src/lib/affiliate/awin-api";
export async function testAwinConnection(form:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const source=String(form.get("source_id")??""),base="/admin/imports/awin/api?result=";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(source)||form.get("confirm")!=="yes")redirect(base+"invalid");
 const {data:s,error}=await a.db.from("catalog_feed_sources").select("awin_publisher_id,awin_advertiser_id").eq("id",source).eq("provider","awin").eq("status","authorized").maybeSingle();
 if(error||!s?.awin_publisher_id||!s.awin_advertiser_id)redirect(base+"invalid");
 const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
 const result=await probeAwin({enabled:process.env.AWIN_LIVE_ENABLED==="true",publisher:process.env.AWIN_PUBLISHER_ID??"",token:process.env.AWIN_API_TOKEN??""},s.awin_publisher_id,s.awin_advertiser_id,yesterday);
 redirect(base+result);
}
