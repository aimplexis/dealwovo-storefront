"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "../visual/access";
const base="/admin/marketing/newsletter";
export async function prepareNewsletter(){const a=await visualAccess();if(!a.ok)redirect("/admin/login");const {data,error}=await a.db.rpc("prepare_newsletter_owner");if(error)redirect(base+"?notice=error");revalidatePath(base);redirect(base+"?notice="+(data===0?"existing":"generated"));}
export async function reviewNewsletter(f:FormData){const a=await visualAccess();if(!a.ok)redirect("/admin/login");const id=String(f.get("id")??""),status=String(f.get("status")??"");if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!["reviewed","archived"].includes(status)||f.get("confirm")!=="yes")redirect(base+"?notice=error");const {data,error}=await a.db.rpc("review_newsletter_issue",{p_id:id,p_status:status});if(error||data!==true)redirect(base+"?notice=error");revalidatePath(base);redirect(base+"?notice="+status);}
