"use client";
import {useState} from "react";
import {departments,suggestDepartment} from "../../../../src/lib/catalog/category-suggestions";
export default function EditorialFields(){
 const [title,setTitle]=useState(""),[override,setOverride]=useState<string|null>(null);
 const suggestion=suggestDepartment(title);
 const selected=override??suggestion?.key??"";
 return <><label>Original editorial title<input name="title" value={title} onChange={e=>setTitle(e.target.value)} minLength={3} maxLength={180} required/></label>
 <label>Editorial department (optional)<select name="category_key" value={selected} onChange={e=>setOverride(e.target.value)}><option value="">Uncategorized</option>{departments.map(d=><option value={d.key} key={d.key}>{d.name}</option>)}</select></label>
 <p aria-live="polite">{suggestion?"Suggested: "+suggestion.name+" (matched "+suggestion.matched.join(", ")+"). Review before saving.":"No unambiguous suggestion yet. Choose a department if appropriate."}</p>{override!==null&&<button type="button" className="dw-admin-secondary" onClick={()=>setOverride(null)}>Use automatic suggestion</button>}
 <label>Original editorial description<textarea name="description" minLength={20} maxLength={1500} required/></label></>;
}
