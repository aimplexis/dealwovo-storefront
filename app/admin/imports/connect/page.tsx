import Link from "next/link";
import {redirect} from "next/navigation";
import {visualAccess} from "../../marketing/visual/access";
import "../../admin.css";
export const dynamic="force-dynamic";
export const metadata={title:"Connect Affiliate Partners | Dealwovo",robots:{index:false,follow:false}};
export default async function Page(){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const {data,error}=await a.db.from("catalog_feed_sources").select("provider,status").limit(1000);
 const count=(provider:string)=>(data??[]).filter(s=>s.provider===provider&&s.status==="authorized").length;
 return <main className="dw-admin"><div className="dw-admin-shell"><Link href="/admin/imports">← Import Studio</Link><p className="dw-admin-kicker">DEALWOVO / PARTNER CONNECTIONS</p><h1>Connect an affiliate partner.</h1><p>Choose a partner, register its identifiers, document permission, then import products. No account credentials are required for manual intake.</p>{error&&<p role="alert">Partner counts unavailable.</p>}<div className="dw-admin-grid">
 <section className="dw-admin-panel"><h2>Amazon Associates</h2><p>Direct product links; Creators API is not connected. {!error&&count("amazon")+" authorized source(s) in first 1,000 records."}</p><Link href="/admin/imports/amazon">Set up Amazon ↗</Link></section>
 <section className="dw-admin-panel"><h2>Awin</h2><p>Advertiser binding, feeds, incremental comparisons and statement reconciliation. {!error&&count("awin")+" authorized source(s) in first 1,000 records."}</p><div className="dw-admin-actions"><Link href="/admin/imports/awin">Set up Awin ↗</Link><Link href="/admin/imports/awin/api">API connection ↗</Link><Link href="/admin/marketing/revenue/reconcile">Reconcile statements ↗</Link></div></section>
 <section className="dw-admin-panel"><h2>CJ, Impact and other networks</h2><p>Manual authorized source and CSV support only. Native APIs are not connected.</p><Link href="/admin/imports#register-source">Register a manual source ↗</Link></section></div></div></main>;
}
