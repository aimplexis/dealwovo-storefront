"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import type {AssistantOffer} from "../lib/catalog/shopping-assistant";
import {collectionOffers,relatedOffers,type Collection} from "../lib/catalog/merchandising";
import {SaveProduct} from "./WishlistProvider";
export default function MerchandisingRail({offers,available,initialNow,kind,related,title,description,emptyHref="/shop",emptyLabel="Explore the shop",limit=6}:{offers:AssistantOffer[];available:boolean;initialNow:number;kind:Collection;related?:AssistantOffer["product"];title:string;description:string;emptyHref?:string;emptyLabel?:string;limit?:number}){
 const [now,setNow]=useState(initialNow),router=useRouter();
 useEffect(()=>{const tick=()=>setNow(Date.now());tick();const id=window.setInterval(tick,30000);const focus=()=>{tick();router.refresh();};window.addEventListener("focus",focus);return()=>{window.clearInterval(id);window.removeEventListener("focus",focus);};},[router]);
 const rows=related?relatedOffers(offers,related,now,limit):collectionOffers(offers,kind,now,limit);
 if(related&&!rows.length)return null;
 return <section className="wrap dw-merch" aria-label={title}><div className="dw-merch-head"><div><span className="dw2-eyebrow">✳ THE CURATED EDIT</span><h2>{title}</h2></div><p>{description}</p></div>
 {rows.length?<><div className="dw-merch-grid">{rows.map(o=><article key={o.product.id} className="dw-merch-card"><Link className="dw-merch-img" href={"/product/"+o.product.slug}>{o.product.image_url?<img src={o.product.image_url} alt={o.product.title} loading="lazy" referrerPolicy="no-referrer"/>:<span aria-hidden="true">✳</span>}</Link><div className="dw-merch-copy"><small>{o.product.category.name} · {o.merchant.name}</small><h3><Link href={"/product/"+o.product.slug}>{o.product.title}</Link></h3><strong>{o.currency==="USD"&&Number.isSafeInteger(o.price_cents)&&o.price_cents!>=0?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(o.price_cents!/100):"See retailer price"}</strong><small>Reviewed {o.verified_at.slice(0,10)} UTC</small><div className="dw-merch-actions"><Link prefetch={false} href={"/out/"+o.id} rel="sponsored nofollow noreferrer">Visit retailer ↗</Link><SaveProduct id={o.product.id} title={o.product.title}/></div><Link className="dw-merch-details" href={"/product/"+o.product.slug}>Details and other offers ↗</Link></div></article>)}</div><p className="dw-merch-note">Selected from the latest 100 reviewed catalog offers, one per product. Not a popularity ranking or guarantee of stock, discount or product equivalence. Final price and terms at retailer. Dealwovo may earn a commission. <Link href="/affiliate-disclosure">Affiliate disclosure</Link>.</p></>:<div className="dw-merch-empty"><p>{available?"No current reviewed products match this edit yet.":"The current product catalog is temporarily unavailable."}</p><Link href={emptyHref}>{emptyLabel} ↗</Link></div>}
 </section>;
}
