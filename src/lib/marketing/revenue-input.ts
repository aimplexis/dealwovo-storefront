// Money is parsed as integer cents, never floating point.
export const commissionStatuses=["pending","approved","paid","reversed"] as const;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ref=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
function isDate(s:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+"T00:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}
export function parseCommission(input:Record<string,unknown>,today:string){
 const {source_id,transaction_ref,statement_ref,transaction_on,statement_on,status,amount,confirm}=input;
 if(typeof source_id!=="string"||!uuid.test(source_id)||typeof transaction_ref!=="string"||!ref.test(transaction_ref)||typeof statement_ref!=="string"||!ref.test(statement_ref)||typeof transaction_on!=="string"||!isDate(transaction_on)||typeof statement_on!=="string"||!isDate(statement_on)||statement_on<transaction_on||statement_on>today||typeof status!=="string"||!commissionStatuses.some(s=>s===status)||confirm!=="yes"||typeof amount!=="string"||!/^\d{1,7}(?:\.\d{1,2})?$/.test(amount))return null;
 const [whole,fraction=""]=amount.split(".");const commission_cents=Number(whole)*100+Number(fraction.padEnd(2,"0"));
 if(commission_cents>100000000||(status==="reversed"&&commission_cents!==0))return null;
 return {source_id,transaction_ref,statement_ref,transaction_on,statement_on,status,commission_cents};
}
export function formatCents(value:string){if(!/^\d+$/.test(value))return "Unavailable";const digits=value.replace(/^0+(?=\d)/,"").padStart(3,"0");const whole=digits.slice(0,-2).replace(/\B(?=(\d{3})+(?!\d))/g,",");return "$"+whole+"."+digits.slice(-2);}
