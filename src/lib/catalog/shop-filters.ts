export const budgets=["all","25","50","100","150plus"] as const;
// Custom upper limits use integer cents; inclusive and exclusive limits remain distinct.
export function preciseBudget(value:string,exclusive=false):string|null{
 if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(value))return null;
 const [whole,fraction=""]=value.split(".");
 const cents=Number(whole)*100+Number(fraction.padEnd(2,"0"));
 if(!Number.isSafeInteger(cents)||cents<1||cents>100000000)return null;
 return (exclusive?"lt:":"lte:")+cents;
}
export function parsePreciseBudget(value:string):{cents:number;exclusive:boolean}|null{
 const match=/^(lt|lte):([1-9]\d{0,8})$/.exec(value);
 if(!match)return null;
 const cents=Number(match[2]);
 return cents<=100000000?{cents,exclusive:match[1]==="lt"}:null;
}
export const sortOptions=["recent","price_low","price_high","name"] as const;
export type Filters={q:string;category:string;budget:typeof budgets[number]|`lt:${number}`|`lte:${number}`|"invalid";sort:typeof sortOptions[number]};
export const defaults:Filters={q:"",category:"all",budget:"all",sort:"recent"};
export function parseShopFilters(input:Record<string,string|string[]|undefined>):Filters{
 const one=(k:string)=>typeof input[k]==="string"?input[k] as string:"";
 const category=one("category");
 const raw=one("budget"),custom=one("maxBudget");
 const encoded=custom?preciseBudget(custom):null;
 const budget:Filters["budget"]=custom?(encoded??"invalid") as Filters["budget"]:parsePreciseBudget(raw)?raw as Filters["budget"]:input.maxBudget!==undefined&&typeof input.maxBudget!=="string"?"invalid":raw.startsWith("lt:")||raw.startsWith("lte:")?"invalid":budgets.find(x=>x===raw)??"all";
 return {q:one("q").trim().slice(0,100),category:/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)&&category.length<=150?category:"all",budget,sort:sortOptions.find(x=>x===one("sort"))??"recent"};
}
type Offer={id:string;price_cents:number|null;currency:string;verified_at:string;product:{title:string;description:string;category:{slug:string;name:string}};merchant:{name:string}};
export function filterOffers<T extends Offer>(offers:readonly T[],f:Filters){
 const limit=parsePreciseBudget(f.budget);
 const words=f.q.toLowerCase().split(/\s+/).filter(Boolean);
 const validPrice=(o:Offer)=>o.currency==="USD"&&typeof o.price_cents==="number"&&Number.isSafeInteger(o.price_cents)&&o.price_cents>0;
 return offers.filter(o=>{
  if(f.category!=="all"&&o.product.category.slug!==f.category)return false;
  const text=[o.product.title,o.product.description,o.product.category.name,o.merchant.name].join(" ").toLowerCase();
  if(!words.every(w=>text.includes(w)))return false;
  if(f.budget==="invalid")return false;
  if(f.budget!=="all"&&(!validPrice(o)||(limit?(limit.exclusive?o.price_cents!>=limit.cents:o.price_cents!>limit.cents):f.budget==="150plus"?o.price_cents!<15000:o.price_cents!>=Number(f.budget)*100)))return false;
  return true;
 }).sort((a,b)=>{
  if(f.sort==="price_low"||f.sort==="price_high"){
   const av=validPrice(a),bv=validPrice(b);if(av!==bv)return av?-1:1;
   if(av&&bv){const delta=(a.price_cents!-b.price_cents!)*(f.sort==="price_low"?1:-1);if(delta)return delta;}
  }else if(f.sort==="name"){const delta=a.product.title.localeCompare(b.product.title,"en-US");if(delta)return delta;}
  const dates=Date.parse(b.verified_at)-Date.parse(a.verified_at);return dates||a.id.localeCompare(b.id);
 });
}
