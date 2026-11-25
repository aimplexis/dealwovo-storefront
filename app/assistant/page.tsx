import {pageMetadata} from "../../src/lib/marketing/seo-readiness";
import {getAssistantOffers} from "../../src/lib/catalog/public";
import ShoppingAssistant from "./shopping-assistant";
import "./assistant.css";
export const dynamic="force-dynamic";
export const metadata=pageMetadata("/assistant");
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const [result,params]=await Promise.all([getAssistantOffers(),searchParams]);
 const purpose=params.purpose==="gift"?"gift":"self";
 const budget=typeof params.budget==="string"&&["25","50","100","150"].includes(params.budget)?params.budget:"";
 return <ShoppingAssistant offers={result.offers} available={result.available} initialPurpose={purpose} initialBudget={budget}/>;
}
