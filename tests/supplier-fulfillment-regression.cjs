const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-fulfillment-"));
try{
 cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--outDir",dir,"src/lib/commerce/supplier-fulfillment.ts"],{stdio:"inherit"});
 const {transitionFulfillment:step,supplierSubmissionKey:key}=require(path.join(dir,"supplier-fulfillment.js"));
 const id="00000000-0000-4000-8000-000000000001",now=Date.parse("2026-11-28T12:00:00Z");
 const order={id,supplierId:"supplier-1",sku:"SKU-1",quantity:1,totalCents:2500,currency:"USD",state:"awaiting_payment",updatedAt:"2026-11-28T10:00:00Z"};
 const event=(kind,minute,more={})=>({orderId:id,kind,reference:"evidence-"+minute,observedAt:"2026-11-28T10:"+String(minute).padStart(2,"0")+":00Z",...more});
 assert.equal(key(order),null);
 assert.equal(step(order,event("submission_requested",1),now),null);
 for(const bad of [{amountCents:2499,currency:"USD"},{amountCents:2500,currency:"EUR"},{amountCents:2500,currency:"USD",orderId:"wrong"},{amountCents:2500,currency:"USD",observedAt:"2026-11-29T00:00:00Z"}])assert.equal(step(order,event("payment_verified",1,bad),now),null);
 const paid=step(order,event("payment_verified",1,{amountCents:2500,currency:"USD"}),now);
 assert.equal(paid.state,"paid");assert.equal(key(paid),"dealwovo-order-"+id);
 assert.equal(step(paid,event("payment_verified",2,{amountCents:2500,currency:"USD"}),now),null);
 const pending=step(paid,event("submission_requested",2),now);assert.equal(pending.state,"submission_pending");assert.equal(key(pending),null);
 const uncertain=step(pending,event("submission_uncertain",3),now);assert.equal(uncertain.state,"submission_uncertain");assert.equal(key(uncertain),null);assert.equal(step(uncertain,event("submission_requested",4),now),null);
 const accepted=step(uncertain,event("supplier_accepted",4,{supplierOrderRef:"supplier-order-1"}),now);assert.equal(accepted.state,"accepted");
 assert.equal(step(accepted,event("shipment_verified",5,{supplierOrderRef:"wrong",trackingRef:"tracking-1"}),now),null);
 assert.equal(step(accepted,event("shipment_verified",5,{supplierOrderRef:"supplier-order-1"}),now),null);
 const shipped=step(accepted,event("shipment_verified",5,{supplierOrderRef:"supplier-order-1",trackingRef:"tracking-1"}),now);assert.equal(shipped.state,"shipped");
 assert.equal(step(shipped,event("delivery_verified",6,{supplierOrderRef:"supplier-order-1",trackingRef:"wrong"}),now),null);
 const delivered=step(shipped,event("delivery_verified",6,{supplierOrderRef:"supplier-order-1",trackingRef:"tracking-1"}),now);assert.equal(delivered.state,"delivered");assert.equal(step(delivered,event("exception_reported",7),now),null);
 assert.equal(step(paid,event("cancellation_verified",2),now),null);
 assert.equal(step(order,event("cancellation_verified",1),now).state,"cancelled");
 assert.equal(step(paid,event("exception_reported",2),now).state,"exception");
 assert.equal(step(paid,event("submission_requested",1),now),null);
 console.log("PASS supplier fulfillment transition guards");
}finally{fs.rmSync(dir,{recursive:true,force:true});}
