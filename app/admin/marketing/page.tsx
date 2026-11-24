import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServer} from "../../../src/lib/supabase/server";
import {generateMarketingDraftsAction,reviewMarketingDraftAction} from "./actions";
import "../admin.css";
import "./marketing.css";
export const dynamic="force-dynamic";
export const metadata={title:"Marketing Agent Studio | Dealwovo",robots:{index:false,follow:false}};
type Run={id:string;source:string;created_at:string;summary:string;draft_count:number;verified_offer_count:number};
type Draft={id:string;channel:string;agent:string;campaign_name:string;focus:string;hook:string;body:string;cta:string;supporting_evidence:string;compliance_note:string;status:string;suggested_day:string|null};
const agents=[
 ["◈","Campaign Strategist","Coordinates weekly themes and distribution plans."],
 ["✳","Content Studio","Generates channel-specific campaign copy drafts."],
 ["◇","SEO Guardian","Develops factual outlines that need source research."],
 ["◎","Trust Guardian","Blocks unverified promotions and product claims."],
 ["↗","Performance Analyst","Reads existing catalog evidence, not imaginary revenue."]
];
export default async function MarketingStudio({searchParams}:{searchParams:Promise<{notice?:string}>}){
 const db=await createSupabaseServer();if(!db)redirect("/admin/login?status=setup");
 const {data:{user}}=await db.auth.getUser();if(!user)redirect("/admin/login");
 const {data:member}=await db.from("catalog_admins").select("role").eq("user_id",user.id).maybeSingle();
 if(!member)redirect("/admin/login?status=denied");
 const [runsResult,draftsResult,schedulerResult,seasonResult]=await Promise.all([
  db.from("marketing_agent_runs").select("id,source,created_at,summary,draft_count,verified_offer_count").order("created_at",{ascending:false}).limit(25),
  db.from("marketing_campaign_drafts").select("id,channel,agent,campaign_name,focus,hook,body,cta,supporting_evidence,compliance_note,status,suggested_day").order("created_at",{ascending:false}).limit(100),
  db.rpc("marketing_scheduler_status"),
  db.rpc("marketing_season_preview")
 ]);
 if(runsResult.error||draftsResult.error)return <main className="dw-admin"><div className="dw-admin-shell"><Link href="/admin">← Catalog</Link><h1>Marketing Agent Studio</h1><p role="alert" className="dw-admin-warning">Marketing tables or permissions unavailable. Verify migration 008.</p></div></main>;
 const runs=(runsResult.data||[]) as Run[],drafts=(draftsResult.data||[]) as Draft[];
 const owner=member.role==="owner",notice=(await searchParams).notice;
 const seasons=(seasonResult.data||[]) as {event_name:string;event_date:string;prep_days:number;theme:string;categories:string;days_until:number}[];
 const scheduler=schedulerResult.error?"unknown":schedulerResult.data==="active"?"active":"inactive";
 return <main className="dw-admin dw-marketing"><div className="dw-admin-shell">
  <Link href="/admin" className="dw-marketing-back">← Catalog Command Center</Link>
  <div className="dw-marketing-head"><div><p className="dw-admin-kicker">DEALWOVO / PRIVATE GROWTH WORKFORCE</p><h1>Your marketing team.<br/><em>Working behind the scenes.</em></h1><p className="dw-admin-muted">Five specialized marketing roles working together on honest, reviewable campaigns. Nothing is posted, emailed, or advertised automatically.</p></div><div className="dw-marketing-orb"><strong>5</strong><span>COORDINATED ROLES ✳</span></div></div>
  <div className="dw-marketing-guard"><span>✳ {scheduler==="active"?"WEEKLY PLANNING":"ON-DEMAND PLANNING"}</span><span>✓ OWNER APPROVAL</span><span>◎ NO INVENTED PRICES</span><span>◈ NO AD SPENDING</span></div>
  {notice&&<p role="status" className={["generated","reviewed","archived"].includes(notice)?"dw-admin-success":"dw-admin-warning"}>{
   notice==="generated"?"Four new private campaign drafts generated.":notice==="reviewed"?"Marked internally reviewed—not published.":notice==="archived"?"Draft archived.":notice==="cooldown"?"Please allow 30 minutes between manual runs.":"A change could not be completed; review the database and try again."
  }</p>}
  <div className="dw-marketing-metrics"><div><small>LAST 25 RUNS</small><strong>{runs.length}</strong></div><div><small>AWAITING REVIEW</small><strong>{drafts.filter(d=>d.status==="draft").length}</strong></div><div><small>INTERNALLY REVIEWED</small><strong>{drafts.filter(d=>d.status==="reviewed").length}</strong></div><div><small>VERIFIED OFFERS AT LAST RUN</small><strong>{runs[0]?.verified_offer_count??0}</strong></div></div>
  <section className="dw-marketing-command"><div><p className="dw-admin-kicker">OVERSEER / CAMPAIGN PLANNER</p><h2>Make every week more intentional.</h2><p>Generate four private editorial drafts on demand. {scheduler==="active"?"Weekly planning is enabled: Monday at 14:00 UTC.":scheduler==="inactive"?"Weekly planning is inactive.":"Weekly scheduler status could not be verified."} Suggested dates are proposals—not scheduled posts.</p>
   <small>{runs[0]?("Most recent: "+new Date(runs[0].created_at).toLocaleString("en-US")+" · "+runs[0].source+" · "+runs[0].summary):"No campaign runs yet."}</small>
   </div><form action={generateMarketingDraftsAction}><button disabled={!owner} type="submit">Generate 4 new drafts ↗</button><small>{owner?"Manual runs are limited by the database to once every 30 minutes.":"Only the owner may create campaigns."}</small></form>
  </section>
  <section className="dw-marketing-section"><p className="dw-admin-kicker">SEASONAL INTELLIGENCE / US SHOPPING CALENDAR</p><h2>Plan ahead. <em>Stay relevant.</em></h2><p className="dw-admin-muted">Calendar-based editorial opportunities, not verified demand or discount forecasts. The planner adapts new drafts to the nearest occasion inside its preparation window.</p>{seasonResult.error?<p role="alert">Seasonal calendar unavailable.</p>:<div className="dw-marketing-personas">{seasons.map(e=><article key={e.event_name+e.event_date}><span>{e.days_until<=e.prep_days?"PLAN NOW":"UPCOMING"}</span><h3>{e.event_name}</h3><p>{e.event_date} · {e.days_until} days away</p><p>{e.theme}</p><p>{e.categories}</p></article>)}</div>}</section>
  <section className="dw-marketing-section"><p className="dw-admin-kicker">YOUR AGENT TEAM</p><h2>Five roles. <em>One mission.</em></h2><div className="dw-marketing-personas">{agents.map(([symbol,name,desc])=><article key={name}><span>{symbol}</span><h3>{name}</h3><p>{desc}</p></article>)}</div></section>
  <section className="dw-marketing-section"><p className="dw-admin-kicker">PRIVATE CONTENT QUEUE</p><h2>Ideas ready for <em>human judgment.</em></h2>
    {drafts.length===0?<div className="dw-marketing-empty"><span>✳</span><h3>No drafts yet</h3><p>Generate your first private batch using the planner above, or allow the enabled weekly planner to run.</p></div>:<div className="dw-marketing-drafts">{drafts.map(d=><article key={d.id}>
    <div className="dw-marketing-draft-head"><span>{d.channel.toUpperCase()} / {d.agent.replaceAll("_"," ")}</span><b>{d.status}</b></div><h3>{d.campaign_name}</h3><strong>{d.hook}</strong><p>{d.body}</p>
    <div className="dw-marketing-cta">CTA: {d.cta}</div>
    <details><summary>Evidence & compliance</summary><p>Evidence: {d.supporting_evidence}</p><p>Guardrails: {d.compliance_note}</p><p>Suggested date: {d.suggested_day||"Not scheduled"} (not published)</p></details>
    {owner&&d.status==="draft"&&<div className="dw-marketing-actions"><form action={reviewMarketingDraftAction}><input name="draft_id" type="hidden" value={d.id}/><button name="status" value="reviewed" type="submit">Mark internally reviewed</button></form><form action={reviewMarketingDraftAction}><input name="draft_id" type="hidden" value={d.id}/><button className="dw-admin-secondary" name="status" value="archived" type="submit">Archive</button></form></div>}
    </article>)}</div>}
  </section>
  <div className="dw-marketing-disclaimer"><h2>Built to protect the brand.</h2><p>Automation currently generates factual editorial drafts and routes them through an approval queue. No external social account, SEO trend feed, affiliate conversion feed, email system, paid model or ad platform is connected. A reviewed draft is not a published post.</p></div>
 </div></main>;
}
