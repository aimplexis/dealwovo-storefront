import {parseShopFilters} from "../../src/lib/catalog/shop-filters";
import AmazonEditorial from "./AmazonEditorial";
import {pageMetadata} from "../../src/lib/marketing/seo-readiness";
import Link from "next/link";
import Image from "next/image";
import {searchPublicCatalog,getReviewedPriceChanges} from "../../src/lib/catalog/public";
import {catalogConfigured} from "../../src/lib/supabase/config";
import ShopCatalog from "./ShopCatalog";
import "./shop.css";
import {departments} from "../../src/lib/catalog/category-suggestions";
export const dynamic="force-dynamic";
export const metadata=pageMetadata("/shop");
const categories=[
 {name:"Tech & gadgets",label:"01 / THE CURIOUS EDIT",href:"/trending",image:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1100&q=84",alt:"Headphones styled for an editorial technology collection"},
 {name:"Thoughtful gifts",label:"02 / THE GIFT EDIT",href:"/gifts",image:"https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1100&q=84",alt:"Beautifully wrapped gifts"},
 {name:"Everyday living",label:"03 / THE DAILY EDIT",href:"/essentials",image:"https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1100&q=84",alt:"Bright modern home interior"}
];
export default async function ShopPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams;const filters=parseShopFilters(params);
 const rawPage=typeof params.page==="string"&&/^\d{1,3}$/.test(params.page)?Number(params.page):1;const page=Math.max(1,Math.min(500,rawPage));
 const retailer=typeof params.retailer==="string"?params.retailer.trim().slice(0,100):"";
 const {offers,available,hasMore}=await searchPublicCatalog(filters,page,retailer);
 const pageHref=(n:number)=>"/shop?"+new URLSearchParams({...filters,retailer,page:String(n)}).toString()+"#verified-offers";
 const {changes}=await getReviewedPriceChanges(offers.map(o=>o.id));const initialNow=Date.now();
 return <main className="dw-wow-shop dw2-shop">
  <section className="wrap dw2-shop-hero">
   <div className="dw2-shop-hero-copy">
    <span className="dw2-eyebrow">THE DEALWOVO DISCOVERY EDIT / VOL. 01</span>
    <h1>Good taste.<br/><em>Great finds.</em></h1>
    <p>Find thoughtful gifts, useful gadgets and everyday upgrades. Search by product, browse by budget, and explore recently verified offers.</p>
    <div className="dw2-shop-hero-actions"><Link href="#verified-offers" className="dw2-button-dark">Shop by product or budget <span aria-hidden="true">↓</span></Link><Link className="dw2-shop-textlink" href="/gifts">Need a gift instead? ↗</Link><Link className="dw2-shop-textlink" href="/assistant">Help me choose ↗</Link></div>
    <div className="dw2-shop-hero-rule"><span aria-hidden="true">✳</span> CURATED IDEAS / REAL RETAILER OFFERS / NO INVENTED DISCOUNTS</div>
   </div>
   <div className="dw2-shop-hero-visual">
    <div className="dw2-shop-hero-photo"><Image src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1400&q=88" alt="Premium beauty and self-care editorial imagery" fill priority sizes="(max-width: 850px) 90vw, 45vw" quality={80}/></div>
    <div className="dw2-shop-orb">THE FINDS<br/><b>FEEL GOOD.</b><span>✳</span></div>
    <span className="dw2-shop-photo-label">CURIOUSLY GOOD / 2026</span>
   </div>
  </section>
  <section className="wrap dw-revenue-shortcuts" aria-label="Search the full reviewed catalog"><form action="/shop#verified-offers" method="get" className="dw-wow-filterbar dw-full-search" key={JSON.stringify([filters,retailer])}><label>Search products<input name="q" type="search" maxLength={100} defaultValue={filters.q} placeholder="Product or everyday need"/></label><label>Department<select name="category" defaultValue={filters.category}><option value="all">All departments</option>{departments.map(d=><option key={d.key} value={d.key}>{d.name}</option>)}{filters.category!=="all"&&!departments.some(d=>d.key===filters.category)&&<option value={filters.category}>{filters.category}</option>}</select></label><label>Retailer<input name="retailer" maxLength={100} defaultValue={retailer} placeholder="Exact retailer name"/></label><label>Budget<select name="budget" defaultValue={filters.budget}><option value="all">Any budget</option><option value="25">Under $25</option><option value="50">Under $50</option><option value="100">Under $100</option><option value="150plus">$150 &amp; up</option></select></label><label>Sort<select name="sort" defaultValue={filters.sort}><option value="recent">Recently reviewed</option><option value="price_low">Price: low to high</option><option value="price_high">Price: high to low</option><option value="name">Name: A–Z</option></select></label><button type="submit">Search catalog ↗</button><Link href="/shop#verified-offers">Reset search</Link></form><p>{available?`Page ${page} · ${offers.length} matching offers on this page`:"Catalog search is temporarily unavailable."}</p></section>
  <ShopCatalog key={JSON.stringify([filters,retailer,page])} offers={offers} configured={catalogConfigured()&&available} changes={changes} initialNow={initialNow} serverSearch/>
  <nav className="wrap dw-catalog-pagination" aria-label="Catalog pages">{page>1&&<Link href={pageHref(page-1)}>← Previous page</Link>}<span>Page {page}</span>{available&&hasMore&&page<500&&<Link href={pageHref(page+1)}>Next page →</Link>}</nav>
  <section className="dw2-shop-edits"><div className="wrap">
   <div className="dw2-shop-edits-head"><div><span className="dw2-eyebrow">PICK YOUR PATH</span><h2>Explore the <em>edits.</em></h2></div><p>Different interests, one place to start. Discover editorial categories while we build the verified product catalog.</p></div>
   <div className="dw2-shop-edits-grid">{categories.map(c=><Link key={c.name} href={c.href} className="dw2-shop-edit">
    <Image src={c.image} alt={c.alt} fill sizes="(max-width: 650px) 100vw, 33vw" quality={75}/>
    <div className="dw2-shop-edit-mask" aria-hidden="true"/>
    <span className="dw2-shop-edit-label">{c.label}</span>
    <span className="dw2-shop-edit-name">{c.name}<b aria-hidden="true">↗</b></span>
   </Link>)}</div>
   <p className="dw2-shop-illustration">The images above are editorial illustrations of shopping interests, not live product listings.</p>
  </div></section>
  <AmazonEditorial/>
  <section className="wrap dw2-shop-commitment"><div><span className="dw2-eyebrow">BUYING WITH INTENTION</span><h2>Make a thoughtful choice.</h2></div><div><p>Explore our practical shopping guides before choosing a product.</p><Link href="/guides">Read buying guides ↗</Link></div></section>
  <section className="wrap dw2-shop-commitment"><div><span className="dw2-eyebrow">WHAT MAKES A GOOD FIND?</span><h2>Discovery with<br/><em>a little more intention.</em></h2></div><div><p>Our product listings are built around approved retailers, reviewable sources, and time-limited offer verification. We don't claim a discount unless we can substantiate it.</p><Link href="/affiliate-disclosure">How our affiliate links work ↗</Link></div></section>
 </main>;
}
