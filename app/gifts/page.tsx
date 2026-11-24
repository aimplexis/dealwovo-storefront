import GiftFinder from "./gift-finder";
import {pageMetadata} from "../../src/lib/marketing/seo-readiness";
export const metadata=pageMetadata("/gifts");
export default function Page(){return <GiftFinder/>;}
