import {NextResponse} from "next/server";
import {validSavedIds} from "../../../src/lib/catalog/wishlist";
import {getWishlistProducts} from "../../../src/lib/catalog/public";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"};
const response=(body:unknown,status=200)=>NextResponse.json(body,{status,headers});
export async function POST(request:Request){
 if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return response({error:"Invalid request"},415);
 const reader=request.body?.getReader();if(!reader)return response({error:"Invalid request"},400);
 let raw="",size=0;const decoder=new TextDecoder();
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>4096){await reader.cancel();return response({error:"Request too large"},413);}raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();
 const body:unknown=JSON.parse(raw);if(!body||typeof body!=="object"||!validSavedIds((body as {ids?:unknown}).ids))return response({error:"Invalid product IDs"},400);
 const ids=(body as {ids:string[]}).ids;if(!ids.length)return response({products:[]});
 const result=await getWishlistProducts(ids);return result.available?response({products:result.products}):response({error:"Catalog unavailable"},503);
 }catch{return response({error:"Request unavailable"},400);}finally{reader.releaseLock();}
}
