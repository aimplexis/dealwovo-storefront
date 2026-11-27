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

import {headers,field,product,supplierCSV} from "../../../src/lib/commerce/supplier-products";
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
