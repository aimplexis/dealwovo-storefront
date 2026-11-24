import Link from "next/link";
import {catalogConfigured} from "../../src/lib/supabase/config";
import {getPublicOffers} from "../../src/lib/catalog/public";
import ShopSpotlight from "./ShopSpotlight";
import ShopCatalog from "./ShopCatalog";
import "./shop.css";
export const dynamic="force-dynamic";
export const metadata={title:"Discover great finds | Dealwovo",description:"Discover gift ideas, tech, and everyday inspiration with Dealwovo. Approved retailer offers will appear as they become available.",robots:{index:false,follow:false}};
const paths=[
 {number:"01",tag:"CLEVER LITTLE THINGS",title:"Tech & gadgets",description:"For the curious, the connected, and the always-upgrading.",href:"/trending",image:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1400&q=86",theme:"lime"},
 {number:"02",tag:"THE THOUGHTFUL EDIT",title:"Gifts that get it",description:"For the people who matter—and the moments worth remembering.",href:"/gifts",image:"https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=1400&q=86",theme:"coral"},
 {number:"03",tag:"THE DAILY GLOW-UP",title:"Everyday living",description:"Useful ideas that make the ordinary a little extraordinary.",href:"/essentials",image:"https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=86",theme:"violet"},
 {number:"04",tag:"SEASONAL INSPIRATION",title:"A little holiday magic",description:"Fresh inspiration for this season's thoughtful moments.",href:"/deals",image:"https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1400&q=86",theme:"blue"}
];
export default async function ShopPage(){
 const offers=await getPublicOffers();
 return <main className="dw-wow-shop">
   <ShopSpotlight/>
   <section id="discover" className="dw-wow-discover wrap">
     <div className="dw-wow-section-heading">
       <div><span className="dw-wow-kicker">CHOOSE YOUR KIND OF WOW</span><h2>Find your <em>thing.</em></h2></div>
       <p>Consider this your invitation to explore a little further. Every category leads somewhere.</p>
     </div>
     <div className="dw-wow-collection-grid">
       {paths.map((item,index)=><Link href={item.href} className={"dw-wow-collection dw-wow-collection-"+item.theme} key={item.number}>
         <img src={item.image} alt={item.title+" lifestyle inspiration"} loading="lazy"/>
         <span className="dw-wow-collection-shade"/>
         <span className="dw-wow-collection-index">{item.number} / DISCOVER</span>
         <span className="dw-wow-collection-arrow" aria-hidden="true">↗</span>
         <span className="dw-wow-collection-bottom"><small>{item.tag}</small><strong>{item.title}</strong><span>{item.description}</span></span>
       </Link>)}
     </div>
     <p className="dw-wow-image-note">These are editorial category images, not advertised products.</p>
   </section>
   <section className="dw-wow-vibe">
     <div className="wrap dw-wow-vibe-layout">
       <div><span className="dw-wow-kicker">YOUR KIND OF DISCOVERY</span><h2>LESS SCROLLING.<br/><em>MORE WOW.</em></h2><p>Shopping should feel like finding something special—not getting lost in a thousand tabs. Start with a little inspiration and see where it takes you.</p><Link href="/gifts" className="dw-wow-vibe-link">Explore the Gift Finder <span aria-hidden="true">↗</span></Link></div>
       <div className="dw-wow-vibe-art" aria-hidden="true"><div className="dw-wow-vibe-ring"/><div className="dw-wow-vibe-card-one"><span>YOU FOUND</span><strong>THE<br/>GOOD<br/>STUFF.</strong><b>↗</b></div><div className="dw-wow-vibe-card-two">✳<small>SMALL FINDS<br/>BIG FEELINGS</small></div><div className="dw-wow-vibe-spark">✦</div></div>
     </div>
   </section>
   <ShopCatalog offers={offers} configured={catalogConfigured()}/>
   <section className="dw-wow-bottom-cta wrap"><div aria-hidden="true" className="dw-wow-bottom-star">✳</div><span className="dw-wow-kicker">GOOD FINDS START SOMEWHERE</span><h2>LET CURIOSITY<br/><em>LEAD THE WAY.</em></h2><p>Thoughtful finds are worth discovering. Your next favorite idea might be one click away.</p><Link href="/trending">Keep exploring <span aria-hidden="true">↗</span></Link></section>
 </main>;
}
