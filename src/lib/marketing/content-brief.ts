// Pure workflow shared by the server action and offline regression tests.
export const channels=["instagram","facebook","pinterest","blog"] as const;
export const themes=["holiday deals","gift discovery","everyday essentials","shopping research"] as const;
export type Channel=typeof channels[number];
export type Theme=typeof themes[number];
export type Brief={channel:Channel;theme:Theme;occasion:string};
export type LabState={text:string;status:string};
export function selectOccasion(calendar:unknown):string{
 if(!Array.isArray(calendar))return "Evergreen editorial";
 const events=calendar.filter(e=>e&&typeof e.event_name==="string"&&/^[A-Za-z0-9][A-Za-z0-9 &'().-]{0,99}$/.test(e.event_name)&&Number.isInteger(e.days_until)&&Number.isInteger(e.prep_days)&&e.days_until>=0&&e.days_until<=e.prep_days);
 events.sort((a,b)=>a.days_until-b.days_until||a.event_name.localeCompare(b.event_name));
 return events[0]?.event_name??"Evergreen editorial";
}
export function buildBrief(b:Brief){
 return "Create one private Dealwovo editorial draft in English for "+b.channel+". Theme: "+b.theme+". Calendar context: "+b.occasion+". Use a warm, concise shopping-discovery tone. Include hook, short body, and CTA to dealwovo.com. No specific products, prices, discounts, stock, shipping, rankings, testimonials, urgency, or revenue claims. Do not imply independent research or publish anything. Output plain text only. Human review required.";
}
type LabDependencies={calendar:()=>Promise<unknown>;enabled:()=>boolean;reserve:()=>Promise<boolean>;generate:(b:Brief)=>Promise<string>};
export async function runLabRequest(input:{channel:unknown;theme:unknown;mode:unknown;confirm:unknown},deps:LabDependencies):Promise<LabState>{
 const channel=channels.find(c=>c===input.channel),theme=themes.find(t=>t===input.theme);
 if(!channel||!theme||!["brief","live"].includes(String(input.mode)))return {text:"",status:"Invalid brief or request mode."};
 if(input.mode==="live"&&(!deps.enabled()||input.confirm!=="yes"))return {text:"",status:"Live generation disabled or consent missing."};
 let calendar:unknown=null;
 try{calendar=await deps.calendar();}catch{/* Explicit evergreen fallback; no invented event. */}
 const brief={channel,theme,occasion:selectOccasion(calendar)};
 if(input.mode==="brief")return {text:buildBrief(brief),status:"Brief preview only — no model called."};
 if(input.mode!=="live")return {text:"",status:"Invalid request mode."};
 try{if(!await deps.reserve())return {text:"",status:"Request allowance unavailable or exhausted."};}
 catch{return {text:"",status:"Request allowance unavailable or exhausted."};}
 try{return {text:await deps.generate(brief),status:"Unverified AI draft — private, unsaved; human review required."};}
 catch{return {text:"",status:"Generation failed. Attempt counted; no automatic retry."};}
}
