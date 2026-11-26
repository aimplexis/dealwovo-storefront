import Link from "next/link";
import type {createSupabaseServer} from "../../../../src/lib/supabase/server";
import {discoveryHandoffs,type DiscoverySnapshot} from "../../../../src/lib/marketing/discovery-supervisor";
import {trendSignal} from "../../../../src/lib/marketing/trend-intelligence";
import type {Evidence} from "../../../../src/lib/marketing/opportunity";
type Db=NonNullable<Awaited<ReturnType<typeof createSupabaseServer>>>;
const count=(v:unknown):number|null=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0?v:null;
export default async function DiscoveryWorkforce({db,today}:{db:Db;today:string}){
 const [discovery,quality,opportunities,evidence,ledger]=await Promise.all([
  db.rpc("catalog_discovery_report",{p_page:1,p_filter:"all"}),
  db.rpc("catalog_quality_report",{p_page:1,p_filter:"attention"}),
  db.from("commerce_opportunities").select("id").order("key").limit(100),
  db.rpc("latest_opportunity_evidence"),
  db.from("discovery_evidence").select("id",{count:"exact",head:true})
 ]);
 const d=discovery.error?null:discovery.data,q=quality.error?null:quality.data;
 const totals=q?.totals,parts=[count(totals?.expired),count(totals?.blocked),count(totals?.expiring)];
 const ops=opportunities.error||!Array.isArray(opportunities.data)?null:opportunities.data;
 const observations=evidence.error||!Array.isArray(evidence.data)?null:evidence.data as (Evidence&{opportunity_id:string})[];
 // At most 100 hypotheses; do not imply the sample represents every research record.
 const reviewed=ops&&observations?ops.filter(o=>trendSignal(observations.filter(e=>e.opportunity_id===o.id),today).status==="reviewed").length:null;
 const snapshot:DiscoverySnapshot={authorizedSources:count(d?.authorizedSources),eligibleCandidates:count(d?.eligibleCandidates),eligibleOffers:count(totals?.eligible),attentionOffers:parts.every(x=>x!==null)?parts.reduce<number>((a,b)=>a+(b??0),0):null,researchOpportunities:ops?.length??null,reviewedDemand:reviewed,evidenceRecords:ledger.error?null:count(ledger.count)};
 const metrics:[string,number|null][]=[["Authorized sources",snapshot.authorizedSources],["Eligible staged candidates",snapshot.eligibleCandidates],["Historical evidence records",snapshot.evidenceRecords],["Loaded research hypotheses",snapshot.researchOpportunities],["Current reviewed demand observations",snapshot.reviewedDemand],["Database-eligible offers",snapshot.eligibleOffers],["Expired, blocked or expiring offers",snapshot.attentionOffers]];
 return <section className="dw-admin-panel"><p className="dw-admin-kicker">DISCOVERY WORKFORCE / READ-ONLY SNAPSHOT</p><h2>Discovery priorities</h2><p>Calculated on page load from existing protected reports. Research coverage is limited to 100 loaded hypotheses. Counts do not certify product safety, live demand, source rights or publication readiness. Unknown means unavailable, not zero.</p><div className="dw-admin-stats">{metrics.map(([label,value])=><div key={label}><span>{value??"Unknown"}</span><strong>{label}</strong></div>)}</div>{discoveryHandoffs(snapshot).map(h=><article className="dw-admin-detail" key={h.key}><h3>{h.priority}. {h.role}</h3><p>{h.status==="blocked"?"Blocked":h.status==="review"?"Human review":"Available for manual preparation"} · Human handoff only</p><p>{h.detail}</p><Link href={h.href}>Open workflow ↗</Link></article>)}<p>These recommendations are not scheduled tasks, do not invoke tools, and do not modify supervisor execution controls.</p></section>;
}
