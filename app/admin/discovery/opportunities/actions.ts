"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "../../marketing/visual/access";
import {dimensions} from "../../../../src/lib/marketing/opportunity";
import {validExternalHttps} from "../../../../src/lib/catalog/feed-csv";
const base="/admin/discovery/opportunities";
export async function recordEvidence(f:FormData){const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const get=(k:string)=>String(f.get(k)??"").trim(),id=get("id"),dimension=get("dimension"),url=get("url"),date=get("date"),geo=get("geo"),note=get("note"),raw=get("rating");
 if(!/^[0-9a-f-]{36}$/.test(id)||!dimensions.some(([d])=>d===dimension)||!validExternalHttps(url)||url.length>2000||!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>new Date().toISOString().slice(0,10)||geo.length<2||geo.length>100||note.length<20||note.length>1200||(raw!==""&&(!/^\d{1,3}$/.test(raw)||Number(raw)>100))||f.get("confirm")!=="yes")redirect(base+"?notice=invalid");
 const {error}=await a.db.rpc("append_opportunity_evidence",{p_id:id,p_dimension:dimension,p_url:url,p_date:date,p_geo:geo,p_note:note,p_rating:raw===""?null:Number(raw)});
 if(error)redirect(base+"?notice=error");revalidatePath(base);redirect(base+"?notice=saved");}
