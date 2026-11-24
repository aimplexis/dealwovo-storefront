"use client";
import {useState} from "react";
import {parseAmazonProduct} from "../../../../src/lib/catalog/amazon-link";
type Source={id:string;name:string;amazon_tracking_id:string};
export default function ProductInput({sources}:{sources:Source[]}){
 const [id,setId]=useState(sources[0]?.id??""),[value,setValue]=useState("");
 const source=sources.find(s=>s.id===id);
 const result=parseAmazonProduct(value,source?.amazon_tracking_id??"");
 return <><label>Authorized source<select name="source_id" value={id} onChange={e=>setId(e.target.value)} required>{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 <label>Amazon US product link or ASIN<input name="product" value={value} onChange={e=>setValue(e.target.value)} maxLength={2000} placeholder="Paste a full Amazon product URL" required/></label>
 <p aria-live="polite">{!value.trim()?"Use a full amazon.com product link or a 10-character ASIN. No product data is fetched.":result.ok?<><strong>ASIN: {result.asin}</strong><br/><code style={{overflowWrap:"anywhere"}}>{result.url}</code></>:result.reason==="short"?"Open the shortened link yourself and paste the full Amazon product URL.":result.reason==="tag"?"The link has a different or duplicate tracking ID. Use a link from your own Associates account.":"Enter a supported HTTPS Amazon US product URL or ASIN."}</p></>;
}
