/** Private fulfillment contract. No provider calls, payment capture or order submission. */
export type FulfillmentState="awaiting_payment"|"paid"|"submission_pending"|"submission_uncertain"|"accepted"|"shipped"|"delivered"|"exception"|"cancelled";
export type FulfillmentOrder={id:string;supplierId:string;sku:string;quantity:number;totalCents:number;currency:"USD";state:FulfillmentState;paymentRef?:string;supplierOrderRef?:string;trackingRef?:string;updatedAt:string};
export type FulfillmentEvent={orderId:string;kind:"payment_verified"|"submission_requested"|"submission_uncertain"|"supplier_accepted"|"shipment_verified"|"delivery_verified"|"exception_reported"|"cancellation_verified";reference:string;observedAt:string;amountCents?:number;currency?:string;supplierOrderRef?:string;trackingRef?:string};
const ref=(v:unknown):v is string=>typeof v==="string"&&v.trim()===v&&v.length>=3&&v.length<=200&&!/[\u0000-\u001f\u007f]/.test(v);
export function transitionFulfillment(order:FulfillmentOrder,event:FulfillmentEvent,now=Date.now()):FulfillmentOrder|null{
 if(!ref(order.id)||!ref(order.supplierId)||!ref(order.sku)||!Number.isSafeInteger(order.quantity)||order.quantity<1||order.quantity>10||!Number.isSafeInteger(order.totalCents)||order.totalCents<1||order.totalCents>100000000||order.currency!=="USD")return null;
 const at=Date.parse(event.observedAt),previous=Date.parse(order.updatedAt);
 if(event.orderId!==order.id||!ref(event.reference)||!Number.isFinite(now)||!Number.isFinite(at)||!Number.isFinite(previous)||at<=previous||at>now)return null;
 const next=(state:FulfillmentState,extra:Partial<FulfillmentOrder>={})=>({...order,...extra,state,updatedAt:event.observedAt});
 switch(event.kind){
  case "payment_verified":return order.state==="awaiting_payment"&&!order.paymentRef&&event.amountCents===order.totalCents&&event.currency==="USD"?next("paid",{paymentRef:event.reference}):null;
  case "submission_requested":return order.state==="paid"&&ref(order.paymentRef)?next("submission_pending"):null;
  case "submission_uncertain":return order.state==="submission_pending"?next("submission_uncertain"):null;
  case "supplier_accepted":return (order.state==="submission_pending"||order.state==="submission_uncertain")&&ref(order.paymentRef)&&ref(event.supplierOrderRef)&&!order.supplierOrderRef?next("accepted",{supplierOrderRef:event.supplierOrderRef}):null;
  case "shipment_verified":return order.state==="accepted"&&ref(order.supplierOrderRef)&&event.supplierOrderRef===order.supplierOrderRef&&ref(event.trackingRef)?next("shipped",{trackingRef:event.trackingRef}):null;
  case "delivery_verified":return order.state==="shipped"&&ref(order.supplierOrderRef)&&event.supplierOrderRef===order.supplierOrderRef&&ref(order.trackingRef)&&event.trackingRef===order.trackingRef?next("delivered"):null;
  case "exception_reported":return ["paid","submission_pending","submission_uncertain","accepted","shipped"].includes(order.state)?next("exception"):null;
  case "cancellation_verified":return order.state==="awaiting_payment"&&!order.paymentRef?next("cancelled"):null;
  default:return null;
 }
}
// A stable key is passed to a future approved adapter; an uncertain submission must be reconciled, not retried blindly.
export function supplierSubmissionKey(order:FulfillmentOrder):string|null{
 return order.state==="paid"&&ref(order.paymentRef)&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id)?"dealwovo-order-"+order.id.toLowerCase():null;
}
