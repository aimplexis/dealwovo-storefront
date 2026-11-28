import type {Campaign,DispatchResult} from "./distribution";
import type {ClaimedJob,ExecutionStore} from "./execution-worker";
export type ExecutionRpc=(name:string,args:Record<string,string|null>)=>PromiseLike<{data:unknown;error:unknown}>;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const account=/^[A-Za-z0-9_-]{1,128}$/;
function row(data:unknown):Record<string,unknown>|null{
 if(!Array.isArray(data)||data.length>1)throw Error("invalid_execution_response");
 if(!data.length)return null;
 const r=data[0];if(!r||typeof r!=="object"||Array.isArray(r))throw Error("invalid_execution_row");return r;
}
function decode(r:Record<string,unknown>,id:string):ClaimedJob{
 if(r.id!==id||typeof r.plan_id!=="string"||!uuid.test(r.plan_id)||typeof r.claim_token!=="string"||!uuid.test(r.claim_token)||typeof r.account_id!=="string"||!account.test(r.account_id)||r.state!=="dispatching")throw Error("invalid_claim");
 const channel=r.channel;if(channel!=="facebook"&&channel!=="instagram"&&channel!=="pinterest")throw Error("invalid_channel");
 const scheduledAt=r.scheduled_at,expiresAt=r.expires_at;
 if(typeof scheduledAt!=="string"||typeof expiresAt!=="string"||!Number.isFinite(Date.parse(scheduledAt))||!Number.isFinite(Date.parse(expiresAt))||Date.parse(expiresAt)<=Date.parse(scheduledAt))throw Error("invalid_window");
 const campaign:Campaign={id:r.plan_id,channel,scheduledAt,expiresAt,reviewed:true,rightsVerified:r.rights_verified===true,destinationVerified:r.destination_verified===true,disclosureReviewed:r.disclosure_reviewed===true,mediaReady:r.media_ready===true,releaseApproved:typeof r.release_approved_at==="string"&&Number.isFinite(Date.parse(r.release_approved_at))&&typeof r.release_approved_by==="string"&&uuid.test(r.release_approved_by)};
 return {id,token:r.claim_token,accountId:r.account_id,campaign};
}
export function createExecutionStore(rpc:ExecutionRpc):ExecutionStore{
 async function call(name:string,args:Record<string,string|null>){const {data,error}=await rpc(name,args);if(error)throw Error("execution_storage_unavailable");return data;}
 return {
 async claim(id,accountId){if(!uuid.test(id)||!account.test(accountId))throw Error("invalid_claim_input");const r=row(await call("claim_marketing_execution",{p_id:id,p_account:accountId}));if(!r)return null;const j=decode(r,id);if(j.accountId!==accountId)throw Error("account_mismatch");return j;},
 async revalidate(job){if(!uuid.test(job.id)||!uuid.test(job.token))throw Error("invalid_claim_input");const r=row(await call("revalidate_marketing_execution",{p_id:job.id,p_token:job.token}));if(!r)return null;const j=decode(r,job.id);if(j.token!==job.token||j.accountId!==job.accountId||j.campaign.id!==job.campaign.id||j.campaign.channel!==job.campaign.channel)throw Error("claim_mismatch");return j.campaign;},
 async finish(job,result:DispatchResult){if(!uuid.test(job.id)||!uuid.test(job.token))return false;if(!["published","failed","uncertain"].includes(result.state))return false;const external=result.state==="published"?result.externalId:null;if(result.state==="published"&&(typeof external!=="string"||!external.trim()||external.length>256))return false;return (await call("finish_marketing_execution",{p_id:job.id,p_token:job.token,p_state:result.state,p_external_id:external}))===true;}
 };
}
