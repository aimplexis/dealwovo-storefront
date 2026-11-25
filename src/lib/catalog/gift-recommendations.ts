import type {AssistantOffer} from "./shopping-assistant";
export const giftFields=[
 {id:"recipient",label:"WHO IS IT FOR?",opts:[["all","Someone wonderful"],["friend","A friend"],["family","Family"],["partner","My partner"],["parent","A parent"],["coworker","A coworker"]]},
 {id:"occasion",label:"THE OCCASION",opts:[["all","Any occasion / just because"],["holiday","The holidays"],["birthday","A birthday"],["thanks","A thank-you"],["anniversary","An anniversary"],["graduation","Graduation"],["housewarming","Housewarming"]]},
 {id:"budget",label:"YOUR COMFORT ZONE",opts:[["all","Any budget"],["under25","Under $25"],["under50","Under $50"],["50to150","$50–$150"],["over150","Over $150"]]},
 {id:"interest",label:"THEIR KIND OF THING",opts:[["all","A bit of everything"],["tech","Tech & gadgets"],["home","Home & living"],["wellness","Wellbeing & personal care"],["kitchen","Cooking & kitchen"],["fashion","Fashion & accessories"],["sports","Sports & outdoors"],["travel","Travel"],["pets","Pets"],["office","Work & productivity"],["toys","Toys & games"]]}
] as const;
export type GiftSelections={recipient:string;occasion:string;budget:string;interest:string};
export const giftDefaults:GiftSelections={recipient:"all",occasion:"all",budget:"all",interest:"all"};
const norm=(s:string)=>s.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const has=(s:string,term:string)=>(" "+s+" ").includes(" "+norm(term)+" ");
const interests:Record<string,readonly string[]>={tech:["electronics","electronics gadgets","tech gadgets","technology","gadgets"],home:["home","home living","home decor","everyday essentials","essentials"],wellness:["beauty","beauty personal care","personal care","wellness","health wellness"],kitchen:["kitchen","kitchen dining","cookware"],fashion:["fashion","fashion accessories","accessories"],sports:["sports","sports outdoors","outdoors"],travel:["travel","travel accessories"],pets:["pets","pet essentials","pet supplies"],office:["office","office productivity","office supplies"],toys:["toys","toys games","games"]};
const recipients:Record<string,readonly string[]>={friend:["gift for friend","gift for friends","friendship gift"],family:["family gift","gift for family"],partner:["gift for partner","gift for spouse","couples gift","romantic gift"],parent:["gift for parent","gift for parents","gift for mom","gift for dad","mother s day","father s day"],coworker:["gift for coworker","gift for coworkers","office gift","colleague gift"]};
const occasions:Record<string,readonly string[]>={holiday:["holiday gift","christmas gift","stocking stuffer","holiday gifting"],birthday:["birthday gift","birthday present"],thanks:["thank you gift","appreciation gift"],anniversary:["anniversary gift","anniversary present"],graduation:["graduation gift","graduation present"],housewarming:["housewarming gift","new home gift"]};
export function recommendGifts(offers:readonly AssistantOffer[],s:GiftSelections,now:number){
 if(giftFields.some(f=>!f.opts.some(([key])=>key===s[f.id])))return [];
 const candidates=offers.flatMap(o=>{
  const v=Date.parse(o.verified_at),e=Date.parse(o.expires_at);
  if(!Number.isFinite(v)||!Number.isFinite(e)||v>now||e<=now)return [];
  const price=o.price_cents,known=o.currency==="USD"&&typeof price==="number"&&Number.isSafeInteger(price)&&price>=0;
  if(s.budget!=="all"&&(!known||(s.budget==="under25"?price!>=2500:s.budget==="under50"?price!>=5000:s.budget==="50to150"?price!<5000||price!>15000:price!<=15000)))return [];
  const category=[norm(o.product.category.slug),norm(o.product.category.name)];
  if(s.interest!=="all"&&!interests[s.interest].some(term=>category.includes(norm(term))))return [];
  const title=norm(o.product.title),description=norm(o.product.description),copy=title+" "+description;
  const recipient=s.recipient!=="all"&&recipients[s.recipient].some(term=>has(copy,term));
  const occasion=s.occasion!=="all"&&occasions[s.occasion].some(term=>has(copy,term));
  const generic=has(copy,"gift")||has(copy,"gifts")||has(copy,"gift set")||has(copy,"present");
  // With no category, require explicit gifting language; never assume arbitrary items are gifts.
  if(s.interest==="all"&&!generic&&!recipient&&!occasion)return [];
  const reasons:string[]=[];
  if(s.interest!=="all")reasons.push("Matches selected interest");
  if(s.budget!=="all")reasons.push("Matches recorded USD budget");
  if(recipient)reasons.push("Catalog text mentions your recipient type");
  if(occasion)reasons.push("Catalog text mentions your occasion");
  if(!recipient&&!occasion&&generic)reasons.push("Catalog text mentions gifting");
  if(!recipient&&s.recipient!=="all"||!occasion&&s.occasion!=="all")reasons.push("Recipient or occasion suitability is not confirmed");
  return [{offer:o,reasons,score:Number(recipient)*4+Number(occasion)*4+Number(generic)}];
 }).sort((a,b)=>b.score-a.score||Date.parse(b.offer.verified_at)-Date.parse(a.offer.verified_at)||a.offer.id.localeCompare(b.offer.id));
 const seen=new Set<string>();
 return candidates.filter(r=>{if(seen.has(r.offer.product.id))return false;seen.add(r.offer.product.id);return true;});
}
