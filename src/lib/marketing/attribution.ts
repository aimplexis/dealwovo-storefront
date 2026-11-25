export const placements=["shop","home","product","gifts","assistant","compare","wishlist","daily","collection","unknown"] as const;
export type Placement=typeof placements[number];
export const channels=["organic_search","pinterest","instagram","facebook","tiktok","youtube","newsletter","creator","paid","other","unknown"] as const;
export function placement(v:unknown):Placement{return placements.find(x=>x===v)??"unknown";}
export function isDeliberateNavigation(h:{get:(name:string)=>string|null}){return h.get("sec-fetch-user")==="?1"&&h.get("sec-fetch-mode")==="navigate"&&h.get("sec-fetch-dest")==="document"&&h.get("sec-fetch-site")==="same-origin"&&!h.get("purpose")&&!h.get("sec-purpose")&&!h.get("next-router-prefetch");}
export function outboundHref(id:string,p:Placement){return "/out/"+id+"?placement="+p;}
