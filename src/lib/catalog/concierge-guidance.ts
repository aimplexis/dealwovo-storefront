import {planShopping,type Request} from "./shopping-assistant";
// Editorial guidance only. Explicit shopper choices never override catalog budget or category constraints.
export const conciergeGoals=[
 {id:"home",label:"Organize my home",first:"Sort and measure one storage area before buying.",ideas:[{label:"Drawer organizers",keyword:"drawer organizer",check:"Measure internal dimensions and clearance."},{label:"Storage containers",keyword:"storage container",check:"Check dimensions, material and cleaning instructions."}],href:"/solutions#organize-home"},
 {id:"workspace",label:"Improve my workspace",first:"Identify the most inconvenient part of your current setup.",ideas:[{label:"Cable organizers",keyword:"cable organizer",check:"Check cable diameter and attachment method."},{label:"Device stands",keyword:"device stand",check:"Check dimensions, stability and device compatibility."}],href:"/solutions#workspace"},
 {id:"travel",label:"Make travel easier",first:"Make a packing list and check carrier restrictions.",ideas:[{label:"Packing organizers",keyword:"packing organizer",check:"Check dimensions and baggage limits."},{label:"Toiletry bags",keyword:"toiletry bag",check:"Check capacity and liquid restrictions."}],href:"/solutions#travel"},
 {id:"routine",label:"Simplify my daily routine",first:"Identify one repeated inconvenience before replacing what you own.",ideas:[{label:"Personal care organizers",keyword:"personal care organizer",check:"Check materials, dimensions and cleaning instructions."},{label:"Storage pouches",keyword:"storage pouch",check:"Check size and closure."}],href:"/solutions#routine"},
 {id:"cooking",label:"Simplify my cooking",first:"Identify the preparation task that takes the most effort.",ideas:[{label:"Measuring tools",keyword:"measuring tool",check:"Check units, capacity and care instructions."},{label:"Food storage containers",keyword:"food storage container",check:"Check food-contact suitability and temperature limits."}],href:"/solutions#cooking"},
 {id:"comfort",label:"Make my home more comfortable",first:"Try rearranging existing items and identify what is missing.",ideas:[{label:"Throws",keyword:"throw blanket",check:"Check fabric, size and care instructions."},{label:"Cushion covers",keyword:"cushion cover",check:"Measure existing cushions and check closures."}],href:"/solutions#comfort"}
] as const;
export function conciergeGoal(id:string){return conciergeGoals.find(g=>g.id===id)??null;}

export function applyConciergeKeyword(request:Request,keyword:string):{ok:true;request:Request}|{ok:false;message:string}{
 if(!conciergeGoals.some(g=>g.ideas.some(i=>i.keyword===keyword)))return {ok:false,message:"Choose a supported shopping idea."};
 if(!request.need.trim()){
  const next={...request,need:keyword};const plan=planShopping(next);return plan.ok?{ok:true,request:next}:plan;
 }
 const old=planShopping(request);if(!old.ok)return old;
 const cents=old.maxCents===null?null:old.maxCents-(old.exclusive?1:0);
 if(cents!==null&&cents<=0)return {ok:false,message:"Your strict budget leaves no positive maximum for this shortcut. Refine your search manually."};
 const next={...request,need:keyword,maxBudget:cents===null?"":(cents/100).toFixed(2)};
 const plan=planShopping(next);return plan.ok?{ok:true,request:next}:plan;
}
