"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "../../marketing/visual/access";
import {modes} from "../../../../src/lib/marketing/growth-overseer";
const base="/admin/launch/overseer";
export async function runCycle(){const a=await visualAccess();if(!a.ok)redirect("/admin/login");const {data,error}=await a.db.rpc("run_growth_cycle");if(error)redirect(base+"?notice=error");revalidatePath(base);redirect(base+"?notice="+(data?.state==="paused"?"paused":data?.state==="busy"?"busy":"ran"));}
export async function setMode(f:FormData){const a=await visualAccess();if(!a.ok)redirect("/admin/login");const mode=String(f.get("mode")??"");if(!modes.some(m=>m===mode)||f.get("confirm")!=="yes")redirect(base+"?notice=invalid");const {error}=await a.db.rpc("set_growth_mode",{p_mode:mode});if(error)redirect(base+"?notice=error");revalidatePath(base);redirect(base+"?notice=mode");}
