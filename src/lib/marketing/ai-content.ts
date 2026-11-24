import "server-only";

export const channels=["instagram","facebook","pinterest","blog"] as const;
export const themes=["holiday deals","gift discovery","everyday essentials","shopping research"] as const;
export type Channel=typeof channels[number];
export type Theme=typeof themes[number];
export type Brief={channel:Channel;theme:Theme;occasion:string};
export const approvedModel="google/gemini-2.5-flash-lite";
export function contentEnabled(){
 return process.env.DEALWOVO_AI_CONTENT_ENABLED==="true"&&process.env.AI_GATEWAY_MODEL===approvedModel&&Boolean(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN);
}
export function buildBrief(b:Brief){
 return "Create one private Dealwovo editorial draft in English for "+b.channel+". Theme: "+b.theme+". Calendar context: "+b.occasion+". Use a warm, concise shopping-discovery tone. Include hook, short body, and CTA to dealwovo.com. No specific products, prices, discounts, stock, shipping, rankings, testimonials, urgency, or revenue claims. Do not imply independent research or publish anything. Output plain text only. Human review required.";
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
