import Link from "next/link";
import {redirect} from "next/navigation";
import {visualAccess} from "../../../marketing/visual/access";
import {compareFeed,reviewSync} from "./actions";
import "../../../admin.css";
export const dynamic="force-dynamic";
export const metadata={title:"Awin Feed Synchronization | Dealwovo",robots:{index:false,follow:false}};
const notices:Record<string,string>={compared:"Feed compared. New items staged privately; no existing offers changed.",applied:"Offer updated to draft. Fresh verification is required before publication.",dismissed:"Observation dismissed.",invalid:"Check required fields and confirmation.",invalidfeed:"CSV rejected. Check format, matching advertiser and publisher, price and row limits.",error:"Comparison failed. No partial changes saved.",stale:"Review rejected. The source or offer may have changed; compare the latest feed again."};
const labels:Record<string,string>={new:"New — staged",unchanged:"Unchanged",staged_changed:"Existing draft changed",offer_changed:"Offer update proposed",editorial_changed:"Editorial review needed"};
const price=(n:number|null)=>n===null?"Not supplied":"$"+(n/100).toFixed(2);
export default async function Page({searchParams}:{searchParams:Promise<{run?:string;notice?:string}>}){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const p=await searchParams;
 const [sources,runs]=await Promise.all([a.db.from("catalog_feed_sources").select("id,name").eq("provider","awin").eq("status","authorized").not("awin_merchant_id","is",null).order("name").limit(100),a.db.from("catalog_awin_sync_runs").select("id,source_id,created_at,row_count").order("id",{ascending:false}).limit(25)]);
 const requested=p.run&&/^[1-9][0-9]{0,15}$/.test(p.run)?p.run:null;
 const run=requested??String(runs.data?.[0]?.id??"");
 const selected=run?await a.db.from("catalog_awin_sync_runs").select("id,source_id,created_at,row_count").eq("id",run).maybeSingle():null;
 const result=selected?.data?await a.db.from("catalog_awin_sync_items").select("id,external_product_id,title,kind,metadata_changed,previous_price,proposed_price,previous_url,proposed_url,decision").eq("run_id",run).order("id").limit(100):null;
 const broken=sources.error||runs.error||selected?.error||result?.error;
 return <main className="dw-admin"><div className="dw-admin-shell"><Link href="/admin/imports/awin">← Awin Quick Setup</Link><p className="dw-admin-kicker">DEALWOVO / INCREMENTAL FEED REVIEW</p><h1>Synchronize products.</h1><p>Upload a newly downloaded authorized CSV from one advertiser. No scheduled downloads or network API is active. Missing rows never imply out-of-stock. Product text and imagery are not overwritten automatically.</p>{p.notice&&<p role="status">{Object.hasOwn(notices,p.notice)?notices[p.notice]:"Check status."}</p>}
 {broken?<p role="alert">Synchronization data unavailable. Changes withheld.</p>:<>
 <section className="dw-admin-panel"><h2>Compare a fresh feed</h2>{!sources.data?.length?<p>Register and authorize an Awin program first.</p>:<form action={compareFeed} className="dw-admin-form"><label>Authorized advertiser<select name="source_id" required>{sources.data.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Fresh legacy CSV (100 rows / 100 KB max)<input name="file" type="file" accept=".csv,text/csv" required/></label><label><span><input type="checkbox" name="confirm" value="yes" required/> I confirm this authorized export and permit staging newly discovered products privately.</span></label><button>Compare and stage new products</button></form>}</section>
 <section className="dw-admin-panel"><h2>Recent comparisons</h2>{(runs.data??[]).map(r=><p key={r.id}><Link href={"?run="+r.id}>Run {r.id} · {r.row_count} rows · {new Date(r.created_at).toLocaleString("en-US",{timeZone:"UTC"})} UTC</Link></p>)}{!(runs.data??[]).length&&<p>No comparisons yet.</p>}</section>
 {requested&&!selected?.data&&<p role="alert">Comparison not found.</p>}
 {selected?.data&&<section><h2>Comparison {run}</h2><p>{selected.data.row_count} uploaded rows. Review applies only to proposed offer fields, not editorial metadata.</p>{Object.keys(labels).map(k=><p key={k}>{labels[k]}: {(result?.data??[]).filter(i=>i.kind===k).length}</p>)}
 {(result?.data??[]).map(i=><article key={i.id} className="dw-admin-panel"><h3>{i.title}</h3><p>{i.external_product_id} · {labels[i.kind]??i.kind} {i.decision?"· "+i.decision:""}</p><p>Previous: {price(i.previous_price)} · Feed: {price(i.proposed_price)} (unverified)</p>{i.previous_url!==null&&i.previous_url!==i.proposed_url&&<details><summary>Tracking link changed</summary><p style={{overflowWrap:"anywhere"}}>Previous: {i.previous_url}</p><p style={{overflowWrap:"anywhere"}}>Proposed: {i.proposed_url}</p></details>}{i.metadata_changed&&<p>Editorial feed fields differ from original intake. Inspect the source export manually; no title, description, category or image is overwritten.</p>}{i.kind==="staged_changed"&&<p>Review the existing staged candidate. Reject and reimport if replacement is needed.</p>}
 {!i.decision&&i.kind==="offer_changed"&&<form action={reviewSync} className="dw-admin-form"><input type="hidden" name="item" value={i.id}/><input type="hidden" name="run" value={run}/><label><span><input type="checkbox" name="confirm" value="yes" required/> I reviewed these proposed offer fields and understand this removes existing public approval.</span></label><button name="decision" value="applied">Apply as unverified draft</button></form>}
 {!i.decision&&["offer_changed","editorial_changed","staged_changed"].includes(i.kind)&&<form action={reviewSync}><input type="hidden" name="item" value={i.id}/><input type="hidden" name="run" value={run}/><button className="dw-admin-secondary" name="decision" value="dismissed">Dismiss observation</button></form>}</article>)}</section>}</>}
 <p><Link href="/admin/imports#review-queue">Review newly staged products ↗</Link> · <Link href="/admin">Verify updated draft offers ↗</Link></p>
 </div></main>;
}
