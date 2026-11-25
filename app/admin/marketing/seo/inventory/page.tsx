import Link from "next/link";
import {redirect} from "next/navigation";
import {visualAccess} from "../../visual/access";
import {getAssistantOffers} from "../../../../../src/lib/catalog/public";
import {inventoryPaths,sitemapPreview} from "../../../../../src/lib/marketing/search-inventory";
import "../../../admin.css";
export const dynamic="force-dynamic";
export const metadata={title:"Search inventory | Dealwovo",robots:{index:false,follow:false}};
export default async function Page(){const a=await visualAccess();if(!a.ok)redirect("/admin/login");const r=await getAssistantOffers();const paths=inventoryPaths(r.offers.map(o=>o.product));return <main className="dw-admin"><div className="dw-admin-shell"><Link href="/admin/marketing/seo">← SEO Intelligence</Link><h1>Search publication inventory.</h1><p>Private sitemap preparation only. Public indexing remains blocked. Static editorial paths are candidates for review, not approved for indexing. Product candidates require current eligible offers and at least 120 description characters; this length check is not evidence of originality or quality. Latest 100 offers sampled; full catalog enumeration remains required before launch.</p>{!r.available&&<p role="alert">Catalog unavailable; product candidates unknown.</p>}<section className="dw-admin-panel"><h2>{paths.length} candidate URLs</h2><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{sitemapPreview(paths)}</pre><p>Do not submit until legal, technical, domain and content reviews are complete. Excludes utility, admin, redirect and API pages.</p></section></div></main>;}
