import {readCsvRows,validExternalHttps,type FeedCandidateInput} from "./feed-csv";

/**
 * Awin Create-a-Feed CSV preview adapter.
 *
 * This DOES NOT authenticate to Awin, download feeds or grant publisher rights.
 * It only maps an already-authorized publisher export to a private staging batch.
 * For unambiguous USD pricing, require an explicit currency=USD column.
 */
import {awinLinkMatches} from "./awin-link";
const required=["product_name","aw_deep_link"] as const;
const optional=["description","product_description","merchant_category","merchant_product_category_path","image_url","price","search_price","currency"] as const;
export function parseAwinCSV(content:string,binding?:{publisher:string;advertiser:string}):FeedCandidateInput[]{
 const rows=readCsvRows(content);
 const fields=rows.shift()!.map(s=>s.trim().toLowerCase());
 if(fields.length!==new Set(fields).size)throw new Error("Duplicate Awin CSV column names");
 for(const field of required)if(!fields.includes(field))throw new Error("Missing Awin column: "+field);
 if(!fields.includes("merchant_product_id")&&!fields.includes("product_id"))throw new Error("Missing stable merchant product ID (merchant_product_id or product_id)");
 const index=new Map(fields.map((k,i)=>[k,i] as const));
 const seen=new Set<string>();
 const mapped=rows.map((r,i)=>{
   if(r.length!==fields.length)throw new Error("Awin row "+(i+2)+" has the wrong number of fields");
   const get=(key:string)=>{const n=index.get(key);return n===undefined?"":r[n].trim()};
   const id=fields.includes("merchant_product_id")?get("merchant_product_id"):get("product_id"),title=get("product_name");
   const description=get("description")||get("product_description");
   const category=get("merchant_category")||get("merchant_product_category_path");
   const affiliate=get("aw_deep_link"),image=get("image_url");
   if(!id||id.length>120||seen.has(id))throw new Error("Missing, too-long or duplicate Awin product ID at row "+(i+2));
   seen.add(id);
   if(title.length<3||title.length>180||description.length>3000||category.length>120)
     throw new Error("Invalid product title, description or category at Awin row "+(i+2));
   if(!validExternalHttps(affiliate)||affiliate.length>2000)
     throw new Error("Awin tracking deep link must be a valid external HTTPS link at row "+(i+2));
   if(binding&&(!awinLinkMatches(affiliate,binding.publisher,binding.advertiser)||(fields.includes("merchant_id")&&get("merchant_id")!==binding.advertiser)))throw new Error("Tracking or advertiser ID mismatch at Awin row "+(i+2));
   if(image&&!validExternalHttps(image))throw new Error("Invalid image URL at Awin row "+(i+2));
   const declaredCurrency=get("currency").toUpperCase();
   if(declaredCurrency&&declaredCurrency!=="USD")
     throw new Error("Only USD product feeds are supported. Row "+(i+2)+" specifies "+declaredCurrency);
   const rawPrice=get("price")||get("search_price");
   let price_cents:number|null=null;
   // Do not silently assume US dollars if Awin's CSV omitted its currency.
   if(declaredCurrency==="USD"&&rawPrice){
     if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(rawPrice))
       throw new Error("Invalid USD price at Awin row "+(i+2));
     const [dollars,cents=""]=rawPrice.split(".");
     price_cents=Number(dollars)*100+Number(cents.padEnd(2,"0"));
     if(!Number.isSafeInteger(price_cents)||price_cents>100000000)
       throw new Error("USD price exceeds accepted limits at Awin row "+(i+2));
   }
   return {external_product_id:id,title,description,category_hint:category,
     image_url:image||null,affiliate_url:affiliate,price_cents,currency:"USD" as const};
 });
 if(mapped.length<1||mapped.length>100)throw new Error("Awin CSV must contain between 1 and 100 products");
 return mapped;
}
