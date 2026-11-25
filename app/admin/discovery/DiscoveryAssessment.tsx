"use client";
import {useState,useEffect,useRef} from "react";
import {discoveryDimensions,evaluateDiscovery,type DiscoveryObservation} from "../../../src/lib/marketing/discovery-value";
import {loadDiscoveryEvidence,appendDiscoveryEvidence} from "./evidence-actions";
const blank=():DiscoveryObservation[]=>discoveryDimensions.map(([dimension])=>({dimension,rating:"",source:"",date:"",note:"",reviewed:false}));
type Loaded=Extract<Awaited<ReturnType<typeof loadDiscoveryEvidence>>,{ok:true}>;
export default function DiscoveryAssessment({candidateId,title,today}:{candidateId:string;title:string;today:string}){
 const [rows,setRows]=useState(blank),[saved,setSaved]=useState<Loaded|null>(null),[status,setStatus]=useState(""),[busy,setBusy]=useState(false),[clock,setClock]=useState(today);
 const lock=useRef(false);
 useEffect(()=>{const tick=()=>setClock(new Date().toISOString().slice(0,10));tick();const timer=window.setInterval(tick,30000);window.addEventListener("focus",tick);return()=>{window.clearInterval(timer);window.removeEventListener("focus",tick);};},[]);
 const edit=(i:number,patch:Partial<DiscoveryObservation>)=>setRows(prev=>prev.map((r,j)=>j===i?{...r,...patch,reviewed:patch.reviewed===true&&Object.keys(patch).length===1}:r));
 const result=evaluateDiscovery(saved?.rows??[],clock),draft=evaluateDiscovery(rows,clock);
 async function reload(){
  const data=await loadDiscoveryEvidence(candidateId);
  if(!data.ok){setSaved(null);setStatus("Saved evidence is unavailable. No score can be confirmed.");return false;}
  setSaved(data);return true;
 }
 async function run(i?:number){
  if(lock.current)return;lock.current=true;setBusy(true);setStatus("");
  try{
   if(i===undefined){if(await reload())setStatus("Saved evidence loaded.");return;}
   const observation=rows[i];const outcome=await appendDiscoveryEvidence(candidateId,observation);
   if(!outcome.ok){setStatus("Evidence was rejected or could not be saved. Check eligibility and reviewed inputs.");return;}
   setRows(prev=>prev.map((r,j)=>j===i?blank()[i]:r));
   if(await reload())setStatus("Evidence appended to history.");else setStatus("Evidence saved, but retrieval failed. Reload saved evidence before submitting again.");
  }catch{setSaved(null);setStatus("The request could not be confirmed. Reload saved evidence before submitting again.");}
  finally{lock.current=false;setBusy(false);}
 }
 return <details className="dw-admin-panel"><summary>Assess discovery value</summary>
 <h3>{title}</h3><p>Candidate reference: {candidateId}</p><p>Private working assessment. Save each reviewed dimension separately. Ratings are human judgments, not independently verified facts. Unsaved entries are lost on reload.</p>
 <button type="button" disabled={busy} onClick={()=>run()}>Load or refresh saved evidence</button>
 <p role="status">{status}</p>
 <p>Saved evidence coverage: {saved?result.coverage+"%":"Not loaded"} · Saved Discovery Value Score: {saved&&result.score!==null?result.score+"/100":"Unknown"}</p>
 {discoveryDimensions.map(([key,label,weight],i)=><fieldset key={key} disabled={busy} className="dw-admin-form"><legend>{label} ({weight} points)</legend>
 <p>Latest saved rating: {saved?result.results[i].rating??"Unknown or expired":"Not loaded"}</p>
 <label>Rating, 0 to 100<input type="number" min={0} max={100} step={1} value={rows[i].rating} onChange={e=>edit(i,{rating:e.target.value})}/></label>
 <label>Evidence source (HTTPS URL)<input type="url" maxLength={2000} value={rows[i].source} onChange={e=>edit(i,{source:e.target.value})}/></label>
 <label>Observation date<input type="date" max={clock} value={rows[i].date} onChange={e=>edit(i,{date:e.target.value})}/></label>
 <label>Evidence, reasoning and limitations<textarea maxLength={1200} rows={3} value={rows[i].note} onChange={e=>edit(i,{note:e.target.value})}/></label>
 <label><span><input type="checkbox" checked={rows[i].reviewed} onChange={e=>edit(i,{reviewed:e.target.checked})}/> I reviewed this observation and rating.</span></label>
 <button type="button" disabled={draft.results[i].rating===null||busy} onClick={()=>run(i)}>Append reviewed evidence</button>
 </fieldset>)}
 <h3>Recent assessment history</h3>
 {!saved?<p>Load saved evidence to view history.</p>:saved.history.length===0?<p>No evidence has been recorded.</p>:saved.history.map(h=><article key={h.id}><h4>{discoveryDimensions.find(([d])=>d===h.dimension)?.[1]??h.dimension}: {h.rating}/100</h4><p>Observed {h.observed_on} · Recorded {h.recorded_at} · Reviewer {h.reviewer_id}</p><p>{h.note}</p><p>Source: {h.source_url}</p></article>)}
 <p>Shows up to 30 most recent records. All seven dimensions require current reviewed evidence within 30 days. A score does not authorize publication. Verify source rights, product safety, exact variant, retailer terms and offer eligibility independently.</p>
 <button type="button" disabled={busy} onClick={()=>setRows(blank())}>Clear unsaved inputs</button>
 </details>;
}
