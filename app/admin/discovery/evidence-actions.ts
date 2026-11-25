"use server";
import {createSupabaseServer} from "../../../src/lib/supabase/server";
import {discoveryDimensions,evaluateDiscovery,type DiscoveryObservation} from "../../../src/lib/marketing/discovery-value";
import {revalidatePath} from "next/cache";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function access(){
 const db=await createSupabaseServer();if(!db)return null;
 const {data:{user},error}=await db.auth.getUser();if(error||!user)return null;
 const m=await db.from("catalog_admins").select("role").eq("user_id",user.id).maybeSingle();
 return !m.error&&m.data&&["owner","editor"].includes(m.data.role)?db:null;
}
export async function loadDiscoveryEvidence(candidateId:string){
 if(typeof candidateId!=="string"||!uuid.test(candidateId))return {ok:false as const};
 const db=await access();if(!db)return {ok:false as const};
 // Query each dimension independently: no history limit can hide a current observation.
 const latest=await Promise.all(discoveryDimensions.map(async ([dimension])=>db.from("discovery_evidence").select("id,dimension,rating,source_url,observed_on,note,reviewer_id,recorded_at").eq("candidate_id",candidateId).eq("dimension",dimension).order("recorded_at",{ascending:false}).order("id",{ascending:false}).limit(1).maybeSingle()));
 const history=await db.from("discovery_evidence").select("id,dimension,rating,source_url,observed_on,note,reviewer_id,recorded_at").eq("candidate_id",candidateId).order("recorded_at",{ascending:false}).order("id",{ascending:false}).limit(30);
 if(history.error||latest.some(r=>r.error))return {ok:false as const};
 const rows=latest.flatMap(r=>r.data?[{dimension:r.data.dimension,rating:String(r.data.rating),source:r.data.source_url,date:r.data.observed_on,note:r.data.note,reviewed:true} as DiscoveryObservation]:[]);
 return {ok:true as const,rows,history:history.data??[],today:new Date().toISOString().slice(0,10)};
}
export async function appendDiscoveryEvidence(candidateId:string,input:unknown){
 if(typeof candidateId!=="string"||!uuid.test(candidateId)||!input||typeof input!=="object")return {ok:false as const};
 const r=input as Partial<DiscoveryObservation>;
 if(typeof r.dimension!=="string"||!discoveryDimensions.some(([d])=>d===r.dimension)||typeof r.rating!=="string"||typeof r.source!=="string"||typeof r.date!=="string"||typeof r.note!=="string"||r.reviewed!==true)return {ok:false as const};
 const row=r as DiscoveryObservation;
 if(evaluateDiscovery([row],new Date().toISOString().slice(0,10)).results.find(x=>x.dimension===row.dimension)?.rating==null)return {ok:false as const};
 const db=await access();if(!db)return {ok:false as const};
 const {error}=await db.from("discovery_evidence").insert({candidate_id:candidateId,dimension:row.dimension,rating:Number(row.rating),source_url:row.source,observed_on:row.date,note:row.note});
 if(error)return {ok:false as const};
 revalidatePath("/admin/discovery");return {ok:true as const};
}
