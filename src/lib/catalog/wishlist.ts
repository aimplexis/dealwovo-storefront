export const MAX_SAVED=40;
export const WISHLIST_KEY="dealwovo.saved-products.v1";
export type SavedProduct={id:string;title:string;targetCents?:number};
export type WishlistOffer={id:string;price_cents:number|null;currency:string;verified_at:string;expires_at:string;merchant:{name:string}};
export type WishlistProduct={id:string;slug:string;title:string;image_url:string|null;category:{name:string};offers:WishlistOffer[]};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validSavedIds(input:unknown):input is string[]{return Array.isArray(input)&&input.length<=MAX_SAVED&&input.every(v=>typeof v==="string"&&uuid.test(v)&&v===v.toLowerCase())&&new Set(input).size===input.length;}
export function savedEntry(input:unknown):SavedProduct|null{
 if(!input||typeof input!=="object")return null;
 const v=input as Record<string,unknown>;
 if(typeof v.id!=="string"||!uuid.test(v.id)||typeof v.title!=="string")return null;
 const title=v.title.replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,180);
 const target=typeof v.targetCents==="number"&&Number.isSafeInteger(v.targetCents)&&v.targetCents>0&&v.targetCents<=100000000?v.targetCents:undefined;
 return title?{id:v.id.toLowerCase(),title,...(target!==undefined?{targetCents:target}:{})}:null;
}
export function readSaved(raw:string|null):SavedProduct[]{
 if(!raw||raw.length>50000)return [];
 try{const data:unknown=JSON.parse(raw);if(!Array.isArray(data))return [];
 const seen=new Set<string>(),items:SavedProduct[]=[];
 for(const entry of data){const s=savedEntry(entry);if(s&&!seen.has(s.id)){seen.add(s.id);items.push(s);}if(items.length>=MAX_SAVED)break;}return items;
 }catch{return [];}
}
export function toggleSaved(items:readonly SavedProduct[],entry:SavedProduct):SavedProduct[]{
 const e=savedEntry(entry);if(!e)return [...items];
 if(items.some(x=>x.id===e.id))return items.filter(x=>x.id!==e.id);
 return items.length>=MAX_SAVED?[...items]:[e,...items];
}
export function eligibleSavedOffers(offers:readonly WishlistOffer[],now:number){
 return offers.filter(o=>{const v=Date.parse(o.verified_at),e=Date.parse(o.expires_at);return Number.isFinite(v)&&Number.isFinite(e)&&v<=now&&e>now;});
}
