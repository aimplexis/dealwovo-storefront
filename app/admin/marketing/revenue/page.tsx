import Link from "next/link";
import {redirect} from "next/navigation";
import {visualAccess} from "../visual/access";
import {recordStatement} from "./actions";
import {commissionStatuses,formatCents} from "../../../../src/lib/marketing/revenue-input";
import "../../admin.css";
export const dynamic="force-dynamic";
export const metadata={title:"Revenue Intelligence | Dealwovo",robots:{index:false,follow:false}};
const periods=[30,90,365,0] as const;
type Revision={revision:number;statement_ref:string;statement_on:string;status:string;commission_cents:string;created_at:string};
type Entry=Revision&{id:string;source_name:string;provider:string;transaction_ref:string;transaction_on:string;history:Revision[]};
type Report={today:string;days:number;page:number;pageSize:number;matching:number;authorizedSources:number;revisionCount:number;sourceCount:number;totals:{transactions:number;pending:number;approved:number;paid:number;reversed:number;pendingCents:string;approvedCents:string;paidCents:string};sources:{source_id:string;source_name:string;provider:string;transactions:number;approved_cents:string;paid_cents:string}[];items:Entry[]};
const notices:Record<string,string>={recorded:"Statement revision recorded. Not independently verified.",invalid:"Invalid data or missing attestation. Check dates, references and USD amount.",duplicate:"This transaction and statement reference already exist. Nothing added.",error:"Statement rejected. Check source authorization, revision dates and permissions."};
export default async function Page({searchParams}:{searchParams:Promise<{days?:string;page?:string;notice?:string}>}){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const p=await searchParams,days=periods.find(n=>String(n)===p.days)??90,page=/^[1-9][0-9]{0,5}$/.test(p.page??"")?Number(p.page):1;
 const [report,sources]=await Promise.all([a.db.rpc("marketing_revenue_report",{p_days:days,p_page:page}),a.db.from("catalog_feed_sources").select("id,name,provider,status").in("status",["authorized","disabled"]).order("name").order("id").limit(100)]);
 const r=report.data as Report|null,failed=!!(report.error||!r||!r.totals||!Array.isArray(r.items)||!Array.isArray(r.sources));
 const href=(d:number,n=1)=>"/admin/marketing/revenue?days="+d+"&page="+n;
 return <main className="dw-admin"><div className="dw-admin-shell"><Link href="/admin/marketing">← Marketing Agent Studio</Link><p className="dw-admin-kicker">DEALWOVO / PRIVATE FINANCIAL EVIDENCE</p><h1>Revenue Intelligence.</h1><p><Link href="/admin/marketing/revenue/attribution">Conversion & attribution ↗</Link> · <Link href="/admin/marketing/revenue/expenses">Operating expenses ↗</Link> · <Link href="/admin/marketing/revenue/reconcile">Reconcile Awin statements ↗</Link></p><p className="dw-admin-muted">Owner-attested affiliate statement records only. Not verified bank deposits, accounting revenue, sales or profit. No external finance connections are enabled; outbound measurement activation is independently gated.</p>
 {p.notice&&<p role="status">{Object.hasOwn(notices,p.notice)?notices[p.notice]:"Check current ledger status."}</p>}
 <nav className="dw-admin-actions" aria-label="Transaction date period">{periods.map(d=><Link key={d} href={href(d)} aria-current={d===days?"page":undefined}>{d===0?"All time":d+" days"}</Link>)}</nav>
 {failed||!r?<p role="alert" className="dw-admin-warning">Financial report unavailable. No amounts can be confirmed.</p>:<>
 <p>Latest recorded revision per transaction, grouped by transaction date (UTC), not payment date.</p>
 <div className="dw-admin-stats">{[[formatCents(r.totals.pendingCents),"Reported pending"],[formatCents(r.totals.approvedCents),"Reported approved, unpaid"],[formatCents(r.totals.paidCents),"Reported paid"],[String(r.totals.transactions),"Recorded transactions"]].map(([n,label])=><div key={label}><span>{n}</span><strong>{label}</strong></div>)}</div>
 {!r.matching&&<p>No statements recorded for this period. Zero recorded amounts do not establish actual revenue.</p>}
 <p>Reversed transactions: {r.totals.reversed} · Authorized catalog sources: {r.authorizedSources} · All-time statement revisions: {r.revisionCount}</p>
 <section className="dw-admin-panel"><h2>Affiliate source breakdown</h2><p>{r.sourceCount} sources with recorded transactions in this period. Showing up to 100.</p>{r.sources.map(s=><div className="dw-admin-row" key={s.source_id}><span><strong>{s.source_name}</strong><small>{s.provider} · {s.transactions} transactions</small></span><span>Approved {formatCents(s.approved_cents)} · Reported paid {formatCents(s.paid_cents)}</span></div>)}</section>
 <section className="dw-admin-panel"><h2>Record a statement revision</h2><p>Use the exact same source, transaction reference and transaction date for corrections. Enter a new statement reference. Reversals must be $0. Do not include customer identities, payment card numbers or account credentials in references.</p><Link href="/admin/imports">Manage authorized sources ↗</Link>
 {sources.error?<p role="alert">Source list unavailable.</p>:!sources.data?.length?<p>No authorized or disabled sources available. Complete affiliate source authorization first.</p>:<form action={recordStatement} className="dw-admin-form">
 <label>Affiliate source<select name="source_id" required defaultValue=""><option value="" disabled>Select source</option>{sources.data.map(s=><option key={s.id} value={s.id}>{s.name} · {s.provider} · {s.status}</option>)}</select></label>
 <small>Up to 100 authorized or disabled sources. Disabled sources accept existing transaction revisions only.</small>
 <label>Network transaction reference<input name="transaction_ref" required maxLength={80} pattern="[A-Za-z0-9][A-Za-z0-9._:\\-]{0,79}"/></label><label>Statement reference<input name="statement_ref" required maxLength={80} pattern="[A-Za-z0-9][A-Za-z0-9._:\\-]{0,79}"/></label>
 <label>Original transaction date (UTC)<input name="transaction_on" type="date" max={r.today} required/></label><label>Statement date (UTC)<input name="statement_on" type="date" max={r.today} required/></label>
 <label>Reported status<select name="status">{commissionStatuses.map(s=><option key={s}>{s}</option>)}</select></label><label>Commission amount (USD)<input name="amount" inputMode="decimal" pattern="[0-9]{1,7}(\\.[0-9]{1,2})?" placeholder="0.00" required/></label>
 <label><span><input type="checkbox" name="confirm" value="yes" required/> I checked this against an authentic affiliate statement and entered the latest status and amount. This is not bank verification.</span></label><button type="submit">Record immutable revision</button></form>}</section>
 <section><h2>Transaction history</h2><p>Page {r.page} of {Math.max(1,Math.ceil(r.matching/r.pageSize))} · {r.matching} matching transactions</p><div className="dw-admin-grid">{r.items.map(e=><article key={e.id} className="dw-admin-panel"><h3>{e.source_name} · {e.transaction_ref}</h3><p>{e.transaction_on} · {e.status} · {formatCents(e.commission_cents)}</p><p>Statement {e.statement_ref} · {e.statement_on} · revision {e.revision}</p><details><summary>Latest {e.history.length} of {e.revision} revisions</summary>{e.history.map(h=><p key={h.revision}>#{h.revision} · {h.statement_ref} · {h.statement_on} · {h.status} · {formatCents(h.commission_cents)}</p>)}</details></article>)}</div>
 <nav className="dw-admin-actions" aria-label="Transaction pagination">{r.page>1&&<Link href={href(days,r.page-1)}>← Previous</Link>}{r.page*r.pageSize<r.matching&&<Link href={href(days,r.page+1)}>Next →</Link>}</nav></section></>}
 <section className="dw-admin-panel"><h2>Measurement readiness</h2><p>Aggregate navigation and explicit network attribution foundations are available; live collection, automatic conversion matching, settlement verification and network API imports remain held. No ROAS, profit or conversion rate is calculated from these statement entries.</p></section></div></main>;
}
