/**
 * Minimal, strict CSV parser for authorized manual product-feed staging.
 * No external feed fetches; no auto-publishing.
 */
export type FeedCandidateInput={
 external_product_id:string;title:string;description:string;category_hint:string;
 image_url:string|null;affiliate_url:string;price_cents:number|null;currency:"USD";
};
const HEADERS=["external_product_id","title","description","category_hint","image_url","affiliate_url","price_usd"] as const;
const MAX_ROWS=100, MAX_BYTES=102400;
export function validExternalHttps(value:string):boolean{
 try{
  if(/[\s\\]/.test(value))return false;
  const u=new URL(value),h=u.hostname.toLowerCase().replace(/\.+$/,"");
  if(u.protocol!=="https:"||u.username||u.password||u.port||!h.includes(".")||h.includes("%"))return false;
  if(h==="localhost"||h.endsWith(".localhost")||h.endsWith(".local")||h.endsWith(".internal")||h.endsWith(".test")||h.endsWith(".example")||h.endsWith(".invalid"))return false;
  if(/^\d+(?:\.\d+){3}$/.test(h)||h.startsWith("[")||h.endsWith(".onion"))return false;
  return true;
 }catch{return false}
}
export function readCsvRows(input:string):string[][]{
 if(new TextEncoder().encode(input).length>MAX_BYTES)throw new Error("File exceeds 100 KB");
 const csv=input.replace(/^\uFEFF/,"");
 const rows:string[][]=[];let row:string[]=[],cell="",quoted=false,closed=false;
 for(let i=0;i<csv.length;i++){
  const c=csv[i];
  if(c==='"'){
   if(quoted&&csv[i+1]==='"'){cell+='"';i++;}
   else if(quoted){quoted=false;closed=true;}
   else if(!cell&&!closed){quoted=true;}
   else throw new Error("Unexpected quote in CSV");
  }else if(c===","&&!quoted){row.push(cell);cell="";closed=false;}
  else if((c==="\n"||c==="\r")&&!quoted){
   if(c==="\r"&&csv[i+1]==="\n")i++;
   row.push(cell);cell="";closed=false;
   if(row.some(s=>s.trim().length>0))rows.push(row);
   if(rows.length>MAX_ROWS+1)throw new Error("Maximum 100 rows per file");
   row=[];
  }else{if(closed)throw new Error("Unexpected character after closing quote");cell+=c;}
 }
 if(quoted)throw new Error("Unclosed quoted field in CSV");
 row.push(cell);if(row.some(s=>s.trim().length>0))rows.push(row);
 if(rows.length>MAX_ROWS+1)throw new Error("Maximum 100 rows per file");
 if(rows.length<2)throw new Error("CSV needs a header and at least one product");

 return rows;
}

export function parseFeedCSV(input:string):FeedCandidateInput[]{
 if(new TextEncoder().encode(input).length>MAX_BYTES)throw new Error("File exceeds 100 KB");
 const rows=readCsvRows(input);
 const header=rows.shift()!.map(c=>c.trim().toLowerCase());
 if(header.length!==HEADERS.length||HEADERS.some((h,i)=>header[i]!==h))
  throw new Error("CSV header must be: "+HEADERS.join(","));
 const ids=new Set<string>();
 return rows.map((r,i)=>{
  if(r.length!==HEADERS.length)throw new Error("Row "+(i+2)+" has an incorrect column count");
  const [external_product_id,title,description,category_hint,image_url,affiliate_url,price_usd]=r.map(s=>s.trim());
  if(!external_product_id||external_product_id.length>120||ids.has(external_product_id))throw new Error("Missing/duplicate/invalid product ID at row "+(i+2));
  ids.add(external_product_id);
  if(title.length<3||title.length>180||description.length>3000||category_hint.length>120)throw new Error("Invalid product text on row "+(i+2));
  if(!validExternalHttps(affiliate_url)||affiliate_url.length>2000)throw new Error("Invalid retailer HTTPS link on row "+(i+2));
  if(image_url&&!validExternalHttps(image_url))throw new Error("Invalid image HTTPS link on row "+(i+2));
  let price_cents:number|null=null;
  if(price_usd){
   if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(price_usd))throw new Error("Price must be USD dollars with up to 2 decimals on row "+(i+2));
   const [whole,fraction=""]=price_usd.split(".");
   price_cents=Number(whole)*100+Number(fraction.padEnd(2,"0"));
   if(!Number.isSafeInteger(price_cents)||price_cents>100000000)throw new Error("Price too large on row "+(i+2));
  }
  return {external_product_id,title,description,category_hint,image_url:image_url||null,affiliate_url,price_cents,currency:"USD" as const};
 });
}
