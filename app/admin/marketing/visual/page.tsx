import Link from "next/link";
import {redirect} from "next/navigation";
import {visualAccess} from "./access";
import Designer from "./designer";
import {reviewVisual} from "./actions";
import {creativeSvg,validCreative,themes,formats} from "../../../../src/lib/marketing/visual-template";
import "../../admin.css";
import "./visual.css";
export const dynamic="force-dynamic";
export const metadata={title:"Visual Marketing Studio | Dealwovo",robots:{index:false,follow:false}};
const statuses=["all","draft","reviewed","archived"] as const;
type Asset={id:string;theme:string;format:string;palette:string;template_version:number;status:string;created_at:string;reviewed_at:string|null};
type Event={asset_id:string;previous_status:string;new_status:string;created_at:string};
export default async function Page({searchParams}:{searchParams:Promise<{filter?:string;page?:string;notice?:string}>}){
 const a=await visualAccess();if(!a.ok)redirect("/admin/login");
 const p=await searchParams,filter=statuses.find(s=>s===p.filter)??"all",requested=/^[1-9][0-9]{0,4}$/.test(p.page??"")?Number(p.page):1;
 const base=()=>{const q=a.db.from("marketing_visual_assets").select("id,theme,format,palette,template_version,status,created_at,reviewed_at",{count:"exact"});return filter==="all"?q:q.eq("status",filter);};
 const countResult=await base().limit(0);
 const total=countResult.count??0,pages=Math.max(1,Math.ceil(total/12)),page=Math.min(requested,pages);
 const rows=await base().order("created_at",{ascending:false}).order("id").range((page-1)*12,page*12-1);
 const assets=(rows.data??[]) as Asset[];
 const history=assets.length?await a.db.from("marketing_visual_review_events").select("asset_id,previous_status,new_status,created_at").in("asset_id",assets.map(r=>r.id)).order("created_at").order("id"):{data:[],error:null};
 const events=(history.data??[]) as Event[];
 const failed=!!(countResult.error||rows.error||history.error);
 const href=(n:number,f=filter)=>"/admin/marketing/visual?filter="+f+"&page="+n;
 const messages:Record<string,string>={created:"Private draft saved.",reviewed:"Internally reviewed — not published.",archived:"Creative archived.",confirm:"Confirm the editorial review before approving.",invalid:"Invalid creative selection.",error:"Change unsuccessful. Refresh and retry."};
 return <main className="dw-admin dw-visual"><div className="dw-admin-shell">
 <Link href="/admin/marketing">← Marketing Agent Studio</Link><p className="dw-admin-kicker">DEALWOVO / PRIVATE CREATIVE WORKBENCH</p><h1>Visual Marketing Studio.</h1><p className="dw-admin-muted">48 original brand combinations. Review every creative before download. No uploads, paid generation or external publication.</p>
 {p.notice&&<p role="status">{Object.hasOwn(messages,p.notice)?messages[p.notice]:"Request completed; check the library."}</p>}<Designer/>
 <section><h2>Private asset library</h2><nav aria-label="Asset filters" className="dw-admin-actions">{statuses.map(s=><Link key={s} href={href(1,s)} aria-current={s===filter?"page":undefined}>{s}</Link>)}</nav>
 {failed?<p role="alert" className="dw-admin-warning">Asset library unavailable. Review and download controls withheld.</p>:<><p>{total} matching assets · Page {page} of {pages}</p>{!assets.length?<p>No saved creatives in this view.</p>:<div className="dw-visual-grid">{assets.map(r=>{const c=validCreative(r.theme,r.format,r.palette);return <article key={r.id} className="dw-admin-panel"><h3>{c?themes[c.theme][1]:"Unsupported creative"}</h3><p>{r.status} · Template v{r.template_version}</p>{c&&r.template_version===1?<><img src={"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(creativeSvg(c))} alt={themes[c.theme][0]}/><p>{formats[c.format].join(" × ")} px · {c.palette}</p></>:<p>Preview unavailable.</p>}
 <details><summary>Review history</summary>{events.filter(e=>e.asset_id===r.id).map((e,i)=><p key={i}>{e.previous_status} → {e.new_status} · {new Date(e.created_at).toISOString()}</p>)}</details>
 {c&&r.template_version===1&&r.status==="draft"&&<form action={reviewVisual} className="dw-admin-form"><input type="hidden" name="id" value={r.id}/><label><span><input type="checkbox" name="confirm" value="yes" required/> I reviewed the editorial graphic and its claims.</span></label><button name="status" value="reviewed">Mark internally reviewed</button></form>}
 {c&&r.template_version===1&&r.status==="reviewed"&&<p><a href={"/admin/marketing/visual/download/"+r.id}>Download reviewed SVG ↓</a></p>}
 {r.status!=="archived"&&<form action={reviewVisual}><input type="hidden" name="id" value={r.id}/><button className="dw-admin-secondary" name="status" value="archived">Archive</button></form>}</article>})}</div>}
 <nav aria-label="Asset pagination" className="dw-admin-actions">{page>1&&<Link href={href(page-1)}>← Previous</Link>}{page<pages&&<Link href={href(page+1)}>Next →</Link>}</nav></>}</section></div></main>;
}
