import {formatCents} from "./revenue-input";
export function signedCents(s:string){return /^-\d+$/.test(s)?"-"+formatCents(s.slice(1)):formatCents(s);}
export function revisionAmount(s:string){if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(s))return null;const [w,f=""]=s.split(".");const n=Number(w)*100+Number(f.padEnd(2,"0"));return n<=100000000?n:null;}
export function breakEven(orderCents:number,commissionBps:number,conversionBps:number,reversalBps:number,otherCents:number){
 if(!Number.isSafeInteger(orderCents)||orderCents<=0||orderCents>100000000||![commissionBps,conversionBps,reversalBps].every(n=>Number.isInteger(n)&&n>=0&&n<=10000)||!Number.isSafeInteger(otherCents)||otherCents<0||otherCents>100000000)return null;
 const denom=1000000000000n,expected=BigInt(orderCents)*BigInt(commissionBps)*BigInt(conversionBps)*BigInt(10000-reversalBps),net=expected-BigInt(otherCents)*denom;
 return {expectedCentsFloor:Number(expected/denom),maxAcquisitionCents:net>0n?Number(net/denom):0,positive:net>0n};
}
