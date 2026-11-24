import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServer} from "../../../src/lib/supabase/server";
import {createFeedSourceAction,authorizeFeedSourceAction,stageFeedCSVAction,quickStageProductAction,convertFeedCandidateAction,rejectFeedCandidateAction} from "./actions";
import {suggestSlug} from "../../../src/lib/catalog/quick-import";
import "../admin.css";
import "./imports.css";
export const dynamic="force-dynamic";
export const metadata={title:"Private Affiliate Import Queue | Dealwovo",robots:{index:false,follow:false}};
type Source={id:string;name:string;provider:string;status:string;authorization_note:string};
type Candidate={id:string;external_product_id:string;title:string;category_hint:string;price_cents:number|null;status:string;batch_id:string};
export default async function ImportDashboard({searchParams}:{searchParams:Promise<{error?:string;success?:string}>}){
 const db=await createSupabaseServer();if(!db)redirect("/admin/login?status=setup");
 const {data:{user}}=await db.auth.getUser();if(!user)redirect("/admin/login");
 const {data:member}=await db.from("catalog_admins").select("role").eq("user_id",user.id).maybeSingle();
 if(!member||!["owner","editor"].includes(member.role))redirect("/admin/login?status=denied");
 const [sourcesResult,batchesResult,candidatesResult,categoriesResult,merchantsResult]=await Promise.all([
 db.from("catalog_feed_sources").select("id,name,provider,status,authorization_note").order("created_at",{ascending:false}).limit(100),
 db.from("catalog_feed_batches").select("id,source_id,row_count,created_at").order("created_at",{ascending:false}).limit(30),
 db.from("catalog_feed_candidates").select("id,external_product_id,title,category_hint,price_cents,status,batch_id").order("created_at",{ascending:false}).limit(100),
 db.from("catalog_categories").select("id,name").order("name").limit(100),
 db.from("catalog_merchants").select("id,name").order("name").limit(100)
 ]);
 const broken=[sourcesResult,batchesResult,candidatesResult,categoriesResult,merchantsResult].some(x=>x.error);
 const sources=(sourcesResult.data||[]) as Source[];
 const candidates=(candidatesResult.data||[]) as Candidate[];
 const categories=(categoriesResult.data||[]) as {id:string;name:string}[];
 const merchants=(merchantsResult.data||[]) as {id:string;name:string}[];
 const params=await searchParams;
 return <main className="dw-admin dw-import">
  <div className="dw-admin-shell">
   <Link href="/admin" className="dw-import-back">← Catalog Command Center</Link>
   <p className="dw-admin-kicker">DEALWOVO / CONTROLLED PRODUCT INGESTION</p><h1>Affiliate Import Studio</h1>
   <p className="dw-admin-muted">Stage licensed affiliate product data, review every candidate, and convert approved candidates into <strong>draft</strong> listings. Nothing imports directly to the public shop.</p>
   {broken?<div role="alert" className="dw-admin-warning">Import tables are unavailable. Apply the Phase 4B migration before using this page.</div>:null}
   {params.error?<div role="alert" className="dw-admin-warning">{params.error}</div>:null}
   {params.success?<p role="status" className="dw-admin-success">{params.success}</p>:null}
   <section className="dw-admin-panel"><h2>Start here — connect later</h2><p>No account keys or product feed needed to set up Dealwovo. Register a draft source now, document actual permission after approval, then add products. Never enter passwords, API secrets or private feed download URLs in these forms.</p><nav className="dw-admin-actions" aria-label="Affiliate setup shortcuts"><a href="https://affiliate-program.amazon.com/" target="_blank" rel="noopener noreferrer">Amazon Associates ↗</a><a href="https://www.awin.com/us" target="_blank" rel="noopener noreferrer">Awin ↗</a><a href="#register-source">Register a partner</a><a href="#quick-product">Add a product</a><a href="#bulk-feed">Import CSV</a><a href="#review-queue">Review queue</a></nav><p>Amazon setup can be recorded now. Amazon product publication requires a dedicated direct-link and content-rights review; no Amazon link import is enabled in this quick workflow.</p></section>
   <div className="dw-import-steps"><span><b>01</b> Register source</span><span><b>02</b> Confirm rights</span><span><b>03</b> Upload CSV</span><span><b>04</b> Review & convert to draft</span></div>
   <div className="dw-admin-grid">
    <section id="register-source" className="dw-admin-panel"><h2>1. Register affiliate feed</h2><p>Do not claim authorization without written program or retailer permission.</p>
     <form action={createFeedSourceAction} className="dw-admin-form"><label>Source name<input name="name" required minLength={3} maxLength={120} placeholder="My approved partner program"/></label>
      <label>Provider<select name="provider" required defaultValue="manual_csv"><option value="manual_csv">Manual CSV</option><option value="awin">Awin</option><option value="impact">impact.com</option><option value="cj">CJ Affiliate</option><option value="amazon">Amazon Associates</option><option value="other">Other partner</option></select></label>
      <label>Partner reference (optional)<input name="partner_ref" maxLength={120} placeholder="Approval or partner ID"/></label><button type="submit">Create draft source</button>
     </form>
    </section>
    <section className="dw-admin-panel"><h2>2. Document feed authorization</h2><p>Only an owner can mark a source authorized. Record the actual approval, product rights, and image permissions.</p>
     {sources.length===0?<p>No feed sources yet.</p>:sources.map(source=><div className="dw-import-source" key={source.id}><strong>{source.name}</strong><small>{source.provider} · {source.status}</small>
       {source.status==="draft"?<form action={authorizeFeedSourceAction} className="dw-admin-form">
        <input type="hidden" name="source_id" value={source.id}/>
        <label>Permission evidence and scope<textarea name="authorization_note" rows={3} minLength={25} maxLength={1500} required placeholder="Agreement date, authorized product/link feed and rights to use product images..."/></label>
        <label className="dw-import-check"><input type="checkbox" name="evidence_confirmed" value="yes" required/> I have independently checked the source's partner approval and intended usage permissions.</label>
        <button type="submit" disabled={member.role!=="owner"}>Confirm authorized source</button>
       </form>:<small>{source.status==="authorized"?"Authorization confirmed in admin records":"Source disabled"}</small>}
      </div>)}
    </section>
    <section id="quick-product" className="dw-admin-panel"><h2>3A. Add one product — no CSV</h2><p>Paste an official affiliate link and enter your own licensed editorial details. Price and image stay empty until a permitted source is available.</p>
 {broken?<p role="alert">Source data unavailable.</p>:<form action={quickStageProductAction} className="dw-admin-form"><label>Authorized non-Amazon source<select name="source_id" required defaultValue=""><option value="" disabled>Select partner</option>{sources.filter(s=>s.status==="authorized"&&s.provider!=="amazon").map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 <label>Partner product ID<input name="external_product_id" required maxLength={120}/></label><label>Product name<input name="title" required minLength={3} maxLength={180}/></label><label>Official affiliate link<input name="affiliate_url" type="url" required maxLength={2000}/></label><label>Category hint (optional)<input name="category_hint" maxLength={120}/></label><label>Original description (optional)<textarea name="description" rows={3} maxLength={3000}/></label><label className="dw-import-check"><input type="checkbox" name="confirmed" value="yes" required/> I checked the partner's permission and official affiliate link.</label><button disabled={!sources.some(s=>s.status==="authorized"&&s.provider!=="amazon")}>Prepare private product</button></form>}</section>
    <section id="bulk-feed" className="dw-admin-panel"><h2>3B. Stage a CSV (private)</h2><p>Maximum 100 rows / 100 KB. Manual sources use this Dealwovo header:</p>
      <code className="dw-import-code">external_product_id,title,description,category_hint,image_url,affiliate_url,price_usd</code>
      <p><strong>Awin publisher exports:</strong> Choose a source registered as Awin and upload a Create-a-Feed CSV containing <code>product_id</code>, <code>product_name</code>, and <code>aw_deep_link</code>. Optional fields include <code>description</code>, <code>merchant_category</code>, <code>image_url</code>, <code>price</code>, and <code>currency</code>. A price is imported only if the feed explicitly declares USD.</p>
      <p>Uploaded products and images remain private and unverified until individually reviewed. Never upload data without publisher and advertiser authorization. No direct retailer scraping.</p>
      <form action={stageFeedCSVAction} className="dw-admin-form"><label>Authorized source<select name="source_id" required defaultValue=""><option disabled value="">Choose authorized source</option>{sources.filter(x=>x.status==="authorized").map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
       <label>CSV file<input name="file" type="file" accept=".csv,text/csv" required/></label>
       <button type="submit" disabled={!sources.some(x=>x.status==="authorized")}>Stage file for review</button>
      </form>
     </section>
    <section id="review-queue" className="dw-admin-panel"><h2>4. Import queue</h2><p>Review candidate details, then choose the existing category and merchant. Promotion creates only drafts.</p>
      {candidates.length===0?<p>No candidates staged yet.</p>:<div className="dw-admin-rows">{candidates.map(c=><details className="dw-admin-detail" key={c.id}><summary>{c.title} · {c.status}</summary>
       <p><strong>External ID:</strong> {c.external_product_id}</p><p><strong>Category hint:</strong> {c.category_hint||"None"}</p>
       <p><strong>Supplied price:</strong> {c.price_cents===null?"Not supplied":"$"+(c.price_cents/100).toFixed(2)} (unverified)</p>
       {c.status==="staged"?<>
        <form action={convertFeedCandidateAction} className="dw-admin-form"><input type="hidden" name="candidate_id" value={c.id}/>
          <label>Product slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={suggestSlug(c.title,c.id)} required/></label>
          <label>Category<select name="category_id" required defaultValue=""><option value="" disabled>Select category</option>{categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label>Retailer<select name="merchant_id" required defaultValue=""><option value="" disabled>Select registered retailer</option>{merchants.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <button type="submit" disabled={!categories.length||!merchants.length}>Convert to DRAFT product and offer</button>
        </form>
        <form action={rejectFeedCandidateAction}><input type="hidden" name="candidate_id" value={c.id}/><button className="dw-admin-secondary" type="submit">Reject candidate</button></form>
       </>:<p>{c.status==="converted"?"Drafts created in Catalog Command Center.":"Rejected."}</p>}
      </details>)}</div>}
    </section>
   </div>
   <p className="dw-import-fineprint">This workflow does not automatically authorize affiliate program access, create publicly visible products, claim verified prices, or report affiliate commissions. Publishing still requires separate human approval in the Catalog Command Center.</p>
  </div>
 </main>;
}
