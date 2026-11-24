/**
 * Dealwovo Offer Quality — deterministic, server-side catalog assessment.
 * Eligibility reflects stored approval and verification timestamps, NOT an
 * independent external availability, URL uptime, or affiliate-network test.
 */
export type QualityCategory={id:string;name:string;status:string};
export type QualityMerchant={id:string;name:string;status:string};
export type QualityProduct={id:string;title:string;slug:string;status:string;category_id:string;image_url:string|null};
export type QualityOffer={
 id:string;product_id:string;merchant_id:string;status:string;
 verified_at:string|null;expires_at:string|null;price_cents:number|null;
 created_at:string;updated_at:string
};
export type QualityStatus="expired"|"blocked"|"expiring"|"eligible"|"draft"|"paused";
export type QualityItem=QualityOffer&{
 classification:QualityStatus;
 reasons:string[];
 productTitle:string;
 merchantName:string;
 productSlug:string|null;
 expiresInHours:number|null;
};
export type QualityReport={
 items:QualityItem[];
 totals:Record<QualityStatus,number>;
 attention:number;
 missingOffers:number;
 unpublishedProducts:number;
 totalOffers:number;
 sampledOffers:number;
 inspectedAt:string;
};

const order:Record<QualityStatus,number>={expired:0,blocked:1,expiring:2,draft:3,paused:4,eligible:5};
const inHours=(time:number,now:number)=>(time-now)/3600000;
const parseTime=(s:string|null):number|null=>{
 if(!s)return null;
 const n=Date.parse(s);
 return Number.isFinite(n)?n:null;
};
export function buildQualityReport(
 categories:QualityCategory[],
 merchants:QualityMerchant[],
 products:QualityProduct[],
 offers:QualityOffer[],
 inspectedAt=new Date().toISOString()
):QualityReport{
 const now=Date.parse(inspectedAt);
 if(!Number.isFinite(now))throw new Error("Invalid evaluation time");
 const catById=new Map(categories.map(c=>[c.id,c]));
 const merById=new Map(merchants.map(m=>[m.id,m]));
 const prodById=new Map(products.map(p=>[p.id,p]));
 const offerProducts=new Set(offers.map(o=>o.product_id));
 const totals:Record<QualityStatus,number>={
  expired:0,blocked:0,expiring:0,eligible:0,draft:0,paused:0
 };
 const items=offers.map(o=>{
  const product=prodById.get(o.product_id);
  const merchant=merById.get(o.merchant_id);
  const category=product?catById.get(product.category_id):undefined;
  const expiry=parseTime(o.expires_at),verified=parseTime(o.verified_at);
  const reasons:string[]=[];
  let classification:QualityStatus;
  if(o.status==="draft"){classification="draft";reasons.push("Awaiting offer verification");}
  else if(o.status==="paused"){classification="paused";reasons.push("Paused by an administrator");}
  else if(o.status!=="approved"){classification="blocked";reasons.push("Unrecognized offer status");}
  else if(expiry!==null&&expiry<=now){
   classification="expired";reasons.push("Verification window expired");
  }else{
   if(expiry===null)reasons.push("No valid verification expiry");
   if(verified===null||verified>now)reasons.push("No valid past verification timestamp");
   if(product?.status!=="published")reasons.push("Product is not published");
   if(category?.status!=="published")reasons.push("Category is not published");
   if(merchant?.status!=="approved")reasons.push("Retailer is not approved");
   if(reasons.length)classification="blocked";
   else if(expiry!==null&&inHours(expiry,now)<=72){
    classification="expiring";reasons.push("Verification expires within 72 hours");
   }else classification="eligible";
  }
  totals[classification]++;
  return {...o,classification,reasons,
   productTitle:product?.title??"Unknown product",
   merchantName:merchant?.name??"Unknown retailer",
   productSlug:product?.slug??null,
   expiresInHours:expiry===null?null:inHours(expiry,now)};
 }).sort((a,b)=>order[a.classification]-order[b.classification]||
   ((parseTime(a.expires_at)??Infinity)-(parseTime(b.expires_at)??Infinity)));
 return {items,totals,attention:totals.expired+totals.blocked+totals.expiring,
  missingOffers:products.filter(p=>!offerProducts.has(p.id)).length,
  unpublishedProducts:products.filter(p=>p.status!=="published").length,
  totalOffers:offers.length,sampledOffers:offers.length,inspectedAt};
}
