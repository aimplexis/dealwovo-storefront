/** Private readiness assessment, never publication or checkout authorization. */
export type EligibilityInput={
 supplierDecision:string|null; supplierReviewedAt:string|null; assetLightConfirmed:boolean;
 observedAt:string; reportedQuantity:number|null; wholesaleCents:number; retailCents:number;
 shippingCents:number|null; otherCostCents:number|null;
 rightsVerified:boolean; safetyVerified:boolean; deliveryVerified:boolean; returnsVerified:boolean; ownerReviewed:boolean;
};
export function assessSupplierProduct(p:EligibilityInput,now=Date.now()){
 const blockers:string[]=[];
 const fresh=(s:string|null,age:number)=>{const t=s?Date.parse(s):NaN;return Number.isFinite(t)&&t<=now&&now-t<=age;};
 const cents=(n:number|null,min=0)=>n!==null&&Number.isSafeInteger(n)&&n>=min&&n<=100000000;
 if(p.supplierDecision!=="qualified"||!p.assetLightConfirmed||!fresh(p.supplierReviewedAt,90*86400000))blockers.push("Supplier qualification missing, stale or held");
 if(!fresh(p.observedAt,86400000))blockers.push("Supplier price and stock observation stale or invalid");
 if(p.reportedQuantity===null||!Number.isSafeInteger(p.reportedQuantity)||p.reportedQuantity<1||p.reportedQuantity>10000000)blockers.push("Supplier availability not confirmed");
 const known=cents(p.wholesaleCents,1)&&cents(p.retailCents,1)&&cents(p.shippingCents)&&cents(p.otherCostCents);
 const estimatedContribution=known?p.retailCents-p.wholesaleCents-p.shippingCents!-p.otherCostCents!:null;
 if(estimatedContribution===null||estimatedContribution<=0)blockers.push("Positive estimated contribution not established");
 if(p.rightsVerified!==true)blockers.push("Product resale rights not verified");
 if(p.safetyVerified!==true)blockers.push("Product safety not verified");
 if(p.deliveryVerified!==true)blockers.push("Delivery commitment not verified");
 if(p.returnsVerified!==true)blockers.push("Return terms not verified");
 if(p.ownerReviewed!==true)blockers.push("Product owner review missing");
 return {status:blockers.length?"hold":"eligible-for-release-review",blockers,estimatedContribution,publicationAllowed:false,checkoutAllowed:false} as const;
}
