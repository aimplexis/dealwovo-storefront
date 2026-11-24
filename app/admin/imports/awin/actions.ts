"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "../../marketing/visual/access";
import {validExternalHttps} from "../../../../src/lib/catalog/feed-csv";
const base="/admin/imports/awin",id=/^[1-9][0-9]{0,18}$/,uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const value=(f:FormData,k:string)=>String(f.get(k)??"").trim();
const done=(n:string):never=>{revalidatePath(base);revalidatePath("/admin/imports");redirect(base+"?notice="+n);};
export async function registerAwin(f:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const p_name=value(f,"name"),website=value(f,"website"),p_publisher=value(f,"publisher"),p_advertiser=value(f,"advertiser");
 if(p_name.length<3||p_name.length>120||!id.test(p_publisher)||!id.test(p_advertiser)||(website&&(!validExternalHttps(website)||website.length>2000)))return done("invalid");
 const {data,error}=await a.db.rpc("register_awin_partner",{p_name,p_website:website||null,p_publisher,p_advertiser});
 return done(error||!data?(error?.code==="23505"?"duplicate":"error"):"registered");
}
export async function authorizeAwin(f:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const source=value(f,"source_id"),note=value(f,"evidence");
 if(!uuid.test(source)||note.length<25||note.length>1500||value(f,"confirm")!=="yes")return done("invalid");
 const {data:{user},error:authError}=await a.db.auth.getUser();if(authError||!user)redirect("/admin/login");
 const {data,error}=await a.db.from("catalog_feed_sources").update({status:"authorized",authorization_note:note,authorized_by:user.id,authorized_at:new Date().toISOString()}).eq("id",source).eq("provider","awin").eq("status","draft").not("awin_merchant_id","is",null).select("id").maybeSingle();
 return done(error||!data?"error":"authorized");
}
