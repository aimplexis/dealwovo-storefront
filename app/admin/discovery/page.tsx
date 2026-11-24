import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServer} from "../../../src/lib/supabase/server";
import "../admin.css";
import "../quality/quality.css";

export const dynamic="force-dynamic";
export const metadata={title:"Product Discovery | Dealwovo Admin",robots:{index:false,follow:false}};

type Candidate={id:string;title:string;description:string;category_hint:string;image_url:string|null;price_cents:number|null;currency:string;created_at:string;external_product_id:string;catalog_feed_batches:{catalog_feed_sources:{id:string;name:string;provider:string;status:string}}};
function evidence(c:Candidate){
 return [
  {label:"Description supplied",present:Boolean(c.description.trim())},
  {label:"Category hint supplied",present:Boolean(c.category_hint.trim())},
  {label:"Image reference supplied",present:Boolean(c.image_url)},
  {label:"USD price supplied",present:c.price_cents!==null&&c.currency==="USD"}
 ];
}
export default async function DiscoveryPage(){
 const db=await createSupabaseServer();if(!db)redirect("/admin/login?status=setup");
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user)redirect("/admin/login");
 const {data:member,error:memberError}=await db.from("catalog_admins").select("role").eq("user_id",user.id).maybeSingle();
 if(memberError||!member||!["owner","editor"].includes(member.role))redirect("/admin/login?status=denied");
 const [sources,staged,rows]=await Promise.all([
  db.from("catalog_feed_sources").select("id",{count:"exact",head:true}).eq("status","authorized"),
  db.from("catalog_feed_candidates").select("id",{count:"exact",head:true}).eq("status","staged"),
  db.from("catalog_feed_candidates").select("id,title,description,category_hint,image_url,price_cents,currency,created_at,external_product_id,catalog_feed_batches!inner(catalog_feed_sources!inner(id,name,provider,status))")
   .eq("status","staged").eq("catalog_feed_batches.catalog_feed_sources.status","authorized").order("created_at",{ascending:false}).order("id").limit(100)
 ]);
 if(sources.error||staged.error||rows.error)return <main className="dw-admin"><div className="dw-admin-shell"><Link href="/admin">← Catalog Command Center</Link><h1>Product Discovery</h1><p role="alert" className="dw-admin-warning">Discovery data is unavailable. No candidate recommendations can be made.</p></div></main>;
 const candidates=(rows.data||[]) as unknown as Candidate[];
 const visible=candidates.filter(c=>c.catalog_feed_batches?.catalog_feed_sources?.status==="authorized").map(c=>({candidate:c,checks:evidence(c),score:evidence(c).filter(x=>x.present).length})).sort((a,b)=>b.score-a.score||b.candidate.created_at.localeCompare(a.candidate.created_at)||a.candidate.id.localeCompare(b.candidate.id));
 return <main className="dw-admin dw-quality"><div className="dw-admin-shell">
 <div className="dw-quality-heading"><div><Link href="/admin" className="dw-quality-back">← Catalog Command Center</Link><p className="dw-admin-kicker">DEALWOVO / PRIVATE PRODUCT DISCOVERY</p><h1>Product Discovery <span>Intelligence.</span></h1><p className="dw-admin-muted">Prioritize staged candidates from currently authorized affiliate sources. This is a review-readiness ranking, not a demand forecast, deal rating, or recommendation to buy.</p></div><div className="dw-quality-actions"><Link href="/admin/imports">Import Studio ↗</Link><Link href="/admin/quality">Offer Quality ↗</Link></div></div>
 <div className="dw-quality-metrics"><div className="dw-quality-metric"><span>Authorized sources</span><strong>{sources.count??0}</strong><small>Recorded authorization, not independent verification</small></div><div className="dw-quality-metric"><span>Staged candidates</span><strong>{staged.count??0}</strong><small>All sources; not publicly listed</small></div><div className="dw-quality-metric"><span>Review queue sample</span><strong>{visible.length}</strong><small>Up to 100 recent authorized candidates</small></div><div className="dw-quality-metric"><span>Complete metadata</span><strong>{visible.filter(x=>x.score===4).length}</strong><small>In sample; all four fields supplied</small></div></div>
 {candidates.length>=100&&<p role="alert" className="dw-admin-warning">Only the latest 100 authorized staged candidates are inspected. Ranking is limited to this sample.</p>}
 <section className="dw-quality-overview"><div className="dw-quality-guide"><span className="dw-quality-eyebrow">SOURCE-TO-REVIEW WORKFLOW</span><h2>Discover with evidence.</h2><p>Register a permitted feed, record owner authorization, upload a licensed CSV, then prioritize candidates with complete metadata. All offers still require independent verification.</p><Link href="/admin/imports">Open Affiliate Import Studio →</Link></div><div className="dw-quality-aside"><span>QUALITY BEFORE<br/><em>QUANTITY.</em></span><p>No scraping. No fabricated deals. No automatic publication.</p></div></section>
 <section className="dw-quality-report"><div className="dw-quality-section-title"><div><p className="dw-admin-kicker">REVIEW PRIORITY</p><h2>Candidate shortlist</h2></div><small>Sorted by supplied metadata completeness, then recency</small></div>
 {visible.length===0?<div className="dw-quality-empty"><h3>No eligible staged candidates yet.</h3><p>{sources.count?"Upload an authorized product feed to begin discovery.":"Register and document an actual affiliate source authorization before importing products."} No invented examples are shown.</p><Link href="/admin/imports">Set up source or upload feed ↗</Link></div>:<div className="dw-quality-rows">{visible.map(({candidate:c,checks,score})=><article key={c.id} className="dw-quality-row"><div className="dw-quality-row-top"><span className="dw-quality-status">{score}/4 supplied fields</span><small>{c.catalog_feed_batches.catalog_feed_sources.name} · {c.catalog_feed_batches.catalog_feed_sources.provider}</small></div><div className="dw-quality-row-main"><div><h3>{c.title}</h3><p>{c.category_hint||"No category hint"} · {c.price_cents===null?"No price supplied":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(c.price_cents/100)+" (unverified feed price)"}</p><p>{checks.map(x=>(x.present?"✓ ":"Missing: ")+x.label).join(" · ")}</p><small>Source product ID: {c.external_product_id} · Imported {new Date(c.created_at).toLocaleDateString("en-US",{timeZone:"UTC"})} UTC</small></div><Link href="/admin/imports">Review in Import Studio →</Link></div></article>)}</div>}
 </section><section className="dw-quality-notes"><h2>What this score means</h2><p>Each supplied metadata field contributes one point. Source authorization is a prerequisite, not a score. The ranking does not verify image rights, price, retailer stock, product safety, commissions, or market demand. Human review remains mandatory.</p></section>
 </div></main>;
}
