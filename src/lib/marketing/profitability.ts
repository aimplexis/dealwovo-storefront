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
  const state=g.key==="unknown"?"reconcile":difference<0n?"review_costs":earned===0n?"insufficient":cost===0n?"verify_costs":"evaluate";
  const action={reconcile:"Reconcile unmatched commissions or costs using explicit evidence.",review_costs:"Review documented costs and attribution before further investment.",insufficient:"Collect genuine transaction and cost evidence before ranking.",verify_costs:"Check whether costs are missing; do not assume zero acquisition cost.",evaluate:"Review offer eligibility, comparable cohorts and complete costs before considering expansion."}[state];
  return [{key:g.key,label:g.label,state,action,earnings:g.earnings,expenses:g.expenses,contribution:g.contribution}];
 }).sort((a,b)=>{const order=["reconcile","review_costs","verify_costs","insufficient","evaluate"];return order.indexOf(a.state)-order.indexOf(b.state)||a.key.localeCompare(b.key);});
}
