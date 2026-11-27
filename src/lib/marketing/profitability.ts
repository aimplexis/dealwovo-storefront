import {formatCents} from "./revenue-input";
export function signedCents(s:string){return /^-\d+$/.test(s)?"-"+formatCents(s.slice(1)):formatCents(s);}
export function revisionAmount(s:string){if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(s))return null;const [w,f=""]=s.split(".");const n=Number(w)*100+Number(f.padEnd(2,"0"));return n<=100000000?n:null;}
export function breakEven(orderCents:number,commissionBps:number,conversionBps:number,reversalBps:number,otherCents:number){
 if(!Number.isSafeInteger(orderCents)||orderCents<=0||orderCents>100000000||![commissionBps,conversionBps,reversalBps].every(n=>Number.isInteger(n)&&n>=0&&n<=10000)||!Number.isSafeInteger(otherCents)||otherCents<0||otherCents>100000000)return null;
 const denom=BigInt(1000000000000),expected=BigInt(orderCents)*BigInt(commissionBps)*BigInt(conversionBps)*BigInt(10000-reversalBps),net=expected-BigInt(otherCents)*denom;
 return {expectedCentsFloor:Number(expected/denom),maxAcquisitionCents:net>BigInt(0)?Number(net/denom):0,positive:net>BigInt(0)};
}

export type DecisionGroup={kind:string;key:string;label:string;earnings:string;expenses:string;contribution:string};
/** Advisory only: period totals are not matched cohorts or verified profit. */
export function commercialDecisions(groups:unknown){
 if(!Array.isArray(groups))return [];
 return groups.flatMap((g:DecisionGroup)=>{
  if(!g||g.kind!=="campaign"||typeof g.key!=="string"||typeof g.label!=="string"||typeof g.earnings!=="string"||typeof g.expenses!=="string"||typeof g.contribution!=="string"||![g.earnings,g.expenses].every(v=>/^\d{1,40}$/.test(v))||! /^-?\d{1,41}$/.test(g.contribution))return [];
  const earned=BigInt(g.earnings),cost=BigInt(g.expenses),difference=earned-cost;
  if(difference!==BigInt(g.contribution))return [];
  const state=g.key==="unknown"?"reconcile":difference<BigInt(0)?"review_costs":earned===BigInt(0)?"insufficient":cost===BigInt(0)?"verify_costs":"evaluate";
  const action={reconcile:"Reconcile unmatched commissions or costs using explicit evidence.",review_costs:"Review documented costs and attribution before further investment.",insufficient:"Collect genuine transaction and cost evidence before ranking.",verify_costs:"Check whether costs are missing; do not assume zero acquisition cost.",evaluate:"Review offer eligibility, comparable cohorts and complete costs before considering expansion."}[state];
  return [{key:g.key,label:g.label,state,action,earnings:g.earnings,expenses:g.expenses,contribution:g.contribution}];
 }).sort((a,b)=>{const order=["reconcile","review_costs","verify_costs","insufficient","evaluate"];return order.indexOf(a.state)-order.indexOf(b.state)||a.key.localeCompare(b.key);});
}

/** Read-only owner handoffs. Missing pack coverage is not evidence of expiry. */
export function overseerCommercialActions(groups:unknown,packs:unknown,now:number){
 if(!Array.isArray(groups)||!Array.isArray(packs)||!Number.isFinite(now))return null;
 const decisions=commercialDecisions(groups);
 const output=decisions.map(d=>{
  if(d.key==="unknown")return {...d,priority:1,href:"/admin/marketing/revenue/attribution"};
  const p=packs.find(v=>v&&v.id===d.key);
  if(!p)return {...d,state:"verify_eligibility",priority:2,action:"Campaign is outside the available report or missing. Check current eligibility before further promotion.",href:"/admin/marketing/products"};
  if(p.current!==true||p.status!=="reviewed"||p.review?.status!=="reviewed"||!Number.isFinite(Date.parse(p.expires_at))||Date.parse(p.expires_at)<=now)return {...d,state:"hold_campaign",priority:0,action:"Hold promotion and review current offer and campaign eligibility. Historical revenue does not override eligibility.",href:"/admin/marketing/products"};
  return {...d,priority:d.state==="review_costs"?1:d.state==="verify_costs"?2:d.state==="insufficient"?3:4,href:d.state==="review_costs"||d.state==="verify_costs"?"/admin/marketing/revenue/profitability":"/admin/marketing/products"};
 });
 return output.sort((a,b)=>a.priority-b.priority||a.key.localeCompare(b.key));
}
