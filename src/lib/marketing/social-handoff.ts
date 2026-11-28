// Private preparation only; never posts, schedules or grants external permission.
export type SocialHandoffPlan={status:string;readiness:string;copy_status:string;visual_status:string;channel:string;format:string;planned_on:string;campaign_name:string;hook:string;body:string;cta:string};
export function socialHandoff(p:SocialHandoffPlan,today:string):string|null{
 if(p.status!=="prepared"||p.readiness!=="internally_prepared"||p.copy_status!=="reviewed"||p.visual_status!=="reviewed")return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(today)||!/^\d{4}-\d{2}-\d{2}$/.test(p.planned_on)||p.planned_on<today)return null;
 const compatible=(p.channel==="instagram"&&["square","portrait"].includes(p.format))||(p.channel==="facebook"&&["square","landscape"].includes(p.format))||(p.channel==="pinterest"&&p.format==="portrait");
 if(!compatible)return null;
 const fields=[p.campaign_name,p.hook,p.body,p.cta];
 if(fields.some(v=>typeof v!=="string"||!v.trim()||v.length>10000))return null;
 return ["PRIVATE HANDOFF — NOT AUTHORIZED FOR PUBLICATION","Channel: "+p.channel,"Proposed date (UTC): "+p.planned_on,"Campaign: "+p.campaign_name,"","DRAFT CAPTION",p.hook,p.body,p.cta,"","BEFORE POSTING","Verify public destination and current claims; confirm channel and affiliate rights; add required disclosure; check final media format; obtain owner release approval.","Record actual post URL and native metrics separately. Do not infer sales from clicks."].join("\n");
}
