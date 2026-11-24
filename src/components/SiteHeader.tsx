"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useRef,useState} from "react";
const links=[
 {href:"/shop",label:"Explore"},
 {href:"/gifts",label:"Gift Finder"},
 {href:"/trending",label:"Tech & trends"},
 {href:"/essentials",label:"Everyday"},
 {href:"/deals",label:"Seasonal"}
];
export default function SiteHeader(){
 const pathname=usePathname();
 const [open,setOpen]=useState(false);
 const menuRef=useRef<HTMLElement>(null);
 const buttonRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>setOpen(false),[pathname]);
 useEffect(()=>{
  if(!open)return;
  const menu=menuRef.current;
  const first=menu?.querySelector<HTMLAnchorElement>("a");
  first?.focus();
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){setOpen(false);buttonRef.current?.focus();return;}
   if(event.key!=="Tab"||!menu)return;
   const items=Array.from(menu.querySelectorAll<HTMLAnchorElement>("a"));
   const firstLink=items[0],lastLink=items[items.length-1];
   if(!firstLink||!lastLink)return;
   if(event.shiftKey&&document.activeElement===firstLink){event.preventDefault();buttonRef.current?.focus();}
   else if(!event.shiftKey&&document.activeElement===lastLink){event.preventDefault();buttonRef.current?.focus();}
  };
  window.addEventListener("keydown",onKey);
  return ()=>window.removeEventListener("keydown",onKey);
 },[open]);
 return <>
  <div className="dw2-announcement"><span className="dw2-announcement-star" aria-hidden="true">✳</span> A BETTER KIND OF DISCOVERY <span className="dw2-announcement-sep">/</span> <strong>CURATING OUR FIRST VERIFIED FINDS</strong> <span className="dw2-announcement-star" aria-hidden="true">✳</span></div>
  <header className="dw2-header">
   <div className="dw2-header-inner wrap">
    <Link href="/" className="dw2-logo" aria-label="Dealwovo home">deal<span>wovo</span><b>.</b></Link>
    <nav className="dw2-desktop-nav" aria-label="Main navigation">
     {links.map(link=><Link key={link.href} href={link.href} aria-current={pathname===link.href?"page":undefined}>{link.label}</Link>)}
    </nav>
    <div className="dw2-header-right">
     <Link className="dw2-header-cta" href="/gifts">Find your next wow <span aria-hidden="true">↗</span></Link>
     <button ref={buttonRef} className="dw2-menu-toggle" type="button" aria-expanded={open} aria-controls="dw2-mobile-nav" aria-label={open?"Close navigation":"Open navigation"} onClick={()=>setOpen(v=>!v)}>
      <span className={open?"dw2-menu-bars is-open":"dw2-menu-bars"} aria-hidden="true"><i/><i/></span><span>{open?"Close":"Menu"}</span>
     </button>
    </div>
   </div>
   <nav ref={menuRef} id="dw2-mobile-nav" className={open?"dw2-mobile-nav is-open":"dw2-mobile-nav"} aria-label="Mobile navigation" inert={!open}>
    {links.map((link,i)=><Link key={link.href} href={link.href} aria-current={pathname===link.href?"page":undefined} onClick={()=>setOpen(false)}><small>0{i+1}</small>{link.label}<span aria-hidden="true">↗</span></Link>)}
    <p>Discover More. Save Smarter. <span>✳</span></p>
   </nav>
  </header>
 </>;
}
