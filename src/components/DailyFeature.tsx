"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {dailyFeature,utcDay,type DailyPromotion} from "../lib/catalog/daily-feature";
import type {AssistantOffer} from "../lib/catalog/shopping-assistant";
import {SaveProduct} from "./WishlistProvider";
export default function DailyFeature({offers,promotion,available,initialNow}:{offers:AssistantOffer[];promotion:DailyPromotion|null;available:boolean;initialNow:number}){
 const [now,setNow]=useState(initialNow),router=useRouter();
 useEffect(()=>{const tick=()=>setNow(Date.now());const id=window.setInterval(tick,30000);const focus=()=>{tick();router.refresh();};window.addEventListener("focus",focus);return()=>{window.clearInterval(id);window.removeEventListener("focus",focus)};},[router]);
 const day=utcDay(now);
 useEffect(()=>{if(day!==utcDay(initialNow))router.refresh();},[day,initialNow,router]);
 const feature=dailyFeature(offers,promotion,now),o=feature?.offer;
 return <section className="wrap dw-daily" id="daily-find" aria-label="Today's featured find"><div className="dw-daily-shell">
 <div className="dw-daily-copy"><span className="dw-daily-kicker">✳ THE DAILY EDIT / {day} UTC</span><h2>{feature?.kind==="deal"?"Deal of the day.":"Today's little wow."}</h2>
 {o?<><p className="dw-daily-type">{feature?.kind==="deal"?"Owner-reviewed retailer promotion":"Daily featured find · not a verified discount"}</p><h3><Link href={"/product/"+o.product.slug}>{o.product.title}</Link></h3><p>{o.product.description}</p><strong>{new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(o.price_cents!/100)}</strong><small>{o.merchant.name} · Reviewed {o.verified_at.slice(0,10)} UTC</small><div className="dw-daily-actions"><a className="dw-daily-cta" href={"/out/"+o.id+"?placement=daily"} rel="sponsored nofollow noreferrer">Visit retailer ↗</a><SaveProduct id={o.product.id} title={o.product.title}/><Link href={"/product/"+o.product.slug}>Details ↗</Link></div></>:<><h3>Something good is on the way.</h3><p>{available?"Our daily feature will appear when a currently reviewed offer with a recorded USD price is available. In the meantime, find your kind of inspiration.":"The catalog is temporarily unavailable. Browse our editorial guides instead."}</p><div className="dw-daily-actions"><Link className="dw-daily-cta" href="/assistant">Find my match ↗</Link><Link href="/gifts">Gift inspiration ↗</Link></div></>}
 <p className="dw-daily-legal">Selection refreshes by UTC day and current eligible catalog data. No live price or stock guarantee. Confirm terms, final price and availability at the retailer. Some links may earn Dealwovo a commission. <Link href="/affiliate-disclosure">Affiliate disclosure</Link>.</p></div>
 <div className="dw-daily-art">{o?.product.image_url?<img src={o.product.image_url} alt={o.product.title} loading="lazy" referrerPolicy="no-referrer"/>:<div aria-hidden="true"><span>✳</span><strong>GOOD FINDS.<br/>EVERY DAY.</strong></div>}<span className="dw-daily-stamp">{feature?.kind==="deal"?"REVIEWED\nPROMOTION":"THE DAILY\nDISCOVERY"}</span></div></div></section>;
}
