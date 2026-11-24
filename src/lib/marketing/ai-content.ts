import "server-only";

import {buildBrief,type Brief} from "./content-brief";
export {channels,themes,buildBrief} from "./content-brief";
export type {Channel,Theme,Brief} from "./content-brief";
export const approvedModel="google/gemini-2.5-flash-lite";
export function contentEnabled(){
 return process.env.DEALWOVO_AI_CONTENT_ENABLED==="true"&&process.env.AI_GATEWAY_MODEL===approvedModel&&Boolean(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN);
}
export async function generateContent(b:Brief):Promise<string>{
 if(!contentEnabled())throw new Error("disabled");
 const token=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN;
 const response=await fetch("https://ai-gateway.vercel.sh/v1/chat/completions",{
 method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
 body:JSON.stringify({model:approvedModel,messages:[{role:"user",content:buildBrief(b)}],max_tokens:450,temperature:0.5}),cache:"no-store",signal:AbortSignal.timeout(20000)
 });
 if(!response.ok)throw new Error("gateway-status-"+response.status);
 const data=await response.json();
 const output=data?.choices?.[0]?.message?.content;
 if(typeof output!=="string"||!output.trim()||output.length>2500)throw new Error("invalid-output");
 return output.trim();
}
