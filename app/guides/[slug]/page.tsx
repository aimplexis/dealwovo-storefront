import MerchandisingServer from "../../../src/components/MerchandisingServer";
import {guideCollections} from "../../../src/lib/catalog/merchandising";
import Link from "next/link";
import {notFound} from "next/navigation";
import {guideBySlug,guidePath,guides} from "../../../src/lib/marketing/shopping-guides";
import {indexingHold,siteOrigin} from "../../../src/lib/marketing/seo-readiness";
import "../guides.css";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const g=guideBySlug((await params).slug);return g?{title:g.title,description:g.description,alternates:{canonical:siteOrigin+guidePath(g.slug)},robots:indexingHold}:{title:"Guide unavailable",robots:indexingHold};}
export const dynamic="force-dynamic";
export function generateStaticParams(){return guides.map(g=>({slug:g.slug}));}
export default async function Page({params}:{params:Promise<{slug:string}>}){const g=guideBySlug((await params).slug);if(!g)notFound();return <main className="dw-guides wrap"><nav aria-label="Breadcrumb"><Link href="/">Home</Link> / <Link href="/guides">Shopping guides</Link></nav><article className="dw-guide-article"><span className="dw2-eyebrow">{g.category}</span><h1>{g.title}</h1><p className="dw-guide-intro">{g.description}</p>{g.sections.map(([h,b])=><section key={h}><h2>{h}</h2><p>{b}</p></section>)}<p className="dw-guide-disclosure">Editorial buying advice; no hands-on product testing is claimed. Some retailer links on Dealwovo may earn us a commission. <Link href="/affiliate-disclosure">Affiliate disclosure</Link>.</p><Link className="dw2-button-dark" href={g.href}>{g.cta} ↗</Link></article>{guideCollections[g.slug]&&<MerchandisingServer kind={guideCollections[g.slug]} title="Explore matching reviewed products." description="Matches the guide’s shopping theme using catalog text and category; not a tested recommendation." emptyHref={g.href} emptyLabel={g.cta} limit={4}/>}<section><h2>More shopping guides</h2><div className="dw-guides-grid">{guides.filter(x=>x.slug!==g.slug).map(x=><article key={x.slug}><Link href={guidePath(x.slug)}>{x.title} ↗</Link></article>)}</div></section></main>;}
