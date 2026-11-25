"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "../../marketing/visual/access";
import {isDepartmentKey} from "../../../../src/lib/catalog/category-suggestions";
export async function publishDepartments(f:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const slugs=f.getAll("department").map(String);
 if(f.get("confirm")!=="yes"||!slugs.length||slugs.length>12||new Set(slugs).size!==slugs.length||!slugs.every(isDepartmentKey))redirect("/admin/launch/departments?notice=invalid");
 const {data,error}=await a.db.rpc("publish_empty_departments",{p_slugs:slugs});
 if(error||data!==slugs.length)redirect("/admin/launch/departments?notice=error");
 revalidatePath("/admin");revalidatePath("/admin/launch");revalidatePath("/shop");revalidatePath("/");
 redirect("/admin/launch/departments?notice=saved");
}
