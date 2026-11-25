// General buying checks, not tested product attributes or individual suitability claims.
const checks:Record<string,readonly string[]>={
 electronics:["Confirm exact model and compatibility with your devices.","Check included accessories, power requirements and warranty."],
 kitchen:["Check dimensions, food-contact suitability and cleaning instructions.","Confirm capacity and temperature limits where applicable."],
 home:["Measure your available space and check material and care instructions."],
 "home-living":["Measure your available space and check material and care instructions."],
 travel:["Check size, weight and relevant carrier restrictions."],
 "beauty-personal-care":["Check ingredients or materials and personal sensitivities."],
 "office-productivity":["Check dimensions, device compatibility and setup requirements."],
 "toys-games":["Check age guidance, group size and included parts."]
};
export function buyingChecks(category:string):readonly string[]{
 return [...(Object.prototype.hasOwnProperty.call(checks,category)?checks[category]:["Check exact variant, dimensions, materials and suitability for your intended use."]),"Confirm final retailer price, availability, delivery and return terms."];
}
export function recommendationEvidence(offer:{price_cents:number|null;currency:string;verified_at:string;product:{category:{slug:string}}},reasons:readonly string[]){
 const price=offer.price_cents;
 return {reasons:[...reasons],checks:buyingChecks(offer.product.category.slug),priceKnown:offer.currency==="USD"&&typeof price==="number"&&Number.isSafeInteger(price)&&price>=0,reviewedAt:offer.verified_at,limitation:"Catalog matching is not hands-on testing, a quality rating or proof of personal suitability."};
}
