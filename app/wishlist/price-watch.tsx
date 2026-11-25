"use client";
import {useState} from "react";
import {useWishlist} from "../../src/components/WishlistProvider";
import {parseTarget,priceWatch,type PriceChange} from "../../src/lib/catalog/price-watch";
import type {SavedProduct,WishlistOffer} from "../../src/lib/catalog/wishlist";
const usd=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n/100);
export default function PriceWatch({saved,offers,changes,now}:{saved:SavedProduct;offers:WishlistOffer[];changes:PriceChange[];now:number}){
 const w=useWishlist(),[input,setInput]=useState(saved.targetCents===undefined?"":String(saved.targetCents/100)),[error,setError]=useState("");
 const states=offers.map(o=>({o,...priceWatch(o,changes.find(c=>c.offerId===o.id),saved.targetCents,now)}));
 return <section className="dw-price-watch" aria-label={"Price watch for "+saved.title}><h4>Price watch</h4>
 {states.filter(s=>s.targetMet||s.dropCents!==null).map(s=><div className="dw-price-signal" key={s.o.id}><strong>{s.o.merchant.name}</strong>{s.dropCents!==null&&<p>Recorded price decreased by {usd(s.dropCents)} since the previous comparable review.</p>}{s.targetMet&&<p>Recorded price meets your target.</p>}</div>)}
 {saved.targetCents!==undefined&&<p role="status">Your target: {usd(saved.targetCents)}. {states.some(s=>s.targetMet)?"A displayed offer meets it.":offers.length?"No displayed current price meets it.":"Waiting for a current reviewed offer."}</p>}
 <form onSubmit={e=>{e.preventDefault();const cents=parseTarget(input);if(cents===null){setError("Enter a positive USD amount with up to two decimal places.");return;}w.setTarget(saved.id,cents);setError("");}}><label htmlFor={"target-"+saved.id}>Target price (USD)</label><div><input id={"target-"+saved.id} value={input} onChange={e=>{setInput(e.target.value);setError("");}} maxLength={10} inputMode="decimal" placeholder="e.g. 40.00"/><button type="submit">Set target</button></div></form>
 {error&&<p role="alert">{error}</p>}{saved.targetCents!==undefined&&<button type="button" className="dw-price-remove" onClick={()=>{w.setTarget(saved.id,undefined);setInput("");setError("");}}>Remove target</button>}
 <small>Checked when wishlist offers refresh. No email, push or live retailer monitoring.</small></section>;
}
