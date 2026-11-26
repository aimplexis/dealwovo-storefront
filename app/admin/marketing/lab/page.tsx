import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServer} from "../../../../src/lib/supabase/server";
import {contentEnabled} from "../../../../src/lib/marketing/ai-content";
import ContentLab from "./content-lab";
import EditorialDiscovery from "./EditorialDiscovery";
import "../../admin.css";
export const dynamic="force-dynamic";
export const metadata={title:"Content Lab | Dealwovo",robots:{index:false,follow:false}};
export default async function Page(){
 const db=await createSupabaseServer();if(!db)redirect("/admin/login?status=setup");
 const {data:{user}}=await db.auth.getUser();if(!user)redirect("/admin/login");
 const {data:member}=await db.from("catalog_admins").select("role").eq("user_id",user.id).maybeSingle();
 if(member?.role!=="owner")redirect("/admin/login?status=denied");
 return <main className="dw-admin"><div className="dw-admin-shell"><Link href="/admin/marketing">← Marketing Agent Studio</Link><p className="dw-admin-kicker">DEALWOVO / SUPERVISED CONTENT INTELLIGENCE</p><h1>Content Lab</h1><p className="dw-admin-muted">Private editorial experimentation. No automatic posting or advertising.</p><EditorialDiscovery/><ContentLab enabled={contentEnabled()}/></div></main>
}
