import {recommendationEvidence} from "../lib/catalog/recommendation-evidence";
import "./recommendation-evidence.css";
type Offer=Parameters<typeof recommendationEvidence>[0];
export default function RecommendationEvidence({offer,reasons}:{offer:Offer;reasons:readonly string[]}){
 const e=recommendationEvidence(offer,reasons);
 return <details className="dw-recommendation-evidence"><summary>Why this appears &amp; what to check</summary><h4>Match evidence</h4><ul>{e.reasons.map((reason,i)=><li key={i}>{reason}</li>)}</ul><p>{e.priceKnown?"Recorded USD price; confirm the total at the retailer.":"No valid recorded USD price; confirm the price at the retailer."}</p><h4>Before you buy</h4><ul>{e.checks.map(check=><li key={check}>{check}</li>)}</ul><p>Offer reviewed {e.reviewedAt.slice(0,10)} UTC. {e.limitation}</p></details>
}
