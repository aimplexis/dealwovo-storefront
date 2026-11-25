"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "../../visual/access";
import {channels} from "../../../../../src/lib/marketing/attribution";
import {revisionAmount} from "../../../../../src/lib/marketing/profitability";
const base="/admin/marketing/revenue/profitability",uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function reviseExpense(f:FormData){const a=await visualAccess();if(!a.ok)redirect("/admin/login");const g=(k:string)=>String(f.get(k)??"").trim(),id=g("expense"),expected=g("expected"),pack=g("pack"),channel=g("channel"),note=g("note"),cents=revisionAmount(g("amount"));if(!/^[1-9]\d{0,17}$/.test(id)||!/^(0|[1-9]\d{0,17})$/.test(expected)||cents===null||(pack!==""&&!uuid.test(pack))||!channels.some(x=>x===channel)||(pack!==""&&channel==="unknown")||(cents===0&&(pack!==""||channel!=="unknown"))||note.length<25||note.length>1200||f.get("confirm")!=="yes")redirect(base+"?notice=invalid");
 const {error}=await a.db.rpc("revise_commerce_expense",{p_expense:id,p_expected:expected,p_cents:cents,p_pack:pack||null,p_channel:channel,p_note:note});if(error)redirect(base+"?notice=error");revalidatePath(base);redirect(base+"?notice=saved");}
