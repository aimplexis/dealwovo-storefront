"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createSupabaseServer} from "../../../src/lib/supabase/server";
import {parseFeedCSV} from "../../../src/lib/catalog/feed-csv";
import {quickCandidate} from "../../../src/lib/catalog/quick-import";
import {parseAwinCSV} from "../../../src/lib/catalog/awin-feed";

const uid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const input=(f:FormData,n:string)=>String(f.get(n)??"").trim();
const fail=(message:string):never=>redirect("/admin/imports?error="+encodeURIComponent(message.slice(0,120)));
const success=(message:string):never=>{revalidatePath("/admin/imports");redirect("/admin/imports?success="+encodeURIComponent(message))};
async function authorized(){
 const db=await createSupabaseServer();if(!db)redirect("/admin/login?status=setup");
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)redirect("/admin/login");
 const {data:member,error:memberError}=await db.from("catalog_admins").select("role").eq("user_id",user.id).maybeSingle();
 if(memberError||!member||!["owner","editor"].includes(member.role))redirect("/admin/login?status=denied");
 return {db,user,role:member.role as "owner"|"editor"};
}
export async function createFeedSourceAction(data:FormData){
 const {db,user}=await authorized();
 const name=input(data,"name"),provider=input(data,"provider"),partner_ref=input(data,"partner_ref");
 if(name.length<3||name.length>120||partner_ref.length>120||!["manual_csv","awin","impact","cj","amazon","other"].includes(provider))fail("Invalid feed source information");
 const {error}=await db.from("catalog_feed_sources").insert({name,provider,partner_ref:partner_ref||null,status:"draft",created_by:user.id});
 if(error){console.error("Feed source creation failed",error.code);fail("Unable to create source")}
 success("Draft feed source created");
}
export async function authorizeFeedSourceAction(data:FormData){
 const {db,user,role}=await authorized();
 if(role!=="owner")fail("Only an owner can authorize affiliate feed rights");
 const id=input(data,"source_id"),note=input(data,"authorization_note"),confirmed=input(data,"evidence_confirmed")==="yes";
 if(!uid.test(id)||note.length<25||note.length>1500||!confirmed)fail("A documented rights confirmation is required");
 const {data:updated,error}=await db.from("catalog_feed_sources").update({authorization_note:note,status:"authorized",authorized_by:user.id,authorized_at:new Date().toISOString()}).eq("id",id).eq("status","draft").select("id").maybeSingle();
 if(error||!updated){console.error("Source authorization failed",error?.code);fail("Source unavailable or no longer a draft")}
 success("Feed source rights marked reviewed");
}
export async function stageFeedCSVAction(data:FormData){
 const {db}=await authorized();
 const source_id=input(data,"source_id"),attachment=data.get("file");
 if(!uid.test(source_id))return fail("Invalid source ID");
 if(!(attachment instanceof File))return fail("Select a valid CSV file");
 if(attachment.size<1||attachment.size>102400)return fail("Select a CSV file smaller than 100 KB");
 const {data:source,error:sourceError}=await db.from("catalog_feed_sources").select("id,status,provider").eq("id",source_id).maybeSingle();
 if(sourceError||!source||source.status!=="authorized")return fail("Source is not authorized");
 let rows:ReturnType<typeof parseFeedCSV>=[];
 try{const sourceCsv=await attachment.text();rows=source.provider==="awin"?parseAwinCSV(sourceCsv):parseFeedCSV(sourceCsv);}
 catch(e){return fail(e instanceof Error?e.message:"Invalid CSV")}
 const {data:count,error}=await db.rpc("stage_catalog_feed",{p_source_id:source_id,p_rows:rows});
 if(error||count!==rows.length){console.error("Atomic feed staging failed",error?.code);return fail("CSV staging rejected; no partial batch saved");}
 return success(rows.length+" feed candidates staged privately");
}
export async function rejectFeedCandidateAction(data:FormData){
 const {db}=await authorized();const id=input(data,"candidate_id");
 if(!uid.test(id))fail("Invalid candidate");
 const {data:updated,error}=await db.from("catalog_feed_candidates").update({status:"rejected"}).eq("id",id).eq("status","staged").select("id").maybeSingle();
 if(error||!updated){console.error("Candidate rejection failed",error?.code);fail("Candidate unavailable or no longer staged")}
 success("Candidate rejected");
}
export async function convertFeedCandidateAction(data:FormData){
 const {db}=await authorized();
 const candidate_id=input(data,"candidate_id"),category_id=input(data,"category_id"),merchant_id=input(data,"merchant_id"),slug=input(data,"slug");
 if(!uid.test(candidate_id)||!uid.test(category_id)||!uid.test(merchant_id)||!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))||slug.length>130)fail("Select category, merchant and a valid unique slug");
 // Public invoker wrapper calls a restricted private function with explicit admin authorization and atomic writes.
 const {error}=await db.rpc("dealwovo_convert_feed_candidate",{p_candidate_id:candidate_id,p_category_id:category_id,p_merchant_id:merchant_id,p_slug:slug});
 if(error){console.error("Candidate conversion failed",error.code);fail("Conversion failed. Check source authorization, selections, and slug uniqueness")}
 revalidatePath("/admin");
 success("Candidate converted to DRAFT product and DRAFT offer — not published");
}

export async function quickStageProductAction(form:FormData){
 const {db}=await authorized(),source_id=input(form,"source_id");
 const row=quickCandidate(Object.fromEntries(form.entries()));
 if(!uid.test(source_id)||!row)return fail("Enter valid product information and confirm usage rights");
 const {data:source,error}=await db.from("catalog_feed_sources").select("id,status,provider").eq("id",source_id).maybeSingle();
 if(error||!source||source.status!=="authorized")return fail("Source is not authorized");
 // Amazon requires a dedicated direct-link publication path; do not route its products through the generic redirect flow.
 if(source.provider==="amazon")return fail("Amazon product intake is held until direct-link compliance is implemented");
 const h=new URL(row.affiliate_url).hostname.toLowerCase();if(h==="amzn.to"||h==="a.co"||/(^|\.)amazon\.[a-z.]+$/.test(h))return fail("Use the dedicated Amazon workflow when available");
 const {data:count,error:stageError}=await db.rpc("stage_catalog_feed",{p_source_id:source_id,p_rows:[row]});
 if(stageError||count!==1)return fail("Product staging rejected");
 return success("Product staged privately. Review and convert it to a draft below.");
}
