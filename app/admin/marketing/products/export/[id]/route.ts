import {visualAccess} from "../../../visual/access";
import {campaignHandoff,type ExportPack} from "../../../../../../src/lib/marketing/product-campaign";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const a=await visualAccess();if(!a.ok)return new Response("Unauthorized",{status:403,headers});
 const {id}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return new Response("Invalid campaign",{status:400,headers});
 const {data,error}=await a.db.rpc("product_campaign_report");
 if(error||!data||!Array.isArray(data.packs))return new Response("Campaign data unavailable",{status:503,headers});
 const pack=data.packs.find((p:ExportPack)=>p.id===id);
 const handoff=pack?campaignHandoff(pack,Date.now()):null;
 if(!handoff)return new Response("Campaign not eligible for internal export",{status:409,headers});
 return new Response(JSON.stringify(handoff,null,2),{headers:{...headers,"Content-Type":"application/json; charset=utf-8","Content-Disposition":'attachment; filename="dealwovo-campaign-'+id+'.json"'}});
}
