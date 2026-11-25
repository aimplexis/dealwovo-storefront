"use client";
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from "react";
import {MAX_SAVED,WISHLIST_KEY,readSaved,toggleSaved,type SavedProduct} from "../lib/catalog/wishlist";
type State={items:SavedProduct[];ready:boolean;temporary:boolean;toggle:(entry:SavedProduct)=>void;remove:(id:string)=>void;clear:()=>void};
const Context=createContext<State|null>(null);
export function WishlistProvider({children}:{children:ReactNode}){
 const [items,setItems]=useState<SavedProduct[]>([]),[ready,setReady]=useState(false),[temporary,setTemporary]=useState(false);
 const current=useRef<SavedProduct[]>([]);
 const replace=(next:SavedProduct[])=>{current.current=next;setItems(next);};
 useEffect(()=>{
  try{replace(readSaved(window.localStorage.getItem(WISHLIST_KEY)));}catch{setTemporary(true);}
  setReady(true);
  const sync=(e:StorageEvent)=>{if(e.key!==WISHLIST_KEY&&e.key!==null)return;try{replace(readSaved(window.localStorage.getItem(WISHLIST_KEY)));setTemporary(false);}catch{setTemporary(true);}};
  window.addEventListener("storage",sync);return()=>window.removeEventListener("storage",sync);
 },[]);
 const save=(next:SavedProduct[])=>{replace(next);try{if(next.length)window.localStorage.setItem(WISHLIST_KEY,JSON.stringify(next));else window.localStorage.removeItem(WISHLIST_KEY);setTemporary(false);}catch{setTemporary(true);}};
 const latest=()=>{try{return temporary?current.current:readSaved(window.localStorage.getItem(WISHLIST_KEY));}catch{return current.current;}};
 return <Context.Provider value={{items,ready,temporary,toggle:e=>save(toggleSaved(latest(),e)),remove:id=>save(latest().filter(x=>x.id!==id)),clear:()=>save([])}}>{children}</Context.Provider>;
}
export function useWishlist(){const c=useContext(Context);if(!c)throw Error("WishlistProvider required");return c;}
export function SaveProduct({id,title}:{id:string;title:string}){
 const w=useWishlist(),saved=w.items.some(x=>x.id===id.toLowerCase()),full=w.items.length>=MAX_SAVED;
 return <button className={"dw-save-product"+(saved?" is-saved":"")} type="button" aria-pressed={saved} aria-label={(saved?"Remove from saved products: ":"Save product: ")+title} disabled={!w.ready||(!saved&&full)} onClick={()=>w.toggle({id,title})}><span aria-hidden="true">{saved?"♥":"♡"}</span>{saved?"Saved":full?"Saved list full":"Save for later"}</button>;
}
