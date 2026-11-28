import "server-only";
import {createClient} from "@supabase/supabase-js";
import type {TestPaymentStore,StoredTestOrder} from "./stripe-test-flow";
import type {StripeTestConfig} from "./stripe-checkout";

export function stripeTestConfig():StripeTestConfig{
 return {enabled:process.env.VERCEL_ENV==="preview"&&process.env.DEALWOVO_STRIPE_TEST_ENABLED==="true",secret:process.env.STRIPE_TEST_SECRET_KEY??"",webhookSecret:process.env.STRIPE_TEST_WEBHOOK_SECRET??"",origin:process.env.DEALWOVO_STRIPE_TEST_ORIGIN??""};
}
// A dedicated restricted PostgREST JWT is required. Never fall back to service_role or a browser key.
export function stripeTestStore():TestPaymentStore|null{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,token=process.env.DEALWOVO_STRIPE_TEST_WRITER_TOKEN;
 if(!url||!key||!token)return null;
 try{
  const u=new URL(url);if(u.protocol!=="https:"||u.username||u.password||u.port||u.pathname!=="/"||u.search||u.hash)return null;
  const payload=JSON.parse(Buffer.from(token.split(".")[1]??"","base64url").toString("utf8"));
  if(payload.role!=="dealwovo_stripe_test_writer"||!Number.isFinite(payload.exp)||payload.exp<=Date.now()/1000)return null;
  const db=createClient(url,key,{accessToken:async()=>token,auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  return {
   async get(id):Promise<StoredTestOrder|null>{
    const {data,error}=await db.from("retail_stripe_test_orders").select("id,total_cents,currency,checkout_session_id,payment_ref").eq("id",id).maybeSingle();
    if(error)throw Error("Test order unavailable");if(!data)return null;
    return {id:data.id,totalCents:data.total_cents,currency:data.currency,sessionId:data.checkout_session_id,paymentRef:data.payment_ref,state:data.payment_ref===null?"awaiting_payment":"paid"};
   },
   async bind(id,session,amount){
    const {data,error}=await db.rpc("bind_stripe_test_session",{p_order:id,p_session:session,p_amount:amount});
    if(error)throw Error("Test session binding failed");return data===true;
   },
   async record(p){
    const {data,error}=await db.rpc("record_stripe_test_payment",{p_order:p.orderId,p_session:p.sessionId,p_event:p.eventId,p_payment:p.paymentRef,p_amount:p.amountCents,p_currency:p.currency,p_at:p.observedAt});
    if(error||!["recorded","duplicate","already_paid"].includes(data))throw Error("Test payment recording failed");
    return data as "recorded"|"duplicate"|"already_paid";
   }
  };
 }catch{return null;}
}
