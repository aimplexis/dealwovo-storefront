export const channelLabels={seo:"SEO brief",instagram:"Instagram",facebook:"Facebook",pinterest:"Pinterest",tiktok:"TikTok script",youtube:"YouTube Shorts",newsletter:"Newsletter draft",creative:"Creative production brief"} as const;
export function displayAssets(value:unknown){
 if(!value||typeof value!=="object"||Array.isArray(value))return [];
 const obj=value as Record<string,unknown>;
 return Object.entries(channelLabels).flatMap(([key,label])=>{
 const raw=obj[key];if(!raw||typeof raw!=="object"||Array.isArray(raw))return [];
 const fields=Object.entries(raw).filter((entry):entry is [string,string]=>typeof entry[1]==="string"&&entry[1].length<=4000);
 return fields.length?[{key,label,fields}]:[];
 });
}
export function packState(status:string,current:boolean,expiry:string,now:number){
 if(status==="archived")return "Archived";
 if(!current||!Number.isFinite(Date.parse(expiry))||Date.parse(expiry)<=now)return "Blocked — product or offer changed or expired";
 if(status==="reviewed")return "Internally reviewed — external distribution held";
 return "Draft — review required";
}
