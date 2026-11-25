import {getAssistantOffers,getDailyPromotion} from "../lib/catalog/public";
import DailyFeature from "./DailyFeature";
export default async function DailyFeatureServer(){const [result,promotion]=await Promise.all([getAssistantOffers(),getDailyPromotion()]);return <DailyFeature offers={result.offers} available={result.available} promotion={promotion} initialNow={Date.now()}/>;}
