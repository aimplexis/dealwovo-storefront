"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createSupabaseServer} from "../../src/lib/supabase/server";
import {validExternalHttps as isHttps} from "../../src/lib/catalog/feed-csv";

const knownTables={category:"catalog_categories",merchant:"catalog_merchants",product:"catalog_products",offer:"catalog_offers"} as const;
const states={category:["draft","published"],merchant:["draft","approved","disabled"],product:["draft","published","archived"],offer:["draft","approved","paused"]} as const;
const uid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const input=(f:FormData,key:string)=>String(f.get(key)??"").trim();
const err=()=>redirect("/admin?message=failed");
const ok=()=>{revalidatePath("/admin");revalidatePath("/shop");redirect("/admin?message=saved");};
const slugOK=(s:string)=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
async function requireOwnerOrEditor(){
 const db=await createSupabaseServer();if(!db)redirect("/admin/login?status=setup");
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)redirect("/admin/login");
 const {data:member,error:membershipError}=await db.from("catalog_admins").select("role").eq("user_id",user.id).maybeSingle();
 if(membershipError||!member||!["owner","editor"].includes(member.role))redirect("/admin/login?status=denied");
 return {db,user};
}
export async function signInAction(form:FormData){
 const db=await createSupabaseServer();
 if(!db)redirect("/admin/login?status=setup");
 const email=input(form,"email"),password=String(form.get("password")??"");
 if(!email||!password)redirect("/admin/login?status=invalid");
 const {error}=await db.auth.signInWithPassword({email,password});
 if(error)redirect("/admin/login?status=invalid");
 const {data:{user}}=await db.auth.getUser();
 if(!user){await db.auth.signOut();redirect("/admin/login?status=invalid");}
 const {data:member}=await db.from("catalog_admins").select("role").eq("user_id",user.id).maybeSingle();
 if(!member){await db.auth.signOut();redirect("/admin/login?status=denied")}
 redirect("/admin");
}
export async function signOutAction(){
 const db=await createSupabaseServer();
 if(db)await db.auth.signOut();
 redirect("/admin/login?status=signedout");
}
export async function createCategoryAction(form:FormData){
 const {db}=await requireOwnerOrEditor();
 const name=input(form,"name"),slug=input(form,"slug");
 if(name.length<2||name.length>100||!slugOK(slug))err();
 const {error}=await db.from("catalog_categories").insert({name,slug,status:"draft"});
 if(error){console.error("Category creation failed",error.code);err()}
 ok();
}
export async function createMerchantAction(form:FormData){
 const {db}=await requireOwnerOrEditor();const name=input(form,"name"),website_url=input(form,"website_url");
 if(name.length<2||name.length>130||(website_url&&!isHttps(website_url)))err();
 const {error}=await db.from("catalog_merchants").insert({name,website_url:website_url||null,status:"draft"});
 if(error){console.error("Merchant creation failed",error.code);err()}
 ok();
}
export async function createProductAction(form:FormData){
 const {db}=await requireOwnerOrEditor();const title=input(form,"title"),slug=input(form,"slug"),category_id=input(form,"category_id"),description=input(form,"description"),image_url=input(form,"image_url");
 if(title.length<3||title.length>180||!slugOK(slug)||!uid.test(category_id)||description.length>3000||(image_url&&!isHttps(image_url)))err();
 const {error}=await db.from("catalog_products").insert({title,slug,category_id,description,image_url:image_url||null,status:"draft"});
 if(error){console.error("Product creation failed",error.code);err()}
 ok();
}
export async function updateProductAction(form:FormData){
 const {db}=await requireOwnerOrEditor();const id=input(form,"id"),title=input(form,"title"),description=input(form,"description"),image_url=input(form,"image_url");
 if(!uid.test(id)||title.length<3||title.length>180||description.length>3000||(image_url&&!isHttps(image_url)))err();
 const {error}=await db.from("catalog_products").update({title,description,image_url:image_url||null}).eq("id",id);
 if(error){console.error("Product edit failed",error.code);err()}
 ok();
}
export async function createOfferAction(form:FormData){
 const {db}=await requireOwnerOrEditor();
 const product_id=input(form,"product_id"),merchant_id=input(form,"merchant_id"),affiliate_url=input(form,"affiliate_url"),price=input(form,"price_usd");
 if(!uid.test(product_id)||!uid.test(merchant_id)||!isHttps(affiliate_url)||affiliate_url.length>2000)err();
 let price_cents:number|null=null;
 if(price!==""){if(!/^\d+(?:\.\d{1,2})?$/.test(price))err();price_cents=Math.round(Number(price)*100);if(!Number.isSafeInteger(price_cents))err()}
 const {error}=await db.from("catalog_offers").insert({product_id,merchant_id,affiliate_url,price_cents,currency:"USD",status:"draft"});
 if(error){console.error("Offer creation failed",error.code);err()}
 ok();
}
export async function updateOfferAction(form:FormData){
 const {db}=await requireOwnerOrEditor();const id=input(form,"id"),affiliate_url=input(form,"affiliate_url"),price=input(form,"price_usd");
 if(!uid.test(id)||!isHttps(affiliate_url)||affiliate_url.length>2000)err();
 let price_cents:number|null=null;
 if(price!==""){if(!/^\d+(?:\.\d{1,2})?$/.test(price))err();price_cents=Math.round(Number(price)*100);if(!Number.isSafeInteger(price_cents))err()}
 // Editing a previously approved offer invalidates approval and verification.
 const {error}=await db.from("catalog_offers").update({affiliate_url,price_cents,status:"draft",verified_at:null,expires_at:null}).eq("id",id);
 if(error){console.error("Offer edit failed",error.code);err()}
 ok();
}
export async function changeStatusAction(form:FormData){
 const {db}=await requireOwnerOrEditor();
 const kind=input(form,"kind") as keyof typeof knownTables,id=input(form,"id"),status=input(form,"status");
 if(!uid.test(id)||!Object.hasOwn(knownTables,kind)||!(states[kind] as readonly string[]).includes(status))err();
 const table=knownTables[kind];
 if(kind==="offer"&&status==="approved"){
   // Force a fresh human verification checkpoint before publishing.
   const confirmed=input(form,"verified")==="yes";
   const expiry=input(form,"expires_at");
   const when=new Date(expiry).getTime();
   if(!confirmed||!Number.isFinite(when)||when<Date.now()+300000||when>Date.now()+1000*60*60*24*30)err();
   const {data:offer}=await db.from("catalog_offers").select("affiliate_url,price_cents,merchant_id,product_id").eq("id",id).single();
   if(!offer||!isHttps(offer.affiliate_url))err();
   const {error}=await db.from("catalog_offers").update({status:"approved",verified_at:new Date().toISOString(),expires_at:new Date(when).toISOString()}).eq("id",id);
   if(error){console.error("Offer approval failed",error.code);err()}
 }else{
   const update=kind==="offer"?{status,verified_at:null,expires_at:null}:{status};
   const {error}=await db.from(table).update(update).eq("id",id);
   if(error){console.error("Status update failed",error.code);err()}
 }
 ok();
}
