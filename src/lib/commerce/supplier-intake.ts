export const supplierKinds=["manufacturer","wholesaler","distributor","brand"] as const;
export const supplierMethods=["manual","csv","feed","api","shopify","woocommerce","other"] as const;
export function supplierIntake(f:FormData){
 const read=(k:string)=>{const v=f.get(k);return typeof v==="string"?v.trim():"";};
 const legal_name=read("legal_name"),kind=read("kind"),website=read("website"),country=read("country"),contact_email=read("contact_email").toLowerCase(),method=read("method"),categories=read("categories");
 if(legal_name.length<2||legal_name.length>160||!supplierKinds.some(v=>v===kind)||!supplierMethods.some(v=>v===method)||!/^[A-Z]{2}$/.test(country)||contact_email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)||categories.length<2||categories.length>1000||website.length>500||/[\u0000-\u001f\u007f]/.test(legal_name+categories))return null;
 try{const u=new URL(website);if(u.protocol!=="https:"||u.username||u.password||u.port||!u.hostname.includes(".")||u.hash||u.search)return null;}catch{return null;}
 return {legal_name,kind,website,country,contact_email,method,categories};
}
