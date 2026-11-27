import {pageMetadata} from "../src/lib/marketing/seo-readiness";
import Link from "next/link";
import Image from "next/image";
import MerchandisingServer from "../src/components/MerchandisingServer";
import DiscoveryEdit from "../src/components/DiscoveryEdit";
import DailyFeatureServer from "../src/components/DailyFeatureServer";
import NewsletterTeaser from "../src/components/NewsletterTeaser";
import ShoppingShortcuts from "../src/components/ShoppingShortcuts";
import PersonalDiscovery from "../src/components/PersonalDiscovery";
import RecentDiscovery from "../src/components/RecentDiscovery";
import ShopSpotlight from "./shop/ShopSpotlight";
import ShopCatalog from "./shop/ShopCatalog";
import {getPublicOfferResult,getReviewedPriceChanges} from "../src/lib/catalog/public";
import "./shop/shop.css";
import "./home-commerce.css";
import {departments} from "../src/lib/catalog/category-suggestions";
export const dynamic="force-dynamic";
export const metadata=pageMetadata("/");
const collections=[
 {number:"01",type:"THE CURIOUS EDIT",title:"Clever tech.",subtitle:"For the ‘wait, that's brilliant’ moments.",href:"/trending",image:"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1400&q=86",tone:"lavender",alt:"Laptop on a desk, illustrating everyday technology"},
 {number:"02",type:"THE THOUGHTFUL EDIT",title:"Gifts with feeling.",subtitle:"Less guessing. More ‘you really get me.’",href:"/gifts",image:"https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1400&q=86",tone:"pink",alt:"Beautifully wrapped gifts and ribbons"},
 {number:"03",type:"THE LIVING EDIT",title:"Everyday, better.",subtitle:"Useful little upgrades for real life.",href:"/essentials",image:"https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=86",tone:"lavender",alt:"Welcoming modern kitchen with thoughtful home details"},
 {number:"04",type:"THE SAVINGS EDIT",title:"Today’s deals.",subtitle:"Find current reviewed promotions and everyday shopping value.",href:"/deals",image:"https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=86",tone:"peach",alt:"Everyday home and kitchen inspiration"}
];
export default async function Home(){
 const {offers,available}=await getPublicOfferResult(24);
 const {changes,available:priceHistoryAvailable}=await getReviewedPriceChanges(offers.map(o=>o.id));const initialNow=Date.now();
 return <main className="dw-wow-shop dw2-home">
  <section className="dw-commerce-light" aria-label="Search products and deals"><div className="wrap dw-commerce-search">
   <form action="/shop#verified-offers" method="get" className="dw-revenue-search"><label htmlFor="home-commerce-query">Search products, categories and retailers</label><div><input id="home-commerce-query" name="q" type="search" maxLength={100} placeholder="What are you shopping for?"/><button type="submit">Search ↗</button></div></form>
   <nav aria-label="Quick shopping links"><Link href="/deals">Today's Deals</Link><Link href="/shop">Shop All</Link><Link href="/wishlist">Saved products</Link></nav>
  </div></section>
  <ShopSpotlight/>
  {!offers.length&&<ShoppingShortcuts hasOffers={false} available={available}/>}
  <div className="dw-commerce-light">
  <section className="wrap dw-commerce-departments" aria-labelledby="commerce-department-title">
   <header><div><span className="dw2-eyebrow">EVERYDAY SHOPPING</span><h2 id="commerce-department-title">Shop by department.</h2></div><Link href="/shop#verified-offers">Shop all products ↗</Link></header>
   <div className="dw-commerce-grid">{departments.map((d,i)=><Link className="dw-commerce-department" key={d.key} href={"/shop?category="+encodeURIComponent(d.key)+"#verified-offers"}><span className="dw-commerce-symbol" aria-hidden="true">{["◉","⌂","◫","✧","◇","♧","♡","◎","♢","▤","▣","✳"][i]}</span><strong>{d.name}</strong><span className="dw-commerce-arrow" aria-hidden="true">↗</span></Link>)}</div>
   <p>Browse current reviewed offers by department. Selection varies as retailer catalogs become available.</p>
  </section>
  <section className="wrap dw-commerce-savings" aria-label="Shopping and savings shortcuts">
   <Link href="/deals"><small>THE SAVINGS EDIT</small><strong>Today's Deals</strong><span>Promotions and reviewed price drops ↗</span></Link>
   <Link href="/shop?budget=25#verified-offers"><small>SHOP BY PRICE</small><strong>Under $25</strong><span>Find affordable products ↗</span></Link>
   <Link href="/shop?budget=50#verified-offers"><small>EVERYDAY VALUE</small><strong>Under $50</strong><span>Browse by budget ↗</span></Link>
   <Link href="/assistant"><small>SHOPPING GUIDANCE</small><strong>Find your match</strong><span>Get help choosing ↗</span></Link>
  </section>
  <DailyFeatureServer/>
  <section className="wrap dw-commerce-departments" aria-label="Discover more savings"><header><div><span className="dw2-eyebrow">SMART SAVINGS</span><h2>Look for recently reduced prices.</h2><p>Compare current offers with earlier reviewed prices, when evidence is available.</p></div><Link href="/deals#savings-title">Explore price drops ↗</Link></header></section>
  {offers.length>0&&<MerchandisingServer kind="discovery" title="Worth discovering." description="Recently reviewed finds across shopping categories. Not necessarily discounted." emptyHref="/guides" emptyLabel="Read shopping guides" limit={6}/>}
  <ShopCatalog offers={offers} configured={available} changes={changes} priceHistoryAvailable={priceHistoryAvailable} initialNow={initialNow} placement="home"/>
  <div className="wrap dw-home-more"><Link className="dw2-button-dark" href="/shop#catalog-search">Search the full catalog ↗</Link><p>Explore all eligible offers using the full catalog search.</p></div>
  {offers.length>0&&<ShoppingShortcuts hasOffers available={available}/>}
  </div>
  <DiscoveryEdit now={Date.now()}/>
  <PersonalDiscovery/>
  <RecentDiscovery/>
  <section className="dw2-intro-band" aria-label="Our approach">
   <div className="wrap dw2-intro-inner"><span>THOUGHTFULLY FOUND.</span><span aria-hidden="true">✳</span><span>DESIGNED FOR DISCOVERY.</span><span aria-hidden="true">✳</span><span>ALWAYS YOUR KIND OF WOW.</span></div>
  </section>
  <section className="wrap dw2-home-collections" id="discover">
   <div className="dw2-section-heading"><div><span className="dw2-eyebrow">01 / A WORLD OF GOOD FINDS</span><h2>Different things.<br/><em>Same great feeling.</em></h2></div><p>Whatever you&apos;re into, start somewhere wonderful. Discover everyday essentials, clever upgrades, meaningful gifts and current reviewed offers all year long.</p></div>
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
   <div className="dw2-feature-art" aria-label="Editorial gift inspiration"><div className="dw2-feature-picture"><Image src="https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1600&q=88" alt="Colorful carefully wrapped presents" fill sizes="(max-width: 820px) 90vw, 45vw" quality={75}/></div><div className="dw2-feature-sticker">THE ART<br/>OF GETTING<br/><b>IT RIGHT.</b><span>✳</span></div></div>
  </div></section>
  <section className="dw2-home-principles"><div className="wrap dw2-principles-wrap"><div><span className="dw2-eyebrow">THE DEALWOVO WAY</span><h2>A little more wonder.<br/><em>A lot more intention.</em></h2></div><div className="dw2-principles"><article><span>01</span><strong>Discover differently.</strong><p>Start with interests and ideas—not a wall of anonymous listings.</p></article><article><span>02</span><strong>Know what&apos;s real.</strong><p>We distinguish editorial inspiration from reviewed retailer offers.</p></article><article><span>03</span><strong>Shop with clarity.</strong><p>When an offer is available, complete your purchase on the retailer&apos;s site.</p></article></div></div></section>
  <NewsletterTeaser/>
  <section className="wrap dw2-home-finale"><span className="dw2-eyebrow">THE GOOD STUFF IS OUT THERE</span><h2>COME CURIOUS.<br/><em>LEAVE INSPIRED.</em></h2><p>There&apos;s always another little thing worth discovering.</p><Link href={offers.length>0?"/shop#verified-offers":"/solutions"} className="dw2-button-lime">{offers.length>0?"Shop reviewed finds":"Explore everyday solutions"} <span aria-hidden="true">↗</span></Link><span className="dw2-finale-star" aria-hidden="true">✳</span></section>
 </main>;
}
