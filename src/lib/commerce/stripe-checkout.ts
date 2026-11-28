import {createHmac,timingSafeEqual} from "node:crypto";
// Server-side adapter only. Never expose secret or accept a client-supplied order amount.
export type CheckoutOrder={id:string;totalCents:number;state:string;currency:string};
export type StripeTestConfig={enabled:boolean;secret:string;webhookSecret:string;origin:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validOrder(o:CheckoutOrder){return uuid.test(o.id)&&o.state==="awaiting_payment"&&o.currency==="USD"&&Number.isSafeInteger(o.totalCents)&&o.totalCents>=50&&o.totalCents<=100000000;}
function origin(c:StripeTestConfig){try{const u=new URL(c.origin);return u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&u.pathname==="/"&&!u.search&&!u.hash?u.origin:null;}catch{return null;}}
export function stripeTestReady(c:StripeTestConfig){return c.enabled===true&&/^sk_test_[A-Za-z0-9_]{10,200}$/.test(c.secret)&&/^whsec_[A-Za-z0-9_]{10,200}$/.test(c.webhookSecret)&&!!origin(c);}
export async function createStripeTestCheckout(c:StripeTestConfig,o:CheckoutOrder,request:typeof fetch=fetch){
 if(!stripeTestReady(c)||!validOrder(o))return null;
 const base=origin(c)!;
 const params=new URLSearchParams({mode:"payment","payment_method_types[0]":"card","line_items[0][price_data][currency]":"usd","line_items[0][price_data][unit_amount]":String(o.totalCents),"line_items[0][price_data][product_data][name]":"Dealwovo test order","line_items[0][quantity]":"1",client_reference_id:o.id,"metadata[order_id]":o.id,"payment_intent_data[metadata][order_id]":o.id,success_url:base+"/shop?checkout=test-return",cancel_url:base+"/shop?checkout=test-cancel"});
 try{
  const res=await request("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{Authorization:"Bearer "+c.secret,"Content-Type":"application/x-www-form-urlencoded","Idempotency-Key":"dealwovo-test-"+o.id.toLowerCase()},body:params,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!res.ok)return null;
  const raw=await res.text();if(raw.length>1000000)return null;
  const s=JSON.parse(raw);
  if(s.object!=="checkout.session"||s.livemode!==false||!/^cs_test_[A-Za-z0-9_]+$/.test(s.id)||s.client_reference_id!==o.id||s.metadata?.order_id!==o.id||s.amount_total!==o.totalCents||s.currency!=="usd"||s.mode!=="payment"||s.status!=="open"||typeof s.url!=="string")return null;
  const u=new URL(s.url);if(u.origin!=="https://checkout.stripe.com"||u.username||u.password||!u.pathname.startsWith("/c/pay/"))return null;
  return {sessionId:s.id as string,url:u.toString()};
 }catch{return null;}
}
export function verifiedStripeTestPayment(c:StripeTestConfig,raw:string,signature:string,o:CheckoutOrder,expectedSessionId:string,now=Date.now()){
 if(!stripeTestReady(c)||!validOrder(o)||!/^cs_test_[A-Za-z0-9_]+$/.test(expectedSessionId)||Buffer.byteLength(raw)>1000000||signature.length>4096||!Number.isFinite(now))return null;
 const parts=signature.split(","),timestamps=parts.filter(p=>p.startsWith("t="));
 if(timestamps.length!==1||!/^t=\d{1,12}$/.test(timestamps[0]))return null;
 const timestamp=timestamps[0].slice(2);if(Math.abs(now/1000-Number(timestamp))>300)return null;
 const digest=createHmac("sha256",c.webhookSecret).update(timestamp+"."+raw).digest();
 if(!parts.some(p=>/^v1=[0-9a-f]{64}$/i.test(p)&&timingSafeEqual(digest,Buffer.from(p.slice(3),"hex"))))return null;
 try{
  const e=JSON.parse(raw),s=e.data?.object;
  if(e.object!=="event"||e.livemode!==false||e.type!=="checkout.session.completed"||!/^evt_[A-Za-z0-9_]+$/.test(e.id)||!Number.isSafeInteger(e.created)||e.created*1000>now||s?.object!=="checkout.session"||s.livemode!==false||s.id!==expectedSessionId||s.client_reference_id!==o.id||s.metadata?.order_id!==o.id||s.mode!=="payment"||s.status!=="complete"||s.payment_status!=="paid"||s.amount_total!==o.totalCents||s.currency!=="usd"||typeof s.payment_intent!=="string"||!/^pi_[A-Za-z0-9_]+$/.test(s.payment_intent))return null;
  return {orderId:o.id,eventId:e.id as string,paymentRef:s.payment_intent as string,amountCents:o.totalCents,currency:"USD" as const,observedAt:new Date(e.created*1000).toISOString()};
 }catch{return null;}
}
