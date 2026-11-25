import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServer} from "../../../src/lib/supabase/server";
import "../admin.css";
import "../quality/quality.css";

export const dynamic="force-dynamic";
export const metadata={title:"Product Discovery | Dealwovo Admin",robots:{index:false,follow:false}};

type Candidate={id:string;title:string;description:string;category_hint:string;image_url:string|null;price_cents:number|null;currency:string;created_at:string;external_product_id:string;source_name:string;provider:string;score:number};
function evidence(c:Candidate){
 return [
  {label:"Description supplied",present:Boolean(c.description.trim())},
  {label:"Category hint supplied",present:Boolean(c.category_hint.trim())},
  {label:"Image reference supplied",present:Boolean(c.image_url)},
  {label:"USD price supplied",present:c.price_cents!==null&&c.currency==="USD"}
 ];
}
type Report={authorizedSources:number;stagedCandidates:number;eligibleCandidates:number;completeCandidates:number;matching:number;page:number;pageSize:number;items:Candidate[]};
const filters=["all","complete","incomplete"] as const;
export default async function DiscoveryPage({searchParams}:{searchParams:Promise<{page?:string;filter?:string}>}){
 const db=await createSupabaseServer();if(!db)redirect("/admin/login?status=setup");
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user)redirect("/admin/login");
 const {data:member,error:memberError}=await db.from("catalog_admins").select("role").eq("user_id",user.id).maybeSingle();
 if(memberError||!member||!["owner","editor"].includes(member.role))redirect("/admin/login?status=denied");
 const params=await searchParams;
 const filter=filters.find(x=>x===params.filter)??"all";
 const page=/^[1-9][0-9]{0,5}$/.test(params.page??"")?Number(params.page):1;
 const {data,error}=await db.rpc("catalog_discovery_report",{p_page:page,p_filter:filter});
 if(error||!data||!Array.isArray(data.items))return <main className="dw-admin"><div className="dw-admin-shell"><Link href="/admin">← Catalog Command Center</Link><h1>Product Discovery</h1><p role="alert" className="dw-admin-warning">Discovery data is unavailable. No candidate recommendations can be made.</p></div></main>;
 const report=data as Report;
 const visible=report.items.map(c=>({candidate:c,checks:evidence(c),score:c.score}));
 const pages=Math.max(1,Math.ceil(report.matching/report.pageSize));
 const href=(page:number,f=filter)=>"/admin/discovery?filter="+f+"&page="+page;
 return <main className="dw-admin dw-quality"><div className="dw-admin-shell">
 <div className="dw-quality-heading"><div><Link href="/admin" className="dw-quality-back">← Catalog Command Center</Link><p className="dw-admin-kicker">DEALWOVO / PRIVATE PRODUCT DISCOVERY</p><h1>Product Discovery <span>Intelligence.</span></h1><p className="dw-admin-muted">Prioritize staged candidates from currently authorized affiliate sources. This is a review-readiness ranking, not a demand forecast, deal rating, or recommendation to buy.</p></div><div className="dw-quality-actions"><Link href="/admin/discovery/opportunities">Commercial opportunity research ↗</Link><Link href="/admin/imports">Import Studio ↗</Link><Link href="/admin/quality">Offer Quality ↗</Link></div></div>
 <div className="dw-quality-metrics"><div className="dw-quality-metric"><span>Authorized sources</span><strong>{report.authorizedSources}</strong><small>Recorded authorization, not independent verification</small></div><div className="dw-quality-metric"><span>Staged candidates</span><strong>{report.stagedCandidates}</strong><small>All sources; not publicly listed</small></div><div className="dw-quality-metric"><span>Authorized review queue</span><strong>{report.eligibleCandidates}</strong><small>All authorized staged candidates</small></div><div className="dw-quality-metric"><span>Complete metadata</span><strong>{report.completeCandidates}</strong><small>All four fields supplied</small></div></div>
 <section className="dw-quality-overview"><div className="dw-quality-guide"><span className="dw-quality-eyebrow">SOURCE-TO-REVIEW WORKFLOW</span><h2>Discover with evidence.</h2><p>Register a permitted feed, record owner authorization, upload a licensed CSV, then prioritize candidates with complete metadata. All offers still require independent verification.</p><Link href="/admin/imports">Open Affiliate Import Studio →</Link></div><div className="dw-quality-aside"><span>QUALITY BEFORE<br/><em>QUANTITY.</em></span><p>No scraping. No fabricated deals. No automatic publication.</p></div></section>
 <section className="dw-quality-report"><div className="dw-quality-section-title"><div><p className="dw-admin-kicker">REVIEW PRIORITY</p><h2>Candidate shortlist</h2></div><small>Sorted by supplied metadata completeness, then recency</small></div>
 <nav className="dw-quality-actions" aria-label="Discovery filters">{filters.map(x=><Link key={x} href={href(1,x)} aria-current={x===filter?"page":undefined}>{x==="all"?"All candidates":x==="complete"?"Complete metadata":"Incomplete metadata"}</Link>)}</nav>
 <p>{report.matching} matching candidates</p>
 {visible.length===0?<div className="dw-quality-empty"><h3>No candidates match this filter.</h3><p>{report.authorizedSources?"Upload an authorized product feed to begin discovery.":"Register and document an actual affiliate source authorization before importing products."} No invented examples are shown.</p><Link href="/admin/imports">Set up source or upload feed ↗</Link></div>:<div className="dw-quality-rows">{visible.map(({candidate:c,checks,score})=><article key={c.id} className="dw-quality-row"><div className="dw-quality-row-top"><span className="dw-quality-status">{score}/4 supplied fields</span><small>{c.source_name} · {c.provider}</small></div><div className="dw-quality-row-main"><div><h3>{c.title}</h3><p>{c.category_hint||"No category hint"} · {c.price_cents===null?"No price supplied":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(c.price_cents/100)+" (unverified feed price)"}</p><p>{checks.map(x=>(x.present?"✓ ":"Missing: ")+x.label).join(" · ")}</p><small>Source product ID: {c.external_product_id} · Imported {new Date(c.created_at).toLocaleDateString("en-US",{timeZone:"UTC"})} UTC</small></div><Link href="/admin/imports">Review in Import Studio →</Link></div></article>)}</div>}
 <nav className="dw-quality-actions" aria-label="Discovery pagination">{report.page>1&&<Link href={href(report.page-1)}>← Previous</Link>}<span>Page {report.page} of {pages}</span>{report.page<pages&&<Link href={href(report.page+1)}>Next →</Link>}</nav>
 </section><section className="dw-quality-notes"><h2>What this score means</h2><p>Each supplied metadata field contributes one point. Source authorization is a prerequisite, not a score. The ranking does not verify image rights, price, retailer stock, product safety, commissions, or market demand. Human review remains mandatory.</p></section>
 </div></main>;
}
