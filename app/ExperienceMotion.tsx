"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";

/** Progressive enhancements only; all content remains visible if JavaScript is unavailable. */
export default function ExperienceMotion(){
 const path=usePathname();
 useEffect(()=>{
   const prefersReduced=window.matchMedia("(prefers-reduced-motion: reduce)");
   if(prefersReduced.matches || typeof IntersectionObserver==="undefined")return;
   const selectors=[
     ".dw-wow-section-heading",".dw-wow-collection",".dw-wow-vibe-layout > div:first-child",
     ".dw-wow-coming",".dw-wow-product-card",".dw-wow-bottom-cta",
     ".tile",".blurb-grid > a",".inner-card",".inner-section > .kicker",
     ".inner-section > .section-title",".gift-controls",".gift-head"
   ].join(",");
   const elements=Array.from(document.querySelectorAll<HTMLElement>(selectors));
   const observer=new IntersectionObserver(entries=>{
     for(const entry of entries)if(entry.isIntersecting){
       const element=entry.target as HTMLElement;
       element.classList.add("dw-scroll-visible");
       observer.unobserve(element);
     }
   },{rootMargin:"0px 0px -30px 0px",threshold:.08});
   let index=0;
   for(const element of elements){
     if(element.getBoundingClientRect().top>window.innerHeight*.94){
       element.style.setProperty("--dw-delay",String((index%3)*75)+"ms");
       element.classList.add("dw-scroll-enter");
       observer.observe(element);
       index++;
     }
   }
   return ()=>{observer.disconnect();for(const element of elements){element.classList.remove("dw-scroll-enter","dw-scroll-visible");element.style.removeProperty("--dw-delay")}};
 },[path]);
 return null;
}
