import {webhookHttp} from "../../../../../../src/lib/commerce/stripe-test-http";
import {stripeTestConfig,stripeTestStore} from "../../../../../../src/lib/commerce/stripe-test-store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req:Request){
 return webhookHttp(req,stripeTestConfig(),stripeTestStore);
}
