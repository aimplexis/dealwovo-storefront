import type {AssistantOffer} from "./shopping-assistant";
export type DailyPromotion={day:string;validUntil:string;offer:AssistantOffer};
export const utcDay=(now:number)=>new Date(now).toISOString().slice(0,10);
const current=(o:AssistantOffer,now:number)=>{const v=Date.parse(o.verified_at),e=Date.parse(o.expires_at);return Number.isFinite(v)&&Number.isFinite(e)&&v<=now&&e>now&&o.currency==="USD"&&typeof o.price_cents==="number"&&Number.isSafeInteger(o.price_cents)&&o.price_cents>0;};
export function dailyFeature(offers:readonly AssistantOffer[],promotion:DailyPromotion|null,now:number){
 const day=utcDay(now);
 if(promotion&&promotion.day===day&&Date.parse(promotion.validUntil)>now&&current(promotion.offer,now))return {kind:"deal" as const,offer:promotion.offer};
 // Stable daily rotation from the current loaded pool, one offer per product. Not a demand or price ranking.
 const seen=new Set<string>(),pool=offers.filter(o=>current(o,now)).sort((a,b)=>a.product.id.localeCompare(b.product.id)||Date.parse(b.verified_at)-Date.parse(a.verified_at)||a.id.localeCompare(b.id)).filter(o=>{if(seen.has(o.product.id))return false;seen.add(o.product.id);return true;});
 if(!pool.length)return null;
 const index=Math.floor(now/86400000)%pool.length;
 return {kind:"find" as const,offer:pool[index]};
}
