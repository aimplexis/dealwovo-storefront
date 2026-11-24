"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "../visual/access";
import {parseCommission} from "../../../../src/lib/marketing/revenue-input";
const base="/admin/marketing/revenue";
export async function recordStatement(form:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const v=parseCommission(Object.fromEntries(form.entries()),new Date().toISOString().slice(0,10));
 if(!v)redirect(base+"?notice=invalid");
 const {data,error}=await a.db.from("marketing_commission_entries").insert(v).select("id").single();
 if(error||!data)redirect(base+"?notice="+(error?.code==="23505"?"duplicate":"error"));
 revalidatePath(base);redirect(base+"?notice=recorded&days=0");
}
