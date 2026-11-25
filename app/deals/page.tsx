import {pageMetadata} from "../../src/lib/marketing/seo-readiness";
import MerchandisingServer from "../../src/components/MerchandisingServer";
import DailyFeatureServer from "../../src/components/DailyFeatureServer";
import SeasonalShopping from "../../src/components/SeasonalShopping";
import EditorialCategory from "../../src/components/EditorialCategory";
export const dynamic="force-dynamic";
export const metadata=pageMetadata("/deals");
export default function Deals(){return <EditorialCategory data={{
 eyebrow:"03 / CELEBRATE THE MOMENT",title:"MAKE IT",accent:"MEMORABLE.",
 intro:"For meaningful moments, small celebrations, and all the people you love. Come for the inspiration; stay for that ‘perfect idea’ feeling.",
 heroImage:"https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=1400&q=88",heroAlt:"Festive decorated tree with ornaments and warm lights",
 stamp:"THE GOOD\nMOMENTS.",sectionEyebrow:"THE SEASONAL EDIT",sectionTitle:"MORE MEANING.",sectionAccent:"MORE MAGIC.",
 sectionIntro:"Fresh inspiration for gifting, gathering and making thoughtful moments last.",
 cards:[
 {label:"GIFTS",name:"Make their day",description:"Ideas that feel considered, not last-minute.",href:"/gifts",image:"https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=950&q=84",alt:"Wrapped presents and colorful ribbon"},
 {label:"HOME & HOSTING",name:"Make a moment",description:"Bring a little more warmth to the gathering.",href:"/essentials",image:"https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=950&q=84",alt:"Welcoming home with warm details"},
 {label:"SEASONAL JOY",name:"The festive feeling",description:"Find the inspiration behind memorable celebrations.",href:"/gifts",image:"https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=950&q=84",alt:"Decorated Christmas tree with ornaments"}
 ],closingTitle:"Thoughtful beats ordinary.",closingCopy:"This is our seasonal inspiration edit, not a collection of unverified discounts. Approved offers will appear in the Shop when ready."
 }}><DailyFeatureServer/><MerchandisingServer kind="seasonal" title="Seasonal shopping finds." description="Current reviewed offers with seasonal language in the catalog. Not necessarily discounted." emptyHref="/gifts" emptyLabel="Explore gift inspiration"/><SeasonalShopping/></EditorialCategory>}
