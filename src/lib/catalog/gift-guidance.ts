import {giftFields,type GiftSelections} from "./gift-recommendations";
export const giftStyles=[["any","Open to ideas"],["practical","Practical and useful"],["sentimental","Personal and sentimental"],["shared","Shared experiences"]] as const;
export type GiftStyle=typeof giftStyles[number][0];
const interestIdeas:Record<string,readonly [string,string,string]>={
 all:["A favorite everyday accessory","A handwritten note with a small keepsake","A planned activity together"],
 tech:["A compatible device accessory","A note about a shared technology memory","Time together exploring a favorite hobby"],
 home:["An organizer or comfortable textile","A framed personal photo","A relaxed evening together"],
 wellness:["A personal care organizer","A thoughtful note about their routine","Time together doing a favorite relaxing activity"],
 kitchen:["A useful kitchen tool","A handwritten family recipe","Cook a favorite meal together"],
 fashion:["An accessory suited to their style","A keepsake in a favorite color","A shared outing to explore their style"],
 sports:["An accessory for their chosen activity","A note celebrating a favorite sporting memory","Watch or enjoy an activity together"],
 travel:["A packing organizer","A personal travel memory album","Plan an outing together"],
 pets:["An accessory appropriate to their pet and routine","A photo of their pet","Spend time together on a pet-friendly outing"],
 office:["A desk organizer","A personal appreciation note","Share a coffee break"],
 toys:["A game appropriate to the group","A personal puzzle or memory activity","Plan a game night"]
};
const recipients:Record<string,string>={all:"Start with a routine or interest you know.",friend:"Choose something connected to a shared interest.",family:"Consider family routines and individual preferences.",partner:"Use a preference or memory you genuinely know.",parent:"Consider their own interests rather than assumptions about age.",coworker:"Keep the gift appropriate to your workplace and its gift policy."};
const occasions:Record<string,string>={all:"Choose something appropriate to the relationship.",holiday:"Check delivery timing and return terms.",birthday:"Make the idea personal to the recipient.",thanks:"Explain what you appreciate in a note.",anniversary:"Consider a meaningful shared memory.",graduation:"Consider the next stage of their life without assuming their plans.",housewarming:"Check the new home's space and the recipient's preferences."};
const budgets:Record<string,string>={all:"Set a total spending limit before choosing.",under25:"Keep recorded product prices below $25; allow for tax and delivery.",under50:"Keep recorded product prices below $50; allow for tax and delivery.","50to150":"For product matches, use recorded prices from $50 through $150; do not feel obliged to spend the full amount.",over150:"Product matches must exceed $150; confirm the complete cost and consider whether a smaller gift would be equally meaningful."};
export function giftGuidance(s:GiftSelections,style:GiftStyle){
 if(giftFields.some(f=>!f.opts.some(([key])=>key===s[f.id]))||!giftStyles.some(([key])=>key===style))return null;
 const ideas=interestIdeas[s.interest];
 const order=style==="sentimental"?[1,0,2]:style==="shared"?[2,0,1]:[0,1,2];
 return {recipient:recipients[s.recipient],occasion:occasions[s.occasion],budget:budgets[s.budget],ideas:order.map(i=>({kind:["Practical idea","Sentimental idea","Shared experience"][i],title:ideas[i],why:["Consider whether it solves a need they actually have.","Connect the idea to a genuine memory or preference.","Check their availability, accessibility and interest first."][i]}))};
}
