import Link from "next/link";
import {redirect} from "next/navigation";
import {visualAccess} from "../marketing/visual/access";
import {registerSupplier} from "./actions";
import {supplierKinds,supplierMethods} from "../../../src/lib/commerce/supplier-intake";
import "../admin.css";
export const dynamic="force-dynamic";
export const metadata={title:"Supplier intake",robots:{index:false,follow:false}};
type Supplier={id:string;legal_name:string;kind:string;website:string;country:string;contact_email:string;method:string;categories:string;created_at:string};
export default async function Suppliers({searchParams}:{searchParams:Promise<{message?:string}>}){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const {data,error}=await a.db.from("retail_suppliers").select("id,legal_name,kind,website,country,contact_email,method,categories,created_at").order("created_at",{ascending:false}).limit(100);
 const {message}=await searchParams;const rows=(data??[]) as Supplier[];
 return <main className="dw-admin"><div className="dw-admin-shell"><p className="dw-admin-kicker">DEALWOVO / OWNER ONLY</p><h1>Supplier intake</h1><p className="dw-admin-muted">Register manufacturer, wholesale, distributor and brand prospects. These are private leads, not approved suppliers. No purchase commitment, warehouse, inventory ownership, product publication or checkout.</p><Link href="/admin">Back to catalog administration ↗</Link>
 {error?<p role="alert" className="dw-admin-warning">Supplier records unavailable. Registration is disabled.</p>:null}
 {message==="saved"?<p role="status" className="dw-admin-success">Supplier prospect recorded.</p>:message?<p role="alert" className="dw-admin-warning">Record not saved. Check fields, duplicates and permissions.</p>:null}
 <div className="dw-admin-grid"><section className="dw-admin-panel"><h2>Register supplier prospect</h2><form action={registerSupplier} className="dw-admin-form"><label>Legal business name<input name="legal_name" minLength={2} maxLength={160} required/></label><label>Business type<select name="kind" required>{supplierKinds.map(k=><option key={k} value={k}>{k}</option>)}</select></label><label>Official website (HTTPS)<input type="url" name="website" maxLength={500} required/></label><label>Country (two-letter code)<input name="country" pattern="[A-Z]{2}" maxLength={2} placeholder="US" required/></label><label>Business contact email<input type="email" name="contact_email" maxLength={254} required/></label><label>Proposed integration method<select name="method">{supplierMethods.map(m=><option key={m} value={m}>{m}</option>)}</select></label><label>Product categories (no confidential information)<textarea name="categories" minLength={2} maxLength={1000} required rows={4}/></label><label><input type="checkbox" name="confirmed" value="yes" required/> I am authorized to record this business contact for partnership review.</label><button disabled={!!error} type="submit">Register prospect</button></form></section>
 <section className="dw-admin-panel"><h2>Recent supplier prospects</h2><p>Up to 100 most recent records. Registration is not verification or authorization.</p>{!error&&!rows.length?<p>No supplier prospects recorded.</p>:null}<div className="dw-admin-rows">{rows.map(s=><details key={s.id} className="dw-admin-detail"><summary>{s.legal_name} — {s.country} — Prospect</summary><p>{s.kind} · {s.method}</p><p>{s.website}</p><p>{s.contact_email}</p><p>{s.categories}</p><small>Recorded {s.created_at.slice(0,10)} UTC</small></details>)}</div></section></div></div></main>;
}
