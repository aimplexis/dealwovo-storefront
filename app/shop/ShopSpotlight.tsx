"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Discovery = {
  name: string; short: string; eyebrow: string;
  description: string; href: string; image: string; alt: string; theme: string;
};
const worlds: Discovery[] = [
  {
    name: "THE TECH EDIT", short: "Tech", eyebrow: "01 / NEW POSSIBILITIES",
    description: "Small upgrades. Big inspiration.", href: "/trending",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1800&q=90",
    alt: "Black headphones on a bold golden yellow background", theme: "lime"
  },
  {
    name: "THE GIFT EDIT", short: "Gifts", eyebrow: "02 / MORE THOUGHTFUL",
    description: "Something they'll actually remember.", href: "/gifts",
    image: "https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=1800&q=90",
    alt: "Holiday gift inspiration in a vibrant decorated scene", theme: "pink"
  },
  {
    name: "THE EVERYDAY EDIT", short: "Living", eyebrow: "03 / A LITTLE BETTER",
    description: "Make ordinary moments feel extraordinary.", href: "/essentials",
    image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1800&q=90",
    alt: "Modern welcoming home kitchen interior", theme: "lavender"
  }
];

export default function ShopSpotlight() {
  const [active,setActive]=useState(0);
  const [paused,setPaused]=useState(false);
  const [hovered,setHovered]=useState(false);
  const [focused,setFocused]=useState(false);
  const [reduced,setReduced]=useState(false);
  const [visible,setVisible]=useState(true);
  const [tabVisible,setTabVisible]=useState(true);
  const scene=useRef<HTMLDivElement>(null);
  const section=useRef<HTMLElement>(null);
  const raf=useRef(0);
  useEffect(()=>{
    const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion=()=>setReduced(motion.matches);
    const onVisibility=()=>setTabVisible(!document.hidden);
    onMotion();onVisibility();
    motion.addEventListener("change",onMotion);
    document.addEventListener("visibilitychange",onVisibility);
    return ()=>{motion.removeEventListener("change",onMotion);document.removeEventListener("visibilitychange",onVisibility);window.cancelAnimationFrame(raf.current)};
  },[]);
  useEffect(()=>{
    if(!section.current||typeof IntersectionObserver==="undefined")return;
    const observer=new IntersectionObserver(entries=>setVisible(entries.some(entry=>entry.isIntersecting)),{threshold:.04});
    observer.observe(section.current);
    return ()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    if(paused||hovered||focused||reduced||!visible||!tabVisible)return;
    const id=window.setInterval(()=>setActive(i=>(i+1)%worlds.length),6500);
    return ()=>window.clearInterval(id);
  },[paused,hovered,focused,reduced,visible,tabVisible]);
  const point=useRef({x:0,y:0});
  const move=(e:React.PointerEvent<HTMLDivElement>)=>{
    if(e.pointerType!=="mouse"||reduced||paused||window.innerWidth<900)return;
    const target=scene.current;if(!target)return;
    const bounds=target.getBoundingClientRect();
    point.current={x:(e.clientX-bounds.left)/bounds.width,y:(e.clientY-bounds.top)/bounds.height};
    if(!raf.current)raf.current=requestAnimationFrame(()=>{
      raf.current=0;
      const x=point.current.x-.5,y=point.current.y-.5;
      target.style.setProperty("--dwx",String((x*18).toFixed(2))+"px");
      target.style.setProperty("--dwy",String((y*12).toFixed(2))+"px");
    });
  };
  const reset=()=>{
    if(!scene.current)return;
    scene.current.style.setProperty("--dwx","0px");
    scene.current.style.setProperty("--dwy","0px");
  };
  const pick=(index:number)=>{setActive(index);setPaused(true)};
  return <section ref={section} className={"dw-wow-hero"+(paused?" dw-wow-hero-paused":"")} aria-label="Discover Dealwovo shopping categories">
    <div className="dw-wow-dots" aria-hidden="true"/>
    <div className="dw-wow-orb dw-wow-orb-one" aria-hidden="true"/>
    <div className="dw-wow-orb dw-wow-orb-two" aria-hidden="true"/>
    <div className="wrap dw-wow-hero-main">
      <div className="dw-wow-copy">
        <div className="dw-wow-overline"><span className="dw-wow-ping"/> THE NEXT GENERATION OF DISCOVERY <span className="dw-wow-rule"/></div>
        <h1>OH, THE<br/><span className="dw-wow-headline-pop">POSSIBILITIES<span className="dw-wow-period">.</span></span></h1>
        <p className="dw-wow-lead">Good stuff. Great ideas. Unexpected discoveries. Find inspiration for the things you love—and a few things you didn't know you needed.</p>
        <div className="dw-wow-actions">
          <a className="dw-wow-primary" href="#discover">Explore the good stuff <span aria-hidden="true">↗</span></a>
          <Link className="dw-wow-secondary" href="/gifts">Find the perfect gift <span aria-hidden="true">→</span></Link>
        </div>
        <div className="dw-wow-social-proof"><span className="dw-wow-spark" aria-hidden="true">✳</span><div><strong>DISCOVER MORE. SAVE SMARTER.</strong><small>A fresh approach to thoughtful shopping.</small></div></div>
      </div>
      <div className="dw-wow-scene" ref={scene} onPointerMove={move} onPointerLeave={reset} aria-label="Animated, clickable shopping inspiration">
        <div className="dw-wow-ring dw-wow-ring-one" aria-hidden="true"/><div className="dw-wow-ring dw-wow-ring-two" aria-hidden="true"/>
        <div className="dw-wow-scene-flare" aria-hidden="true"/>
        {worlds.map((item,i)=>{
          const offset=(i-active+worlds.length)%worlds.length;
          const position=offset===0?"front":offset===1?"right":"left";
          return <Link
            key={item.short}
            href={item.href}
            className={"dw-wow-scene-card dw-wow-scene-card-"+position}
            aria-label={"Explore "+item.short+": "+item.description}
            onPointerEnter={(e)=>{if(e.pointerType!=="touch")setHovered(true)}}
            onPointerLeave={()=>setHovered(false)}
            onFocus={()=>setFocused(true)}
            onBlur={()=>setFocused(false)}
          >
            <Image src={item.image} alt={item.alt} fill quality={75} sizes="(max-width: 640px) 76vw, (max-width: 950px) 360px, 440px" priority={i===0} loading={i===0?undefined:"lazy"} className="dw-wow-scene-photo"/>
            <span className="dw-wow-photo-gradient" aria-hidden="true"/>
            <span className="dw-wow-scene-card-meta"><small>{item.eyebrow}</small><strong>{item.name}</strong><span>{item.description}</span></span>
            <span className="dw-wow-scene-arrow" aria-hidden="true">↗</span>
          </Link>
        })}
        <div className="dw-wow-floating-stamp" aria-hidden="true">GOOD<br/><strong>FINDS</strong><span>✳</span></div>
        <div className="dw-wow-floating-note" aria-hidden="true">THE GOOD STUFF CLUB <span>✦</span></div>
        <span className="dw-wow-twink dw-wow-twink-a" aria-hidden="true">✳</span>
        <span className="dw-wow-twink dw-wow-twink-b" aria-hidden="true">✦</span>
      </div>
    </div>
    <div className="wrap dw-wow-controls">
      <div className="dw-wow-tabs" role="group" aria-label="Choose a discovery category">
        <span className="dw2-sr-only" role="status" aria-live="polite">Featured category: {worlds[active].short}</span>
        {worlds.map((item,i)=><button type="button" key={item.name} aria-pressed={i===active} onClick={()=>pick(i)} className={"dw-wow-tab"+(i===active?" is-active":"")}>
          <span className="dw-wow-tab-num">0{i+1}</span> {item.short}<span className="dw-wow-tab-icon" aria-hidden="true">{i===active?"↗":"+"}</span>
        </button>)}
      </div>
      <button type="button" className="dw-wow-pause" aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>
        <span aria-hidden="true">{paused?"▶":"Ⅱ"}</span>{paused?" Resume motion":" Pause motion"}
      </button>
    </div>
    <div className="dw-wow-ticker" aria-hidden="true"><div className="dw-wow-ticker-run">
      <span>FIND YOUR NEXT WOW &nbsp;✳&nbsp; THE UNEXPECTED EDIT &nbsp;✳&nbsp; DISCOVER SOMETHING GOOD &nbsp;✳&nbsp;</span>
      <span>FIND YOUR NEXT WOW &nbsp;✳&nbsp; THE UNEXPECTED EDIT &nbsp;✳&nbsp; DISCOVER SOMETHING GOOD &nbsp;✳&nbsp;</span>
    </div></div>
  </section>;
}
