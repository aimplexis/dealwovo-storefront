import {NextRequest,NextResponse} from "next/server";
import {createServerClient} from "@supabase/ssr";
import {supabaseConfig} from "./src/lib/supabase/config";
/* Next.js 16 proxy refreshes authenticated sessions before admin server rendering. */
export async function proxy(request:NextRequest){
 const cfg=supabaseConfig();
 let response=NextResponse.next({request});
 response.headers.set("Cache-Control","private, no-store");
 if(!cfg)return response; // closed admin login until configured
 const client=createServerClient(cfg.url,cfg.key,{
  cookies:{
   getAll(){return request.cookies.getAll()},
   setAll(items){
    items.forEach(({name,value})=>request.cookies.set(name,value));
    response=NextResponse.next({request});
    response.headers.set("Cache-Control","private, no-store");
    items.forEach(({name,value,options})=>response.cookies.set(name,value,options));
   }
  }
 });
 await client.auth.getUser(); // Always revalidate; do not trust unverified cookie user metadata.
 return response;
}
export const config={matcher:["/admin/:path*"]};
