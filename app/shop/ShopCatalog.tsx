"use client";
import Link from "next/link";
import {SaveProduct} from "../../src/components/WishlistProvider";
import {CompareBar,CompareToggle,useCompareSelection} from "../../src/components/CompareSelection";
import {useMemo,useState} from "react";
import type {PublicOffer} from "../../src/lib/catalog/public";
import {defaults,filterOffers,type Filters} from "../../src/lib/catalog/shop-filters";
type Props={offers:PublicOffer[];configured:boolean;initial?:Filters};
const budgetLabels={all:"Any budget","25":"Under $25","50":"Under $50","100":"Under $100","150plus":"$150 & up"} as const;
const sortLabels={recent:"Recently verified",price_low:"Price: low to high",price_high:"Price: high to low",name:"Name: A–Z"} as const;
export default function ShopCatalog({offers,configured,initial=defaults}:Props){
 const comparison=useCompareSelection();
 const [filters,setFilters]=useState<Filters>(initial);
 const categories=useMemo(()=>[...new Map(offers.map(o=>[o.product.category.slug,o.product.category.name] as const)).entries()].sort((a,b)=>a[1].localeCompare(b[1])),[offers]);
 const shown=useMemo(()=>filterOffers(offers,filters),[offers,filters]);
 const clear=()=>setFilters({...defaults});
 return <section className="dw-wow-catalog wrap dw-revenue-catalog" id="verified-offers">
  <div className="dw-wow-section-heading"><div><div className="dw-wow-kicker">✳ THE VERIFIED EDIT</div><h2>Find something <em>worth discovering.</em></h2></div><p>Browse recently verified retailer offers by interest, budget and price. Final prices and availability are confirmed at the retailer.</p></div>
  <div className="dw-wow-filterbar" aria-label="Filter verified products">
   <label htmlFor="dw-wow-search">Search products<input id="dw-wow-search" placeholder="Product, category or retailer" type="search" maxLength={100} value={filters.q} onChange={e=>setFilters(s=>({...s,q:e.target.value}))}/></label>
   <label htmlFor="dw-wow-category">Category<select id="dw-wow-category" value={filters.category} onChange={e=>setFilters(s=>({...s,category:e.target.value}))}><option value="all">All categories</option>{filters.category!=="all"&&!categories.some(([slug])=>slug===filters.category)&&<option value={filters.category}>Selected category</option>}{categories.map(([slug,name])=><option key={slug} value={slug}>{name}</option>)}</select></label>
   <label htmlFor="dw-wow-budget">Budget<select id="dw-wow-budget" value={filters.budget} onChange={e=>setFilters(s=>({...s,budget:e.target.value as Filters["budget"]}))}>{Object.entries(budgetLabels).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
   <label htmlFor="dw-wow-sort">Sort by<select id="dw-wow-sort" value={filters.sort} onChange={e=>setFilters(s=>({...s,sort:e.target.value as Filters["sort"]}))}>{Object.entries(sortLabels).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
  </div>
  <div className="dw-revenue-resultbar"><span role="status">{shown.length} of {offers.length} loaded offers{filters.budget!=="all"?" with recorded USD prices":""}{offers.length===100?" (latest 100 loaded)":""}</span><button type="button" onClick={clear}>Clear filters</button></div>
  {shown.length>0&&<p className="dw-wow-legal">Dealwovo may earn a commission from qualifying retailer purchases. You complete your purchase on the retailer’s website. <Link href="/affiliate-disclosure">How affiliate links work</Link>.</p>}
  {offers.length>0&&<CompareBar ids={comparison.ids} clear={comparison.clear}/>}
  {shown.length?<div className="dw-wow-product-grid">{shown.map(offer=><article className="dw-wow-product-card" key={offer.id}>
   <Link className="dw-wow-product-picture" href={"/product/"+offer.product.slug} aria-label={"View details: "+offer.product.title}>{offer.product.image_url?<img src={offer.product.image_url} loading="lazy" alt={offer.product.title} referrerPolicy="no-referrer"/>:<span aria-hidden="true">✳</span>}<span className="dw-wow-verified"><span aria-hidden="true">✓</span> VERIFIED OFFER</span></Link>
   <div className="dw-wow-product-content"><span className="dw-wow-product-tag">{offer.product.category.name} / {offer.merchant.name}</span><h3><Link href={"/product/"+offer.product.slug}>{offer.product.title}</Link></h3><p className="dw-revenue-description">{offer.product.description}</p><strong>{offer.price_cents===null?"See retailer price":new Intl.NumberFormat("en-US",{style:"currency",currency:offer.currency}).format(offer.price_cents/100)}</strong><small className="dw-revenue-checked">Checked {new Date(offer.verified_at).toISOString().slice(0,10)} UTC · Final price at retailer</small><a href={"/out/"+offer.id+"?placement=shop"} rel="sponsored nofollow noreferrer">Shop at {offer.merchant.name} <span aria-hidden="true">↗</span></a><Link className="dw-wow-product-details-link" href={"/product/"+offer.product.slug}>Product details →</Link><SaveProduct id={offer.product.id} title={offer.product.title}/><CompareToggle id={offer.id} title={offer.product.title+" at "+offer.merchant.name} selected={comparison.ids} toggle={comparison.toggle}/></div>
  </article>)}</div>:<div className="dw-revenue-empty"><div><span className="dw2-eyebrow">{offers.length?"TRY A DIFFERENT SEARCH":"THE FIRST COLLECTION"}</span><h3>{offers.length?"Nothing matches just yet.":configured?"More good finds are on the way.":"Shopping catalog not available yet."}</h3><p>{offers.length?"Try a different search or budget. Offers without recorded prices are excluded from budget filters.":"Explore thoughtful gift ideas and seasonal inspiration while verified products are being prepared. No placeholder products or invented discounts."}</p><div className="dw-revenue-empty-links">{offers.length?<button onClick={clear}>Show all offers</button>:<Link href="/gifts">Explore Gift Finder ↗</Link>}<Link href="/deals">Holiday inspiration ↗</Link><Link href="/assistant">Get shopping guidance ↗</Link><Link href="/guides">Read buying guides ↗</Link></div></div><div className="dw-revenue-empty-art" aria-hidden="true">✳<span>GOOD FINDS<br/>TAKE A LITTLE<br/>THOUGHT.</span></div></div>}
  <p className="dw-wow-legal">Some retailer links may be affiliate links; Dealwovo may earn a commission from qualifying purchases. Confirm final prices, shipping and stock at the retailer. <Link href="/affiliate-disclosure">Read our affiliate disclosure</Link>.</p>
 </section>;
}
