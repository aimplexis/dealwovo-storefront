"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createSupabaseServer} from "../../../src/lib/supabase/server";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A deliberate human action to immediately make an approved offer unavailable. */
export async function pauseQualityOfferAction(form:FormData){
 const client=await createSupabaseServer();
 if(!client)redirect("/admin/login?status=setup");
 const {data:{user},error}=await client.auth.getUser();
 if(error||!user)redirect("/admin/login");
 const {data:member,error:memberError}=await client.from("catalog_admins")
  .select("role").eq("user_id",user.id).maybeSingle();
 if(memberError||!member||!["owner","editor"].includes(member.role))
  redirect("/admin/login?status=denied");
 const id=String(form.get("offer_id")??"");
 if(!uuid.test(id)||form.get("confirm")!=="pause")
  redirect("/admin/quality?message=invalid");
 const {data:row,error:updateError}=await client.from("catalog_offers")
  .update({status:"paused",verified_at:null,expires_at:null})
  .eq("id",id).eq("status","approved").select("id").maybeSingle();
 if(updateError||!row){
  console.error("Offer pause failed",updateError?.code??"not_applicable");
  redirect("/admin/quality?message=failed");
 }
 revalidatePath("/admin/quality");
 revalidatePath("/admin");
 revalidatePath("/shop");
 redirect("/admin/quality?message=paused");
}
