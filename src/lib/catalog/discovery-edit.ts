import type {AssistantOffer} from "./shopping-assistant";
import {currentOffer} from "./merchandising";
// Evergreen editorial inspiration. Rotation does not imply newly published inventory.
export const weeklyEdits=[
 {title:"Comfort, home and family",description:"Make room for comfort and time together.",ideas:[{title:"Refresh your favorite corner",copy:"Rearrange a lamp, blanket or cushion you already own before buying anything.",href:"/lifestyle#home"},{title:"Plan a game night",copy:"Choose a shared activity that suits everyone's interests.",href:"/lifestyle#social"}]},
 {title:"Make life easier",description:"Small changes for a more organized week.",ideas:[{title:"Tame tangled cables",copy:"Identify which cords need organizing and measure before choosing accessories.",href:"/solutions#workspace"},{title:"Reset one drawer",copy:"Sort everyday items and check what storage would actually fit.",href:"/solutions#organize-home"}]},
 {title:"Clever finds and technology",description:"Explore practical technology and useful upgrades.",ideas:[{title:"Rethink your listening setup",copy:"Compare comfort, device compatibility and your listening habits.",href:"/guides/wireless-headphone-buying-guide"},{title:"Make your workspace work for you",copy:"Start with the task you repeat most often.",href:"/solutions#workspace"}]},
 {title:"Everyday favorites",description:"Discover simple ways to make daily routines easier.",ideas:[{title:"Simplify your kitchen",copy:"Measure storage space before choosing containers or organizers.",href:"/guides/kitchen-organization-buying-guide"},{title:"Refresh your daily routine",copy:"Identify one repeated inconvenience and explore practical alternatives.",href:"/solutions#routine"}]},
 {title:"Thoughtful discoveries",description:"Make ordinary moments feel special.",ideas:[{title:"A little something for someone",copy:"Start with an interest they genuinely enjoy, not a promotion.",href:"/gifts"},{title:"A thoughtful find on a budget",copy:"Leave room for delivery and tax when comparing product prices.",href:"/guides/thoughtful-gifts-under-25"}]},
 {title:"Little luxuries",description:"Find inspiration for a relaxing end to the week.",ideas:[{title:"Elevate your coffee ritual",copy:"Consider what would improve the way you already make your favorite drink.",href:"/lifestyle#coffee"},{title:"Make space for comfort",copy:"Try a new arrangement before deciding whether a small upgrade is needed.",href:"/solutions#comfort"}]},
 {title:"The weekend edit",description:"Make time for hobbies, outings and everyday adventures.",ideas:[{title:"Pack for your next outing",copy:"Make a list and check bag dimensions and travel requirements.",href:"/solutions#travel"},{title:"Make a moment together",copy:"Explore an activity or shared gift that fits your interests.",href:"/lifestyle#social"}]}
] as const;
export function editorialEdit(now:number){return weeklyEdits[new Date(now).getUTCDay()]??weeklyEdits[0];}
export function discoveryOffers(offers:readonly AssistantOffer[],now:number,limit=6){
 if(!Number.isFinite(now)||!Number.isSafeInteger(limit)||limit<=0)return [];
 const sorted=offers.filter(o=>currentOffer(o,now)).sort((a,b)=>Date.parse(b.verified_at)-Date.parse(a.verified_at)||a.id.localeCompare(b.id));
 const seen=new Set<string>(),categories=new Set<string>(),first:AssistantOffer[]=[],rest:AssistantOffer[]=[];
 for(const o of sorted){if(seen.has(o.product.id))continue;seen.add(o.product.id);if(categories.has(o.product.category.slug))rest.push(o);else{categories.add(o.product.category.slug);first.push(o);}}
 return [...first,...rest].slice(0,Math.min(12,limit));
}
