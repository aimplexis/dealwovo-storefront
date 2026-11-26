import {validExternalHttps} from "./feed-csv";
export const qualityChecks=[
 ["identity","Exact product and variant",30,"Confirm the brand, model, size and relevant variant identifiers."],
 ["safety","Safety and recalls",7,"Review applicable recall notices, warnings and manufacturer guidance."],
 ["imagery","Image usage rights",30,"Document permission for the exact image and intended channel."],
 ["retailer","Retailer and source rights",7,"Confirm retailer identity and recorded affiliate authorization."],
 ["price","Price accuracy",1,"Check the exact variant price, currency and seller terms."],
 ["freshness","Offer availability and freshness",1,"Check the current offer and its verification expiry."],
 ["claims","Editorial claim accuracy",7,"Substantiate promotional claims, limitations and disclosures."],
 ["approval","Independent human review",1,"Record a human review of the current product and content version."]
] as const;
export type QualityCheck=typeof qualityChecks[number][0];
export type QualityObservation={check:QualityCheck;decision:"clear"|"concern"|"unknown";source:string;date:string;note:string;confirmed:boolean};
function day(s:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return NaN;const n=Date.parse(s+"T00:00:00Z");return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===s?n:NaN;}
export function assessProductQuality(rows:readonly QualityObservation[],today:string){
 const now=day(today);
 const results=qualityChecks.map(([check,label,maxAge,instruction])=>{
  const matches=rows.filter(r=>r.check===check),r=matches.length===1?matches[0]:undefined;
  const age=r?(now-day(r.date))/86400000:NaN;
  // Any reported concern blocks review, including stale or incomplete concerns.
  const concern=matches.some(x=>x.decision==="concern");
  const clear=!!r&&r.decision==="clear"&&r.confirmed===true&&r.source.length<=2000&&validExternalHttps(r.source)&&r.note.trim().length>=20&&r.note.length<=1200&&Number.isFinite(age)&&age>=0&&age<=maxAge;
  return {check,label,maxAge,instruction,status:concern?"concern" as const:clear?"documented" as const:"unknown" as const};
 });
 const concerns=results.filter(r=>r.status==="concern").length,documented=results.filter(r=>r.status==="documented").length;
 return {results,concerns,documented,status:concerns?"hold" as const:documented===qualityChecks.length?"ready_for_independent_verification" as const:"incomplete" as const};
}
