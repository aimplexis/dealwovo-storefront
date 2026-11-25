import type {Evidence} from "./opportunity";
// Research triage only: ratings are reviewed judgments, not measured growth or demand forecasts.
export const researchThemes=[
 {title:"Everyday usefulness",question:"Which repeated household or work tasks could become simpler?"},
 {title:"Clever technology",question:"Which device accessories solve a specific compatibility or convenience problem?"},
 {title:"Comfort and self-care",question:"Which nonmedical routine improvements have credible product evidence?"},
 {title:"Leisure and travel",question:"Which practical accessories fit actual activities and constraints?"},
 {title:"Gifts and life occasions",question:"Which ideas suit birthdays, milestones and shared experiences?"},
 {title:"Seasonal opportunities",question:"Which time-sensitive needs have dated evidence and an appropriate selling window?"}
] as const;
function day(s:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return NaN;const n=Date.parse(s+"T00:00:00Z");return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===s?n:NaN;}
function validSource(s:string){try{const u=new URL(s);return s.length<=2000&&u.protocol==="https:"&&!!u.hostname&&!u.username&&!u.password;}catch{return false;}}
export function trendSignal(rows:readonly Evidence[],today:string){
 const now=day(today);
 const demand=rows.filter(r=>r.dimension==="demand").sort((a,b)=>b.observed_on.localeCompare(a.observed_on)||b.id-a.id)[0];
 if(!demand)return {status:"missing" as const,rating:null,observation:null};
 const age=(now-day(demand.observed_on))/86400000;
 if(!Number.isFinite(age)||age<0||age>30)return {status:"stale_or_invalid" as const,rating:null,observation:demand};
 if(demand.geography.trim().toLowerCase()!=="united states"||!validSource(demand.source_url)||demand.note.trim().length<20||demand.note.length>1200||demand.rating===null||!Number.isInteger(demand.rating)||demand.rating<0||demand.rating>100)return {status:"needs_review" as const,rating:null,observation:demand};
 return {status:"reviewed" as const,rating:demand.rating,observation:demand};
}
export const trendLabels={missing:"No demand evidence",stale_or_invalid:"Refresh dated evidence",needs_review:"Review evidence and US scope",reviewed:"Reviewed demand observation"} as const;
