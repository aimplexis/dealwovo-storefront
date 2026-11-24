// Editorial hypotheses only. No search-volume, ranking or demand data is inferred.
export const siteOrigin="https://dealwovo.com";
export const indexingHold={index:false,follow:false} as const;
export const seoPages={
 "/":{title:"Dealwovo — Discover More. Save Smarter.",description:"Discover thoughtful gifts, creative tech and everyday inspiration with Dealwovo.",intent:"Brand discovery",topics:["thoughtful shopping ideas","gift and everyday inspiration"]},
 "/shop":{title:"Explore the Good Stuff",description:"Explore curated gifts, gadgets and everyday inspiration. Verified retailer finds appear after approval.",intent:"Shopping discovery",topics:["curated shopping ideas","useful everyday finds"]},
 "/gifts":{title:"Gift Finder & Thoughtful Gift Ideas",description:"Explore gift inspiration by recipient, occasion, budget and interests without guessing product prices.",intent:"Gift discovery",topics:["thoughtful gift ideas","gift ideas by recipient","holiday gift inspiration"]},
 "/deals":{title:"Seasonal Shopping Inspiration",description:"Discover thoughtful seasonal ideas and celebrations. Verified deals appear only when confirmed.",intent:"Seasonal research",topics:["holiday shopping ideas","seasonal gift inspiration"]},
 "/trending":{title:"Tech & Gadget Inspiration",description:"Explore clever technology, creative setups and modern discoveries to inspire your next find.",intent:"Technology discovery",topics:["useful tech gift ideas","everyday gadget inspiration"]},
 "/essentials":{title:"Everyday Living & Essentials",description:"Explore thoughtful ideas for home, personal care and practical everyday inspiration.",intent:"Everyday discovery",topics:["everyday essentials ideas","practical home inspiration"]},
 "/about":{title:"About",description:"Learn about Dealwovo’s affiliate-first shopping discovery concept and prelaunch status.",intent:"Brand trust",topics:[]},
 "/contact":{title:"Contact",description:"Read Dealwovo’s prelaunch support contact status.",intent:"Support readiness",topics:[]},
 "/privacy":{title:"Privacy Notice",description:"Read the temporary Dealwovo prelaunch privacy notice.",intent:"Legal review required",topics:[]},
 "/terms":{title:"Site Terms",description:"Read Dealwovo’s temporary prelaunch site terms.",intent:"Legal review required",topics:[]},
 "/affiliate-disclosure":{title:"Affiliate Disclosure",description:"Learn how eligible retailer affiliate links may support Dealwovo.",intent:"Commercial disclosure review",topics:[]}
} as const;
export type SeoPath=keyof typeof seoPages;
export function pageMetadata(path:SeoPath){const p=seoPages[path];return {title:p.title,description:p.description,alternates:{canonical:siteOrigin+path},robots:indexingHold};}
export function productMetadata(product:{slug:string;title:string;description:string}|null){
 if(!product||!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug))||product.slug.length>150)return {title:"Product unavailable",robots:indexingHold};
 return {title:product.title,description:product.description.trim().slice(0,160)||"Explore this product through approved retail partners.",alternates:{canonical:siteOrigin+"/product/"+product.slug},robots:indexingHold};
}
export function reviewCopy(text:string){
 const flags:string[]=[];
 if(!text.trim())flags.push("No copy supplied");
 if(/\b(?:best|cheapest|lowest price|guaranteed|number one|top[- ]rated|bestseller|best seller)\b|(?:^|[^\w])#\s*1\b/i.test(text))flags.push("Ranking or comparative claim: source evidence required");
 if(/\$\s*\d|\d\s*%|\b(?:discount|sale price|in stock|free shipping|limited time|save today)\b/i.test(text))flags.push("Price, availability or promotion language: verify current evidence");
 if(/\b(?:affiliate|commission)\b/i.test(text)===false)flags.push("Check affiliate disclosure if commercial links are present");
 return flags;
}
export function auditMetadata(rows:readonly {path:string;title:string;description:string}[]){
 const titles=new Map<string,number>(),descriptions=new Map<string,number>();const norm=(v:string)=>v.trim().replace(/\s+/g," ").toLowerCase();
 for(const r of rows){for(const [map,v] of [[titles,r.title],[descriptions,r.description]] as const){const k=norm(v);if(k)map.set(k,(map.get(k)??0)+1);}}
 return rows.map(r=>({path:r.path,issues:[...(!norm(r.title)?["Missing title"]:[]),...(!norm(r.description)?["Missing description"]:[]),...((titles.get(norm(r.title))??0)>1?["Duplicate title"]:[]),...((descriptions.get(norm(r.description))??0)>1?["Duplicate description"]:[]),...(r.description.length>160?["Long description: editorial review suggested"]:[])]}));
}
