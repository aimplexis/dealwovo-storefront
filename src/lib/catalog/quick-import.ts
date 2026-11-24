import {validExternalHttps,type FeedCandidateInput} from "./feed-csv";
export function suggestSlug(title:string,id:string){
 const stem=title.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90).replace(/-+$/g,"")||"product";
 const suffix=id.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,12);
 return suffix?stem+"-"+suffix:stem;
}
export function quickCandidate(input:Record<string,unknown>):FeedCandidateInput|null{
 const get=(k:string)=>typeof input[k]==="string"?(input[k] as string).trim():"";
 const title=get("title"),external_product_id=get("external_product_id"),affiliate_url=get("affiliate_url"),description=get("description"),category_hint=get("category_hint");
 if(title.length<3||title.length>180||!external_product_id||external_product_id.length>120||description.length>3000||category_hint.length>120||affiliate_url.length>2000||!validExternalHttps(affiliate_url)||get("confirmed")!=="yes")return null;
 // Link-only intake: original editorial text, no copied images or retailer price.
 return {title,external_product_id,affiliate_url,description,category_hint,image_url:null,price_cents:null,currency:"USD"};
}
