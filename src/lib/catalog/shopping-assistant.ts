// Deterministic, explainable catalog matching. No generative model, user tracking or external queries.
export type AssistantOffer={id:string;price_cents:number|null;currency:string;verified_at:string;expires_at:string;product:{id:string;slug:string;title:string;description:string;image_url:string|null;category:{slug:string;name:string}};merchant:{name:string}};
export type Request={need:string;category:string;maxBudget:string;purpose:"self"|"gift"};
export type Plan={ok:true;words:string[];category:string;maxCents:number|null;exclusive:boolean;purpose:Request["purpose"]}|{ok:false;message:string};
const money=(v:string)=>{if(!/^\d{1,6}(?:\.\d{1,2})?$/.test(v))return null;const [w,f=""]=v.split(".");const n=Number(w)*100+Number(f.padEnd(2,"0"));return n>0&&n<=100000000?n:null;};
const normalize=(v:string)=>v.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const words=(v:string)=>normalize(v).match(/[a-z0-9]+/g)??[];
const stop=new Set(["i","im","am","looking","for","a","an","the","some","need","want","find","me","please","show","would","like","to","buy","shop","shopping","something","gift","gifts","present","my","under","with"]);
const token=(v:string)=>/^[a-z]+(?:boxes|watches|brushes|dishes)$/.test(v)||/^(boxes|watches|brushes|dishes)$/.test(v)?v.slice(0,-2):v.length>4&&v.endsWith("ies")?v.slice(0,-3)+"y":v.length>3&&v.endsWith("s")&&!v.endsWith("ss")&&!v.endsWith("us")&&!v.endsWith("is")?v.slice(0,-1):v;
export function planShopping(r:Request):Plan{
 if(r.need.length>240||r.maxBudget.length>10||!(r.category==="all"||/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.category)&&r.category.length<=150))return {ok:false,message:"Check the product description, category and budget."};
 let need=normalize(r.need).replace(/\b(?:i'm|i’m)\b/g,"im");
 let maxCents:number|null=null,exclusive=false;
 if(r.maxBudget.trim()){maxCents=money(r.maxBudget.trim());if(maxCents===null)return {ok:false,message:"Enter a positive USD budget, with up to two decimal places."};}
 // Only recognize explicit USD upper limits. Do not interpret ranges, lower bounds, negation or other currencies.
 if(/\b(?:not|without|except|exclude|avoid|between|over|above|at least|more than|minimum|starting at)\b|[€£¥]|\b(?:eur|gbp|cad|aud)\b/.test(need))return {ok:false,message:"This assistant supports product keywords and a maximum USD budget. For exclusions, ranges or other currencies, refine your search."};
 if(/\d,\d/.test(need))return {ok:false,message:"Enter your USD budget without commas, such as 1000."};
 let invalid=false;
 need=need.replace(/\b(under|less than|up to|at most|maximum|max|budget(?: of)?)\s*\$?\s*(\d+(?:\.\d{1,2})?)(?![\d.])(?:\s*(?:usd|dollars))?/g,(_m:string,kind:string,value:string)=>{
  const n=money(value);if(n===null){invalid=true;return "";}const strict=kind==="under"||kind==="less than";
  if(maxCents===null||n<maxCents){maxCents=n;exclusive=strict;}else if(n===maxCents&&strict)exclusive=true;return " ";
 });
 if(invalid||/[$]|\b(?:usd|dollars|under|less than|up to|at most|budget|maximum|max)\b/.test(need))return {ok:false,message:"Use a clear upper limit, such as under $50, or enter your budget in the field."};
 const terms=[...new Set(words(need).filter(w=>!stop.has(w)).map(token))];
 if(terms.length>12)return {ok:false,message:"Use a few product keywords so we can match them reliably."};
 if(!terms.length&&r.category==="all"&&maxCents===null)return {ok:false,message:"Tell us a product, choose a category, or enter a maximum budget."};
 return {ok:true,words:terms,category:r.category,maxCents,exclusive,purpose:r.purpose};
}
export function recommendOffers(offers:readonly AssistantOffer[],plan:Extract<Plan,{ok:true}>,now=Date.now()){
 const result=offers.flatMap(o=>{
  const verified=Date.parse(o.verified_at),expires=Date.parse(o.expires_at);
  if(!Number.isFinite(verified)||!Number.isFinite(expires)||verified>now||expires<=now)return [];
  if(plan.category!=="all"&&o.product.category.slug!==plan.category)return [];
  const price=o.price_cents,validPrice=o.currency==="USD"&&typeof price==="number"&&Number.isSafeInteger(price)&&price>=0;
  if(plan.maxCents!==null&&(!validPrice||(plan.exclusive?price!>=plan.maxCents:price!>plan.maxCents)))return [];
  const title=new Set(words(o.product.title).map(token)),category=new Set(words(o.product.category.name).map(token)),description=new Set(words(o.product.description).map(token));
  if(!plan.words.every(w=>title.has(w)||category.has(w)||description.has(w)))return [];
  const score=plan.words.reduce((n,w)=>n+(title.has(w)?5:category.has(w)?3:1),0);
  const reasons:string[]=[];
  if(plan.words.length)reasons.push("Matches your product keywords");
  if(plan.category!=="all")reasons.push("In your chosen category");
  if(plan.maxCents!==null)reasons.push("Within your recorded USD budget");
  if(!reasons.length)reasons.push("Recently reviewed catalog offer");
  return [{offer:o,score,reasons}];
 }).sort((a,b)=>b.score-a.score||Date.parse(b.offer.verified_at)-Date.parse(a.offer.verified_at)||a.offer.id.localeCompare(b.offer.id));
 // One recommendation per product; alternatives remain available on product detail.
 const seen=new Set<string>();
 return result.filter(r=>{if(seen.has(r.offer.product.id))return false;seen.add(r.offer.product.id);return true;});
}
