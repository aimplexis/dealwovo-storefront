import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServer} from "../../src/lib/supabase/server";
import {catalogConfigured} from "../../src/lib/supabase/config";
import {signOutAction,createCategoryAction,createMerchantAction,createProductAction,createOfferAction,updateProductAction,updateOfferAction,changeStatusAction} from "./actions";
import "./admin.css";
export const dynamic="force-dynamic";
export const metadata={title:"Dealwovo Catalog Administration",robots:{index:false,follow:false}};
type Category={id:string;slug:string;name:string;status:string};
type Merchant={id:string;name:string;website_url:string|null;status:string};
type Product={id:string;title:string;slug:string;description:string;image_url:string|null;category_id:string;status:string};
type Offer={id:string;affiliate_url:string;price_cents:number|null;currency:string;product_id:string;merchant_id:string;status:string;verified_at:string|null;expires_at:string|null};
type Audit={id:number;entity_type:string;operation:string;created_at:string};
function StatusButton({kind,id,status,label}:{kind:"category"|"merchant"|"product"|"offer";id:string;status:string;label:string}){
 return <form action={changeStatusAction}><input type="hidden" name="kind" value={kind}/><input type="hidden" name="id" value={id}/><input type="hidden" name="status" value={status}/><button className="dw-admin-secondary" type="submit">{label}</button></form>
}
export default async function AdminPage({searchParams}:{searchParams:Promise<{message?:string}>}){
 if(!catalogConfigured())redirect("/admin/login?status=setup");
 const db=await createSupabaseServer();if(!db)redirect("/admin/login?status=setup");
 const {data:{user},error:userErr}=await db.auth.getUser();if(userErr||!user)redirect("/admin/login");
 const {data:admin}=await db.from("catalog_admins").select("role").eq("user_id",user.id).maybeSingle();
 if(!admin)redirect("/admin/login?status=denied");
 const results=await Promise.all([
 db.from("catalog_categories").select("id,slug,name,status").order("created_at",{ascending:false}).limit(100),
 db.from("catalog_merchants").select("id,name,website_url,status").order("created_at",{ascending:false}).limit(100),
 db.from("catalog_products").select("id,title,slug,description,image_url,category_id,status").order("created_at",{ascending:false}).limit(100),
 db.from("catalog_offers").select("id,affiliate_url,price_cents,currency,product_id,merchant_id,status,verified_at,expires_at").order("created_at",{ascending:false}).limit(100),
 db.from("catalog_admin_events").select("id,entity_type,operation,created_at").order("created_at",{ascending:false}).limit(12)
 ]);
 const [cats,merch,prod,offs,aud]=results;
 const hasError=results.some(r=>r.error);
 const categories=(cats.data||[]) as Category[], merchants=(merch.data||[]) as Merchant[],products=(prod.data||[]) as Product[],offers=(offs.data||[]) as Offer[],audit=(aud.data||[]) as Audit[];
 const params=await searchParams;
 return <main className="dw-admin"><div className="dw-admin-shell">
  <div className="dw-admin-top"><div><p className="dw-admin-kicker">DEALWOVO / PRIVATE BACK OFFICE</p><h1>Catalog Command Center</h1>
   <p className="dw-admin-muted">Welcome, {user.email}. Role: {admin.role}. All new entries begin as drafts.</p></div>
   <div className="dw-admin-actions"><Link href="/admin/discovery">Product Discovery ↗</Link><Link href="/admin/marketing">Marketing Agent Studio ↗</Link>{admin.role==="owner"&&<Link href="/admin/marketing/revenue">Revenue Intelligence ↗</Link>}<Link href="/admin/quality">Offer Quality ↗</Link><Link href="/admin/deals">Deal Evaluation ↗</Link><Link href="/admin/imports">Affiliate Import Studio ↗</Link><Link href="/shop">Public catalog ↗</Link><form action={signOutAction}><button type="submit" className="dw-admin-secondary">Sign out</button></form></div>
  </div>
  {hasError?<div role="alert" className="dw-admin-warning">Database unavailable or migration incomplete. Check Supabase configuration and apply both Phase 3 migrations. Do not publish offers.</div>:null}
  {params.message==="saved"?<p role="status" className="dw-admin-success">Changes saved.</p>:params.message==="failed"?<p role="alert" className="dw-admin-warning">The change was not saved. Check data, permissions, uniqueness, or approved-offer requirements.</p>:null}
  <div className="dw-admin-stats"><div><span>{categories.length}</span><strong>Categories</strong></div><div><span>{merchants.length}</span><strong>Merchants</strong></div><div><span>{products.length}</span><strong>Products</strong></div><div><span>{offers.length}</span><strong>Offers</strong></div></div>
  <div className="dw-admin-grid">
   <section className="dw-admin-panel"><h2>1. Categories</h2><p>Create a draft department. Publish it only when ready.</p>
    <form action={createCategoryAction} className="dw-admin-form"><label>Category name<input name="name" placeholder="Technology" minLength={2} maxLength={100} required/></label><label>URL slug<input name="slug" placeholder="technology" pattern="[a-z0-9]+(-[a-z0-9]+)*" required/></label><button type="submit">Add draft category</button></form>
    <div className="dw-admin-rows">{categories.map(c=><div key={c.id} className="dw-admin-row"><span><strong>{c.name}</strong><small>/{c.slug} · {c.status}</small></span>{c.status==="draft"?<StatusButton kind="category" id={c.id} status="published" label="Publish"/>:<StatusButton kind="category" id={c.id} status="draft" label="Unpublish"/>}</div>)}</div>
   </section>
   <section className="dw-admin-panel"><h2>2. Retail partners</h2><p>Register retailers only when approved for catalog use.</p>
    <form action={createMerchantAction} className="dw-admin-form"><label>Retailer name<input name="name" placeholder="Retail partner" minLength={2} maxLength={130} required/></label><label>Official HTTPS website<input type="url" name="website_url" placeholder="https://retailer.example"/></label><button type="submit">Add draft merchant</button></form>
    <div className="dw-admin-rows">{merchants.map(m=><div key={m.id} className="dw-admin-row"><span><strong>{m.name}</strong><small>{m.status}</small></span>{m.status==="approved"?<StatusButton kind="merchant" id={m.id} status="disabled" label="Disable"/>:<StatusButton kind="merchant" id={m.id} status="approved" label="Approve"/>}</div>)}</div>
   </section>
   <section className="dw-admin-panel"><h2>3. Products</h2><p>Keep a product separate from each retailer-specific offer.</p>
    <form action={createProductAction} className="dw-admin-form"><label>Product title<input name="title" minLength={3} maxLength={180} required/></label><label>Product slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="product-example" required/></label>
     <label>Category<select name="category_id" required defaultValue=""><option value="" disabled>Select a category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
     <label>Description<textarea name="description" rows={3} maxLength={3000}/></label><label>Licensed HTTPS image URL<input name="image_url" type="url" placeholder="https://..."/></label>
     <button type="submit" disabled={!categories.length}>Add draft product</button></form>
    <div className="dw-admin-rows">{products.map(p=><details className="dw-admin-detail" key={p.id}><summary>{p.title} · {p.status}</summary>
      <form action={updateProductAction} className="dw-admin-form"><input type="hidden" name="id" value={p.id}/><label>Title<input name="title" defaultValue={p.title} minLength={3} maxLength={180} required/></label>
      <label>Description<textarea name="description" defaultValue={p.description} rows={2} maxLength={3000}/></label>
      <label>Image URL<input name="image_url" type="url" defaultValue={p.image_url||""}/></label><button type="submit">Save product changes</button></form>
      <div className="dw-admin-inline">{p.status==="published"?<StatusButton kind="product" id={p.id} status="archived" label="Archive"/>:<StatusButton kind="product" id={p.id} status="published" label="Publish"/>}</div>
     </details>)}</div>
   </section>
   <section className="dw-admin-panel"><h2>4. Affiliate offers</h2><p>Offers remain invisible until independently verified and explicitly approved.</p>
    <form action={createOfferAction} className="dw-admin-form"><label>Product<select name="product_id" required defaultValue=""><option value="" disabled>Select product</option>{products.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
    <label>Retailer<select name="merchant_id" required defaultValue=""><option value="" disabled>Select retailer</option>{merchants.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
    <label>Approved affiliate HTTPS URL<input name="affiliate_url" type="url" maxLength={2000} required placeholder="https://..."/></label>
    <label>Verified USD price (optional)<input name="price_usd" inputMode="decimal" placeholder="49.99" pattern="[0-9]+(\.[0-9]{1,2})?"/></label>
    <button type="submit" disabled={!products.length||!merchants.length}>Create draft offer</button></form>
    <div className="dw-admin-rows">{offers.map(o=><details key={o.id} className="dw-admin-detail"><summary>{products.find(p=>p.id===o.product_id)?.title||"Product"} · {o.status}</summary>
      <form action={updateOfferAction} className="dw-admin-form"><input type="hidden" name="id" value={o.id}/><label>Affiliate destination<input type="url" name="affiliate_url" defaultValue={o.affiliate_url} required/></label>
      <label>USD price (optional)<input name="price_usd" inputMode="decimal" defaultValue={o.price_cents===null?"":(o.price_cents/100).toFixed(2)}/></label>
      <button type="submit">Save edits (resets verification)</button></form>
      {o.status==="approved"?<StatusButton kind="offer" id={o.id} status="paused" label="Pause offer"/>:<form action={changeStatusAction} className="dw-admin-verify"><input type="hidden" name="kind" value="offer"/><input type="hidden" name="id" value={o.id}/><input type="hidden" name="status" value="approved"/>
        <label><input type="checkbox" name="verified" value="yes" required/> I independently verified this retailer link, product, price (if shown), and availability.</label>
        <label>Verification expiry (within 30 days)<input type="datetime-local" name="expires_at" required/></label><button type="submit">Approve verified offer</button>
      </form>}
      {o.verified_at?<small>Verified {new Date(o.verified_at).toLocaleDateString("en-US")} · expires {o.expires_at?new Date(o.expires_at).toLocaleString("en-US"):"missing"}</small>:null}
     </details>)}</div>
   </section>
  </div>
  <section className="dw-admin-panel dw-admin-audit"><h2>Recent audit trail</h2><p>Database triggers record authenticated changes. Entries cannot be edited through the app.</p>
   {audit.length?<div className="dw-admin-rows">{audit.map(a=><div className="dw-admin-row" key={a.id}><span>{a.entity_type} · {a.operation}</span><small>{new Date(a.created_at).toLocaleString("en-US")}</small></div>)}</div>:<small>Nothing recorded yet.</small>}
  </section>
 </div></main>
}
