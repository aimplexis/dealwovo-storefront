import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServer} from "../../../src/lib/supabase/server";
import type {QualityItem} from "../../../src/lib/catalog/quality";
import "../admin.css";
import "../quality/quality.css";

export const dynamic="force-dynamic";
export const metadata={title:"Deal Evaluation | Dealwovo Admin",robots:{index:false,follow:false}};
const filters=["all","hold","recheck","editorial-review"] as const;
type Priority=Exclude<(typeof filters)[number],"all">;
type Item=QualityItem&{currency:string;priority:Priority;price_known:boolean;comparison_merchant:string|null;comparison_price_cents:number|null;comparison_cents:number|null;comparison_verified_at:string|null};
type Report={totalOffers:number;page:number;pageSize:number;matching:number;inspectedAt:string;totals:Record<Priority,number>;items:Item[]};
const labels={all:"All offers",hold:"Hold",recheck:"Recheck", "editorial-review":"Editorial review"};
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n/100);
const date=(s:string|null)=>s?new Date(s).toLocaleString("en-US",{timeZone:"UTC",dateStyle:"medium",timeStyle:"short"})+" UTC":"Not recorded";
export default async function DealEvaluationPage({searchParams}:{searchParams:Promise<{page?:string;filter?:string}>}){
 const db=await createSupabaseServer();if(!db)redirect("/admin/login?status=setup");
 const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user)redirect("/admin/login");
 const {data:member,error:memberError}=await db.from("catalog_admins").select("role").eq("user_id",user.id).maybeSingle();
 if(memberError||!member||!["owner","editor"].includes(member.role))redirect("/admin/login?status=denied");
 const params=await searchParams,filter=filters.find(x=>x===params.filter)??"all";
 const page=/^[1-9][0-9]{0,5}$/.test(params.page??"")?Number(params.page):1;
 const {data,error}=await db.rpc("catalog_deal_report",{p_page:page,p_filter:filter});
 if(error||!data||!Array.isArray(data.items)||!data.totals)return <main className="dw-admin dw-quality"><div className="dw-admin-shell"><Link href="/admin">← Catalog Command Center</Link><h1>Deal Evaluation</h1><p role="alert" className="dw-admin-warning">Deal data is unavailable. No promotion conclusions can be made.</p></div></main>;
 const report=data as Report,pages=Math.max(1,Math.ceil(report.matching/report.pageSize));
 const href=(p:number,f=filter)=>"/admin/deals?filter="+f+"&page="+p;
 return <main className="dw-admin dw-quality"><div className="dw-admin-shell">
 <div className="dw-quality-heading"><div><Link href="/admin" className="dw-quality-back">← Catalog Command Center</Link><p className="dw-admin-kicker">DEALWOVO / PRIVATE PROMOTION INTELLIGENCE</p><h1>Deal Evaluation <span>Command Center.</span></h1><p className="dw-admin-muted">Review stored offer evidence before promoting products. A current approval is not proof of a discount, live stock or commercial profitability.</p></div><div className="dw-quality-actions"><Link href="/admin/quality">Offer Quality ↗</Link><Link href="/admin/discovery">Product Discovery ↗</Link></div></div>
 <div className="dw-quality-metrics">{filters.map(f=><div key={f} className="dw-quality-metric"><span>{labels[f]}</span><strong>{f==="all"?report.totalOffers:report.totals[f]}</strong><small>{f==="all"?"Catalog-wide count":f==="hold"?"Do not promote":f==="recheck"?"Verification expires soon":"Human evidence review required"}</small></div>)}</div>
 <section className="dw-quality-overview"><div className="dw-quality-guide"><span className="dw-quality-eyebrow">EVIDENCE BEFORE PROMOTION</span><h2>Compare with care.</h2><p>Only current eligible offers for the same catalog product, from different retailers, with positive recorded USD prices qualify for comparison. Variants, shipping, taxes and final checkout prices must still be independently checked.</p><p>Commission potential, demand, historical savings and seasonal fit are not scored without supporting data.</p></div><div className="dw-quality-aside"><span>TRUST BEFORE<br/><em>PROMOTION.</em></span><p>No automatic approvals or published discount claims.</p></div></section>
 <section className="dw-quality-report"><div className="dw-quality-section-title"><div><p className="dw-admin-kicker">PROMOTION REVIEW QUEUE</p><h2>Evaluate offers</h2></div><small>{report.matching} matching · {report.totalOffers} total · Checked {date(report.inspectedAt)}</small></div>
 <nav className="dw-quality-actions" aria-label="Deal filters">{filters.map(f=><Link key={f} href={href(1,f)} aria-current={f===filter?"page":undefined}>{labels[f]}</Link>)}</nav>
 {report.items.length===0?<div className="dw-quality-empty"><h3>No offers match this filter.</h3><p>{report.totalOffers?"Choose another filter.":"Import permitted products and verify retailer offers to begin."}</p><Link href="/admin/imports">Open Affiliate Import Studio ↗</Link></div>:<div className="dw-quality-rows">{report.items.map(item=><article className="dw-quality-row" key={item.id}><div className="dw-quality-row-top"><span className={"dw-quality-status dw-quality-"+item.classification}>{labels[item.priority]}</span><small>{item.merchantName} · {item.classification}</small></div><div className="dw-quality-row-main"><div><h3>{item.productTitle}</h3><p>Recorded price: {item.price_known&&item.price_cents!==null?money(item.price_cents):"No comparable USD price"}</p>{item.comparison_cents!==null&&item.comparison_price_cents!==null?<p>Lowest eligible recorded alternative from another retailer: {item.comparison_merchant} · {money(item.comparison_price_cents)}. This offer is {item.comparison_cents===0?"the same recorded price":money(Math.abs(item.comparison_cents))+(item.comparison_cents>0?" lower":" higher")} — not a verified saving. Alternative verified: {date(item.comparison_verified_at)}.</p>:<p>No eligible cross-retailer comparison available.</p>}<p>{item.reasons.join(" · ")||"Stored eligibility conditions met. Independent review required."}</p><small>Verified: {date(item.verified_at)} · Expiry: {date(item.expires_at)}</small></div><Link href="/admin/quality">Review offer quality →</Link></div></article>)}</div>}
 <nav className="dw-quality-actions" aria-label="Deal report pagination">{report.page>1&&<Link href={href(report.page-1)}>← Previous</Link>}<span>Page {report.page} of {pages}</span>{report.page<pages&&<Link href={href(report.page+1)}>Next →</Link>}</nav></section>
 <section className="dw-quality-notes"><h2>Promotion guardrails</h2><p>Hold blocked, draft, expired or paused offers. Recheck expiring offers. Editorial review is a human decision, not a publishing authorization. Recorded comparison prices may have changed.</p></section>
 </div></main>;
}
