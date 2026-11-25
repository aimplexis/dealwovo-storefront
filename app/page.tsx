import {pageMetadata} from "../src/lib/marketing/seo-readiness";
import Link from "next/link";
import Image from "next/image";
import DailyFeatureServer from "../src/components/DailyFeatureServer";
import ShoppingShortcuts from "../src/components/ShoppingShortcuts";
import ShopSpotlight from "./shop/ShopSpotlight";
import ShopCatalog from "./shop/ShopCatalog";
import {getPublicOffers} from "../src/lib/catalog/public";
import {catalogConfigured} from "../src/lib/supabase/config";
import "./shop/shop.css";
export const dynamic="force-dynamic";
export const metadata=pageMetadata("/");
const collections=[
 {number:"01",type:"THE CURIOUS EDIT",title:"Clever tech.",subtitle:"For the ‘wait, that's brilliant’ moments.",href:"/trending",image:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1400&q=86",tone:"lime",alt:"Modern headphones on a golden yellow background"},
 {number:"02",type:"THE THOUGHTFUL EDIT",title:"Gifts with feeling.",subtitle:"Less guessing. More ‘you really get me.’",href:"/gifts",image:"https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1400&q=86",tone:"pink",alt:"Beautifully wrapped gifts and ribbons"},
 {number:"03",type:"THE LIVING EDIT",title:"Everyday, better.",subtitle:"Useful little upgrades for real life.",href:"/essentials",image:"https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=86",tone:"lavender",alt:"Welcoming modern kitchen with thoughtful home details"},
 {number:"04",type:"THE SEASONAL EDIT",title:"Moments to make.",subtitle:"Inspiration for every celebration.",href:"/deals",image:"https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=1400&q=86",tone:"peach",alt:"Festive holiday decorations and gifts"}
];
export default async function Home(){
 const offers=await getPublicOffers(100);
 return <main className="dw-wow-shop dw2-home">
  <ShopSpotlight/>
  <ShoppingShortcuts/>
  <DailyFeatureServer/>
  <section className="dw2-intro-band" aria-label="Our approach">
   <div className="wrap dw2-intro-inner"><span>THOUGHTFULLY FOUND.</span><span aria-hidden="true">✳</span><span>DESIGNED FOR DISCOVERY.</span><span aria-hidden="true">✳</span><span>ALWAYS YOUR KIND OF WOW.</span></div>
  </section>
  <section className="wrap dw2-home-collections" id="discover">
   <div className="dw2-section-heading"><div><span className="dw2-eyebrow">01 / A WORLD OF GOOD FINDS</span><h2>Different things.<br/><em>Same great feeling.</em></h2></div><p>Whatever you&apos;re into, start somewhere wonderful. Explore four edits made for discovering more of what you love.</p></div>
   <div className="dw2-collection-grid">
    {collections.map(item=><Link key={item.number} className={"dw2-collection-card dw2-collection-"+item.tone} href={item.href}>
     <Image src={item.image} alt={item.alt} fill sizes="(max-width: 700px) 100vw, (max-width: 1050px) 50vw, 40vw" quality={75} className="dw2-collection-image"/>
     <span className="dw2-collection-overlay" aria-hidden="true"/>
     <span className="dw2-collection-no">{item.number} <span>/ DISCOVER</span></span>
     <span className="dw2-collection-arrow" aria-hidden="true">↗</span>
     <span className="dw2-collection-info"><small>{item.type}</small><strong>{item.title}</strong><span>{item.subtitle}</span></span>
    </Link>)}
   </div>
   <p className="dw2-imagery-note">Editorial lifestyle imagery illustrates categories, not currently available products.</p>
  </section>
  <section className="dw2-home-feature"><div className="wrap dw2-feature-inner">
   <div className="dw2-feature-copy"><span className="dw2-eyebrow">02 / BETTER GIFTING BEGINS HERE</span><h2>Gift the feeling.<br/><em>Not the guesswork.</em></h2><p>Someone special on your mind? A few thoughtful answers can point you toward categories they'll actually love. No endless tabs required.</p><Link href="/gifts" className="dw2-button-dark">Find their kind of wow <span aria-hidden="true">↗</span></Link><small>Explore editorial ideas and matching reviewed retailer products when available.</small></div>
   <div className="dw2-feature-art" aria-label="Editorial gift inspiration"><div className="dw2-feature-picture"><Image src="https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1600&q=88" alt="Colorful carefully wrapped presents" fill sizes="(max-width: 820px) 90vw, 45vw" quality={80}/></div><div className="dw2-feature-sticker">THE ART<br/>OF GETTING<br/><b>IT RIGHT.</b><span>✳</span></div></div>
  </div></section>
  <section className="wrap dw2-home-catalog">
   <div className="dw2-small-bar"><span className="dw2-eyebrow">03 / MADE FOR REAL DISCOVERIES</span><Link href="/shop">Enter the shop <span aria-hidden="true">↗</span></Link></div>
   <ShopCatalog offers={offers} configured={catalogConfigured()}/>
  </section>
  <section className="dw2-home-principles"><div className="wrap dw2-principles-wrap"><div><span className="dw2-eyebrow">THE DEALWOVO WAY</span><h2>A little more wonder.<br/><em>A lot more intention.</em></h2></div><div className="dw2-principles"><article><span>01</span><strong>Discover differently.</strong><p>Start with interests and ideas—not a wall of anonymous listings.</p></article><article><span>02</span><strong>Know what&apos;s real.</strong><p>We distinguish editorial inspiration from reviewed retailer offers.</p></article><article><span>03</span><strong>Shop with clarity.</strong><p>When an offer is available, complete your purchase on the retailer&apos;s site.</p></article></div></div></section>
  <section className="wrap dw2-home-finale"><span className="dw2-eyebrow">THE GOOD STUFF IS OUT THERE</span><h2>COME CURIOUS.<br/><em>LEAVE INSPIRED.</em></h2><p>There&apos;s always another little thing worth discovering.</p><Link href="/shop" className="dw2-button-lime">Explore the good stuff <span aria-hidden="true">↗</span></Link><span className="dw2-finale-star" aria-hidden="true">✳</span></section>
 </main>;
}
