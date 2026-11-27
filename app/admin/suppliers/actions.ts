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
