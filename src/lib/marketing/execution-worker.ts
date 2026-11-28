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
 const job=await store.claim(id,connection.accountId);
 if(!job)return "not_claimed";
 const finish=async(result:DispatchResult):Promise<WorkerResult>=>{
  try{return await store.finish(job,result)?result.state:"uncertain";}catch{return "uncertain";}
 };
 let current:Campaign|null;
 try{current=await store.revalidate(job);}catch{return finish({state:"failed",code:"review_unavailable_before_dispatch"});}
 if(!current||job.id!==id||job.accountId!==connection.accountId||current.id!==campaign.id||distributionGate(current,connection,enabled,clock()).length)return finish({state:"failed",code:"eligibility_changed_before_dispatch"});
 const key=dispatchKey(current,connection);
 if(!key)return finish({state:"failed",code:"invalid_dispatch_key"});
 let result:DispatchResult;
 try{result=await adapter.publish(current,key);}catch{return finish({state:"uncertain",code:"provider_outcome_unknown"});}
 if(result.state==="published"&&(!result.externalId.trim()||result.externalId.length>256))result={state:"uncertain",code:"invalid_publication_receipt"};
 return finish(result);
}
