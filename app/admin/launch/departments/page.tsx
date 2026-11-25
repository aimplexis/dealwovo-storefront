import Link from "next/link";
import {redirect} from "next/navigation";
import {visualAccess} from "../../marketing/visual/access";
import {departments} from "../../../../src/lib/catalog/category-suggestions";
import {publishDepartments} from "./actions";
import "../../admin.css";
export const dynamic="force-dynamic";
export const metadata={title:"Shopping Departments | Dealwovo",robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{notice?:string}>}){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");const params=await searchParams;
 const {data,error}=await a.db.from("catalog_categories").select("id,slug,name,status").in("slug",departments.map(d=>d.key));
 const rows=data??[],published=rows.filter(r=>r.status==="published").length;
 return <main className="dw-admin"><div className="dw-admin-shell"><Link href="/admin/launch">← Revenue Launch Center</Link><h1>Shopping departments.</h1><p>12 permanent departments for imports, discovery and recommendations. Holiday deals, gift discovery, trending finds and daily deals remain cross-category collections.</p>{params.notice&&<p role="status">{params.notice==="saved"?"Selected empty departments published. No products or offers were published.":"No changes saved. Review selection, existing products and category names."}</p>}
 {error?<p role="alert">Department records unavailable.</p>:<section className="dw-admin-panel"><h2>{rows.length} of 12 initialized · {published} published</h2><p>Review and select empty draft departments to publish. The database rejects renamed, populated or changed departments; review those individually in Catalog Command Center. Empty categories do not create product listings.</p><form action={publishDepartments} className="dw-admin-form">{departments.map(d=>{const row=rows.find(r=>r.slug===d.key),available=row?.status==="draft"&&row.name===d.name;return <label key={d.key}><span><input type="checkbox" name="department" value={d.key} defaultChecked={available} disabled={!available}/> {d.name} · {row?row.name===d.name?row.status:"Name differs — individual review":"Missing"}</span><small>/{d.key}</small></label>;})}<label><span><input type="checkbox" name="confirm" value="yes" required/> I approve publishing the selected empty departments only. This is not authorization to publish products, offers or the production website.</span></label><button type="submit" disabled={!rows.some(r=>r.status==="draft"&&departments.some(d=>d.key===r.slug&&d.name===r.name))}>Publish selected empty departments</button></form></section>}
 <p><Link href="/admin/imports/connect">Next: affiliate partner connections ↗</Link> · <Link href="/admin">Individual catalog review ↗</Link></p></div></main>;
}
