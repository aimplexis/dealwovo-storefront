"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createSupabaseServer} from "../../../src/lib/supabase/server";
import {getPublicOffers} from "../../../src/lib/catalog/public";
async function owner(){
 const db=await createSupabaseServer();if(!db)redirect("/admin/login?status=setup");
 const {data:{user}}=await db.auth.getUser();if(!user)redirect("/admin/login");
 const {data:member}=await db.from("catalog_admins").select("role").eq("user_id",user.id).maybeSingle();
 if(member?.role!=="owner")redirect("/admin/login?status=denied");
 return {db,user};
}
function done(n:string):never{redirect("/admin/marketing?notice="+encodeURIComponent(n))}
export async function generateMarketingDraftsAction(){
 const {db,user}=await owner();
 const {data:latest,error:historyError}=await db.from("marketing_agent_runs").select("created_at")
 .eq("initiated_by",user.id).eq("source","manual").order("created_at",{ascending:false}).limit(1);
 if(historyError)return done("history-error");
 if(latest?.[0]&&Date.now()-new Date(latest[0].created_at).getTime()<30*60*1000)return done("cooldown");
 const [visible,productResult,sourceResult]=await Promise.all([
  getPublicOffers(100),
  db.from("catalog_products").select("id",{count:"exact",head:true}),
  db.from("catalog_feed_sources").select("id",{count:"exact",head:true}).eq("status","authorized")
 ]);
 if(productResult.error||sourceResult.error)return done("catalog-error");
 const draftList=[
  {channel:"instagram",agent:"content_studio",focus:"brand",campaign_name:"The Good Finds Club",hook:"Your next favorite discovery starts with curiosity.",body:"Meet Dealwovo: thoughtful gifts, clever ideas and everyday inspiration. Our verified retailer catalog is being curated. Discover More. Save Smarter.",cta:"Explore Dealwovo at dealwovo.com.",supporting_evidence:"Live editorial pages, prelaunch verified catalog.",compliance_note:"Never imply a discount, inventory, sales or verified product."},
  {channel:"facebook",agent:"campaign_strategist",focus:"gifts",campaign_name:"Thoughtful Gifting",hook:"The thought really does make the difference.",body:"Finding a thoughtful gift starts by understanding the person. Explore Dealwovo's editorial Gift Finder, with inspiring ideas for friends and family. Product recommendations await independent verification.",cta:"Discover gift inspiration on Dealwovo.",supporting_evidence:"Existing editorial Gift Finder, not real product recommendations.",compliance_note:"No invented products, prices, delivery promises, or third-party endorsements."},
  {channel:"pinterest",agent:"content_studio",focus:"living",campaign_name:"Small Everyday Wonders",hook:"Little upgrades, inspired everyday moments.",body:"Collect imaginative home and everyday living ideas with Dealwovo. Our reviewed retailer catalog is still in preparation.",cta:"Explore everyday inspiration.",supporting_evidence:"Editorial Everyday category; no licensed product feed connected.",compliance_note:"Use licensed images; do not claim stock, savings, or popularity."},
  {channel:"blog",agent:"seo_guardian",focus:"tech",campaign_name:"Tech Without Hype",hook:"How to choose clever tech without the hype",body:"Editorial outline: identify the real problem; evaluate compatibility, warranty and accessibility; cite current sources before ranking products; disclose affiliate arrangements clearly. Requires human research and review.",cta:"Explore the tech edit.",supporting_evidence:"Tech editorial page; no verified external trends or rankings connected.",compliance_note:"No comparative performance claims or product rankings without evidence."}
 ] as const;
 const {data:run,error:runError}=await db.from("marketing_agent_runs").insert({
  initiated_by:user.id,source:"manual",focus:"brand",verified_offer_count:visible.length,
  product_count:productResult.count??0,feed_source_count:sourceResult.count??0,
  draft_count:draftList.length,summary:visible.length?
    "Generated four evidence-controlled editorial drafts. Verified offers were not copied into claims.":
    "Prelaunch: generated four safe editorial drafts, without inventing any available offers."
 }).select("id").single();
 if(runError||!run){console.error("marketing_run_error",runError?.code);return done("run-error")}
 const {error:insertError}=await db.from("marketing_campaign_drafts")
  .insert(draftList.map((draft,i)=>({...draft,run_id:run.id,suggested_day:new Date(Date.now()+i*86400000).toISOString().slice(0,10)})));
 if(insertError){console.error("marketing_draft_error",insertError.code);return done("draft-error")}
 revalidatePath("/admin/marketing");done("generated");
}
export async function reviewMarketingDraftAction(form:FormData){
 const {db,user}=await owner();
 const id=String(form.get("draft_id")??""),status=String(form.get("status")??"");
 if(!/^[a-f0-9-]{36}$/i.test(id)||!["reviewed","archived"].includes(status))return done("invalid");
 const {data,error}=await db.from("marketing_campaign_drafts")
  .update({status,reviewed_by:user.id,reviewed_at:new Date().toISOString()})
  .eq("id",id).eq("status","draft").select("id").maybeSingle();
 if(error||!data){console.error("marketing_review_error",error?.code);return done("review-error")}
 revalidatePath("/admin/marketing");done(status);
}
