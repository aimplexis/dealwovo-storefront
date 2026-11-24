import "server-only";
import {publicSupabase} from "../supabase/public";

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
