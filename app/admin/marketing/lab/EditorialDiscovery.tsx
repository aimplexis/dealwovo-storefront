"use client";
import {useState} from "react";
import {editorialTopics,editorialChannels,prepareEditorialDraft} from "../../../../src/lib/marketing/editorial-discovery";
export default function EditorialDiscovery(){
 const [topic,setTopic]=useState<string>(editorialTopics[0].key),[channel,setChannel]=useState<string>("social"),[draft,setDraft]=useState<ReturnType<typeof prepareEditorialDraft>>(null),[notice,setNotice]=useState("");
 const change=()=>{setDraft(null);setNotice("");};
 async function copy(){
  if(!draft)return;
  try{await navigator.clipboard.writeText([draft.title,draft.text,draft.cta+" — "+draft.href,"PRIVATE DRAFT — REVIEW REQUIRED",draft.evidence,draft.review].join("\n\n"));setNotice("Private draft copied for manual review.");}catch{setNotice("Clipboard unavailable. Select the draft text to copy manually.");}
 }
 return <section className="dw-admin-panel"><p className="dw-admin-kicker">DISCOVERY / EDITORIAL WORKBENCH</p><h2>Prepare a discovery story.</h2><p>Choose one evergreen topic and a channel. This deterministic tool prepares private working copy without paid models, market claims or external publication. Drafts are not saved to the campaign queue; review and transfer manually using existing workflows.</p>
 <div className="dw-admin-form"><label>Discovery topic<select value={topic} onChange={e=>{setTopic(e.target.value);change();}}>{editorialTopics.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}</select></label><label>Channel<select value={channel} onChange={e=>{setChannel(e.target.value);change();}}>{editorialChannels.map(c=><option key={c} value={c}>{c==="social"?"Social media":c==="newsletter"?"Newsletter":"Website"}</option>)}</select></label><button type="button" onClick={()=>{setDraft(prepareEditorialDraft(topic,channel));setNotice("");}}>Prepare private draft</button></div>
 {draft&&<article><h3>{draft.title}</h3><p>Draft — review required</p><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{draft.text}</pre><p>Suggested destination: {draft.href}</p><p>Call to action: {draft.cta}</p><p>Evidence: {draft.evidence}</p><p>Review: {draft.review}</p><button type="button" onClick={copy}>Copy private draft</button></article>}<p role="status">{notice}</p>
 </section>;
}
