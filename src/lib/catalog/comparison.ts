import type {AssistantOffer} from "./shopping-assistant";
export const MAX_COMPARE=4;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseComparison(value:unknown):{ids:string[];invalid:boolean}{
 if(value===undefined||value==="")return {ids:[],invalid:false};
 if(typeof value!=="string"||value.length>MAX_COMPARE*37)return {ids:[],invalid:true};
 const ids=value.split(",").map(v=>v.toLowerCase());
 if(ids.length>MAX_COMPARE||ids.some(v=>!uuid.test(v))||new Set(ids).size!==ids.length)return {ids:[],invalid:true};
 return {ids,invalid:false};
}
export function comparisonHref(ids:readonly string[]){return "/compare?offers="+encodeURIComponent(ids.slice(0,MAX_COMPARE).join(","));}
export function toggleComparison(ids:readonly string[],id:string):string[]{
 if(!uuid.test(id))return [...ids];
 const normalized=id.toLowerCase();
 if(ids.includes(normalized))return ids.filter(v=>v!==normalized);
 return ids.length<MAX_COMPARE?[...ids,normalized]:[...ids];
}
export function currentComparison(offers:readonly AssistantOffer[],ids:readonly string[],now:number){
 const valid=offers.filter(o=>{const v=Date.parse(o.verified_at),e=Date.parse(o.expires_at);return Number.isFinite(v)&&Number.isFinite(e)&&v<=now&&e>now;});
 const byId=new Map(valid.map(o=>[o.id,o]));
 return ids.flatMap(id=>{const o=byId.get(id);return o?[o]:[];});
}
export function comparePrices(offers:readonly AssistantOffer[]){
 // Compare recorded prices only when the catalog identifies the same product
 // and all selected offers have positive USD prices. No implied variant equality or savings.
 if(offers.length<2||new Set(offers.map(o=>o.product.id)).size!==1||new Set(offers.map(o=>o.merchant.name)).size<2||!offers.every(o=>o.currency==="USD"&&typeof o.price_cents==="number"&&Number.isSafeInteger(o.price_cents)&&o.price_cents>0))return null;
 const values=offers.map(o=>o.price_cents!);
 return {min:Math.min(...values),max:Math.max(...values),difference:Math.max(...values)-Math.min(...values)};
}
