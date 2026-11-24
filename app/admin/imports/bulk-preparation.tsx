"use client";
import {useState} from "react";
import {prepareBulkDrafts} from "./actions";
type Option={id:string;name:string};
type Candidate={id:string;title:string;price:string;source:string;category:string;merchant:string;slug:string;bound:boolean;merchantOptions:Option[]};
export default function BulkPreparation({items,categories}:{items:Candidate[];categories:Option[]}){
 const [selected,setSelected]=useState<string[]>([]),[confirmed,setConfirmed]=useState(false);
 const [edits,setEdits]=useState<Record<string,{category_id:string;merchant_id:string;slug:string}>>({});
 const row=(c:Candidate)=>edits[c.id]??{category_id:c.category,merchant_id:c.merchant,slug:c.slug};
 const change=(c:Candidate,key:"category_id"|"merchant_id"|"slug",v:string)=>{setEdits(prev=>({...prev,[c.id]:{...(prev[c.id]??row(c)),[key]:v}}));setConfirmed(false);};
 const rows=items.filter(c=>selected.includes(c.id)).map(c=>({candidate_id:c.id,...row(c)}));
 const valid=rows.length>0&&rows.length<=25&&rows.every(r=>r.category_id&&r.merchant_id&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.slug)&&r.slug.length<=130);
 return <section className="dw-admin-panel"><h2>Prepare multiple products</h2><p>Select up to 25 staged candidates. Review each category, retailer and slug. All selected drafts are created together, or none are saved.</p>
 {!items.length?<p>No eligible staged candidates in the current queue.</p>:<form action={prepareBulkDrafts} className="dw-admin-form">
 <input type="hidden" name="rows" value={JSON.stringify(rows)}/>
 <div className="dw-admin-actions"><button type="button" onClick={()=>{setSelected(items.filter(c=>c.category&&c.merchant).slice(0,25).map(c=>c.id));setConfirmed(false);}}>Select up to 25 with suggested assignments</button><button type="button" className="dw-admin-secondary" onClick={()=>{setSelected([]);setConfirmed(false);}}>Clear selection</button></div>
 {items.map(c=><details key={c.id} className="dw-admin-detail"><summary>{c.title} · {c.source} · {selected.includes(c.id)?"Selected":"Not selected"}</summary><p>Feed price: {c.price} (unverified)</p><label><span><input type="checkbox" checked={selected.includes(c.id)} disabled={selected.length>=25&&!selected.includes(c.id)} onChange={e=>{setSelected(prev=>e.target.checked?[...prev,c.id]:prev.filter(x=>x!==c.id));setConfirmed(false);}}/> Include in draft batch</span></label><label>Category<select value={row(c).category_id} onChange={e=>change(c,"category_id",e.target.value)}><option value="">Select category</option>{categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Retailer<select value={row(c).merchant_id} onChange={e=>change(c,"merchant_id",e.target.value)} disabled={c.bound}><option value="">Select retailer</option>{c.merchantOptions.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Product slug<input value={row(c).slug} onChange={e=>change(c,"slug",e.target.value)} maxLength={130}/></label></details>)}
 <p aria-live="polite">{rows.length} selected of 25 maximum.</p><label><span><input type="checkbox" name="confirm" value="yes" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} required/> I reviewed the selected assignments and understand that this creates drafts only.</span></label><button disabled={!valid||!confirmed}>Prepare selected drafts</button></form>}</section>;
}
