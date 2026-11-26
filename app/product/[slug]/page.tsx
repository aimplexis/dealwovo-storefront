import MobilePurchaseBar from "../../../src/components/MobilePurchaseBar";
import MerchandisingServer from "../../../src/components/MerchandisingServer";
import {cache} from "react";
import {comparisonHref} from "../../../src/lib/catalog/comparison";
import {productMetadata} from "../../../src/lib/marketing/seo-readiness";
import Link from "next/link";
import {buyingChecks} from "../../../src/lib/catalog/recommendation-evidence";
import {RecordRecentProduct} from "../../../src/components/RecentDiscovery";
import {SaveProduct} from "../../../src/components/WishlistProvider";
import {notFound} from "next/navigation";
import {getVerifiedProductBySlug,getReviewedPriceChanges} from "../../../src/lib/catalog/public";
import "./product.css";
import {reviewedPriceDrop,validTarget} from "../../../src/lib/catalog/price-watch";

export const dynamic="force-dynamic";
const readProduct=cache(getVerifiedProductBySlug);
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const info=await readProduct(slug);return productMetadata(info?.product??null);}
export default async function ProductDetail({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const info=await readProduct(slug);
  if(!info)notFound();
  const {product,offers}=info;
  const {changes}=await getReviewedPriceChanges(offers.map(o=>o.id));
  const now=Date.now();
  const priced=(o:typeof offers[number])=>o.currency==="USD"&&validTarget(o.price_cents);
  const current=offers.filter(o=>Date.parse(o.verified_at)<=now&&Date.parse(o.expires_at)>now);
  if(!current.length)notFound();
  const ordered=[...current].sort((a,b)=>Number(priced(b))-Number(priced(a))||(priced(a)&&priced(b)?a.price_cents!-b.price_cents!:0)||Date.parse(b.verified_at)-Date.parse(a.verified_at)||a.id.localeCompare(b.id));
  const primary=ordered[0];
  const money=(c:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(c/100);
  const dropFor=(o:typeof primary)=>{const matches=changes.filter(c=>c.offerId===o.id);return reviewedPriceDrop(o,matches.length===1?matches[0]:undefined,now);};
  return <main className="dw-product-page"><RecordRecentProduct slug={product.slug} title={product.title}/>
   <div className="wrap dw-product-breadcrumb"><Link href="/shop">← Shop verified finds</Link><span>/</span><Link href={"/shop?category="+encodeURIComponent(product.category.slug)+"#verified-offers"}>{product.category.name}</Link></div>
   <section className="wrap dw-product-content">
    <div className="dw-product-visual">{product.image_url?<img src={product.image_url} alt={product.title} referrerPolicy="no-referrer"/>:<div className="dw-product-no-image" aria-label="Product image not available">✳</div>}</div>
    <div className="dw-product-information">
     <span className="dw-product-kicker">✳ VERIFIED RETAILER DISCOVERY</span>
     <h1>{product.title}</h1><p>{product.description||"Explore this product through approved retail partners."}</p>
     <section className="dw-product-buybox" aria-label="Featured retailer offer">
      <span className="dw-product-kicker">REVIEWED RETAILER OFFER</span>
      <strong className="dw-product-main-price">{priced(primary)?money(primary.price_cents!):"See retailer price"}</strong>
      <p>{primary.merchant.name} · Reviewed {primary.verified_at.slice(0,10)} UTC</p>
      <p className="dw-product-note">Selected from up to 20 current offers; recorded product price only, before shipping and tax. Not a lowest-price guarantee.</p>
      <p className="dw-product-disclosure">Dealwovo may earn a commission from qualifying purchases. <Link href="/affiliate-disclosure">Affiliate disclosure</Link>.</p>
      <a className="dw-product-primary-cta" href={"/out/"+primary.id+"?placement=product"} rel="sponsored nofollow noreferrer">Shop at {primary.merchant.name} ↗</a>
      <div className="dw-product-buybox-actions"><SaveProduct id={product.id} title={product.title}/><a href="#retailer-offers">View retailer offers ↓</a></div>
     </section>
     <div className="dw-product-offers" id="retailer-offers">
      <h2>Shop this product</h2>{ordered.length>1&&<p><Link href={comparisonHref(ordered.slice(0,4).map(o=>o.id))}>Compare {Math.min(4,ordered.length)} retailer offers ↗</Link></p>}
      <p className="dw-product-note">Each offer is checked for validity and expiry. The retailer handles checkout, payment, delivery, returns and order support. Confirm final price, stock and retailer terms before buying.</p>
      <p className="dw-product-disclosure">Dealwovo may earn a commission from qualifying purchases. <Link href="/affiliate-disclosure">How affiliate links work</Link>.</p>
      {ordered.map(offer=>{const drop=dropFor(offer);return <article className="dw-product-offer" key={offer.id}>
       <div><span>Approved retailer</span><strong>{offer.merchant.name}</strong>
        <small>Verified {new Date(offer.verified_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</small>
       </div><div className="dw-product-offer-action"><strong>{priced(offer)?money(offer.price_cents!):"See retailer price"}</strong>
       {drop&&<div className="dw-product-price-evidence"><b>{drop.percent>0?drop.percent+"% lower":"Price decreased"}</b><small>Previously recorded {money(drop.previousCents)} on {drop.previousVerifiedAt.slice(0,10)} UTC. Not a retailer list price.</small></div>}
       <a href={"/out/"+offer.id+"?placement=product"} rel="sponsored nofollow noreferrer">Check price at retailer ↗</a></div>
      </article>;})}
     </div>
     <section className="dw-product-note" aria-label="Buying considerations"><h2>Before you buy</h2><ul>{buyingChecks(product.category.slug).map(check=><li key={check}>{check}</li>)}</ul><p>These are general buying checks, not tested product attributes or a guarantee of suitability.</p></section>
     
     <p className="dw-product-disclosure">Affiliate disclosure: We may earn a commission from eligible retailer purchases, at no additional cost to you. Dealwovo does not process the purchase. <Link href="/affiliate-disclosure">Read details</Link>.</p>
    </div>
   </section>
   <MerchandisingServer kind="recent" related={product} title="More to explore." description="Other products in the same department. Compare exact features and retailer terms before choosing." limit={4}/>
   <MobilePurchaseBar offerId={primary.id} merchant={primary.merchant.name} price={priced(primary)?money(primary.price_cents!):"See retailer price"} verifiedAt={primary.verified_at} expiresAt={primary.expires_at} initialNow={now}/>
  </main>;
}
