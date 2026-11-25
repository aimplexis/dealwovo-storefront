import Link from "next/link";
import {redirect} from "next/navigation";
import {visualAccess} from "../../../marketing/visual/access";
import {testAwinConnection} from "./actions";
import "../../../admin.css";
export const dynamic="force-dynamic";
export const metadata={title:"Awin API Readiness | Dealwovo",robots:{index:false,follow:false}};
const messages:Record<string,string>={ok:"Read-only scoped transaction request succeeded. No transactions were retained.",disabled:"Live calls disabled or publisher/token configuration does not match.",unauthorized:"Awin denied access.",rate_limited:"Awin rate limited the request. Retry later.",unavailable:"Connection unavailable.",invalid_response:"Response was not within the supported format or size.",invalid:"Choose an authorized source and confirm."};
export default async function Page({searchParams}:{searchParams:Promise<{result?:string}>}){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const p=await searchParams,configured=!!process.env.AWIN_API_TOKEN&&/^[1-9][0-9]{0,18}$/.test(process.env.AWIN_PUBLISHER_ID??""),enabled=process.env.AWIN_LIVE_ENABLED==="true";
 const {data,error}=await a.db.from("catalog_feed_sources").select("id,name,awin_publisher_id").eq("provider","awin").eq("status","authorized").not("awin_merchant_id","is",null).limit(100);
 const sources=(data??[]).filter(s=>s.awin_publisher_id===process.env.AWIN_PUBLISHER_ID);
 return <main className="dw-admin"><div className="dw-admin-shell"><Link href="/admin/imports/connect">← Partner connections</Link><h1>Awin API readiness.</h1><section className="dw-admin-panel"><h2>Server-side configuration</h2><p>Credentials: {configured?"Present, not verified":"Not configured"} · Live calls: {enabled?"Enabled by environment":"Disabled"}</p><p>When authorized, configure AWIN_API_TOKEN as a sensitive server-only Vercel variable, AWIN_PUBLISHER_ID as the approved account ID, and AWIN_LIVE_ENABLED only after explicit approval. Never enter a token in this page, chat, or GitHub. This first probe uses a single publisher and approved advertiser, one UTC day, GET only, no redirects and no retained response data.</p><a href="https://help.awin.com/apidocs/api-authentication">Awin authentication documentation ↗</a></section>
 {p.result&&<p role="status">{Object.hasOwn(messages,p.result)?messages[p.result]:"Check connection status."}</p>}
 {error?<p role="alert">Source lookup failed.</p>:enabled&&configured&&sources.length?<form action={testAwinConnection} className="dw-admin-form"><label>Authorized advertiser<select name="source_id">{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label><span><input type="checkbox" name="confirm" value="yes" required/> I authorize one read-only Awin test request.</span></label><button>Test connection</button></form>:<p>Live test unavailable until credentials, source authorization and activation are configured.</p>}<p><Link href="/admin/marketing/revenue/reconcile">Manual statement reconciliation ↗</Link></p></div></main>;
}
