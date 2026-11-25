export const budgets=["all","25","50","100","150plus"] as const;
export const sortOptions=["recent","price_low","price_high","name"] as const;
export type Filters={q:string;category:string;budget:typeof budgets[number];sort:typeof sortOptions[number]};
export const defaults:Filters={q:"",category:"all",budget:"all",sort:"recent"};
export function parseShopFilters(input:Record<string,string|string[]|undefined>):Filters{
 const one=(k:string)=>typeof input[k]==="string"?input[k] as string:"";
 const category=one("category");
 return {q:one("q").trim().slice(0,100),category:/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)&&category.length<=150?category:"all",budget:budgets.find(x=>x===one("budget"))??"all",sort:sortOptions.find(x=>x===one("sort"))??"recent"};
}
type Offer={id:string;price_cents:number|null;currency:string;verified_at:string;product:{title:string;description:string;category:{slug:string;name:string}};merchant:{name:string}};
export function filterOffers<T extends Offer>(offers:readonly T[],f:Filters){
 const words=f.q.toLowerCase().split(/\s+/).filter(Boolean);
 const validPrice=(o:Offer)=>o.currency==="USD"&&typeof o.price_cents==="number"&&Number.isSafeInteger(o.price_cents)&&o.price_cents>=0;
 return offers.filter(o=>{
  if(f.category!=="all"&&o.product.category.slug!==f.category)return false;
  const text=[o.product.title,o.product.description,o.product.category.name,o.merchant.name].join(" ").toLowerCase();
  if(!words.every(w=>text.includes(w)))return false;
  if(f.budget!=="all"&&(!validPrice(o)||(f.budget==="150plus"?o.price_cents!<15000:o.price_cents!>=Number(f.budget)*100)))return false;
  return true;
 }).sort((a,b)=>{
  if(f.sort==="price_low"||f.sort==="price_high"){
   const av=validPrice(a),bv=validPrice(b);if(av!==bv)return av?-1:1;
   if(av&&bv){const delta=(a.price_cents!-b.price_cents!)*(f.sort==="price_low"?1:-1);if(delta)return delta;}
  }else if(f.sort==="name"){const delta=a.product.title.localeCompare(b.product.title,"en-US");if(delta)return delta;}
  const dates=Date.parse(b.verified_at)-Date.parse(a.verified_at);return dates||a.id.localeCompare(b.id);
 });
}
