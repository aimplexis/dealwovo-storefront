import "server-only";
import {publicSupabase} from "../supabase/public";
import {validExternalHttps} from "./feed-csv";

export type PublicOffer={
 id:string;affiliate_url:string;price_cents:number|null;currency:string;verified_at:string;
 product:{id:string;slug:string;title:string;description:string;image_url:string|null;category:{slug:string;name:string}};
 merchant:{id:string;name:string};
};
const selector="id,affiliate_url,price_cents,currency,verified_at,product:catalog_products!inner(id,slug,title,description,image_url,category:catalog_categories!inner(slug,name)),merchant:catalog_merchants!inner(id,name)";
export async function getPublicOffers(limit=36):Promise<PublicOffer[]>{
 const client=publicSupabase();
 if(!client)return [];
 const {data,error}=await client.from("catalog_offers").select(selector)
  .eq("status","approved").lte("verified_at",new Date().toISOString())
  .gt("expires_at",new Date().toISOString()).order("verified_at",{ascending:false})
  .limit(Math.min(Math.max(1,limit),100));
 if(error){console.error("Catalog read unavailable",error.code);return [];}
 return (data||[]) as unknown as PublicOffer[];
}

/**
 * Only published products with at least one verified, current offer can be
 * discovered. All reads use the publishable/anon client and respect RLS.
 */
export async function getVerifiedProductBySlug(slug:string):Promise<{product:PublicOffer["product"];offers:PublicOffer[]}|null>{
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>150)return null;
 const client=publicSupabase();if(!client)return null;
 const {data:product,error:productError}=await client.from("catalog_products")
   .select("id,slug,title,description,image_url,category:catalog_categories!inner(slug,name)")
   .eq("slug",slug).eq("status","published").maybeSingle();
 if(productError||!product)return null;
 const now=new Date().toISOString();
 const {data:offers,error:offersError}=await client.from("catalog_offers")
   .select("id,affiliate_url,price_cents,currency,verified_at,product:catalog_products!inner(id,slug,title,description,image_url,category:catalog_categories!inner(slug,name)),merchant:catalog_merchants!inner(id,name)")
   .eq("product_id",product.id).eq("status","approved")
   .lte("verified_at",now).gt("expires_at",now).order("verified_at",{ascending:false}).limit(20);
 if(offersError||!offers?.length)return null;
 return {product:product as unknown as PublicOffer["product"],offers:offers as unknown as PublicOffer[]};
}
/**
 * Always re-check status and expiry at click time. Never trust an external URL
 * supplied in a browser request as the redirect destination.
 */
export async function getCurrentOfferDestination(offerId:string):Promise<string|null>{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(offerId))return null;
 const client=publicSupabase();if(!client)return null;
 const now=new Date().toISOString();
 const {data,error}=await client.from("catalog_offers").select("affiliate_url")
   .eq("id",offerId).eq("status","approved")
   .lte("verified_at",now).gt("expires_at",now).maybeSingle();
 if(error||!data?.affiliate_url)return null;
 if(!validExternalHttps(data.affiliate_url))return null;
 return new URL(data.affiliate_url).toString();
}
