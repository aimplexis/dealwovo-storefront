import "server-only";
import {createSupabaseServer} from "../../../../src/lib/supabase/server";
export async function visualAccess(){
 const db=await createSupabaseServer();if(!db)return {ok:false as const,status:503};
 const {data:{user},error}=await db.auth.getUser();if(error||!user)return {ok:false as const,status:401};
 const {data:member,error:memberError}=await db.from("catalog_admins").select("role").eq("user_id",user.id).maybeSingle();
 if(memberError||member?.role!=="owner")return {ok:false as const,status:403};
 return {ok:true as const,db};
}
