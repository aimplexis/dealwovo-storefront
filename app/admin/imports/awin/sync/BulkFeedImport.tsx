"use client";
import {useEffect,useRef,useState} from "react";
import {prepareAwinBatches} from "../../../../../src/lib/catalog/awin-feed-batches";
import {submitBulkBatch} from "./actions";
type Source={id:string;name:string;awin_publisher_id:string;awin_advertiser_id:string};
export default function BulkFeedImport({sources}:{sources:Source[]}){
 const [source,setSource]=useState(sources[0]?.id??"");
 const [file,setFile]=useState<File|null>(null);
 const [confirmed,setConfirmed]=useState(false);
 const [prepared,setPrepared]=useState<ReturnType<typeof prepareAwinBatches>|null>(null);
 const [busy,setBusy]=useState(false);
 const [runs,setRuns]=useState<string[]>([]);
 const [message,setMessage]=useState("");
 const [failed,setFailed]=useState(false);
 const lock=useRef(false);
 const [journal,setJournal]=useState<{source:string;total:number;runs:string[];pending:number|null}|null>(null);
 const [storageReady,setStorageReady]=useState(false);
 const storageKey="dw-awin-bulk-journal-v1";
 useEffect(()=>{try{const raw=sessionStorage.getItem(storageKey);if(raw){const j=JSON.parse(raw);if(typeof j.source==="string"&&Number.isInteger(j.total)&&j.total>0&&j.total<=5000&&Array.isArray(j.runs)&&j.runs.length<=j.total&&j.runs.every((v:unknown)=>typeof v==="string"&&/^[1-9][0-9]{0,19}$/.test(v))&&(j.pending===null||j.pending===j.runs.length+1))setJournal(j);else throw Error("Invalid recovery record");}setStorageReady(true);}catch{setMessage("Recovery storage unavailable. Use the single-batch comparison form.");}},[]);
 function checkpoint(j:{source:string;total:number;runs:string[];pending:number|null}){sessionStorage.setItem(storageKey,JSON.stringify(j));setJournal(j);}
 function clearJournal(){try{sessionStorage.removeItem(storageKey);setJournal(null);reset();}catch{setMessage("Unable to clear recovery record.");}}
 const reset=()=>{setPrepared(null);setRuns([]);setMessage("");setFailed(false);setConfirmed(false);};
 async function prepare(){
  if(lock.current||!file)return;
  const selected=sources.find(s=>s.id===source);if(!selected)return;
  lock.current=true;setBusy(true);reset();
  try{
   if(file.size<1||file.size>5*1024*1024)throw Error("Select a CSV file between 1 byte and 5 MB.");
   const result=prepareAwinBatches(await file.text(),{publisher:selected.awin_publisher_id,advertiser:selected.awin_advertiser_id});
   setPrepared(result);setMessage("Validated locally. Nothing has been submitted.");
  }catch(e){setMessage(e instanceof Error?e.message:"File validation failed.");}
  finally{lock.current=false;setBusy(false);}
 }
 async function submit(){
  if(lock.current||!prepared||!confirmed||failed||runs.length||journal||!storageReady)return;
  lock.current=true;setBusy(true);
  const completed:string[]=[];
  try{
   for(let i=0;i<prepared.batches.length;i++){
    setMessage("Submitting batch "+(i+1)+" of "+prepared.batches.length+"...");
    checkpoint({source,total:prepared.batches.length,runs:[...completed],pending:i+1});
    const result=await submitBulkBatch(source,prepared.batches[i],true);
    if(!result.ok){setFailed(true);setMessage("Stopped at batch "+(i+1)+". "+result.message+" Earlier confirmed batches remain saved. Do not retry blindly.");return;}
    completed.push(result.run);checkpoint({source,total:prepared.batches.length,runs:[...completed],pending:null});setRuns([...completed]);
   }
   setMessage("All batches confirmed. Review each comparison and newly staged product. Nothing was published.");
  }catch{setFailed(true);setMessage("Submission interrupted. The last request may have committed. Check recent comparisons before preparing the remaining rows.");}
  finally{lock.current=false;setBusy(false);}
 }
 return <section className="dw-admin-panel"><h2>Bulk feed preparation and synchronization</h2>
 <p>Validate up to 5,000 products or 5 MB locally, then submit sequential batches of at most 100 rows and 100 KB. Each batch is a separate transaction. Keep this tab open. New products remain private; existing offer changes require review.</p>
 {!sources.length?<p>Authorize an advertiser before importing.</p>:<div className="dw-admin-form">
 <label>Authorized advertiser<select value={source} disabled={busy} onChange={e=>{setSource(e.target.value);reset();}}>{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 <label>Authorized legacy CSV<input type="file" accept=".csv,text/csv" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]??null);reset();}}/></label>
 <button type="button" disabled={busy||!file} onClick={prepare}>Validate and prepare batches</button>
 {prepared&&<><p>{prepared.products} products · {prepared.batches.length} batches</p><label><span><input type="checkbox" checked={confirmed} disabled={busy||failed||runs.length>0} onChange={e=>setConfirmed(e.target.checked)}/> I confirm the export is authorized for this advertiser and approve private staging.</span></label><button type="button" disabled={busy||!confirmed||failed||runs.length>0||!!journal||!storageReady} onClick={submit}>Compare and stage all prepared batches</button><progress value={runs.length} max={prepared.batches.length}/><p>{runs.length} of {prepared.batches.length} batches confirmed</p></>}
 {journal&&<section aria-label="Import recovery"><h3>Saved import checkpoint</h3><p>{journal.runs.length} of {journal.total} batches confirmed for {sources.find(s=>s.id===journal.source)?.name??"previous advertiser"}.</p>{journal.pending!==null&&<p role="alert">Batch {journal.pending} has an uncertain outcome. Check comparison records before submitting any remaining rows.</p>}{journal.runs.map(run=><p key={run}><a href={"?run="+encodeURIComponent(run)}>Review confirmed run {run}</a></p>)}<p>Only run references are saved in this tab; no feed contents or tracking URLs are stored. This is a recovery aid, not automatic resume.</p><button type="button" disabled={busy} onClick={()=>{if(window.confirm("Have you reviewed the saved runs and reconciled any uncertain batch? Clearing this checkpoint does not undo database changes."))clearJournal();}}>Clear reviewed checkpoint</button></section>}
 <p role="status" aria-live="polite">{message}</p>{runs.length>0&&<div><h3>Confirmed comparison runs</h3>{runs.map((run,i)=><p key={run}><a href={"?run="+encodeURIComponent(run)}>Review batch {i+1} · Run {run}</a></p>)}</div>}
 {failed&&<p>Inspect the latest comparison records before resubmitting any remaining rows. Preparing a file again resets this local progress list.</p>}
 </div>}</section>;
}
