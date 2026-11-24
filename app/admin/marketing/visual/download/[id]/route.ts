import {visualAccess} from "../../access";
import {creativeSvg,validCreative} from "../../../../../../src/lib/marketing/visual-template";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store, max-age=0","X-Robots-Tag":"noindex, nofollow","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox"};
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const a=await visualAccess();if(!a.ok)return new Response("Owner access required",{status:a.status,headers});
 const {id}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return new Response("Asset unavailable",{status:404,headers});
 const {data,error}=await a.db.from("marketing_visual_assets").select("theme,format,palette,template_version").eq("id",id).eq("status","reviewed").maybeSingle();
 const c=validCreative(data?.theme,data?.format,data?.palette);
 if(error||!data||!c||data.template_version!==1)return new Response("Reviewed asset unavailable",{status:404,headers});
 return new Response(creativeSvg(c),{headers:{...headers,"Content-Type":"image/svg+xml; charset=utf-8","Content-Disposition":'attachment; filename="dealwovo-'+c.theme+'-'+c.format+'-'+id+'.svg"'}});
}
