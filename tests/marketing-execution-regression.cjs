const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-execution-"));
async function main(){
 cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--outDir",dir,"src/lib/marketing/execution-worker.ts","src/lib/marketing/execution-store.ts"],{stdio:"inherit"});
 const {executeMarketingJob}=require(path.join(dir,"execution-worker.js"));
 const now=Date.parse("2026-11-27T12:00:00Z"),campaign={id:"fixture",channel:"facebook",reviewed:true,rightsVerified:true,destinationVerified:true,disclosureReviewed:true,mediaReady:true,releaseApproved:true,scheduledAt:"2026-11-27T11:00:00Z",expiresAt:"2026-11-27T13:00:00Z"};
 const connection={channel:"facebook",authorized:true,publishScope:true,accountId:"fixture-account",checkedAt:"2026-11-27T11:59:00Z"};
 async function run(opts={}){
  let publishes=0,finishes=[],claims=0,checks=0;
  const job={id:"job",token:"claim",accountId:connection.accountId,campaign,...opts.job};
  const adapter={channel:"facebook",verifyConnection:async()=>{checks++;return checks===2&&opts.revoked?{...connection,authorized:false}:connection;},publish:async()=>{publishes++;if(opts.throwPublish)throw Error("timeout");return opts.receipt===undefined?{state:"published",externalId:"post"}:opts.receipt;},reconcile:async()=>({state:"uncertain",code:"unknown"})};
  const store={claim:async()=>{claims++;if(opts.throwClaim)throw Error("timeout");return opts.noClaim?null:job;},revalidate:async()=>opts.withdrawn?null:campaign,finish:async(j,r)=>{finishes.push(r);return !opts.finishLost;}};
  const result=await executeMarketingJob({id:"job",campaign,enabled:!opts.disabled,adapter,store,clock:()=>now});
  return {result,publishes,finishes,claims,checks};
 }
 let r=await run();assert.equal(r.result,"published");assert.equal(r.publishes,1);assert.equal(r.checks,2);
 for(const [opts,expected] of [[{disabled:true},"held"],[{throwClaim:true},"uncertain"],[{noClaim:true},"not_claimed"],[{job:{id:"wrong"}},"uncertain"],[{job:{token:""}},"uncertain"],[{withdrawn:true},"failed"],[{revoked:true},"failed"]]){r=await run(opts);assert.equal(r.result,expected);assert.equal(r.publishes,0);}
 for(const opts of [{throwPublish:true},{receipt:null},{receipt:{state:"published",externalId:42}},{receipt:{state:"invented"}},{finishLost:true}]){r=await run(opts);assert.equal(r.result,"uncertain");assert.equal(r.publishes,1);}
 const {createExecutionStore}=require(path.join(dir,"execution-store.js"));
 const id="11111111-1111-4111-8111-111111111111",plan="22222222-2222-4222-8222-222222222222",token="33333333-3333-4333-8333-333333333333",owner="44444444-4444-4444-8444-444444444444";
 const record={id,plan_id:plan,claim_token:token,account_id:connection.accountId,state:"dispatching",channel:"facebook",scheduled_at:campaign.scheduledAt,expires_at:campaign.expiresAt,rights_verified:true,destination_verified:true,disclosure_reviewed:true,media_ready:true,release_approved_at:"2026-11-27T10:00:00Z",release_approved_by:owner};
 let response=[record],error=null,calls=[];
 const store=createExecutionStore(async(name,args)=>{calls.push({name,args});return {data:response,error};});
 const claimed=await store.claim(id,connection.accountId);
 assert.equal(claimed.campaign.id,plan);assert.equal(claimed.token,token);
 assert.deepEqual(calls[0],{name:"claim_marketing_execution",args:{p_id:id,p_account:connection.accountId}});
 assert.deepEqual(await store.revalidate(claimed),claimed.campaign);
 response=true;assert.equal(await store.finish(claimed,{state:"published",externalId:"fixture-post"}),true);
 assert.deepEqual(calls.at(-1),{name:"finish_marketing_execution",args:{p_id:id,p_token:token,p_state:"published",p_external_id:"fixture-post"}});
 assert.equal(await store.finish(claimed,{state:"published",externalId:" "}),false);
 response=false;assert.equal(await store.finish(claimed,{state:"uncertain",code:"timeout"}),false);
 response=[];assert.equal(await store.claim(id,connection.accountId),null);assert.equal(await store.revalidate(claimed),null);
 for(const invalid of [null,[record,record],[{...record,account_id:"other"}],[{...record,state:"pending"}],[{...record,expires_at:"invalid"}]]){response=invalid;await assert.rejects(()=>store.claim(id,connection.accountId));}
 response=[{...record,claim_token:owner}];await assert.rejects(()=>store.revalidate(claimed));
 error={code:"fixture"};await assert.rejects(()=>store.claim(id,connection.accountId));error=null;
 // Exercise worker and RPC adapter together. The fixture models atomic claim, not database concurrency proof.
 let taken=false,published=0;
 const integrated=createExecutionStore(async(name,args)=>{
  if(name==="claim_marketing_execution"){if(taken)return {data:[],error:null};taken=true;return {data:[record],error:null};}
  if(name==="revalidate_marketing_execution")return {data:[record],error:null};
  return {data:args.p_token===token,error:null};
 });
 const input={id,campaign:{...campaign,id:plan},enabled:true,adapter:{channel:"facebook",verifyConnection:async()=>connection,publish:async()=>{published++;return {state:"published",externalId:"fixture-post"};},reconcile:async()=>({state:"uncertain",code:"unknown"})},store:integrated,clock:()=>now};
 assert.deepEqual((await Promise.all([executeMarketingJob(input),executeMarketingJob(input)])).sort(),["not_claimed","published"]);assert.equal(published,1);
 console.log("PASS execution storage RPC contract and simulated duplicate claim");
 console.log("PASS marketing execution: claim integrity, revocation, no duplicate dispatch, malformed receipts and uncertain outcomes");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>fs.rmSync(dir,{recursive:true,force:true}));
