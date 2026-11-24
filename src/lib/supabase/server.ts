import "server-only";
import {cookies} from "next/headers";
import {createServerClient} from "@supabase/ssr";
import {supabaseConfig} from "./config";
export async function createSupabaseServer(){
 const config=supabaseConfig();if(!config)return null;
 const cookieStore=await cookies();
 return createServerClient(config.url,config.key,{
  cookies:{
   getAll(){return cookieStore.getAll()},
   setAll(items){try{items.forEach(({name,value,options})=>cookieStore.set(name,value,options))}catch{/* Server Components cannot set cookies; proxy handles refresh. */}}
  }
 });
}
