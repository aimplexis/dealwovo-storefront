import Link from "next/link";
import {pageMetadata} from "../../src/lib/marketing/seo-readiness";
import MerchandisingServer from "../../src/components/MerchandisingServer";
import DailyFeatureServer from "../../src/components/DailyFeatureServer";
import SeasonalShopping from "../../src/components/SeasonalShopping";
export const dynamic="force-dynamic";
export const metadata=pageMetadata("/deals");
export default function Deals(){return <main className="dw2-home">
<section className="wrap dw2-home-collections"><div className="dw2-section-heading"><div><span className="dw2-eyebrow">THE SAVINGS EDIT</span><h1>Today&apos;s Deals.</h1></div><p>Discover reviewed promotions and affordable everyday products. Confirm final prices and terms at the retailer.</p></div><Link className="dw2-button-dark" href="/shop#verified-offers">Shop all reviewed products ↗</Link></section>
<DailyFeatureServer/>
<MerchandisingServer kind="discovery" title="Everyday finds worth exploring." description="Current reviewed products; not necessarily discounted." emptyHref="/shop" emptyLabel="Explore the shop" limit={12}/>
<section className="wrap dw2-home-collections"><div className="dw2-section-heading"><div><span className="dw2-eyebrow">SHOP YOUR BUDGET</span><h2>Good finds at every price.</h2></div><p>Recorded product prices before shipping and tax, not a claim of savings.</p></div><div className="dw-revenue-budgets">{[25,50,100].map((n,i)=><Link className={"dw-revenue-budget tone-"+i} key={n} href={"/shop?budget="+n+"#verified-offers"}><strong>Under ${n}</strong><span aria-hidden="true">↗</span></Link>)}</div></section>
<SeasonalShopping/>
</main>;}
