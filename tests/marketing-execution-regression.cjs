const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-execution-"));
async function main(){
 cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--outDir",dir,"src/lib/marketing/execution-worker.ts"],{stdio:"inherit"});
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
 console.log("PASS marketing execution: claim integrity, revocation, no duplicate dispatch, malformed receipts and uncertain outcomes");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>fs.rmSync(dir,{recursive:true,force:true}));
