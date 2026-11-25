// Human-reviewed discovery value is separate from commercial readiness and publication.
export const discoveryDimensions=[
 ["usefulness","Everyday usefulness",25],
 ["quality","Quality and reliability evidence",20],
 ["relevance","Customer interest and relevance",15],
 ["value","Price-to-value relationship",15],
 ["distinctiveness","Distinctiveness and discovery appeal",10],
 ["retailer","Retailer and availability evidence",10],
 ["year_round","Year-round relevance",5]
] as const;
export type DiscoveryDimension=typeof discoveryDimensions[number][0];
export type DiscoveryObservation={dimension:DiscoveryDimension;rating:string;source:string;date:string;note:string;reviewed:boolean};
function day(s:string):number|null{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
 const t=Date.parse(s+"T00:00:00Z");return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===s?t:null;
}
function sourceValid(s:string){try{const u=new URL(s);return s.length<=2000&&u.protocol==="https:"&&!!u.hostname&&!u.username&&!u.password;}catch{return false;}}
export function evaluateDiscovery(rows:readonly DiscoveryObservation[],today:string){
 const now=day(today);let coverage=0,points=0;
 const results=discoveryDimensions.map(([dimension,label,weight])=>{
  const matches=rows.filter(r=>r.dimension===dimension);const r=matches.length===1?matches[0]:undefined;
  const observed=r?day(r.date):null;
  const valid=!!r&&r.reviewed===true&&now!==null&&observed!==null&&observed<=now&&now-observed<=30*86400000&&sourceValid(r.source)&&r.note.trim().length>=20&&r.note.length<=1200&&/^\d{1,3}$/.test(r.rating)&&Number(r.rating)<=100;
  const rating=valid?Number(r!.rating):null;
  if(rating!==null){coverage+=weight;points+=rating*weight;}
  return {dimension,label,weight,rating};
 });
 return {coverage,score:coverage===100?points/100:null,results};
}
