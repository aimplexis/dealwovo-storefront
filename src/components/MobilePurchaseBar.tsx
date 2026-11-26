"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";

export default function MobilePurchaseBar({offerId,merchant,price,verifiedAt,expiresAt,initialNow}:{offerId:string;merchant:string;price:string;verifiedAt:string;expiresAt:string;initialNow:number}){
 const router=useRouter();
 const [now,setNow]=useState(initialNow);
 const verified=Date.parse(verifiedAt),expiry=Date.parse(expiresAt);
 const current=Number.isFinite(verified)&&Number.isFinite(expiry)&&verified<=now&&expiry>now;
 useEffect(()=>{
  const tick=()=>setNow(Date.now());
  tick();
  const timer=window.setInterval(tick,1000);
  const focus=()=>{tick();router.refresh();};
  window.addEventListener("focus",focus);
  return()=>{window.clearInterval(timer);window.removeEventListener("focus",focus);};
 },[router]);
 return <aside className="dw-mobile-purchase" aria-label="Quick retailer purchase">
  {current?<><div className="dw-mobile-purchase-row"><div><small>Recorded price · {merchant}</small><strong>{price}</strong></div><a href={"/out/"+offerId+"?placement=product"} rel="sponsored nofollow noreferrer" onClick={e=>{if(Date.now()>=expiry){e.preventDefault();setNow(Date.now());router.refresh();}}}>Shop at retailer ↗</a></div><p>Final price at retailer. We may earn a commission. <Link href="/affiliate-disclosure">Disclosure</Link></p></>:<><p role="status">This offer is no longer current.</p><button type="button" onClick={()=>router.refresh()}>Refresh retailer offers</button></>}
 </aside>;
}
