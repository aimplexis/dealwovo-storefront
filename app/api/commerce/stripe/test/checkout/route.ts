import {checkoutHttp} from "../../../../../../src/lib/commerce/stripe-test-http";
import {stripeTestConfig,stripeTestStore} from "../../../../../../src/lib/commerce/stripe-test-store";
import {visualAccess} from "../../../../../admin/marketing/visual/access";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req:Request){
 return checkoutHttp(req,stripeTestConfig(),async()=>(await visualAccess()).ok,stripeTestStore);
}
