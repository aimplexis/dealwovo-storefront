import {stripeTestReady,type StripeTestConfig} from "./stripe-checkout";
import {startTestCheckout,receiveTestPayment,type TestPaymentStore} from "./stripe-test-flow";
const response=(status:number,body:object)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"}});
async function boundedBody(req:Request,max:number):Promise<string>{
 const length=req.headers.get("content-length");
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>max))throw Error("Body size");
 const reader=req.body?.getReader();if(!reader)throw Error("Missing body");
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error("Body size");}chunks.push(value);}
 return new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks));
 }finally{reader.releaseLock();}
}
export async function checkoutHttp(req:Request,c:StripeTestConfig,authorize:()=>Promise<boolean>,getStore:()=>TestPaymentStore|null,request:typeof fetch=fetch){
 if(!stripeTestReady(c))return response(503,{error:"Test checkout unavailable"});
 if(req.method!=="POST")return response(405,{error:"Method not allowed"});
 if(req.headers.get("origin")!==new URL(c.origin).origin)return response(403,{error:"Origin not allowed"});
 if(req.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json")return response(415,{error:"JSON required"});
 try{
  if(!(await authorize()))return response(403,{error:"Owner authorization required"});
  let input;try{input=JSON.parse(await boundedBody(req,1024));}catch{return response(400,{error:"Invalid request"});}
  if(!input||typeof input.orderId!=="string"||Object.keys(input).length!==1)return response(400,{error:"Order ID required"});
  const store=getStore();if(!store)return response(503,{error:"Test storage unavailable"});
  const session=await startTestCheckout(c,store,input.orderId,true,request);
  return session?response(200,{mode:"test",...session}):response(409,{error:"Test checkout could not be started"});
 }catch{return response(503,{error:"Test checkout unavailable"});}
}
export async function webhookHttp(req:Request,c:StripeTestConfig,getStore:()=>TestPaymentStore|null,now=Date.now()){
 if(!stripeTestReady(c))return response(503,{error:"Test webhook unavailable"});
 if(req.method!=="POST")return response(405,{error:"Method not allowed"});
 const signature=req.headers.get("stripe-signature");
 if(!signature||signature.length>4096)return response(400,{error:"Invalid signature"});
 let raw;try{raw=await boundedBody(req,1000000);}catch{return response(400,{error:"Invalid event body"});}
 try{
  const store=getStore();if(!store)return response(503,{error:"Test storage unavailable"});
  const result=await receiveTestPayment(c,store,raw,signature,now);
  if(result==="rejected")return response(400,{error:"Event rejected"});
  if(result==="unavailable")return response(503,{error:"Event processing unavailable"});
  return response(200,{received:true,mode:"test",result});
 }catch{return response(503,{error:"Event processing unavailable"});}
}
