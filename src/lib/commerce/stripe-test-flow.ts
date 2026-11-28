import {createStripeTestCheckout,verifiedStripeTestPayment,stripeTestReady,type StripeTestConfig,type CheckoutOrder} from "./stripe-checkout";
export type StoredTestOrder=CheckoutOrder&{sessionId:string|null;paymentRef:string|null};
export type TestPaymentStore={
 get(id:string):Promise<StoredTestOrder|null>;
 bind(id:string,session:string,amount:number):Promise<boolean>;
 record(input:{orderId:string;sessionId:string;eventId:string;paymentRef:string;amountCents:number;currency:"USD";observedAt:string}):Promise<"recorded"|"duplicate"|"already_paid">;
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function startTestCheckout(c:StripeTestConfig,store:TestPaymentStore,id:string,ownerAuthorized:boolean,request:typeof fetch=fetch){
 if(!ownerAuthorized||!stripeTestReady(c)||!uuid.test(id))return null;
 try{
  const o=await store.get(id);
  if(!o||o.id!==id||o.paymentRef!==null||o.sessionId!==null||o.state!=="awaiting_payment")return null;
  const session=await createStripeTestCheckout(c,o,request);
  if(!session||!(await store.bind(id,session.sessionId,o.totalCents)))return null;
  return session;
 }catch{return null;}
}
// Read only a bounded candidate identifier before authentication; never persist or log raw events.
// Caller must supply a restricted server-side store, not a browser credential.
export async function receiveTestPayment(c:StripeTestConfig,store:TestPaymentStore,raw:string,signature:string,now=Date.now()){
 if(!stripeTestReady(c)||Buffer.byteLength(raw)>1000000||signature.length>4096)return "rejected" as const;
 try{
  const parsed=JSON.parse(raw),s=parsed.data?.object,id=s?.client_reference_id;
  if(typeof id!=="string"||!uuid.test(id)||typeof s?.id!=="string"||!/^cs_test_[A-Za-z0-9_]{1,200}$/.test(s.id))return "rejected" as const;
  // Authenticate before any database access. The provisional amount is used only for signature and shape validation.
  const provisional:CheckoutOrder={id,totalCents:s.amount_total,currency:"USD",state:"awaiting_payment"};
  const signed=verifiedStripeTestPayment(c,raw,signature,provisional,s.id,now);
  if(!signed)return "rejected" as const;
  const o=await store.get(id);
  if(!o||o.id!==id||o.sessionId!==s.id||o.totalCents!==signed.amountCents||o.currency!=="USD"||(o.paymentRef!==null&&o.paymentRef!==signed.paymentRef))return "rejected" as const;
  return await store.record({...signed,sessionId:s.id});
 }catch{return "unavailable" as const;}
}
