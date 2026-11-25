import {pageMetadata} from "../../src/lib/marketing/seo-readiness";
import MerchandisingServer from "../../src/components/MerchandisingServer";
import EditorialCategory from "../../src/components/EditorialCategory";
export const dynamic="force-dynamic";
export const metadata=pageMetadata("/essentials");
export default function Essentials(){return <EditorialCategory data={{
 eyebrow:"02 / LITTLE THINGS, BIG DIFFERENCE",title:"EVERYDAY,",accent:"ELEVATED.",
 intro:"The coziest corners, calmer routines, and thoughtful little upgrades. Find inspiration that makes the ordinary feel surprisingly good.",
 heroImage:"https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=88",heroAlt:"Warm modern kitchen and thoughtfully styled home",
 stamp:"LIVE A\nLITTLE BETTER.",sectionEyebrow:"THE LIVING EDIT",sectionTitle:"SMALL UPGRADES.",sectionAccent:"BIG FEELINGS.",
 sectionIntro:"Consider this your mood board for life's useful, lovely and quietly brilliant details.",
 cards:[
 {label:"HOME",name:"Feel at home",description:"Comfortable spaces and beautiful everyday rituals.",href:"/shop",image:"https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=950&q=84",alt:"Clean modern home and kitchen"},
 {label:"WELLNESS",name:"A little time for you",description:"Soft routines and moments worth slowing down for.",href:"/gifts",image:"https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=950&q=84",alt:"Premium personal-care products in a styled setting"},
 {label:"DAILY RITUALS",name:"Make it a ritual",description:"The simple pleasures that make a day.",href:"/gifts",image:"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=950&q=84",alt:"Coffee cups and everyday moments"}
 ],closingTitle:"The little things count.",closingCopy:"We separate editorial ideas from approved retailer products, so inspiration never masquerades as an offer."
 }}><MerchandisingServer kind="everyday" title="Useful finds for every day." description="Current reviewed offers in home, kitchen, personal care and essentials."/></EditorialCategory>}
