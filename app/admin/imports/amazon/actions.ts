"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {isDepartmentKey} from "../../../../src/lib/catalog/category-suggestions";
import {parseAmazonProduct,amazonTagPattern} from "../../../../src/lib/catalog/amazon-link";
import {visualAccess} from "../../marketing/visual/access";
const base="/admin/imports/amazon",uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,tag=amazonTagPattern;
const value=(f:FormData,k:string)=>String(f.get(k)??"").trim();
const done=(n:string):never=>{revalidatePath(base);redirect(base+"?notice="+n);};
async function owner(){const a=await visualAccess();if(!a.ok)redirect("/admin/login");return a.db;}
export async function saveTag(f:FormData){
 const db=await owner(),id=value(f,"source_id"),amazon_tracking_id=value(f,"tag");
 if(!uuid.test(id)||!tag.test(amazon_tracking_id))return done("invalid");
 const {data,error}=await db.from("catalog_feed_sources").update({amazon_tracking_id}).eq("id",id).eq("provider","amazon").in("status",["draft","authorized"]).select("id").maybeSingle();
 return done(error||!data?"error":"saved");
}
export async function addAmazon(f:FormData){
 const db=await owner(),source_id=value(f,"source_id"),product=value(f,"product"),title=value(f,"title"),description=value(f,"description"),category_key=value(f,"category_key");
 if(!uuid.test(source_id)||!product||product.length>2000||title.length<3||title.length>180||description.length<20||description.length>1500||(category_key&&!isDepartmentKey(category_key))||value(f,"confirm")!=="yes")return done("invalid");
 const {data:s,error:e}=await db.from("catalog_feed_sources").select("amazon_tracking_id").eq("id",source_id).eq("provider","amazon").eq("status","authorized").maybeSingle();
 if(e||!s||!tag.test(s.amazon_tracking_id??""))return done("error");
 const parsed=parseAmazonProduct(product,s.amazon_tracking_id);
 if(!parsed.ok)return done(parsed.reason);
 const {data,error}=await db.from("catalog_amazon_links").insert({source_id,asin:parsed.asin,tracking_id:s.amazon_tracking_id,title,description,category_key:category_key||null}).select("id").single();
 return done(error||!data?(error?.code==="23505"?"duplicate":"error"):"created");
}
export async function reviewAmazon(f:FormData){
 const db=await owner(),id=value(f,"id"),status=value(f,"status");
 if(!uuid.test(id)||!["reviewed","archived"].includes(status)||(status==="reviewed"&&value(f,"confirm")!=="yes"))return done("invalid");
 const {data,error}=await db.from("catalog_amazon_links").update({status}).eq("id",id).in("status",["draft","reviewed"]).select("id").maybeSingle();
 return done(error||!data?"error":status);
}
