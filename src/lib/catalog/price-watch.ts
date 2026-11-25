import type {WishlistOffer} from "./wishlist";
export type PriceChange={offerId:string;currentCents:number;currentVerifiedAt:string;previousCents:number;previousVerifiedAt:string};
export const validTarget=(v:unknown):v is number=>typeof v==="number"&&Number.isSafeInteger(v)&&v>0&&v<=100000000;
export function parseTarget(text:string){const s=text.trim();if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(s))return null;const [w,f=""]=s.split(".");const n=Number(w)*100+Number(f.padEnd(2,"0"));return validTarget(n)?n:null;}
export function priceWatch(offer:WishlistOffer,change:PriceChange|undefined,target:number|undefined,now:number){
 const verified=Date.parse(offer.verified_at),expiry=Date.parse(offer.expires_at);
 if(!Number.isFinite(verified)||!Number.isFinite(expiry)||verified>now||expiry<=now||offer.currency!=="USD"||!validTarget(offer.price_cents))return {targetMet:false,dropCents:null as number|null};
 const targetMet=validTarget(target)&&offer.price_cents<=target;
 const previous=change?Date.parse(change.previousVerifiedAt):NaN;
 const dropCents=change&&change.offerId===offer.id&&change.currentCents===offer.price_cents&&Date.parse(change.currentVerifiedAt)===verified&&validTarget(change.previousCents)&&Number.isFinite(previous)&&previous<verified&&previous>=now-90*86400000&&change.previousCents>offer.price_cents?change.previousCents-offer.price_cents:null;
 return {targetMet,dropCents};
}
