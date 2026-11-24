import "server-only";
import {createClient} from "@supabase/supabase-js";
import {supabaseConfig} from "./config";
export function publicSupabase(){
 const cfg=supabaseConfig();
 if(!cfg)return null;
 return createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
