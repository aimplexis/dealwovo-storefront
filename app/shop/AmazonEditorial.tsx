import {publicSupabase} from "../../src/lib/supabase/public";
export default async function AmazonEditorial(){
 const db=publicSupabase();if(!db)return null;
 const {data,error}=await db.rpc("amazon_editorial_links");if(error||!Array.isArray(data)||!data.length)return null;
 const items=data.filter(r=>typeof r.affiliate_url==="string"&&/^https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]{10}\?tag=[A-Za-z0-9][A-Za-z0-9-]{0,59}-20$/.test(r.affiliate_url));
 if(!items.length)return null;
 return <section className="wrap dw-wow-catalog"><h2>Amazon editorial discoveries</h2><p>As an Amazon Associate I earn from qualifying purchases.</p><div className="dw-wow-product-grid">{items.map(r=><article className="dw-wow-product-card" key={r.id}><div className="dw-wow-product-content"><h3>{r.title}</h3><p>{r.description}</p><a href={r.affiliate_url} rel="sponsored nofollow">Check price at Amazon ↗</a></div></article>)}</div></section>;
}
