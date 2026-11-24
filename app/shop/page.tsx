import Link from "next/link";
import {catalogConfigured} from "../../src/lib/supabase/config";
import {getPublicOffers} from "../../src/lib/catalog/public";
import "./shop.css";
export const dynamic="force-dynamic";
export const metadata={title:"Browse verified discoveries | Dealwovo",robots:{index:false,follow:false}};
export default async function ShopPage(){
 const offers=await getPublicOffers();
 return <main className="dw-shop-v3">
  <section className="dw-shop-v3-hero"><div className="wrap"><span className="dw-shop-v3-label">✳ THE DEALWOVO CATALOG</span>
  <h1>GOOD FINDS.<br/><em>REAL OPTIONS.</em></h1>
  <p>Explore approved product discoveries from participating retail partners. Each offer opens on the retailer’s own website.</p>
  <Link href="/gifts" className="dw-shop-v3-light">Explore gift inspiration ↗</Link></div></section>
  <section className="wrap dw-shop-v3-results"><h2>{offers.length?"Verified retailer offers":"Products are coming soon"}</h2>
   {offers.length?<div className="dw-shop-v3-grid">{offers.map(o=><article className="dw-shop-v3-card" key={o.id}>
    {o.product.image_url?<img src={o.product.image_url} alt={o.product.title} loading="lazy"/>:<div className="dw-shop-v3-placeholder" aria-hidden="true">✳</div>}
    <div className="dw-shop-v3-details"><small>{o.product.category.name} · {o.merchant.name}</small>
    <h3>{o.product.title}</h3><p>{o.product.description}</p>
    {o.price_cents!==null?<strong>{new Intl.NumberFormat("en-US",{style:"currency",currency:o.currency}).format(o.price_cents/100)}</strong>:<strong>Price on retailer site</strong>}
    <a href={o.affiliate_url} target="_blank" rel="sponsored nofollow noopener noreferrer">View at retailer ↗</a></div>
   </article>)}</div>:<div className="dw-shop-v3-empty"><div aria-hidden="true">✳</div>
    <h3>{catalogConfigured()?"No verified offers have been published yet.":"Our verified catalog is being prepared."}</h3>
    <p>We're building an affiliate-first discovery experience, not advertising products or prices before they're independently verified.</p>
    <Link href="/gifts">Explore gift ideas ↗</Link></div>}
   <p className="dw-shop-v3-disclosure">Some retailer links may be affiliate links. Dealwovo may earn a commission on qualifying purchases, at no additional cost to you. Always verify final price, availability and shipping on the retailer site. <Link href="/affiliate-disclosure">Affiliate disclosure</Link>.</p>
  </section>
 </main>
}
