import "server-only";
import {createClient} from "@supabase/supabase-js";
import {placement,isDeliberateNavigation} from "./attribution";
export async function recordNavigation(request:Request,id:string){
 if(process.env.VERCEL_ENV!=="production"||process.env.DEALWOVO_OUTBOUND_MEASUREMENT!=="true"||!isDeliberateNavigation(request.headers))return;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return;
 try{const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 await client.rpc("record_outbound_navigation",{p_offer:id,p_placement:placement(new URL(request.url).searchParams.get("placement"))}).abortSignal(AbortSignal.timeout(800));}
 catch{/* Measurement must never prevent a valid retailer redirect. */}
}
