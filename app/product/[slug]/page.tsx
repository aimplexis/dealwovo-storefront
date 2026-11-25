import MerchandisingServer from "../../../src/components/MerchandisingServer";
import {cache} from "react";
import {comparisonHref} from "../../../src/lib/catalog/comparison";
import {productMetadata} from "../../../src/lib/marketing/seo-readiness";
import Link from "next/link";
import {SaveProduct} from "../../../src/components/WishlistProvider";
import {notFound} from "next/navigation";
import {getVerifiedProductBySlug} from "../../../src/lib/catalog/public";
import "./product.css";

export const dynamic="force-dynamic";
const readProduct=cache(getVerifiedProductBySlug);
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const info=await readProduct(slug);return productMetadata(info?.product??null);}
export default async function ProductDetail({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const info=await readProduct(slug);
  if(!info)notFound();
  const {product,offers}=info;
  return <main className="dw-product-page">
   <div className="wrap dw-product-breadcrumb"><Link href="/shop">← Shop verified finds</Link><span>/</span><span>{product.category.name}</span></div>
   <section className="wrap dw-product-content">
    <div className="dw-product-visual">{product.image_url?<img src={product.image_url} alt={product.title}/>:<div className="dw-product-no-image" aria-label="Product image not available">✳</div>}</div>
    <div className="dw-product-information">
     <span className="dw-product-kicker">✳ VERIFIED RETAILER DISCOVERY</span>
     <h1>{product.title}</h1><p>{product.description||"Explore this product through approved retail partners."}</p>
     <SaveProduct id={product.id} title={product.title}/>
     <div className="dw-product-offers">
      <h2>Where to explore</h2>{offers.length>1&&<p><Link href={comparisonHref(offers.slice(0,4).map(o=>o.id))}>Compare {Math.min(4,offers.length)} retailer offers ↗</Link></p>}
      <p className="dw-product-note">Each offer is checked for validity and expiry. Final price, shipping and stock are confirmed on the retailer site.</p>
      {offers.map(offer=><article className="dw-product-offer" key={offer.id}>
       <div><span>Approved retailer</span><strong>{offer.merchant.name}</strong>
        <small>Verified {new Date(offer.verified_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</small>
       </div><div className="dw-product-offer-action"><strong>{offer.price_cents===null?"Price at retailer":new Intl.NumberFormat("en-US",{style:"currency",currency:offer.currency}).format(offer.price_cents/100)}</strong>
       <Link href={"/out/"+offer.id} rel="sponsored nofollow noreferrer">Visit retailer ↗</Link></div>
      </article>)}
     </div>
     <p className="dw-product-disclosure">Affiliate disclosure: We may earn a commission from eligible retailer purchases, at no additional cost to you. Dealwovo does not process the purchase. <Link href="/affiliate-disclosure">Read details</Link>.</p>
    </div>
   </section>
   <MerchandisingServer kind="recent" related={product} title="More to explore." description="Other products in the same department. Compare exact features and retailer terms before choosing." limit={4}/>
  </main>;
}
