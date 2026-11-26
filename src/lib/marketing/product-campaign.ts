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

import {siteOrigin} from "./seo-readiness";
export type ExportPack={id:string;product_title:string;product_slug:string;merchant:string;verified_at:string;expires_at:string;status:string;current:boolean;assets:unknown;review:{status:string}|null};
const sourceByChannel:Record<string,string>={instagram:"instagram",facebook:"facebook",pinterest:"pinterest",tiktok:"tiktok",youtube:"youtube",newsletter:"newsletter"};
/** Private handoff only. UTM parameters identify intended channels, not measured conversions. */
export function campaignHandoff(p:ExportPack,now:number){
 if(!Number.isFinite(now)||p.status!=="reviewed"||p.current!==true||p.review?.status!=="reviewed"||!Number.isFinite(Date.parse(p.verified_at))||Date.parse(p.verified_at)>now||!Number.isFinite(Date.parse(p.expires_at))||Date.parse(p.expires_at)<=now||!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).test(p.product_slug)||p.product_slug.length>150||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).test(p.id))return null;
 const destination=siteOrigin+"/product/"+p.product_slug;
 const assets=displayAssets(p.assets);
 if(!assets.length)return null;
 return {status:"INTERNAL REVIEW ONLY — EXTERNAL DISTRIBUTION HELD",campaignId:p.id,product:p.product_title,retailer:p.merchant,verifiedAt:p.verified_at,expiresAt:p.expires_at,destination,requirements:["Recheck current offer and exact product before use.","Verify channel permission, rights, disclosures and final media.","Obtain separate owner release approval. No publishing, sending or spending is authorized.","UTM tags are planning identifiers only; tracking and conversion attribution are not enabled by this export."],assets:assets.map(a=>{const source=sourceByChannel[a.key];const url=new URL(destination);if(source){url.searchParams.set("utm_source",source);url.searchParams.set("utm_medium",source==="newsletter"?"email":"organic_social");url.searchParams.set("utm_campaign","product-"+p.id);}return {...a,landingUrl:url.toString()};})};
}
