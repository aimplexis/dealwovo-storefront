"use client";
import Link from "next/link";
import Image from "next/image";
import {useMemo,useState} from "react";
import {giftFields as fields,giftDefaults,type GiftSelections} from "../../src/lib/catalog/gift-recommendations";
import type {AssistantOffer} from "../../src/lib/catalog/shopping-assistant";
import GiftProducts from "./gift-products";
import {giftGuidance,giftStyles,type GiftStyle} from "../../src/lib/catalog/gift-guidance";
type GiftEdit={title:string;eyebrow:string;copy:string;recipient:string[];occasion:string[];budget:string[];interest:string[];href:string;image:string;alt:string};
const ideas:GiftEdit[]=[
 {title:"The curious mind",eyebrow:"01 / TECH & LITTLE WONDERS",copy:"For the one who loves discovering what's next.",recipient:["friend","family","partner"],occasion:["holiday","birthday"],budget:["under25","under50","50to150","over150"],interest:["tech"],href:"/trending",image:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80",alt:"Headphones in an editorial photograph"},
 {title:"The cozy soul",eyebrow:"02 / COMFORT & HOME",copy:"Thoughtful inspiration for slower, softer moments.",recipient:["friend","family","partner"],occasion:["holiday","birthday","thanks"],budget:["under25","under50","50to150"],interest:["home"],href:"/essentials",image:"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=80",alt:"Cozy warm drink and home setting"},
 {title:"The ritual lover",eyebrow:"03 / BEAUTY & WELLBEING",copy:"A little everyday luxury, beautifully considered.",recipient:["friend","family","partner"],occasion:["holiday","birthday","thanks"],budget:["under25","under50","50to150","over150"],interest:["wellness"],href:"/essentials",image:"https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1000&q=80",alt:"Editorial skincare and personal-care products"},
 {title:"The thoughtful surprise",eyebrow:"04 / THE UNEXPECTED EDIT",copy:"For the person who deserves an extra-special moment.",recipient:["friend","family","partner"],occasion:["holiday","birthday","thanks"],budget:["under25","under50","50to150","over150"],interest:["home","tech","wellness"],href:"/deals",image:"https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1000&q=80",alt:"Tastefully wrapped gifts"}
];
export default function GiftsPage({offers,available}:{offers:AssistantOffer[];available:boolean}){
 const [selections,setSelections]=useState<GiftSelections>({...giftDefaults});
 const [style,setStyle]=useState<GiftStyle>("any");
 const guidance=useMemo(()=>giftGuidance(selections,style),[selections,style]);
 const results=useMemo(()=>ideas.filter(x=>fields.every(field=>{
   const value=selections[field.id];
   return value==="all"||x[field.id].includes(value);
 })),[selections]);
 const reset=()=>{setSelections({...giftDefaults});setStyle("any");};
 return <main className="dw2-gifts">
  <section className="dw2-gifts-hero"><div className="wrap dw2-gifts-hero-inner">
   <div><span className="dw2-eyebrow">THE DEALWOVO GIFT FINDER ✳</span>
    <h1>It's the thought<br/><em>that wows.</em></h1>
    <p>The best gifts make people feel seen. Tell us a little about who you're celebrating, and explore ideas that feel as thoughtful as they are delightful.</p>
    <a href="#gift-finder" className="dw2-button-dark">Find their kind of wonderful <span aria-hidden="true">↘</span></a>
    <div className="dw2-gifts-hero-tag">THOUGHTFUL IDEAS. REVIEWED RETAILER FINDS.</div>
   </div>
   <div className="dw2-gifts-picture"><Image src="https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1600&q=85" alt="Beautifully wrapped gifts ready for someone special" fill priority sizes="(max-width: 760px) 95vw, 45vw" quality={80}/>
    <span>THE ART OF<br/><b>GIVING WELL.</b> ✳</span>
   </div>
  </div></section>
  <section className="wrap dw2-finder" id="gift-finder"><div className="dw2-finder-head"><div><span className="dw2-eyebrow">01 / START WITH SOMEONE SPECIAL</span><h2>A few details.<br/><em>A world of ideas.</em></h2></div><p>Choose a recipient, occasion, budget, interest and gift style. Product matches use the first four choices; gift style personalizes editorial guidance.</p></div>
   <div className="dw2-finder-controls">{fields.map((f,i)=><label key={f.id} htmlFor={"dw2-field-"+f.id}><span>0{i+1} / {f.label}</span>
    <select id={"dw2-field-"+f.id} value={selections[f.id]} onChange={e=>setSelections(s=>({...s,[f.id]:e.target.value}))}>
     {f.opts.map(([val,title])=><option key={val} value={val}>{title}</option>)}
    </select></label>)}<label htmlFor="dw-gift-style"><span>05 / GIFT STYLE</span><select id="dw-gift-style" value={style} onChange={e=>setStyle(e.target.value as GiftStyle)}>{giftStyles.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
   {guidance&&<section className="dw-gift-guidance" aria-label="Your personalized gift inspiration"><span className="dw2-eyebrow">YOUR THOUGHTFUL GIFT PLAN</span><h2>Ideas with meaning.</h2><p>{guidance.recipient} {guidance.occasion} {guidance.budget}</p><div className="dw-gift-guidance-grid">{guidance.ideas.map(i=><article key={i.kind}><small>{i.kind}</small><h3>{i.title}</h3><p>{i.why}</p></article>)}</div><p>Editorial ideas, not verified offers or price guarantees. Gift style changes this guidance, not the reviewed catalog filters.</p><button type="button" onClick={reset}>Reset all choices</button></section>}
   <GiftProducts offers={offers} available={available} selections={selections}/>
   <div className="dw2-finder-result-head"><div><span className="dw2-eyebrow">03 / EDITORIAL INSPIRATION</span><h2>Ideas for <em>their kind of wow.</em></h2><p aria-live="polite">{results.length} {results.length===1?"inspiration path":"inspiration paths"} available</p></div><button type="button" onClick={reset}>Reset selections ↺</button></div>
   {results.length?<div className="dw2-gifts-grid">{results.map((x,i)=><Link href={x.href} className="dw2-gifts-card" key={x.title}>
    <Image src={x.image} alt={x.alt} fill sizes="(max-width: 650px) 95vw, 45vw" quality={75}/>
    <div className="dw2-gifts-card-overlay" aria-hidden="true"/><span className="dw2-gifts-card-label">{x.eyebrow}</span><span className="dw2-gifts-card-index">0{i+1}</span>
    <span className="dw2-gifts-card-bottom"><strong>{x.title}</strong><span>{x.copy}</span><b>Explore the edit ↗</b></span>
   </Link>)}</div>:<div className="dw2-gift-no-match"><span aria-hidden="true">✳</span><h3>Let's try a different angle.</h3><p>No editorial guide matches every choice. Reset selections to browse general inspiration, or explore the product matches above.</p><button type="button" onClick={reset}>Show all inspiration ↗</button></div>}
   <p><Link className="dw2-button-dark" href={"/shop?budget="+(selections.budget==="under25"?"25":selections.budget==="under50"?"50":selections.budget==="over150"?"150plus":"all")+"#verified-offers"}>Browse {selections.budget==="under25"?"offers under $25":selections.budget==="under50"?"offers under $50":selections.budget==="over150"?"offers $150 and up":"all verified offers"} ↗</Link></p><p><Link href={"/assistant?purpose=gift"+(selections.budget==="under25"?"&budget=25":selections.budget==="under50"?"&budget=50":"")}>Find product matches with the Shopping Assistant ↗</Link></p><p className="dw2-gift-legal">The editorial cards above are inspiration, not specific products or confirmed prices. The separate shoppable recommendations use the reviewed catalog.</p>
  </section>
  <section className="dw2-gifts-finale"><div className="wrap"><span className="dw2-eyebrow">THERE'S ALWAYS SOMETHING WONDERFUL</span><h2>GOOD GIFTS.<br/><em>GREAT FEELINGS.</em></h2><Link href="/shop" className="dw2-button-lime">Explore more ideas <span aria-hidden="true">↗</span></Link></div></section>
 </main>;
}
