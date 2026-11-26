import type {AssistantOffer} from "./shopping-assistant";
export type Collection="recent"|"tech"|"everyday"|"gifts"|"seasonal"|"budget-gifts"|"headphones"|"kitchen"|"chargers"|"workspace"|"toiletry"|"coffee";
const text=(v:string)=>v.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const has=(v:string,terms:readonly string[])=>terms.some(t=>(" "+v+" ").includes(" "+t+" "));
const gift=["gift","gifts","gift set","gifting","present","presents"],season=["holiday","holidays","christmas","thanksgiving","seasonal","stocking stuffer","hanukkah","valentine","easter","halloween","mother s day","father s day"];
export function currentOffer(o:AssistantOffer,now:number){const v=Date.parse(o.verified_at),e=Date.parse(o.expires_at);return Number.isFinite(v)&&Number.isFinite(e)&&v<=now&&e>now;}
const sort=(a:AssistantOffer,b:AssistantOffer)=>Date.parse(b.verified_at)-Date.parse(a.verified_at)||a.id.localeCompare(b.id);
function distinct(rows:AssistantOffer[],limit:number){const seen=new Set<string>();return rows.filter(o=>{if(seen.has(o.product.id))return false;seen.add(o.product.id);return true;}).slice(0,Math.max(0,Math.min(12,Math.floor(limit))));}
export function collectionOffers(offers:readonly AssistantOffer[],kind:Collection,now:number,limit=6){
 return distinct(offers.filter(o=>{if(!currentOffer(o,now))return false;const category=o.product.category.slug,copy=text(o.product.title+" "+o.product.description);
 switch(kind){case "recent":return true;case "tech":return category==="electronics";case "everyday":return ["home","kitchen","essentials","beauty","wellness"].includes(category);
 case "gifts":return has(copy,gift);case "seasonal":return has(copy,season);
 case "budget-gifts":return has(copy,gift)&&o.currency==="USD"&&typeof o.price_cents==="number"&&Number.isSafeInteger(o.price_cents)&&o.price_cents>0&&o.price_cents<2500;
 case "headphones":return category==="electronics"&&has(copy,["headphone","headphones","earbud","earbuds","headset","headsets"]);
 case "kitchen":return category==="kitchen"&&has(copy,["organizer","organizers","organization","storage","divider","dividers","container","containers"]);
 case "chargers":return category==="electronics"&&has(copy,["charger","chargers","charging adapter"])&&has(copy,["usb c","type c"]);
 case "workspace":return ["home","electronics","essentials"].includes(category)&&has(copy,["desk organizer","desk organizers","cable organizer","cable management","cable sleeve","file holder"]);
 case "toiletry":return has(copy,["toiletry bag","toiletry bags","toiletry organizer","toiletry pouch"]);
 case "coffee":return category==="kitchen"&&has(copy,["coffee scale","coffee grinder","coffee organizer","coffee filter","coffee tray","coffee storage","coffee frother","milk frother"]);
 default:return false;}
 }).sort(sort),limit);
}
const stop=new Set(["with","from","your","this","that","and","for","the","product","pack","set","new"]);
const tokens=(s:string)=>new Set(text(s).split(" ").filter(w=>w.length>=3&&!stop.has(w)));
export function relatedOffers(offers:readonly AssistantOffer[],product:AssistantOffer["product"],now:number,limit=4){
 const target=tokens(product.title);
 return distinct(offers.filter(o=>currentOffer(o,now)&&o.product.id!==product.id&&o.product.category.slug===product.category.slug).map(o=>({o,score:[...tokens(o.product.title)].filter(w=>target.has(w)).length})).sort((a,b)=>b.score-a.score||sort(a.o,b.o)).map(r=>r.o),limit);
}
export const guideCollections:Record<string,Collection>={"thoughtful-gifts-under-25":"budget-gifts","wireless-headphone-buying-guide":"headphones","kitchen-organization-buying-guide":"kitchen","holiday-shopping-budget-guide":"seasonal","usb-c-charger-buying-guide":"chargers","small-desk-organization-guide":"workspace","travel-toiletry-bag-buying-guide":"toiletry","coffee-station-buying-guide":"coffee"};
