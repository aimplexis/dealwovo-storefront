export const dimensions=[["demand",25],["commission",20],["price",15],["seasonality",15],["reliability",10],["conversion",10],["availability",5]] as const;
export type Evidence={id:number;dimension:string;observed_on:string;rating:number|null;source_url:string;note:string;geography:string};
export function scoreEvidence(rows:readonly Evidence[],today:string){
 let coverage=0,weighted=0;const latest:Evidence[]=[];
 for(const [d,w] of dimensions){const e=rows.filter(r=>r.dimension===d&&/^\d{4}-\d{2}-\d{2}$/.test(r.observed_on)&&r.observed_on<=today).sort((a,b)=>b.observed_on.localeCompare(a.observed_on)||b.id-a.id)[0];if(!e)continue;latest.push(e);const days=(Date.parse(today)-Date.parse(e.observed_on))/86400000;if(days<0||days>30||e.rating===null||!Number.isInteger(e.rating)||e.rating<0||e.rating>100)continue;coverage+=w;weighted+=e.rating*w/100;}
 return {coverage,score:coverage===100?Math.round(weighted*100)/100:null,observedPoints:Math.round(weighted*100)/100,latest};
}
export const expenseCategories=["hosting","research","creative","marketing","email","other"] as const;
export function expenseCents(s:string){if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(s))return null;const [w,f=""]=s.split(".");const n=Number(w)*100+Number(f.padEnd(2,"0"));return n>=1&&n<=100000000?n:null;}
