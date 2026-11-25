import {readCsvRows} from "../catalog/feed-csv";
import {parseCommission} from "../marketing/revenue-input";
export const statementHeader="transaction_ref,transaction_on,status,amount_usd,currency,advertiser_id";
export function parseAwinStatement(csv:string,source_id:string,statement_ref:string,statement_on:string,advertiser:string,today:string){
 const rows=readCsvRows(csv),header=rows.shift()!.map(v=>v.trim().toLowerCase()).join(",");
 if(header!==statementHeader)throw Error("Use the Dealwovo normalized statement header");
 const seen=new Set<string>();
 return rows.map((row,i)=>{
  if(row.length!==6)throw Error("Invalid row "+(i+2));
  const [transaction_ref,transaction_on,status,amount,currency,advertiser_id]=row.map(v=>v.trim());
  const parsed=parseCommission({source_id,statement_ref,statement_on,transaction_ref,transaction_on,status,amount,confirm:"yes"},today);
  if(!parsed||currency!=="USD"||advertiser_id!==advertiser||seen.has(transaction_ref))throw Error("Invalid or duplicate scoped row "+(i+2));
  seen.add(transaction_ref);
  return {transaction_ref,transaction_on,status,commission_cents:parsed.commission_cents,currency,advertiser_id};
 });
}
