import type {QualityItem} from "./quality";

export type DealRow={
 offer:QualityItem;
 currency:string|null;
 priceKnown:boolean;
 comparisonCents:number|null;
 comparisonMerchant:string|null;
 reviewPriority:"hold"|"recheck"|"editorial-review";
 reasons:string[];
};
export function evaluateDeals(items:QualityItem[],currencies:Record<string,string>):DealRow[]{
 const comparable=(o:QualityItem)=>o.classification==="eligible"&&currencies[o.id]==="USD"&&typeof o.price_cents==="number"&&Number.isSafeInteger(o.price_cents)&&o.price_cents>0;
 const groups=new Map<string,QualityItem[]>();
 for(const o of items){
  if(!comparable(o))continue;
  const group=groups.get(o.product_id)||[];
  group.push(o);groups.set(o.product_id,group);
 }
 return items.map((offer):DealRow=>{
  const currency=currencies[offer.id]??null;
  const priceKnown=currency==="USD"&&typeof offer.price_cents==="number"&&Number.isSafeInteger(offer.price_cents)&&offer.price_cents>0;
  const reviewPriority=offer.classification==="eligible"?"editorial-review":offer.classification==="expiring"?"recheck":"hold";
  const alternatives=comparable(offer)?(groups.get(offer.product_id)||[]).filter(x=>x.merchant_id!==offer.merchant_id).sort((a,b)=>(a.price_cents??Infinity)-(b.price_cents??Infinity)||a.id.localeCompare(b.id)):[];
  const alternative=alternatives[0];
  const comparisonCents=alternative&&priceKnown?alternative.price_cents!-offer.price_cents!:null;
  const reasons=[...offer.reasons];
  if(!priceKnown)reasons.push("No positive, comparable recorded USD price");
  if(reviewPriority==="editorial-review")reasons.push("Independent price, variant, availability, rights and promotion review still required");
  return {offer,currency,priceKnown,comparisonCents,comparisonMerchant:alternative?.merchantName??null,reviewPriority,reasons};
 }).sort((a,b)=>({hold:0,recheck:1,"editorial-review":2}[a.reviewPriority]-{hold:0,recheck:1,"editorial-review":2}[b.reviewPriority])||a.offer.id.localeCompare(b.offer.id));
}
