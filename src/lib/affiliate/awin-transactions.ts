// Legacy Awin publisher transaction response -> existing USD ledger contract.
type Status="pending"|"approved"|"paid"|"reversed";
export type AwinCommissionRow={transaction_ref:string;transaction_on:string;status:Status;commission_cents:number;currency:"USD";advertiser_id:string};
export type AwinTransactionScope={publisher:string;advertiser:string;statementOn:string;today:string};
const identifier=/^[1-9][0-9]{0,18}$/;
const object=(v:unknown):Record<string,unknown>|null=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:null;
function id(v:unknown){const s=typeof v==="string"?v:typeof v==="number"&&Number.isSafeInteger(v)?String(v):"";return identifier.test(s)?s:null;}
function day(s:unknown):s is string{if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+"T00:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}
function utcDay(v:unknown){if(typeof v!=="string")return null;const m=v.match(/^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|\+00:00)?$/);return m&&day(m[1])?m[1]:null;}
function cents(v:unknown){if(typeof v!=="number"&&typeof v!=="string")return null;const s=String(v);if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(s))return null;const [w,f=""]=s.split(".");const n=Number(w)*100+Number(f.padEnd(2,"0"));return Number.isSafeInteger(n)&&n<=100000000?n:null;}
export function normalizeAwinTransactions(data:unknown,scope:AwinTransactionScope):AwinCommissionRow[]{
 if(!identifier.test(scope.publisher)||!identifier.test(scope.advertiser)||!day(scope.statementOn)||!day(scope.today)||scope.statementOn>scope.today)throw Error("Invalid transaction scope");
 if(!Array.isArray(data)||data.length>100)throw Error("Expected 0–100 transactions");
 const seen=new Set<string>();
 return data.map((value,index)=>{
  const invalid=()=>{throw Error("Unsupported or invalid transaction at row "+(index+1));};
  const r=object(value);if(!r)return invalid();
  const transaction_ref=id(r.id),transaction_on=utcDay(r.transactionDate),amount=object(r.commissionAmount);
  if(!transaction_ref||seen.has(transaction_ref)||id(r.publisherId)!==scope.publisher||id(r.advertiserId)!==scope.advertiser||!transaction_on||transaction_on>scope.statementOn||!amount||amount.currency!=="USD"||typeof r.paidToPublisher!=="boolean")return invalid();
  const commission=cents(amount.amount);if(commission===null)return invalid();
  let status:Status;
  switch(r.commissionStatus){
   case "pending":if(r.paidToPublisher)return invalid();status="pending";break;
   case "approved":status=r.paidToPublisher?"paid":"approved";break;
   case "declined":case "deleted":if(r.paidToPublisher)return invalid();status="reversed";break;
   default:return invalid();
  }
  seen.add(transaction_ref);
  return {transaction_ref,transaction_on,status,commission_cents:status==="reversed"?0:commission,currency:"USD",advertiser_id:scope.advertiser};
 });
}
export function parseAwinTransactionJson(input:string,scope:AwinTransactionScope){
 if(new TextEncoder().encode(input).length>1048576)throw Error("JSON exceeds 1 MB");
 return normalizeAwinTransactions(JSON.parse(input),scope);
}
