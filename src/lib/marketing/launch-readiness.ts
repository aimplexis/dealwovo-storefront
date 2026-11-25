export const launchGates=[
 ["build","Build and regression tests","Record the successful build for this exact commit."],
 ["browser","Browser acceptance","Exercise public shopping and owner/editor/non-admin workflows."],
 ["accessibility","Accessibility","Verify mobile layouts, keyboard navigation, focus and readable contrast."],
 ["security","Security","Review access policies, dependencies, credential handling and outstanding warnings."],
 ["environment","Production configuration","Verify production environment variables, domain, HTTPS and monitoring."],
 ["legal","Legal and privacy","Finalize disclosures, contact details, terms, privacy and image rights."],
 ["affiliate_rights","Affiliate authorization","Verify partner and advertiser approvals, permitted channels and attribution terms."],
 ["catalog","Catalog and product accuracy","Check current prices, links, availability, rights and publication review."],
 ["attribution","Attribution evidence","Verify qualifying network attribution without self-purchases or fabricated conversions."],
 ["operations","Operational readiness","Confirm maintenance, rollback, support and campaign review procedures."]
] as const;
export type GateKey=typeof launchGates[number][0];
export type Review={gate_key:GateKey;status:"hold"|"reviewed";evidence:string;created_at:string};
export type Metrics={inspectedAt:string;categories:number;draftCategories:number;merchants:number;authorizedSources:number;awinSources:number;amazonSources:number;draftProducts:number;eligibleProducts:number;eligibleOffers:number;amazonReviewed:number;reviewedCampaigns:number;reviewedNewsletterIssues:number;transactions:number;positiveApprovedTransactions:number;networkPaidTransactions:number;approvedCents:string;paidCents:string};
export const validCandidate=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{40}$/.test(v);
export function launchSummary(m:Metrics,reviews:readonly Review[],pathway:"general"|"amazon"="general"){
 const reviewed=launchGates.filter(([k])=>reviews.find(r=>r.gate_key===k)?.status==="reviewed").length;
 const missing:string[]=[];
 if(pathway==="amazon"){
  if(!(Number.isSafeInteger(m.amazonSources)&&m.amazonSources>0&&Number.isSafeInteger(m.authorizedSources)&&m.authorizedSources>=m.amazonSources))missing.push("Document actual Amazon source authorization");
  if(!(Number.isSafeInteger(m.amazonReviewed)&&m.amazonReviewed>0))missing.push("Prepare at least one current reviewed Amazon editorial link");
 }else{
  if(!m.categories)missing.push("Publish shopping categories");
  if(!m.authorizedSources)missing.push("Document actual affiliate authorization");
  if(!m.merchants)missing.push("Approve authorized retailer records");
  if(!m.eligibleProducts||!m.eligibleOffers)missing.push("Prepare at least one eligible general catalog product and offer");
 }
 if(reviewed<launchGates.length)missing.push("Complete candidate-specific evidence reviews");
 return {pathway,reviewed,missing,catalogTarget:100,catalogProgress:Math.min(100,m.eligibleProducts),readyForOwnerDecision:missing.length===0};
}
export function centsLabel(cents:string){if(!/^\d+$/.test(cents))return "Unavailable";const s=cents.replace(/^0+(?=\d)/,"").padStart(3,"0");return "$"+s.slice(0,-2).replace(/\B(?=(\d{3})+(?!\d))/g,",")+"."+s.slice(-2);}
