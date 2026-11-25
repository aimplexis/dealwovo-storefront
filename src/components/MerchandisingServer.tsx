import {getAssistantOffers} from "../lib/catalog/public";
import MerchandisingRail from "./MerchandisingRail";
import type {Collection} from "../lib/catalog/merchandising";
import type {AssistantOffer} from "../lib/catalog/shopping-assistant";
export default async function MerchandisingServer(props:{kind:Collection|"discovery";title:string;description:string;related?:AssistantOffer["product"];emptyHref?:string;emptyLabel?:string;limit?:number}){const r=await getAssistantOffers();return <MerchandisingRail {...props} offers={r.offers} available={r.available} initialNow={Date.now()}/>;}
