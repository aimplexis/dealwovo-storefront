import {recordNavigation} from "../../../src/lib/marketing/record-navigation";
import {NextResponse} from "next/server";
import {getCurrentOfferDestination} from "../../../src/lib/catalog/public";
export const dynamic="force-dynamic";
export const runtime="nodejs";
/**
 * URL is resolved exclusively from approved, non-expired database offers.
 * No redirect target can be supplied in query parameters.
 * No PII, raw IP addresses, or browser fingerprints are collected.
 */
export async function GET(request:Request,{params}:{params:Promise<{offerId:string}>}){
 const {offerId}=await params;
 const destination=await getCurrentOfferDestination(offerId);
 if(!destination){
  return new Response("This retailer offer is unavailable or has expired.",{status:404,headers:{"Cache-Control":"private, no-store, max-age=0","X-Robots-Tag":"noindex, nofollow","Content-Type":"text/plain; charset=utf-8"}});
 }
 // Operational logs show attempted outbound navigation, NOT confirmed sales.
 await recordNavigation(request,offerId);
 const response=NextResponse.redirect(destination,302);
 response.headers.set("Cache-Control","private, no-store, max-age=0");
 response.headers.set("Referrer-Policy","no-referrer");
 response.headers.set("X-Robots-Tag","noindex, nofollow");
 return response;
}
