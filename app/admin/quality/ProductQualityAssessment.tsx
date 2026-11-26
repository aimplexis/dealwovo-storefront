"use client";
import {useEffect,useState} from "react";
import {assessProductQuality,qualityChecks,type QualityObservation} from "../../../src/lib/catalog/product-quality";
const empty=():QualityObservation[]=>qualityChecks.map(([check])=>({check,decision:"unknown",source:"",date:"",note:"",confirmed:false}));
export default function ProductQualityAssessment({today}:{today:string}){
 const [rows,setRows]=useState(empty),[product,setProduct]=useState(""),[clock,setClock]=useState(today);
 useEffect(()=>{const tick=()=>setClock(new Date().toISOString().slice(0,10));tick();const t=window.setInterval(tick,30000);return()=>window.clearInterval(t);},[]);
 const result=assessProductQuality(rows,clock);
 const edit=(i:number,patch:Partial<QualityObservation>)=>setRows(prev=>prev.map((r,j)=>i===j?{...r,...patch,confirmed:patch.confirmed===true&&Object.keys(patch).length===1}:r));
 return <section className="dw-admin-panel"><p className="dw-admin-kicker">PRODUCT QUALITY / PRIVATE WORKING REVIEW</p><h2>Evidence before recommendation.</h2><p>This advisory worksheet is temporary and does not change catalog status, save an approval, certify safety or authorize publication. Review each exact product and its offer separately.</p>
 <label>Exact product and variant reference<input value={product} maxLength={180} onChange={e=>{setProduct(e.target.value);setRows(empty());}}/></label>
 {qualityChecks.map(([key,label,maxAge,instruction],i)=><fieldset key={key} disabled={!product.trim()} className="dw-admin-form"><legend>{label}</legend><p>{instruction} Evidence age limit: {maxAge} day(s).</p>
 <label>Review finding<select value={rows[i].decision} onChange={e=>edit(i,{decision:e.target.value as QualityObservation["decision"]})}><option value="unknown">Not established</option><option value="concern">Unresolved concern</option><option value="clear">Evidence supplied</option></select></label>
 <label>Public HTTPS evidence reference<input type="url" maxLength={2000} value={rows[i].source} onChange={e=>edit(i,{source:e.target.value})}/></label>
 <label>Observation date<input type="date" max={clock} value={rows[i].date} onChange={e=>edit(i,{date:e.target.value})}/></label>
 <label>Evidence and limitations<textarea rows={2} maxLength={1200} value={rows[i].note} onChange={e=>edit(i,{note:e.target.value})}/></label>
 <label><span><input type="checkbox" checked={rows[i].confirmed} onChange={e=>edit(i,{confirmed:e.target.checked})}/> I reviewed the exact product and this evidence.</span></label>
 <p>Finding: {result.results[i].status}</p></fieldset>)}
 <p role="status">{!product.trim()?"Identify the product first.":result.status==="hold"?"HOLD — unresolved concerns.":result.status==="incomplete"?"Incomplete evidence.":"Documentation complete — independent verification still required."} {result.documented}/8 checks documented.</p>
 <p>Reported concerns must be resolved outside this worksheet with documented evidence. Existing offer eligibility and owner publication controls remain independent.</p><button type="button" onClick={()=>{setProduct("");setRows(empty());}}>Reset worksheet</button></section>;
}
