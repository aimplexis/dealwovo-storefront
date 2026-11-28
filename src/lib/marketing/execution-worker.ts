import {distributionGate,dispatchKey,type Campaign,type Connection,type DispatchResult,type DistributionAdapter} from "./distribution";
export type ClaimedJob={id:string;token:string;accountId:string;campaign:Campaign};
// Store implementation must atomically claim, revalidate current approvals and compare claim token on completion.
export interface ExecutionStore {
 claim(id:string,accountId:string):Promise<ClaimedJob|null>;
 revalidate(job:ClaimedJob):Promise<Campaign|null>;
 finish(job:ClaimedJob,result:DispatchResult):Promise<boolean>;
}
export type WorkerResult="held"|"not_claimed"|"published"|"failed"|"uncertain";
export async function executeMarketingJob(input:{id:string;campaign:Campaign;enabled:boolean;adapter:DistributionAdapter;store:ExecutionStore;clock:()=>number}):Promise<WorkerResult>{
 const {id,campaign,enabled,adapter,store,clock}=input;
 if(!enabled||adapter.channel!==campaign.channel)return "held";
 let connection:Connection;
 try{connection=await adapter.verifyConnection();}catch{return "held";}
 if(distributionGate(campaign,connection,enabled,clock()).length||!dispatchKey(campaign,connection))return "held";
 let job:ClaimedJob|null;
 try{job=await store.claim(id,connection.accountId);}catch{return "uncertain";}
 if(!job)return "not_claimed";
 if(job.id!==id||job.accountId!==connection.accountId||!job.token||job.campaign.id!==campaign.id||job.campaign.channel!==campaign.channel)return "uncertain";
 const finish=async(result:DispatchResult):Promise<WorkerResult>=>{
  try{return await store.finish(job,result)?result.state:"uncertain";}catch{return "uncertain";}
 };
 let current:Campaign|null;
 try{current=await store.revalidate(job);}catch{return finish({state:"failed",code:"review_unavailable_before_dispatch"});}
 if(!current||current.id!==campaign.id||current.channel!==adapter.channel||distributionGate(current,connection,enabled,clock()).length)return finish({state:"failed",code:"eligibility_changed_before_dispatch"});
 const key=dispatchKey(current,connection);
 if(!key)return finish({state:"failed",code:"invalid_dispatch_key"});
 let fresh:Connection;
 try{fresh=await adapter.verifyConnection();}catch{return finish({state:"failed",code:"connection_unavailable_before_dispatch"});}
 if(fresh.accountId!==job.accountId||distributionGate(current,fresh,enabled,clock()).length)return finish({state:"failed",code:"connection_changed_before_dispatch"});
 let result:DispatchResult;
 try{result=await adapter.publish(current,key);}catch{return finish({state:"uncertain",code:"provider_outcome_unknown"});}
 if(!result||!["published","failed","uncertain"].includes(result.state))result={state:"uncertain",code:"invalid_provider_result"};
 else if(result.state==="published"&&(typeof result.externalId!=="string"||!result.externalId.trim()||result.externalId.length>256))result={state:"uncertain",code:"invalid_publication_receipt"};
 else if(result.state!=="published")result={state:result.state,code:"provider_reported_"+result.state};
 return finish(result);
}
