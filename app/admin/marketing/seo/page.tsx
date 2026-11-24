import Link from "next/link";
import {redirect} from "next/navigation";
import {visualAccess} from "../visual/access";
import {seoPages,auditMetadata,siteOrigin} from "../../../../src/lib/marketing/seo-readiness";
import {selectOccasion} from "../../../../src/lib/marketing/content-brief";
import CopyReview from "./copy-review";
import "../../admin.css";
export const dynamic="force-dynamic";
export const metadata={title:"SEO Intelligence | Dealwovo",robots:{index:false,follow:false}};
export default async function Page(){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const calendar=await a.db.rpc("marketing_season_preview");
 const rows=Object.entries(seoPages).map(([path,p])=>({path,...p})),audit=auditMetadata(rows);
 return <main className="dw-admin"><div className="dw-admin-shell"><Link href="/admin/marketing">← Marketing Agent Studio</Link><p className="dw-admin-kicker">DEALWOVO / PRIVATE SEARCH READINESS</p><h1>SEO Intelligence.</h1><p className="dw-admin-muted">Prepare accurate, useful search content before launch. No keyword volumes, ranking or traffic metrics are connected.</p>
 <div className="dw-admin-stats"><div><strong>INDEXING HOLD</strong><small>Public noindex + robots disallow</small></div><div><span>{rows.length}</span><strong>Tracked static page metadata</strong></div><div><span>{audit.filter(x=>!x.issues.length).length}</span><strong>Metadata checks clear</strong></div><div><strong>SEARCH CONSOLE</strong><small>Not connected</small></div></div>
 <section className="dw-admin-panel"><h2>Technical launch gates</h2><p>Canonical targets use {siteOrigin}. Product metadata requires a current verified product. Public sitemap publication, crawling permission, actual indexed pages, legal copy, contact details and source rights are separate launch gates. This is a configuration inventory, not a live crawl or search ranking audit.</p><p>Indexing stays disabled. No sitemap submitted or public indexing enabled.</p></section>
 <section><h2>Metadata and keyword hypotheses</h2><p>These are suggested editorial topics, not researched search demand. Current calendar context: {calendar.error?"Unavailable":selectOccasion(calendar.data)}.</p><div className="dw-admin-grid">{rows.map((p,i)=><article className="dw-admin-panel" key={p.path}><h3>{p.title}</h3><p>{p.description}</p><p>{siteOrigin+p.path}</p><p>{p.intent}</p><p>{p.topics.length?p.topics.join(" · "):"No commercial keyword target"}</p><p>{audit[i].issues.join(" · ")||"Local metadata checks clear"}</p><Link href={p.path}>Inspect page ↗</Link></article>)}</div></section>
 <CopyReview/><section className="dw-admin-panel"><h2>Search performance readiness</h2><p>Search Console, live keyword research, external trend data and conversion tracking are not connected. No estimated impressions or rank claims. Owner authorization and a verified domain property are required before connecting.</p></section></div></main>;
}
