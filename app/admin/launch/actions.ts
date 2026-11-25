"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "../marketing/visual/access";
import {launchGates,validCandidate} from "../../../src/lib/marketing/launch-readiness";
export async function recordLaunchReview(f:FormData){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const sha=process.env.VERCEL_GIT_COMMIT_SHA??"",gate=String(f.get("gate")??""),status=String(f.get("status")??""),evidence=String(f.get("evidence")??"").trim();
 if(!validCandidate(sha)||String(f.get("candidate")??"")!==sha||!launchGates.some(([k])=>k===gate)||!["hold","reviewed"].includes(status)||evidence.length<12||evidence.length>1200||f.get("confirm")!=="yes")redirect("/admin/launch?notice=invalid");
 const {error}=await a.db.from("release_gate_reviews").insert({candidate_sha:sha,gate_key:gate,status,evidence});
 if(error)redirect("/admin/launch?notice=error");revalidatePath("/admin/launch");redirect("/admin/launch?notice=saved");
}
