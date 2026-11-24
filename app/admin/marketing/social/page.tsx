import Link from "next/link";
import {redirect} from "next/navigation";
import {visualAccess} from "../visual/access";
import {createPlan,reviewPlan} from "./actions";
import "../../admin.css";
export const dynamic="force-dynamic";
export const metadata={title:"Social Media Command Center | Dealwovo",robots:{index:false,follow:false}};
const filters=["all","planned","prepared","archived"] as const;
type Plan={id:string;planned_on:string;status:string;channel:string;campaign_name:string;hook:string;body:string;cta:string;theme:string;format:string;palette:string;asset_id:string;copy_status:string;visual_status:string;readiness:string;history:{previous_status:string;new_status:string;created_at:string}[]};
type Report={today:string;page:number;pageSize:number;matching:number;totals:Record<string,number>;items:Plan[]};
const notices:Record<string,string>={created:"Private calendar entry created.",prepared:"Internally prepared. Nothing published.",archived:"Plan archived.",invalid:"Invalid selections.",confirm:"Confirm the combined campaign review.",error:"Change rejected. Check current source reviews, channel format, date and duplicate entries."};
const readiness:Record<string,string>={archived:"Archived",source_review_required:"Blocked: source review required",date_elapsed:"Blocked: proposed date elapsed",internally_prepared:"Internally prepared — not published",needs_review:"Awaiting combined review"};
export default async function Page({searchParams}:{searchParams:Promise<{page?:string;filter?:string;notice?:string}>}){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const p=await searchParams,filter=filters.find(x=>x===p.filter)??"all",page=/^[1-9][0-9]{0,5}$/.test(p.page??"")?Number(p.page):1;
 const [report,drafts,assets]=await Promise.all([
 a.db.rpc("marketing_social_calendar",{p_page:page,p_filter:filter}),
 a.db.from("marketing_campaign_drafts").select("id,channel,campaign_name").eq("status","reviewed").in("channel",["instagram","facebook","pinterest"]).order("created_at",{ascending:false}).limit(100),
 a.db.from("marketing_visual_assets").select("id,theme,format,palette").eq("status","reviewed").in("format",["square","portrait","landscape"]).eq("template_version",1).order("created_at",{ascending:false}).limit(100)
 ]);
 const r=report.data as Report|null,failed=!!(report.error||!r||!Array.isArray(r.items));
 const href=(n:number,f=filter)=>"/admin/marketing/social?filter="+f+"&page="+n;
 return <main className="dw-admin"><div className="dw-admin-shell">
 <Link href="/admin/marketing">← Marketing Agent Studio</Link><p className="dw-admin-kicker">DEALWOVO / PRIVATE SOCIAL PLANNING</p><h1>Social Media Command Center.</h1><p className="dw-admin-muted">Prepare Instagram, Facebook and Pinterest campaigns using reviewed copy and original graphics. Proposed dates use UTC; no external accounts, publishing jobs, credentials or ad spending.</p>
 <div className="dw-admin-stats">{["Instagram","Facebook","Pinterest"].map(c=><div key={c}><strong>{c}</strong><small>Not connected · manual preparation only</small></div>)}</div>
 {p.notice&&<p role="status">{Object.hasOwn(notices,p.notice)?notices[p.notice]:"Check current calendar status."}</p>}
 <section className="dw-admin-panel"><h2>Build a private calendar entry</h2><p>Instagram: square or portrait. Facebook: square or landscape. Pinterest: portrait. These are supported internal templates, not a guarantee of platform upload compatibility.</p><nav className="dw-admin-actions"><Link href="/admin/marketing?filter=reviewed">Review campaign copy</Link><Link href="/admin/marketing/visual?filter=reviewed">Review graphics</Link></nav>
 {failed||drafts.error||assets.error?<p role="alert">Source data unavailable. Creation withheld.</p>:!drafts.data?.length||!assets.data?.length?<p>Review at least one eligible copy draft and one compatible graphic first.</p>:<form action={createPlan} className="dw-admin-form"><label>Reviewed copy<select name="draft_id" required>{drafts.data.map(d=><option key={d.id} value={d.id}>{d.channel} — {d.campaign_name}</option>)}</select></label><label>Reviewed graphic<select name="asset_id" required>{assets.data.map(v=><option key={v.id} value={v.id}>{v.theme} · {v.format} · {v.palette} · {v.id.slice(0,8)}</option>)}</select></label><label>Proposed date (UTC)<input name="planned_on" type="date" min={r?.today} required/></label><small>Latest 100 reviewed items per source list. Database enforces compatibility and dates within 180 days.</small><button>Create private plan</button></form>}</section>
 <section><h2>Campaign calendar</h2>{failed||!r?<p role="alert">Calendar unavailable. No counts or readiness can be confirmed.</p>:<><nav className="dw-admin-actions" aria-label="Calendar filters">{filters.map(f=><Link key={f} href={href(1,f)} aria-current={f===filter?"page":undefined}>{f} ({r.totals[f]})</Link>)}</nav><p>{r.matching} matching plans · Page {r.page} of {Math.max(1,Math.ceil(r.matching/r.pageSize))}</p>
 <div className="dw-admin-grid">{r.items.map(v=><article key={v.id} className="dw-admin-panel"><p className="dw-admin-kicker">{v.planned_on} · {v.channel}</p><h3>{v.campaign_name}</h3><p><strong>{readiness[v.readiness]??"Readiness unknown"}</strong></p><p>{v.hook}</p><p>{v.body}</p><p>CTA: {v.cta}</p><p>Graphic: {v.theme} · {v.format} · {v.palette}</p><p>Copy: {v.copy_status} · Visual: {v.visual_status}</p><details><summary>Review history</summary>{v.history.map((e,i)=><p key={i}>{e.previous_status} → {e.new_status} · {e.created_at}</p>)}</details>
 {v.readiness==="needs_review"&&<form action={reviewPlan} className="dw-admin-form"><input type="hidden" name="id" value={v.id}/><label><span><input type="checkbox" name="confirm" value="yes" required/> I reviewed the combined copy, visual, claims and proposed date.</span></label><button name="status" value="prepared">Mark internally prepared</button></form>}
 {v.readiness==="internally_prepared"&&<p><a href={"/admin/marketing/visual/download/"+v.asset_id}>Download reviewed SVG</a> · Recheck before external use.</p>}
 {v.status!=="archived"&&<form action={reviewPlan}><input type="hidden" name="id" value={v.id}/><button className="dw-admin-secondary" name="status" value="archived">Archive</button></form>}</article>)}</div>{!r.items.length&&<p>No private plans match this filter.</p>}
 <nav className="dw-admin-actions" aria-label="Calendar pagination">{r.page>1&&<Link href={href(r.page-1)}>← Previous</Link>}{r.page*r.pageSize<r.matching&&<Link href={href(r.page+1)}>Next →</Link>}</nav></>}</section></div></main>;
}
