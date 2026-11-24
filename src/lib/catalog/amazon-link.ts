export const amazonTagPattern=/^[A-Za-z0-9][A-Za-z0-9-]{0,59}-20$/;
type Parsed={ok:true;asin:string;url:string}|{ok:false;reason:"invalid"|"short"|"tag"};
export function parseAmazonProduct(value:string,trackingId:string):Parsed{
 const input=value.trim();
 if(!amazonTagPattern.test(trackingId)||!input||input.length>2000)return {ok:false,reason:"invalid"};
 let asin=input.toUpperCase();
 if(!/^[A-Z0-9]{10}$/.test(asin)){
  if(/[\s\\\u0000-\u001f\u007f]/.test(input))return {ok:false,reason:"invalid"};
  let u:URL;try{u=new URL(input);}catch{return {ok:false,reason:"invalid"};}
  if(u.protocol!=="https:"||u.username||u.password||u.port)return {ok:false,reason:"invalid"};
  if(["amzn.to","a.co"].includes(u.hostname))return {ok:false,reason:"short"};
  if(!["amazon.com","www.amazon.com"].includes(u.hostname))return {ok:false,reason:"invalid"};
  const match=u.pathname.match(/^\/(?:[^/]+\/)?dp\/([A-Za-z0-9]{10})(?:\/ref=[^/]+)?\/?$/)||u.pathname.match(/^\/gp\/product\/([A-Za-z0-9]{10})(?:\/ref=[^/]+)?\/?$/);
  if(!match)return {ok:false,reason:"invalid"};
  const tags=u.searchParams.getAll("tag");
  if(tags.length>1||(tags.length===1&&tags[0]!==trackingId))return {ok:false,reason:"tag"};
  asin=match[1].toUpperCase();
 }
 return {ok:true,asin,url:"https://www.amazon.com/dp/"+asin+"?tag="+trackingId};
}
