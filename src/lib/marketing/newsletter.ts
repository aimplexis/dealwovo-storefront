export const interests=[["all","A little of everything"],["gifts","Gift ideas"],["tech","Tech & gadgets"],["essentials","Everyday essentials"],["holiday","Holiday shopping"]] as const;
export type Interest=typeof interests[number][0];
export function previewPreference(input:unknown){return typeof input==="string"&&interests.some(([v])=>v===input)?input as Interest:null;}
export function productPath(slug:unknown){return typeof slug==="string"&&slug.length<=150&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)?"/product/"+slug:null;}
export function newsletterText(issue:{subject:string;intro:string;guide_path:string;items:unknown}){
 const links=Array.isArray(issue.items)?issue.items.slice(0,5).flatMap(item=>{const path=productPath(item?.slug);return path&&typeof item?.title==="string"?[item.title.replace(/[\r\n]+/g," ").slice(0,180)+" — https://dealwovo.com"+path]:[];}):[];
 const guide=["/shop","/gifts","/trending","/essentials","/deals"].includes(issue.guide_path)?issue.guide_path:"/shop";
 return [issue.subject,issue.intro,...links,"Explore more: https://dealwovo.com"+guide,"Some retailer links on Dealwovo may earn us a commission. Verify current offers on the website.","[Required before sending: verified sender identity, postal address and working unsubscribe link.]","INTERNAL DRAFT — NOT APPROVED FOR EMAIL DELIVERY"].join("\n\n");
}
