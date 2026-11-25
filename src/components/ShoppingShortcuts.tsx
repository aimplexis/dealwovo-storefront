import Link from "next/link";
import "./shopping-shortcuts.css";
const budgets=[{n:"Under $25",v:"25",copy:"Small surprises"},{n:"Under $50",v:"50",copy:"Thoughtful finds"},{n:"Under $100",v:"100",copy:"Something special"},{n:"$150 & up",v:"150plus",copy:"Bigger ideas"}];
const paths=[
 {title:"Find a meaningful gift",copy:"Start with their interests, occasion and budget.",href:"/gifts",symbol:"♡"},
 {title:"Choose the right product",copy:"Get guidance based on what you need.",href:"/assistant",symbol:"✳"},
 {title:"Shop for your lifestyle",copy:"Explore practical ideas for your interests and routines.",href:"/lifestyle",symbol:"⌂"},
 {title:"Shop with confidence",copy:"Read practical buying guides before choosing.",href:"/guides",symbol:"✓"}
];
export default function ShoppingShortcuts({hasOffers=false}:{hasOffers?:boolean}){return <section className="wrap dw-revenue-shortcuts dw-intent-discovery" id="shopping-start" aria-label="Find your next favorite">
 <div className="dw-revenue-discover"><div><span className="dw2-eyebrow">FIND WHAT FITS YOUR LIFE</span><h2>Less searching. <em>More discovering.</em></h2><p>Start with a product, a budget, or someone you love.</p></div><form action="/shop#verified-offers" method="get" className="dw-revenue-search"><label htmlFor="dw-discover-search">What are you looking for?</label><div><input id="dw-discover-search" name="q" type="search" maxLength={100} placeholder="Search reviewed products"/><button type="submit">Search <span aria-hidden="true">↗</span></button></div></form></div>
 {!hasOffers&&<p className="dw-intent-status">Our reviewed product collection is being prepared. Explore gift ideas and buying guides in the meantime.</p>}
 <div className="dw-intent-grid">{paths.map(p=><Link className="dw-intent-card" key={p.href} href={p.href}><span className="dw-intent-symbol" aria-hidden="true">{p.symbol}</span><span><strong>{p.title}</strong><small>{p.copy}</small></span><span aria-hidden="true">↗</span></Link>)}</div>
 <h3 className="dw-intent-budget-heading">Browse by product price</h3><div className="dw-revenue-budgets">{budgets.map((b,i)=><Link className={"dw-revenue-budget tone-"+i} key={b.v} href={"/shop?budget="+b.v+"#verified-offers"}><small>{b.copy}</small><strong>{b.n}</strong><span aria-hidden="true">↗</span></Link>)}</div>
 <p className="dw-intent-note">Price filters apply to reviewed offers when available, before tax and delivery. <Link href="/guides/thoughtful-gifts-under-25">Read our budget gift guide ↗</Link></p>
 <div className="dw-intent-trust"><span>Editorial inspiration, clearly identified</span><span>Reviewed offers when available</span><span>Checkout directly with retailers</span><Link href="/affiliate-disclosure">How we earn ↗</Link></div>
 </section>}
