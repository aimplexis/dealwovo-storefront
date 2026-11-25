"use client";
import {useState} from "react";
import {discoveryDimensions,evaluateDiscovery,type DiscoveryObservation} from "../../../src/lib/marketing/discovery-value";
export default function DiscoveryAssessment({candidateId,title,today}:{candidateId:string;title:string;today:string}){
 const [rows,setRows]=useState<DiscoveryObservation[]>(()=>discoveryDimensions.map(([dimension])=>({dimension,rating:"",source:"",date:"",note:"",reviewed:false})));
 const result=evaluateDiscovery(rows,today);
 const edit=(i:number,patch:Partial<DiscoveryObservation>)=>setRows(prev=>prev.map((r,j)=>j===i?{...r,...patch,reviewed:patch.reviewed===true&&Object.keys(patch).length===1}:r));
 return <details className="dw-admin-panel"><summary>Assess discovery value</summary>
 <h3>{title}</h3><p>Candidate reference: {candidateId}</p><p>Private working assessment. Ratings are human judgments, not verified facts. Entries remain in this page only and are lost on reload. No publication or database change is made.</p>
 {discoveryDimensions.map(([key,label,weight],i)=><fieldset key={key} className="dw-admin-form"><legend>{label} ({weight} points)</legend>
 <label>Rating, 0 to 100<input type="number" min={0} max={100} step={1} value={rows[i].rating} onChange={e=>edit(i,{rating:e.target.value})}/></label>
 <label>Evidence source (HTTPS URL)<input type="url" maxLength={2000} value={rows[i].source} onChange={e=>edit(i,{source:e.target.value})}/></label>
 <label>Observation date<input type="date" max={today} value={rows[i].date} onChange={e=>edit(i,{date:e.target.value})}/></label>
 <label>Evidence, reasoning and limitations<textarea maxLength={1200} rows={3} value={rows[i].note} onChange={e=>edit(i,{note:e.target.value})}/></label>
 <label><span><input type="checkbox" checked={rows[i].reviewed} onChange={e=>edit(i,{reviewed:e.target.checked})}/> I reviewed this observation and rating.</span></label>
 <p>{result.results[i].rating===null?"Unknown or incomplete evidence":"Reviewed input supplied; not independently verified."}</p></fieldset>)}
 <p role="status">Evidence coverage: {result.coverage}% · Discovery Value Score: {result.score===null?"Unknown":result.score+"/100"}</p>
 <p>All seven dimensions require current reviewed evidence within 30 days. A score does not authorize publication. Verify source rights, product safety, exact variant, retailer terms and offer eligibility independently.</p>
 <button type="button" onClick={()=>setRows(discoveryDimensions.map(([dimension])=>({dimension,rating:"",source:"",date:"",note:"",reviewed:false})))}>Reset working assessment</button>
 </details>;
}
