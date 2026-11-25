"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "../visual/access";
const base="/admin/marketing/products";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function preparePack(f:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const id=String(f.get("offer")??"");if(id!==""&&!uuid.test(id))redirect(base+"?notice=invalid");
 const {data,error}=await a.db.rpc("prepare_product_campaigns",{p_offer:id||null});if(error||typeof data!=="number")redirect(base+"?notice=error");
 revalidatePath(base);redirect(base+"?notice="+(data?"prepared":"none"));
}
export async function reviewPack(f:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const id=String(f.get("id")??""),status=String(f.get("status")??""),note=String(f.get("note")??"").trim();
 if(!uuid.test(id)||!["reviewed","archived"].includes(status)||note.length<25||note.length>1200||f.get("confirm")!=="yes")redirect(base+"?notice=invalid");
 const {data,error}=await a.db.rpc("review_product_campaign",{p_id:id,p_status:status,p_note:note});if(error||data!==true)redirect(base+"?notice=error");
 revalidatePath(base);redirect(base+"?notice="+status);
}
