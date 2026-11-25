import {getAssistantOffers} from "../../src/lib/catalog/public";
import GiftFinder from "./gift-finder";
import {pageMetadata} from "../../src/lib/marketing/seo-readiness";
export const metadata=pageMetadata("/gifts");
export const dynamic="force-dynamic";
export default async function Page(){const r=await getAssistantOffers();return <GiftFinder offers={r.offers} available={r.available}/>;}
