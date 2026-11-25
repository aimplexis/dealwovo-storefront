export const interests=[
 {id:"tech",label:"Technology",href:"/lifestyle#tech",description:"Useful device accessories and technology ideas."},
 {id:"home",label:"Home & living",href:"/lifestyle#home",description:"Comfort and organization for everyday life."},
 {id:"coffee",label:"Coffee & cooking",href:"/lifestyle#coffee",description:"Thoughtful tools for your daily ritual."},
 {id:"care",label:"Personal care",href:"/lifestyle#care",description:"Practical ideas for your routine."},
 {id:"travel",label:"Travel",href:"/lifestyle#travel",description:"Packing and travel convenience."},
 {id:"social",label:"Family & social",href:"/lifestyle#social",description:"Shared activities and meaningful gifts."}
] as const;
export const discoveryBudgets=[["all","Any budget"],["25","Under $25"],["50","Under $50"],["100","Under $100"],["150plus","$150 and up"]] as const;
export type Preferences={interests:string[];budget:string};
export const emptyPreferences=():Preferences=>({interests:[],budget:"all"});
export const preferenceKey="dealwovo.discovery.v1";
export function readPreferences(raw:string|null):Preferences{
 if(!raw||raw.length>2048)return emptyPreferences();
 try{const v=JSON.parse(raw);if(!v||typeof v!=="object"||Array.isArray(v)||!Array.isArray(v.interests))return emptyPreferences();
 return {interests:interests.filter(i=>v.interests.includes(i.id)).map(i=>i.id),budget:discoveryBudgets.some(([id])=>id===v.budget)?v.budget:"all"};
 }catch{return emptyPreferences();}
}
export function discoveryPaths(p:Preferences){return interests.filter(i=>p.interests.includes(i.id));}
