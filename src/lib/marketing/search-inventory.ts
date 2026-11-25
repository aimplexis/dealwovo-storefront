import {guides,guidePath} from "./shopping-guides";
export const candidatePaths=["/","/shop","/gifts","/deals","/trending","/essentials","/guides",...guides.map(g=>guidePath(g.slug))];
export function inventoryPaths(products:readonly {slug:string;description:string}[]){const eligible=products.filter(p=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)&&p.slug.length<=150&&p.description.trim().length>=120).map(p=>"/product/"+p.slug);return [...new Set([...candidatePaths,...eligible])];}
export function sitemapPreview(paths:readonly string[]){
 const allowed=[...new Set(paths)].filter(p=>candidatePaths.includes(p)||(/^\/product\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p)&&p.slice(9).length<=150));
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+allowed.map(p=>"  <url><loc>https://dealwovo.com"+p+"</loc></url>").join("\n")+"\n</urlset>";
}
