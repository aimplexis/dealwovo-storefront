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

/** Safe client projection: no raw affiliate destinations or private source data. */
export async function getAssistantOffers():Promise<{available:boolean;offers:import("./shopping-assistant").AssistantOffer[]}>{
 const client=publicSupabase();if(!client)return {available:false,offers:[]};
 const now=new Date().toISOString();
 const {data,error}=await client.from("catalog_offers").select("id,price_cents,currency,verified_at,expires_at,product:catalog_products!inner(id,slug,title,description,image_url,category:catalog_categories!inner(slug,name)),merchant:catalog_merchants!inner(name)").eq("status","approved").lte("verified_at",now).gt("expires_at",now).order("verified_at",{ascending:false}).order("id").limit(100);
 if(error)return {available:false,offers:[]};return {available:true,offers:(data??[]) as unknown as import("./shopping-assistant").AssistantOffer[]};
}

/** Fresh anonymous RLS read for explicitly selected offer IDs, independent of latest-100 window. */
export async function getComparisonOffers(ids:string[]):Promise<{available:boolean;offers:import("./shopping-assistant").AssistantOffer[]}>{
 if(!ids.length||ids.length>4||new Set(ids).size!==ids.length||ids.some(id=>!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))return {available:false,offers:[]};
 const client=publicSupabase();if(!client)return {available:false,offers:[]};
 const now=new Date().toISOString();
 const {data,error}=await client.from("catalog_offers").select("id,price_cents,currency,verified_at,expires_at,product:catalog_products!inner(id,slug,title,description,image_url,category:catalog_categories!inner(slug,name)),merchant:catalog_merchants!inner(name)").in("id",ids).eq("status","approved").lte("verified_at",now).gt("expires_at",now).limit(4);
 if(error)return {available:false,offers:[]};return {available:true,offers:(data??[]) as unknown as import("./shopping-assistant").AssistantOffer[]};
}

/** Wishlist uses product identity, not the original offer, and never reads raw destinations. */
export async function getWishlistProducts(ids:string[]):Promise<{available:boolean;products:import("./wishlist").WishlistProduct[]}>{
 const {validSavedIds}=await import("./wishlist");if(!validSavedIds(ids))return {available:false,products:[]};
 if(!ids.length)return {available:true,products:[]};
 const client=publicSupabase();if(!client)return {available:false,products:[]};
 const now=new Date().toISOString();
 const {data,error}=await client.from("catalog_products").select("id,slug,title,image_url,category:catalog_categories!inner(name),offers:catalog_offers!inner(id,price_cents,currency,verified_at,expires_at,merchant:catalog_merchants!inner(name))").in("id",ids).eq("status","published").eq("offers.status","approved").lte("offers.verified_at",now).gt("offers.expires_at",now).order("verified_at",{referencedTable:"offers",ascending:false}).order("id",{referencedTable:"offers"}).limit(3,{referencedTable:"offers"}).limit(40);
 if(error)return {available:false,products:[]};return {available:true,products:(data??[]) as unknown as import("./wishlist").WishlistProduct[]};
}

export async function getDailyPromotion():Promise<import("./daily-feature").DailyPromotion|null>{
 const client=publicSupabase();if(!client)return null;
 const {data,error}=await client.rpc("current_daily_deal");
 if(error||!data||typeof data!=="object"||!data.offer)return null;
 return data as import("./daily-feature").DailyPromotion;
}
