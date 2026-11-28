import Link from "next/link";
import {guides,guidePath} from "../../src/lib/marketing/shopping-guides";
import {indexingHold,siteOrigin} from "../../src/lib/marketing/seo-readiness";
import "./guides.css";
export const metadata={title:"Shopping Guides",description:"Practical buying advice for gifts, electronics, home and holiday shopping.",alternates:{canonical:siteOrigin+"/guides"},robots:indexingHold};
export default function Page(){return <main className="dw-guides wrap"><span className="dw2-eyebrow">THE GOOD FINDS LIBRARY</span><h1>Shop with a little more intention.</h1><p>Useful buying advice, not paid rankings or claims of hands-on testing.</p><div className="dw-guides-grid">{guides.map(g=><article key={g.slug}><small>{g.category}</small><h2><Link href={guidePath(g.slug)}>{g.title} ↗</Link></h2><p>{g.description}</p></article>)}</div><p><Link href="/trust">Read our editorial standards ↗</Link></p><Link href="/shop">Explore the shop ↗</Link></main>;}
