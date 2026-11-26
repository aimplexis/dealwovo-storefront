import {readBoundedCsvRows} from "./feed-csv";
import {parseAwinCSV} from "./awin-feed";
const encode=(row:string[])=>row.map(v=>'"'+v.replace(/"/g,'""')+'"').join(",");
const bytes=(s:string)=>new TextEncoder().encode(s).length;
export function prepareAwinBatches(input:string,binding:{publisher:string;advertiser:string}){
 if(!/^[1-9][0-9]{0,18}$/.test(binding.publisher)||!/^[1-9][0-9]{0,18}$/.test(binding.advertiser))throw new Error("Valid publisher and advertiser IDs required");
 const rows=readBoundedCsvRows(input,5000,5*1024*1024),header=encode(rows.shift()!),seen=new Set<string>(),batches:string[]=[];
 let lines=[header],size=bytes(header);
 const flush=()=>{if(lines.length===1)return;const csv=lines.join("\n");for(const row of parseAwinCSV(csv,binding)){if(seen.has(row.external_product_id))throw new Error("Duplicate product ID across feed batches");seen.add(row.external_product_id);}batches.push(csv);lines=[header];size=bytes(header);};
 for(const row of rows){const line=encode(row),n=bytes(line)+1;if(bytes(header)+n>102400)throw new Error("Single product exceeds batch size");if(lines.length>=101||size+n>102400)flush();lines.push(line);size+=n;}
 flush();return {batches,products:seen.size};
}
