// Read-only legacy publisher transaction probe. Never log headers, raw data or provider errors.
export type ProbeResult="ok"|"unauthorized"|"rate_limited"|"unavailable"|"invalid_response"|"disabled";
const id=/^[1-9][0-9]{0,18}$/;
export function awinProbeUrl(publisher:string,advertiser:string,date:string){
 if(!id.test(publisher)||!id.test(advertiser)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date))throw Error("Invalid scoped probe");
 const d=new Date(date+"T00:00:00Z");if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==date)throw Error("Invalid date");
 const url=new URL("https://api.awin.com/publishers/"+publisher+"/transactions/");
 url.search=new URLSearchParams({advertiserId:advertiser,startDate:date+"T00:00:00",endDate:date+"T23:59:59",timezone:"UTC",dateType:"transaction",showBasketProducts:"false"}).toString();return url;
}
export async function probeAwin(config:{enabled:boolean;publisher:string;token:string},publisher:string,advertiser:string,date:string,request:typeof fetch=fetch):Promise<ProbeResult>{
 if(!config.enabled||config.publisher!==publisher||!config.token||config.token.length>4096||/[\s\u0000-\u001f\u007f]/.test(config.token))return "disabled";
 try{
  const res=await request(awinProbeUrl(publisher,advertiser,date),{method:"GET",headers:{Authorization:"Bearer "+config.token,Accept:"application/json"},redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(res.status===401||res.status===403)return "unauthorized";
  if(res.status===429)return "rate_limited";
  if(!res.ok)return "unavailable";
  const reader=res.body?.getReader();if(!reader)return "invalid_response";
  const decoder=new TextDecoder();let text="",size=0;
  try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>1048576){await reader.cancel();return "invalid_response";}text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
  const data:unknown=JSON.parse(text);return Array.isArray(data)?"ok":"invalid_response";
 }catch{return "unavailable";}
}
