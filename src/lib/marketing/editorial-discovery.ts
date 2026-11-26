// Original evergreen editorial briefs. No product, price, demand or availability claims.
export const editorialTopics=[
 {key:"unexpected",label:"Things You Didn't Know You Needed",hook:"What could make your daily routine a little easier?",body:"Notice one task that regularly interrupts your day. Before buying anything, consider a simpler arrangement, then look for an accessory that solves the specific problem.",href:"/solutions",cta:"Explore practical solutions"},
 {key:"easier",label:"Make Life Easier",hook:"Start with one drawer, not an entire room.",body:"Sort what you actually use, measure the available space, and choose organization tools only if they solve a remaining problem. Check dimensions and care instructions.",href:"/guides/kitchen-organization-buying-guide",cta:"Explore the kitchen organization guide"},
 {key:"discover",label:"Worth Discovering",hook:"A clever upgrade starts with a real need.",body:"Think about how you use your devices throughout the day. Compare exact model compatibility, included accessories and return terms before choosing an upgrade.",href:"/guides/wireless-headphone-buying-guide",cta:"Read the wireless headphone buying guide"},
 {key:"luxuries",label:"Little Luxuries",hook:"Make an ordinary moment feel special.",body:"Refresh your favorite quiet corner or coffee ritual with what you already have. If a small upgrade would help, decide on a budget and compare practical features.",href:"/lifestyle",cta:"Explore lifestyle inspiration"},
 {key:"guides",label:"Smart Shopping Guides",hook:"Shop with a little more confidence.",body:"Check the exact product variant, seller, total delivered price, warranty and return policy. A crossed-out price alone does not prove that an offer is good value.",href:"/guides",cta:"Read practical buying guides"},
 {key:"moments",label:"Moments That Matter",hook:"Thoughtfulness matters more than a big price tag.",body:"Start with the recipient's interests and routines. Consider a shared experience or useful gift, and reserve room in your budget for delivery and wrapping.",href:"/gifts",cta:"Find thoughtful gift inspiration"},
 {key:"weekend",label:"The Weekend Edit",hook:"Make time for something you enjoy.",body:"Plan a favorite activity, a relaxing afternoon or a game night. Make a short checklist and use what you already own before looking for anything new.",href:"/lifestyle",cta:"Discover ideas for your weekend"},
 {key:"seasonal",label:"Seasonal Discoveries",hook:"Plan for the next special occasion.",body:"Write down your priorities, check delivery windows and compare total costs. Explore seasonal inspiration without assuming any particular discount or availability.",href:"/deals",cta:"Explore seasonal ideas"}
] as const;
export type EditorialChannel="social"|"newsletter"|"website";
export const editorialChannels=["social","newsletter","website"] as const;
export function prepareEditorialDraft(key:string,channel:string){
 const topic=editorialTopics.find(t=>t.key===key);
 if(!topic||!editorialChannels.some(c=>c===channel))return null;
 const text=channel==="social"?topic.hook+"\n\n"+topic.body+"\n\n"+topic.cta+".":channel==="newsletter"?topic.hook+"\n\n"+topic.body+"\n\nThis week's idea: "+topic.cta+".":topic.hook+"\n\n"+topic.body;
 return {key:topic.key,channel,title:topic.label,text,cta:topic.cta,href:topic.href,status:"draft" as const,evidence:"Original evergreen editorial guidance. No live market or product claims.",review:"Confirm relevance, destination, originality, channel rights and any added claims. Internal review is not publication approval."};
}
