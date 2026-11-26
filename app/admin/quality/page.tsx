import FreshnessHistory from "./freshness";
import ProductQualityAssessment from "./ProductQualityAssessment";
import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServer} from "../../../src/lib/supabase/server";
import type {QualityItem,QualityStatus} from "../../../src/lib/catalog/quality";
import {pauseQualityOfferAction} from "./actions";
import "../admin.css";
import "./quality.css";

export const dynamic="force-dynamic";
export const metadata={title:"Offer Quality | Dealwovo Admin",robots:{index:false,follow:false}};

const labels:Record<QualityStatus,string>={
 expired:"Expired",blocked:"Blocked",expiring:"Expires soon",
 eligible:"Database eligible",draft:"Draft",paused:"Paused"
};
type Report={items:QualityItem[];totals:Record<QualityStatus,number>;totalOffers:number;categories:number;merchants:number;products:number;authorizedSources:number;page:number;pageSize:number;matching:number;inspectedAt:string};
const filters=["attention","all","eligible","expiring","expired","blocked","draft","paused"] as const;
export default async function OfferQualityPage({searchParams}:{searchParams:Promise<{message?:string;page?:string;filter?:string}>}){
 const db=await createSupabaseServer();if(!db)redirect("/admin/login?status=setup");
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user)redirect("/admin/login");
 const {data:member,error:membershipError}=await db.from("catalog_admins")
   .select("role").eq("user_id",user.id).maybeSingle();
 if(membershipError||!member||!["owner","editor"].includes(member.role))
  redirect("/admin/login?status=denied");
 const params=await searchParams;
 const filter=filters.find(x=>x===params.filter)??"attention";
 const requestedPage=/^[1-9][0-9]{0,5}$/.test(params.page??"")?Number(params.page):1;
 const {data,error}=await db.rpc("catalog_quality_report",{p_page:requestedPage,p_filter:filter});
 if(error||!data||!Array.isArray(data.items)||!data.totals){
  console.error("Quality report unavailable",error?.code);
  return <main className="dw-admin dw-quality"><div className="dw-admin-shell"><Link href="/admin">← Catalog Command Center</Link><h1>Offer Quality</h1><p role="alert" className="dw-admin-warning">Quality data is unavailable. No health conclusions can be made.</p></div></main>;
 }
 const report=data as Report;
 const needsAttention=report.items;
 const sourcesAuthorized=report.authorizedSources;
 const allReady=report.totals.eligible;
 const expired=report.totals.expired;
 const watch=report.totals.expiring;
 const pages=Math.max(1,Math.ceil(report.matching/report.pageSize));
 const href=(page:number,f=filter)=>"/admin/quality?filter="+f+"&page="+page;
 const fmt=(date:string|null)=>date?new Date(date).toLocaleString("en-US",{timeZone:"UTC",dateStyle:"medium",timeStyle:"short"})+" UTC":"Not set";
 return <main className="dw-admin dw-quality"><div className="dw-admin-shell">
  <div className="dw-quality-heading">
   <div><Link href="/admin" className="dw-quality-back">← Catalog Command Center</Link>
   <p className="dw-admin-kicker">DEALWOVO / PRIVATE OFFER INTELLIGENCE</p>
   <h1>Offer Quality <span>Command Center.</span></h1>
   <p className="dw-admin-muted">Keep the shopping experience trustworthy. This checks Dealwovo's stored approval and verification rules—not external retailer uptime or live inventory.</p></div>
   <div className="dw-quality-actions"><Link href="/admin/imports">Import Studio ↗</Link><Link href="/shop">Public Shop ↗</Link></div>
  </div>
  {params.message==="paused"?<p role="status" className="dw-admin-success">Offer paused. Its previous approval and verification timestamps were cleared.</p>:params.message?<p role="alert" className="dw-admin-warning">No change was made. Refresh the report and retry if the offer is still approved.</p>:null}
  <div className="dw-quality-metrics">
   <div className="dw-quality-metric"><span>Eligible offers</span><strong>{allReady}</strong><small>Meet stored visibility conditions</small></div>
   <div className="dw-quality-metric is-warn"><span>Expiring within 72h</span><strong>{watch}</strong><small>Recheck before verification lapses</small></div>
   <div className="dw-quality-metric is-danger"><span>Expired or blocked</span><strong>{expired+report.totals.blocked}</strong><small>Not eligible to appear publicly</small></div>
   <div className="dw-quality-metric"><span>Pending review</span><strong>{report.totals.draft+report.totals.paused}</strong><small>Draft or paused offers</small></div>
  </div>
  <FreshnessHistory/>
  <ProductQualityAssessment today={new Date().toISOString().slice(0,10)}/>
  <section className="dw-quality-overview">
   <div className="dw-quality-guide">
    <span className="dw-quality-eyebrow">✳ LAUNCH READINESS</span>
    <h2>{report.totalOffers===0?"Build the first trusted collection.":"Protect every published offer."}</h2>
    <p>{report.totalOffers===0?"The catalog is still intentionally empty. Complete these steps with actual partner authorization and product evidence before shoppers see an offer.":"Offer eligibility is recalculated each time this page loads. No price, stock or URL reachability is claimed to have been checked externally."}</p>
    <div className="dw-quality-steps">
     <div><b>{report.categories>0?"✓":"01"}</b><span>Set up catalog categories</span><small>{report.categories} recorded</small></div>
     <div><b>{report.merchants>0?"✓":"02"}</b><span>Register verified retailers</span><small>{report.merchants} recorded</small></div>
     <div><b>{sourcesAuthorized>0?"✓":"03"}</b><span>Document affiliate feed authorization</span><small>{sourcesAuthorized} marked authorized in admin</small></div>
     <div><b>{report.products>0?"✓":"04"}</b><span>Review product and image rights</span><small>{report.products} product records</small></div>
     <div><b>{allReady>0?"✓":"05"}</b><span>Verify and approve first public offer</span><small>{allReady} eligible in database</small></div>
    </div>
   </div>
   <div className="dw-quality-aside">
    <span>TRUST IS A<br/><em>FEATURE.</em></span>
    <div aria-hidden="true">✳</div>
    <p>Review before publishing. Recheck before expiring. Pause immediately when an offer is no longer reliable.</p>
   </div>
  </section>
  <section className="dw-quality-report">
   <div className="dw-quality-section-title"><div><p className="dw-admin-kicker">REVIEW QUEUE</p><h2>Offer review queue</h2></div>
    <small>Checked {fmt(report.inspectedAt)} · {report.matching} matching · {report.totalOffers} total</small></div>
   <nav aria-label="Filter offers" className="dw-quality-actions">{filters.map(x=><Link key={x} href={href(1,x)} aria-current={filter===x?"page":undefined}>{x==="attention"?"Needs attention":x==="all"?"All offers":labels[x]} {x==="attention"?report.totalOffers-report.totals.eligible:x==="all"?report.totalOffers:report.totals[x]}</Link>)}</nav>
   {needsAttention.length===0?<div className="dw-quality-empty">
    <span aria-hidden="true">✦</span><h3>{report.totalOffers?"No offers match this filter.":"No offers to review yet."}</h3>
    <p>{report.totalOffers?"This does not verify live retailer inventory, external URLs, licensing or final prices.":"Create your first category and authorized retailer in the Catalog Command Center, or begin with a permitted Awin publisher feed."}</p>
    <Link href={report.totalOffers?"/admin":"/admin/imports"}>{report.totalOffers?"Review catalog records ↗":"Open Import Studio ↗"}</Link>
   </div>:<div className="dw-quality-rows">
    {needsAttention.map(item=><article key={item.id} className="dw-quality-row">
     <div className="dw-quality-row-top"><span className={"dw-quality-status dw-quality-"+item.classification}>{labels[item.classification]}</span>
      <small>{item.merchantName}</small>
     </div>
     <div className="dw-quality-row-main"><div><h3>{item.productTitle}</h3>
      <p>{item.reasons.join(" · ")}</p>
      <small>{item.expires_at?"Verification expiry: "+fmt(item.expires_at):"Verification expiry not recorded"}</small></div>
      <div className="dw-quality-row-actions">{item.status==="approved"?
       <form action={pauseQualityOfferAction}><input type="hidden" name="offer_id" value={item.id}/>
        <button type="submit" name="confirm" value="pause" className="dw-admin-secondary">Pause offer now</button></form>:null}
       <Link href="/admin">Review in catalog →</Link></div>
     </div>
    </article>)}
   </div>}
   <nav aria-label="Offer report pagination" className="dw-quality-actions">{report.page>1&&<Link href={href(report.page-1)}>← Previous</Link>}<span>Page {report.page} of {pages}</span>{report.page<pages&&<Link href={href(report.page+1)}>Next →</Link>}</nav>
  </section>
  <section className="dw-quality-notes">
   <h2>Quality rules</h2><p><strong>Eligible</strong> means the offer, product, category and retailer have the required stored statuses, and verification has not expired. <strong>Expiring</strong> means 72 hours or less remain. <strong>Blocked</strong> means a dependency or verification value is missing or invalid. <strong>Expired</strong> means the verification window has ended. Draft and paused offers are not publicly eligible.</p>
   <p>Dealwovo currently does not claim external link uptime checks, live inventory validation, market-wide price comparisons, affiliate sales, or commissions. Those require authorized integrations and additional testing.</p>
  </section>
 </div></main>;
}
