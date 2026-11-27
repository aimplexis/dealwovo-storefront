import Link from "next/link";
import ShopCatalog from "../shop/ShopCatalog";
import {getPublicOfferResult,getReviewedPriceChanges} from "../../src/lib/catalog/public";
import "../shop/shop.css";
import "../home-commerce.css";
import {pageMetadata} from "../../src/lib/marketing/seo-readiness";
import MerchandisingServer from "../../src/components/MerchandisingServer";
import DailyFeatureServer from "../../src/components/DailyFeatureServer";
import SeasonalShopping from "../../src/components/SeasonalShopping";
export const dynamic="force-dynamic";
export const metadata=pageMetadata("/deals");
export default async function Deals(){
 const {offers,available:catalogAvailable}=await getPublicOfferResult(100);const {changes,available}=await getReviewedPriceChanges(offers.map(o=>o.id));const initialNow=Date.now();
 return <main className="dw2-home dw-wow-shop">
<section className="wrap dw2-home-collections"><div className="dw2-section-heading"><div><span className="dw2-eyebrow">THE SAVINGS EDIT</span><h1>Today&apos;s Deals.</h1></div><p>Discover reviewed promotions and affordable everyday products. Confirm final prices and terms at the retailer.</p></div><Link className="dw2-button-dark" href="/shop#verified-offers">Shop all reviewed products ↗</Link></section>
<div className="dw-commerce-light"><DailyFeatureServer/>
<section className="wrap dw-commerce-departments" aria-labelledby="savings-title"><header><div><span className="dw2-eyebrow">SMART SAVINGS</span><h2 id="savings-title">Recently reduced prices.</h2></div><Link href="/shop#verified-offers">Browse all products ↗</Link></header><p>{catalogAvailable&&available?"Compare current prices against earlier reviewed prices for the same offer. Historical reductions are not advertised sales.":"Price history is temporarily unavailable. No reductions are inferred."}</p></section>
<ShopCatalog offers={offers} configured={catalogAvailable} changes={changes} initialNow={initialNow} onlyDrops placement="daily"/>
</div>
<MerchandisingServer kind="discovery" title="Everyday finds worth exploring." description="Current reviewed products; not necessarily discounted." emptyHref="/shop" emptyLabel="Explore the shop" limit={12}/>
<section className="wrap dw2-home-collections"><div className="dw2-section-heading"><div><span className="dw2-eyebrow">SHOP YOUR BUDGET</span><h2>Good finds at every price.</h2></div><p>Recorded product prices before shipping and tax, not a claim of savings.</p></div><div className="dw-revenue-budgets">{[25,50,100].map((n,i)=><Link className={"dw-revenue-budget tone-"+i} key={n} href={"/shop?budget="+n+"#verified-offers"}><strong>Under ${n}</strong><span aria-hidden="true">↗</span></Link>)}</div></section>
<div className="dw-commerce-light"><SeasonalShopping/></div>
</main>;}
