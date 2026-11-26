// Shopify Storefront API 2026-10. No network access unless explicitly enabled.
export const SHOPIFY_API_VERSION="2026-10";
export type ShopifyConfig={enabled:boolean;shop:string;token:string;checkoutHost?:string};
export type RetailVariant={id:string;title:string;price:string;currency:string;available:boolean};
export type RetailProduct={id:string;handle:string;title:string;description:string;variants:RetailVariant[]};
type Fetcher=typeof fetch;
const variantId=/^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]{0,19}$/;
const shopHost=/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/;
export function configured(c:ShopifyConfig){return c.enabled&&shopHost.test(c.shop)&&c.token.length>0&&c.token.length<=4096&&!/\s/.test(c.token);}
export function validRetailLine(id:unknown,quantity:unknown){return typeof id==="string"&&variantId.test(id)&&typeof quantity==="number"&&Number.isSafeInteger(quantity)&&quantity>=1&&quantity<=10;}
export function checkoutDestination(raw:unknown,c:ShopifyConfig):string|null{
 if(typeof raw!=="string"||raw.length>4096)return null;
 try{const u=new URL(raw);const hosts=[c.shop,c.checkoutHost].filter(Boolean);return u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&hosts.includes(u.hostname)&&u.pathname!=="/"?u.toString():null;}catch{return null;}
}
async function query(c:ShopifyConfig,document:string,variables:Record<string,unknown>,request:Fetcher,buyerIp?:string):Promise<any>{
 if(!configured(c))throw Error("Retail integration disabled or unconfigured");
 const headers:Record<string,string>={"Content-Type":"application/json","Shopify-Storefront-Private-Token":c.token};
 if(buyerIp&&/^[0-9a-fA-F:.]{3,45}$/.test(buyerIp))headers["Shopify-Storefront-Buyer-IP"]=buyerIp;
 const res=await request("https://"+c.shop+"/api/"+SHOPIFY_API_VERSION+"/graphql.json",{method:"POST",headers,body:JSON.stringify({query:document,variables}),redirect:"error",cache:"no-store",signal:AbortSignal.timeout(8000)});
 if(!res.ok)throw Error("Retail provider unavailable");
 const body=await res.text();if(body.length>1000000)throw Error("Retail response too large");
 const payload=JSON.parse(body);if(payload.errors?.length||!payload.data)throw Error("Retail provider rejected request");
 return payload.data;
}
const fields="id handle title description variants(first: 50) { nodes { id title availableForSale price { amount currencyCode } } pageInfo { hasNextPage } }";
function product(p:any):RetailProduct|null{
 if(!p||typeof p.id!=="string"||typeof p.handle!=="string"||typeof p.title!=="string"||typeof p.description!=="string"||!Array.isArray(p.variants?.nodes))return null;
 const variants:RetailVariant[]=p.variants.nodes.flatMap((v:any)=>validRetailLine(v?.id,1)&&typeof v.title==="string"&&typeof v.availableForSale==="boolean"&&typeof v.price?.amount==="string"&&/^\d{1,9}(?:\.\d{1,2})?$/.test(v.price.amount)&&Number(v.price.amount)>0&&v.price.currencyCode==="USD"?[{id:v.id,title:v.title,price:v.price.amount,currency:"USD",available:v.availableForSale}]:[]);
 return {id:p.id,handle:p.handle,title:p.title,description:p.description,variants};
}
export async function readRetailCatalog(c:ShopifyConfig,request:Fetcher=fetch){
 if(!configured(c))return {status:"disabled" as const,products:[] as RetailProduct[]};
 try{const data=await query(c,"query RetailCatalog @inContext(country: US) { products(first: 20) { nodes { "+fields+" } pageInfo { hasNextPage } } }",{},request);
 if(!Array.isArray(data.products?.nodes))throw Error("Invalid catalog");
 return {status:"ready" as const,products:data.products.nodes.map(product).filter((p:RetailProduct|null):p is RetailProduct=>p!==null&&p.variants.some(v=>v.available)) as RetailProduct[],hasMore:data.products.pageInfo?.hasNextPage===true};
 }catch{return {status:"unavailable" as const,products:[] as RetailProduct[]};}
}
export async function createRetailCheckout(c:ShopifyConfig,id:unknown,quantity:unknown,request:Fetcher=fetch,buyerIp?:string){
 if(!configured(c)||!validRetailLine(id,quantity))return null;
 try{
 const v=await query(c,"query RetailVariant($id: ID!) @inContext(country: US) { node(id: $id) { ... on ProductVariant { id availableForSale price { amount currencyCode } product { requiresSellingPlan } } } }",{id},request,buyerIp);
 if(v.node?.id!==id||v.node.availableForSale!==true||v.node.product?.requiresSellingPlan!==false||v.node.price?.currencyCode!=="USD"||!/^\d{1,9}(?:\.\d{1,2})?$/.test(v.node.price?.amount??"")||Number(v.node.price.amount)<=0)return null;
 const data=await query(c,"mutation RetailCart($input: CartInput!) { cartCreate(input: $input) { cart { checkoutUrl totalQuantity lines(first: 2) { nodes { quantity merchandise { ... on ProductVariant { id } } } } } userErrors { code message } warnings { code message } } }",{input:{lines:[{merchandiseId:id,quantity}],buyerIdentity:{countryCode:"US"}}},request,buyerIp);
 const result=data.cartCreate,cart=result?.cart;
 if(!Array.isArray(result?.userErrors)||result.userErrors.length||!Array.isArray(result.warnings)||result.warnings.length||cart?.totalQuantity!==quantity||cart.lines?.nodes?.length!==1||cart.lines.nodes[0].quantity!==quantity||cart.lines.nodes[0].merchandise?.id!==id)return null;
 return checkoutDestination(cart.checkoutUrl,c);
 }catch{return null;}
}
