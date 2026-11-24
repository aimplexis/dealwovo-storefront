// Supported legacy Awin product links and explicit deep links; no external URL resolution.
export function awinLinkMatches(value:string,publisher:string,advertiser:string){
 if(!/^[1-9][0-9]{0,18}$/.test(publisher)||!/^[1-9][0-9]{0,18}$/.test(advertiser)||value.length>2000||/[\s\\\u0000-\u001f\u007f]/.test(value))return false;
 const m=value.match(/^https:\/\/(?:www\.)?awin1\.com\/(pclick|cread)\.php\?([^#]+)(?:#.*)?$/);if(!m)return false;
 const pairs=m[2].split("&").map(x=>[x.slice(0,x.indexOf("=")<0?x.length:x.indexOf("=")),x.includes("=")?x.slice(x.indexOf("=")+1):""]);
 if(pairs.some(([key])=>!/^[A-Za-z0-9_]+$/.test(key)))return false;
 const pk=m[1]==="pclick"?"a":"awinaffid",ak=m[1]==="pclick"?"m":"awinmid";
 const p=pairs.filter(([k])=>k.toLowerCase()===pk),a=pairs.filter(([k])=>k.toLowerCase()===ak);
 return p.length===1&&a.length===1&&p[0][0]===pk&&a[0][0]===ak&&p[0][1]===publisher&&a[0][1]===advertiser;
}
