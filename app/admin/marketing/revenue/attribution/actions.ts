"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "../../visual/access";
import {channels} from "../../../../../src/lib/marketing/attribution";
const base="/admin/marketing/revenue/attribution",uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function recordAttribution(f:FormData){const a=await visualAccess();if(!a.ok)redirect("/admin/login");const get=(k:string)=>String(f.get(k)??"").trim(),ledger=get("ledger"),pack=get("pack"),channel=get("channel"),note=get("note");if(!uuid.test(ledger)||(pack!==""&&!uuid.test(pack))||!channels.some(c=>c===channel)||(pack===""?channel!=="unknown":channel==="unknown")||note.length<25||note.length>1200||f.get("confirm")!=="yes")redirect(base+"?notice=invalid");const {error}=await a.db.rpc("append_commission_attribution",{p_ledger:ledger,p_pack:pack||null,p_channel:channel,p_note:note});if(error)redirect(base+"?notice=error");revalidatePath(base);redirect(base+"?notice=saved");}
