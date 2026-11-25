import {pageMetadata} from "../../src/lib/marketing/seo-readiness";
import {parseComparison} from "../../src/lib/catalog/comparison";
import {getComparisonOffers} from "../../src/lib/catalog/public";
import ComparisonView from "./comparison-view";
export const dynamic="force-dynamic";
export const metadata=pageMetadata("/compare");
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams,request=parseComparison(params.offers);
 const result=request.ids.length?await getComparisonOffers(request.ids):{available:true,offers:[]};
 return <ComparisonView ids={request.ids} invalid={request.invalid} offers={result.offers} available={result.available}/>;
}
