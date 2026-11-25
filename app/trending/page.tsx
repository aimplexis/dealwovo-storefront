import {pageMetadata} from "../../src/lib/marketing/seo-readiness";
import MerchandisingServer from "../../src/components/MerchandisingServer";
import EditorialCategory from "../../src/components/EditorialCategory";
export const dynamic="force-dynamic";
export const metadata=pageMetadata("/trending");
export default function Trending(){return <EditorialCategory data={{
 eyebrow:"01 / FOR THE ALWAYS-CURIOUS",title:"THE NEXT",accent:"GOOD THING.",
 intro:"Smart ideas, great design, and little upgrades with a big personality. Explore the tech and trends that make everyday life more interesting.",
 heroImage:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1400&q=88",heroAlt:"Premium modern headphones against a vibrant golden background",
 stamp:"OH, THAT'S\nCLEVER.",sectionEyebrow:"THE CURIOUS EDIT",sectionTitle:"GOOD IDEAS.",sectionAccent:"BETTER MOMENTS.",
 sectionIntro:"Three ways to explore what's next—from sound and screens to smarter everyday moments.",
 cards:[
 {label:"SOUND & STYLE",name:"Sound worth noticing",description:"An invitation to better listening experiences.",href:"/gifts",image:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=950&q=84",alt:"Headphones on a vibrant background"},
 {label:"WORK & PLAY",name:"The creative setup",description:"Ideas for an inspiring desk and daily routine.",href:"/essentials",image:"https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=950&q=84",alt:"Bright modern workspace and screen"},
 {label:"GIFT-WORTHY TECH",name:"For the curious one",description:"Gift inspiration for the person who loves what's next.",href:"/gifts",image:"https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=950&q=84",alt:"Contemporary technology workspace"}
 ],closingTitle:"Find your next wow.",closingCopy:"Our verified retailer catalog is in preparation. Explore today's ideas without pretending unverified items are ready to buy."
 }}><MerchandisingServer kind="tech" title="Explore current tech finds." description="Recently reviewed electronics, not a measured trend ranking."/></EditorialCategory>}
