import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServer} from "../../../src/lib/supabase/server";
import {buildQualityReport,type QualityCategory,type QualityMerchant,type QualityProduct,type QualityOffer,type QualityStatus} from "../../../src/lib/catalog/quality";
import {pauseQualityOfferAction} from "./actions";
import "../admin.css";
import "./quality.css";

export const dynamic="force-dynamic";
export const metadata={title:"Offer Quality | Dealwovo Admin",robots:{index:false,follow:false}};

const labels:Record<QualityStatus,string>={
 expired:"Expired",blocked:"Blocked",expiring:"Expires soon",
 eligible:"Database eligible",draft:"Draft",paused:"Paused"
};
export default async function OfferQualityPage({searchParams}:{searchParams:Promise<{message?:string}>}){
 const db=await createSupabaseServer();if(!db)redirect("/admin/login?status=setup");
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user)redirect("/admin/login");
 const {data:member,error:membershipError}=await db.from("catalog_admins")
   .select("role").eq("user_id",user.id).maybeSingle();
 if(membershipError||!member||!["owner","editor"].includes(member.role))
  redirect("/admin/login?status=denied");
 // Read-only diagnostic queries. RLS limits all data to authorized admins.
 const [cat,mer,prod,off,source]=await Promise.all([
  db.from("catalog_categories").select("id,name,status").order("created_at",{ascending:false}).limit(500),
  db.from("catalog_merchants").select("id,name,status").order("created_at",{ascending:false}).limit(500),
  db.from("catalog_products").select("id,title,slug,status,category_id,image_url").order("created_at",{ascending:false}).limit(500),
  db.from("catalog_offers").select("id,product_id,merchant_id,status,verified_at,expires_at,price_cents,created_at,updated_at").order("updated_at",{ascending:false}).limit(500),
  db.from("catalog_feed_sources").select("id,status").limit(500)
 ]);
 const failed=[cat,mer,prod,off,source].some(result=>result.error);
 const params=await searchParams;
 if(failed){
  console.error("Quality dashboard read failed",...( [cat,mer,prod,off,source].filter(x=>x.error).map(x=>x.error?.code) ));
  return <main className="dw-admin dw-quality"><div className="dw-admin-shell">
   <Link href="/admin" className="dw-quality-back">← Catalog Command Center</Link>
   <h1>Offer Quality</h1>
   <div role="alert" className="dw-admin-warning">Quality data is unavailable. Check Supabase permissions and the latest migrations. No health conclusions can be made.</div>
  </div></main>;
 }
 const categories=(cat.data||[]) as QualityCategory[];
 const merchants=(mer.data||[]) as QualityMerchant[];
 const products=(prod.data||[]) as QualityProduct[];
 const offers=(off.data||[]) as QualityOffer[];
 const feeds=(source.data||[]) as {id:string;status:string}[];
 const report=buildQualityReport(categories,merchants,products,offers);
 const hasLimit=[cat,mer,prod,off,source].some(r=>(r.data||[]).length>=500);
 const needsAttention=report.items.filter(x=>x.classification!=="eligible");
 const sourcesAuthorized=feeds.filter(s=>s.status==="authorized").length;
 const allReady=report.items.filter(x=>x.classification==="eligible").length;
 const expired=report.items.filter(x=>x.classification==="expired").length;
 const watch=report.items.filter(x=>x.classification==="expiring").length;
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
  {hasLimit?<p role="alert" className="dw-admin-warning">This report inspects up to the 500 most recent records per table. Counts and relationships may be incomplete at larger volumes. Paginated reporting is required before using it for full-catalog operations.</p>:null}
  <div className="dw-quality-metrics">
   <div className="dw-quality-metric"><span>Eligible offers</span><strong>{allReady}</strong><small>Meet stored visibility conditions</small></div>
   <div className="dw-quality-metric is-warn"><span>Expiring within 72h</span><strong>{watch}</strong><small>Recheck before verification lapses</small></div>
   <div className="dw-quality-metric is-danger"><span>Expired or blocked</span><strong>{expired+report.totals.blocked}</strong><small>Not eligible to appear publicly</small></div>
   <div className="dw-quality-metric"><span>Pending review</span><strong>{report.totals.draft+report.totals.paused}</strong><small>Draft or paused offers</small></div>
  </div>
  <section className="dw-quality-overview">
   <div className="dw-quality-guide">
    <span className="dw-quality-eyebrow">✳ LAUNCH READINESS</span>
    <h2>{offers.length===0?"Build the first trusted collection.":"Protect every published offer."}</h2>
    <p>{offers.length===0?"The catalog is still intentionally empty. Complete these steps with actual partner authorization and product evidence before shoppers see an offer.":"Offer eligibility is recalculated each time this page loads. No price, stock or URL reachability is claimed to have been checked externally."}</p>
    <div className="dw-quality-steps">
     <div><b>{categories.length>0?"✓":"01"}</b><span>Set up catalog categories</span><small>{categories.length} recorded</small></div>
     <div><b>{merchants.length>0?"✓":"02"}</b><span>Register verified retailers</span><small>{merchants.length} recorded</small></div>
     <div><b>{sourcesAuthorized>0?"✓":"03"}</b><span>Document affiliate feed authorization</span><small>{sourcesAuthorized} marked authorized in admin</small></div>
     <div><b>{products.length>0?"✓":"04"}</b><span>Review product and image rights</span><small>{products.length} product records</small></div>
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
   <div className="dw-quality-section-title"><div><p className="dw-admin-kicker">REVIEW QUEUE</p><h2>What needs attention</h2></div>
    <small>Checked {fmt(report.inspectedAt)} · latest 500 offers maximum</small></div>
   {needsAttention.length===0?<div className="dw-quality-empty">
    <span aria-hidden="true">✦</span><h3>{offers.length?"No database warning flags in the scanned offers.":"No offers to review yet."}</h3>
    <p>{offers.length?"This does not verify live retailer inventory, external URLs, licensing or final prices.":"Create your first category and authorized retailer in the Catalog Command Center, or begin with a permitted Awin publisher feed."}</p>
    <Link href={offers.length?"/admin":"/admin/imports"}>{offers.length?"Review catalog records ↗":"Open Import Studio ↗"}</Link>
   </div>:<div className="dw-quality-rows">
    {needsAttention.map(item=><article key={item.id} className="dw-quality-row">
     <div className="dw-quality-row-top"><span className={"dw-quality-status dw-quality-"+item.classification}>{labels[item.classification]}</span>
      <small>{item.merchantName}</small>
     </div>
     <div className="dw-quality-row-main"><div><h3>{item.productTitle}</h3>
      <p>{item.reasons.join(" · ")}</p>
      <small>{item.expires_at?"Verification expiry: "+fmt(item.expires_at):"Verification expiry not recorded"}</small></div>
      <div className="dw-quality-row-actions">{item.classification==="expiring"||item.classification==="expired"||item.classification==="blocked"?
       <form action={pauseQualityOfferAction}><input type="hidden" name="offer_id" value={item.id}/>
        <button type="submit" name="confirm" value="pause" className="dw-admin-secondary">Pause offer now</button></form>:null}
       <Link href="/admin">Review in catalog →</Link></div>
     </div>
    </article>)}
   </div>}
  </section>
  <section className="dw-quality-notes">
   <h2>Quality rules</h2><p><strong>Eligible</strong> means the offer, product, category and retailer have the required stored statuses, and verification has not expired. <strong>Expiring</strong> means less than 72 hours remain. <strong>Blocked</strong> means a dependency or verification value is missing or invalid. <strong>Expired</strong> means the verification window has ended. Draft and paused offers are not publicly eligible.</p>
   <p>Dealwovo currently does not claim external link uptime checks, live inventory validation, market-wide price comparisons, affiliate sales, or commissions. Those require authorized integrations and additional testing.</p>
  </section>
 </div></main>;
}
