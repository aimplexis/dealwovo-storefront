"use client";
import Link from "next/link";
import {useMemo,useState} from "react";
import type {PublicOffer} from "../../src/lib/catalog/public";
type Props={offers:PublicOffer[];configured:boolean};
export default function ShopCatalog({offers,configured}:Props){
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("all");
 const categories=useMemo(()=>[...new Map(offers.map(o=>[o.product.category.slug,o.product.category.name] as const)).entries()], [offers]);
 const shown=useMemo(()=>offers.filter(o=>{
   const matches=category==="all"||o.product.category.slug===category;
   const q=query.trim().toLowerCase();
   return matches && (!q||o.product.title.toLowerCase().includes(q)||o.merchant.name.toLowerCase().includes(q)||o.product.description.toLowerCase().includes(q));
 }),[offers,query,category]);
 return <section className="dw-wow-catalog wrap" id="verified-offers">
   <div className="dw-wow-section-heading dw-reveal-ready">
     <div><div className="dw-wow-kicker">✳ THE VERIFIED EDIT</div><h2>{offers.length?"Real finds,":"The best is"} <em>{offers.length?"real value.":"still ahead."}</em></h2></div>
     <p>We focus on verified retailer offers, not endless listings or invented deals.</p>
   </div>
   {offers.length?<>
     <div className="dw-wow-filterbar" aria-label="Filter verified products">
       <label htmlFor="dw-wow-search">Search approved offers<input id="dw-wow-search" placeholder="Search product names or retailers" type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
       <label htmlFor="dw-wow-category">Browse category<select id="dw-wow-category" value={category} onChange={e=>setCategory(e.target.value)}>
         <option value="all">All categories</option>{categories.map(([slug,name])=><option key={slug} value={slug}>{name}</option>)}
       </select></label>
       <span aria-live="polite">{shown.length} {shown.length===1?"offer":"offers"}</span>
     </div>
     {shown.length?<div className="dw-wow-product-grid">{shown.map(offer=><article className="dw-wow-product-card" key={offer.id}>
       <div className="dw-wow-product-picture">{offer.product.image_url?<img src={offer.product.image_url} loading="lazy" alt={offer.product.title}/>:<span aria-hidden="true">✳</span>}
         <span className="dw-wow-verified"><span aria-hidden="true">✓</span> VERIFIED OFFER</span></div>
       <div className="dw-wow-product-content">
         <span className="dw-wow-product-tag">{offer.product.category.name} / {offer.merchant.name}</span>
         <h3><Link href={"/product/"+offer.product.slug}>{offer.product.title}</Link></h3><p>{offer.product.description}</p>
         <strong>{offer.price_cents===null?"See retailer price":new Intl.NumberFormat("en-US",{style:"currency",currency:offer.currency}).format(offer.price_cents/100)}</strong>
         <Link href={"/out/"+offer.id} rel="sponsored nofollow noreferrer">View verified retailer <span aria-hidden="true">↗</span></Link><Link className="dw-wow-product-details-link" href={"/product/"+offer.product.slug}>Product details →</Link>
       </div></article>)}</div>:<div className="dw-wow-no-match" role="status">No matching verified offers. <button type="button" onClick={()=>{setQuery("");setCategory("all")}}>Clear filters ↗</button></div>}
   </>:<div className="dw-wow-coming">
       <div className="dw-wow-coming-main">
         <div className="dw-wow-coming-glow" aria-hidden="true"/><span className="dw-wow-coming-star" aria-hidden="true">✳</span>
         <span className="dw-wow-kicker">THE COLLECTION IS TAKING SHAPE</span>
         <h3>{configured?"Curating the first verified finds.":"Something good is coming."}</h3>
         <p>Our editorial shopping guide is open. Retailer-backed products and prices will appear only after they're checked and approved.</p>
         <Link href="/gifts">Try the Gift Finder <span aria-hidden="true">↗</span></Link>
       </div>
       <div className="dw-wow-coming-aside">
         <span>GOOD SHOPPING<br/>STARTS WITH<br/><em>GOOD TASTE.</em></span>
         <div className="dw-wow-coming-line" aria-hidden="true">✳ ✦ ✳</div>
       </div>
     </div>}
     <p className="dw-wow-legal">Lifestyle photography is illustrative and does not represent current products for sale. Some verified retailer links may be affiliate links; Dealwovo may earn a commission from qualifying purchases, at no additional cost to you. Confirm final prices, shipping and stock at the retailer. <Link href="/affiliate-disclosure">Read our affiliate disclosure</Link>.</p>
   </section>;
}
