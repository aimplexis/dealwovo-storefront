export const RECENT_KEY="dealwovo.recent-discovery.v1";
export const MAX_RECENT=12;
export const RECENT_TTL=30*24*60*60*1000;
export type RecentEntry={slug:string;title:string;seenAt:number};
export type RecentState={enabled:boolean;items:RecentEntry[]};
export function readRecent(raw:string|null,now:number):RecentState{
 const off={enabled:false,items:[]};
 if(!raw||raw.length>12000||!Number.isFinite(now))return off;
 try{const v=JSON.parse(raw);if(v?.enabled!==true||!Array.isArray(v.items))return off;
 const seen=new Set<string>();const items:RecentEntry[]=[];
 for(const x of v.items){if(!x||typeof x.slug!=="string"||x.slug.length>150||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug)||typeof x.title!=="string"||!Number.isSafeInteger(x.seenAt)||x.seenAt>now||x.seenAt<=now-RECENT_TTL||seen.has(x.slug))continue;
 const title=x.title.replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,180);if(!title)continue;seen.add(x.slug);items.push({slug:x.slug,title,seenAt:x.seenAt});if(items.length>=MAX_RECENT)break;}
 return {enabled:true,items};
 }catch{return off;}
}
export function recordRecent(state:RecentState,slug:string,title:string,now:number):RecentState{
 if(!state.enabled)return {enabled:false,items:[]};
 return readRecent(JSON.stringify({enabled:true,items:[{slug,title,seenAt:now},...state.items.filter(x=>x.slug!==slug)]}),now);
}
