const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-supplier-"));
try{
 cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--outDir",dir,"src/lib/commerce/supplier-products.ts","src/lib/commerce/supplier-eligibility.ts"],{stdio:"inherit"});
 const {product,classifySupplierRefresh:refresh}=require(path.join(dir,"commerce/supplier-products.js"));
 const {assessSupplierProduct:assess}=require(path.join(dir,"commerce/supplier-eligibility.js"));
 const now=Date.parse("2026-11-27T18:00:00Z"),id="00000000-0000-4000-8000-000000000001";
 const old=product(["SKU-1","Fixture organizer","","home","","12.00","25.00","3.00","4","fixture evidence","2026-11-27T10:00:00Z"],id,now);
 const next={...old,observed_at:"2026-11-27T17:00:00Z",reported_quantity:0};
 assert.equal(refresh(old,next,now),"refresh");
 assert.equal(refresh(old,old,now),"unchanged");
 assert.equal(refresh(old,{...old,wholesale_cents:1300},now),"hold");
 for(const patch of [{sku:"SKU-2"},{supplier_id:"other"},{observed_at:"2026-11-27T09:00:00Z"},{observed_at:"2026-11-28T00:00:00Z"},{observed_at:"invalid"},{wholesale_cents:0},{retail_cents:-1},{reported_quantity:-1},{shipping_cents:-1},{source_reference:""}])assert.equal(refresh(old,{...next,...patch},now),"hold",JSON.stringify(patch));
 assert.equal(refresh(old,{...next,shipping_cents:null,reported_quantity:null},now),"refresh");
 assert.equal(refresh(old,next,now+86400000),"hold");
 const input={supplierDecision:"qualified",supplierReviewedAt:old.observed_at,assetLightConfirmed:true,observedAt:next.observed_at,reportedQuantity:4,wholesaleCents:1200,retailCents:2500,shippingCents:300,otherCostCents:200,rightsVerified:true,safetyVerified:true,deliveryVerified:true,returnsVerified:true,ownerReviewed:true};
 const good=assess(input,now);assert.equal(good.status,"eligible-for-release-review");assert.equal(good.estimatedContribution,800);assert.equal(good.checkoutAllowed,false);assert.equal(good.publicationAllowed,false);
 for(const patch of [{reportedQuantity:0},{shippingCents:null},{otherCostCents:null},{wholesaleCents:2500},{supplierDecision:"hold"},{rightsVerified:false}])assert.equal(assess({...input,...patch},now).status,"hold");
 console.log("PASS supplier refresh and private commercial eligibility");
}finally{fs.rmSync(dir,{recursive:true,force:true});}
