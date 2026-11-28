"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "../marketing/visual/access";
import {supplierIntake} from "../../../src/lib/commerce/supplier-intake";
export async function registerSupplier(form:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const row=supplierIntake(form);if(!row||form.get("confirmed")!=="yes")redirect("/admin/suppliers?message=invalid");
 const {error}=await a.db.from("retail_suppliers").insert(row);
 if(error)redirect("/admin/suppliers?message=failed");
 revalidatePath("/admin/suppliers");redirect("/admin/suppliers?message=saved");
}

import {headers,field,product,supplierCSV,classifySupplierRefresh,type SupplierObservation} from "../../../src/lib/commerce/supplier-products";
export async function importSupplierProducts(form:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const fail=()=>redirect("/admin/suppliers/products?message=invalid");
 if(form.get("confirmed")!=="yes")return fail();
 const id=field(form,"supplier_id"),mode=field(form,"mode");
 let records:ReturnType<typeof product>[];
 try{
  if(mode==="manual")records=[product(headers.map(h=>field(form,h)),id)];
  else if(mode==="csv"){const file=form.get("csv");if(!(file instanceof File)||file.size>102400||file.size===0)return fail();records=supplierCSV(await file.text(),id);}
  else return fail();
 }catch{return fail();}
 const {data:supplier,error:lookupError}=await a.db.from("retail_suppliers").select("id").eq("id",id).maybeSingle();
 if(lookupError||!supplier)return fail();
 // One insert: a duplicate or invalid row rejects the entire batch.
 const {error}=await a.db.from("retail_supplier_products").insert(records);
 if(error)redirect("/admin/suppliers/products?message=failed");
 revalidatePath("/admin/suppliers/products");redirect("/admin/suppliers/products?message=saved");
}

export async function reviewSupplier(form:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const supplier_id=field(form,"supplier_id"),decision=field(form,"decision");
 const keys=["identity_ref","rights_ref","fulfillment_ref","returns_ref","terms_ref","safety_ref"] as const;
 const refs=Object.fromEntries(keys.map(k=>[k,field(form,k)]));
 const asset_light_confirmed=form.get("asset_light")==="yes";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supplier_id)||!["qualified","hold","rejected"].includes(decision)||keys.some(k=>refs[k].length<3||refs[k].length>500)||decision==="qualified"&&!asset_light_confirmed||form.get("review_confirmed")!=="yes")redirect("/admin/suppliers?message=review-invalid");
 const {error}=await a.db.from("retail_supplier_reviews").insert({supplier_id,decision,...refs,asset_light_confirmed});
 if(error)redirect("/admin/suppliers?message=review-failed");
 revalidatePath("/admin/suppliers");redirect("/admin/suppliers?message=review-saved");
}

export async function refreshSupplierProducts(form:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const fail=()=>redirect("/admin/suppliers/products?message=refresh-failed");
 if(form.get("confirmed")!=="yes")return fail();
 const id=field(form,"supplier_id"),file=form.get("csv");
 if(!(file instanceof File)||file.size>102400||file.size===0)return fail();
 let records:ReturnType<typeof product>[];
 try{records=supplierCSV(await file.text(),id);}catch{return fail();}
 if(!records.length)return fail();
 const {data,error}=await a.db.from("retail_supplier_current_products").select("id,supplier_id,sku,observed_at,wholesale_cents,retail_cents,shipping_cents,reported_quantity,source_reference").eq("supplier_id",id).in("sku",records.map(r=>r.sku));
 if(error||!data||data.length!==records.length)return fail();
 const bySku=new Map((data as (SupplierObservation&{id:string})[]).map(p=>[p.sku,p]));
 const updates=[];
 for(const record of records){
  const current=bySku.get(record.sku);if(!current)return fail();
  const incoming={...record,retail_cents:current.retail_cents};
  const decision=classifySupplierRefresh(current,incoming);
  if(decision==="hold")return fail();
  if(decision==="refresh")updates.push({product_id:current.id,observed_at:incoming.observed_at,wholesale_cents:incoming.wholesale_cents,shipping_cents:incoming.shipping_cents,reported_quantity:incoming.reported_quantity,source_reference:incoming.source_reference});
 }
 if(updates.length){const {error:writeError}=await a.db.from("retail_supplier_observations").insert(updates);if(writeError)return fail();}
 revalidatePath("/admin/suppliers/products");redirect("/admin/suppliers/products?message=refreshed");
}
