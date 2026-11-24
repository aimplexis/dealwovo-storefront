// Deterministic editorial suggestions, not demand estimates or verified product classifications.
export const departments=[
 {key:"electronics",name:"Electronics & Gadgets",terms:["electronics","gadgets","headphones","earbuds","smartwatch","bluetooth speaker","charger","power bank","keyboard","monitor","tablet","laptop","phone case"]},
 {key:"home",name:"Home & Living",terms:["home living","home decor","furniture","lamp","bedding","pillow","curtain","rug","sofa","nightstand","blanket"]},
 {key:"kitchen",name:"Kitchen & Dining",terms:["kitchen dining","kitchen","cookware","coffee maker","air fryer","blender","cutlery","dinnerware","toaster","skillet","food storage"]},
 {key:"beauty",name:"Beauty & Personal Care",terms:["beauty personal care","beauty","skin care","skincare","hair dryer","shampoo","makeup","moisturizer","razor","hair brush"]},
 {key:"fashion",name:"Fashion & Accessories",terms:["fashion accessories","fashion","clothing","dress","shirt","handbag","wallet","jewelry","sneakers","sunglasses","belt"]},
 {key:"toys",name:"Toys & Games",terms:["toys games","toys","toy","puzzle","board game","building blocks","doll","action figure","remote control car"]},
 {key:"wellness",name:"Health & Wellness",terms:["health wellness","wellness","yoga mat","meditation cushion","foam roller","sleep mask","massage ball"]},
 {key:"sports",name:"Sports & Outdoors",terms:["sports outdoors","sports","outdoors","camping","tent","hiking","dumbbells","resistance bands","basketball","cycling","fishing"]},
 {key:"pets",name:"Pet Essentials",terms:["pet essentials","pet supplies","dog leash","cat litter","pet bed","cat toy","dog toy","pet carrier","bird feeder"]},
 {key:"office",name:"Office & Productivity",terms:["office productivity","office supplies","desk organizer","notebook","planner","stapler","printer paper","file folder","desk chair"]},
 {key:"travel",name:"Travel Accessories",terms:["travel accessories","luggage","suitcase","packing cubes","passport holder","travel adapter","luggage tag","neck pillow"]},
 {key:"essentials",name:"Everyday Essentials",terms:["everyday essentials","household supplies","paper towels","trash bags","laundry detergent","dish soap","cleaning cloth","reusable shopping bag"]}
] as const;
export type DepartmentKey=(typeof departments)[number]["key"];
export function isDepartmentKey(v:string):v is DepartmentKey{return departments.some(d=>d.key===v);}
const norm=(s:string)=>s.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const contains=(s:string,t:string)=>(" "+s+" ").includes(" "+norm(t)+" ");
export function suggestDepartment(title:string,hint=""){
 const t=norm(title.slice(0,180)),h=norm(hint.slice(0,120));
 const scores=departments.map(d=>{const matches=d.terms.filter(w=>contains(t,w)||contains(h,w));return {key:d.key,name:d.name,score:matches.reduce((sum,w)=>sum+(contains(h,w)?4:0)+(contains(t,w)?2:0),0),matches};}).sort((a,b)=>b.score-a.score);
 const best=scores[0],next=scores[1];
 return best.score>0&&best.score>next.score?{key:best.key,name:best.name,matched:best.matches}:null;
}
export function suggestExistingCategory(title:string,hint:string,categories:{id:string;name:string}[]){
 const exact=categories.filter(c=>norm(c.name)&&norm(c.name)===norm(hint));
 if(exact.length===1)return exact[0];
 if(exact.length>1)return null;
 const proposed=suggestDepartment(title,hint);if(!proposed)return null;
 const d=departments.find(x=>x.key===proposed.key)!;
 const aliases=[norm(d.name),norm(d.key),...d.terms.map(norm)];
 const matches=categories.filter(c=>aliases.includes(norm(c.name)));
 return matches.length===1?matches[0]:null;
}
