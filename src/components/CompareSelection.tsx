"use client";
import Link from "next/link";
import {useState} from "react";
import {MAX_COMPARE,comparisonHref,toggleComparison} from "../lib/catalog/comparison";
export function useCompareSelection(){const [ids,setIds]=useState<string[]>([]);return {ids,toggle:(id:string)=>setIds(prev=>toggleComparison(prev,id)),clear:()=>setIds([])};}
export function CompareToggle({id,title,selected,toggle}:{id:string;title:string;selected:readonly string[];toggle:(id:string)=>void}){
 const checked=selected.includes(id);
 return <label className="dw-compare-toggle"><input type="checkbox" checked={checked} disabled={!checked&&selected.length>=MAX_COMPARE} onChange={()=>toggle(id)}/><span>{checked?"Selected for comparison":"Compare offer"}<span className="dw2-sr-only">: {title}</span></span></label>;
}
export function CompareBar({ids,clear}:{ids:readonly string[];clear:()=>void}){
 return <div className="dw-compare-bar"><div><strong>Compare your finds</strong><p role="status">{ids.length} of {MAX_COMPARE} selected. {ids.length<2?"Select at least two offers.":"Ready to compare."}</p></div><div className="dw-compare-bar-actions">{ids.length>=2?<Link className="dw-compare-action" href={comparisonHref(ids)}>Compare {ids.length} offers ↗</Link>:<span className="dw-compare-action disabled" aria-disabled="true">Compare offers</span>}{ids.length>0&&<button type="button" onClick={clear}>Clear selection</button>}</div></div>;
}
