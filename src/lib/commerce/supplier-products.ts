import {readBoundedCsvRows,validExternalHttps} from "../catalog/feed-csv";
export const headers=["sku","title","description","category_hint","image_url","wholesale_usd","retail_usd","shipping_usd","reported_quantity","source_reference","observed_at"] as const;
export function field(f:FormData,k:string){const v=f.get(k);return typeof v==="string"?v.trim():"";}
function money(s:string,zero=false){if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(s))throw Error("Invalid USD");const [a,b=""]=s.split(".");const n=Number(a)*100+Number(b.padEnd(2,"0"));if(n>100000000||n<(zero?0:1))throw Error("Invalid amount");return n;}
export function product(values:readonly string[],supplier_id:string,now=Date.now()){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supplier_id)||values.length!==headers.length)throw Error("Invalid supplier or fields");
 const [sku,title,description,category_hint,image_url,w,r,s,q,source_reference,observed_at]=values.map(v=>v.trim());
 const limits:[[string,number,number],...[string,number,number][]]=[[sku,1,120],[title,3,180],[description,0,3000],[category_hint,2,120],[source_reference,3,500]];
 for(const [v,min,max] of limits)if(v.length<min||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v))throw Error("Invalid text");
 if(/[\r\n\t]/.test(sku)||image_url&&(image_url.length>2000||!validExternalHttps(image_url)))throw Error("Invalid SKU or image");
 if(q&&(!/^\d{1,8}$/.test(q)||Number(q)>10000000))throw Error("Invalid quantity");
 const t=Date.parse(observed_at);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(observed_at)||!Number.isFinite(t)||t>now||new Date(t).toISOString()!==observed_at.replace("Z",".000Z"))throw Error("Invalid observation timestamp");
 return {supplier_id,sku,title,description,category_hint,image_url:image_url||null,wholesale_cents:money(w),retail_cents:money(r),shipping_cents:s?money(s,true):null,reported_quantity:q?Number(q):null,source_reference,observed_at};
}
export function supplierCSV(csv:string,id:string,now=Date.now()){
 const rows=readBoundedCsvRows(csv,100,102400),h=rows.shift()!;if(h.length!==headers.length||headers.some((v,i)=>h[i].trim()!==v))throw Error("Invalid header");
 const seen=new Set<string>();return rows.map(row=>{const p=product(row,id,now);if(seen.has(p.sku))throw Error("Duplicate SKU");seen.add(p.sku);return p;});
}
