// Provider-neutral execution policy. No external calls or automatic release.
export const channels=["facebook","instagram","pinterest","tiktok","youtube"] as const;
export type Channel=typeof channels[number];
export type Connection={channel:Channel;authorized:boolean;publishScope:boolean;accountId:string;checkedAt:string};
export type Campaign={id:string;channel:Channel;reviewed:boolean;rightsVerified:boolean;destinationVerified:boolean;disclosureReviewed:boolean;mediaReady:boolean;releaseApproved:boolean;scheduledAt:string;expiresAt:string};
export type DispatchState="pending"|"dispatching"|"published"|"failed"|"uncertain";
export type DispatchResult={state:"published";externalId:string}|{state:"failed";code:string}|{state:"uncertain";code:string};
export interface DistributionAdapter {
 channel:Channel;
 verifyConnection():Promise<Connection>;
 publish(campaign:Campaign,idempotencyKey:string):Promise<DispatchResult>;
 reconcile(idempotencyKey:string):Promise<DispatchResult>;
}
export function distributionGate(c:Campaign,a:Connection|null,enabled:boolean,now:number):string[]{
 const issues:string[]=[];
 if(!enabled)issues.push("distribution_disabled");
 if(!Number.isFinite(now))issues.push("invalid_clock");
 if(!channels.includes(c.channel))issues.push("unsupported_channel");
 if(!c.id||!c.reviewed||!c.rightsVerified||!c.destinationVerified||!c.disclosureReviewed||!c.mediaReady||!c.releaseApproved)issues.push("campaign_not_approved");
 const due=Date.parse(c.scheduledAt),expiry=Date.parse(c.expiresAt);
 if(!Number.isFinite(due)||!Number.isFinite(expiry)||due>now||expiry<=now||expiry<=due)issues.push("outside_dispatch_window");
 const checked=a?Date.parse(a.checkedAt):NaN;
 if(!a||a.channel!==c.channel||!a.authorized||!a.publishScope||!a.accountId.trim()||!Number.isFinite(checked)||checked>now||now-checked>3600000)issues.push("connection_unverified");
 return issues;
}
export function dispatchKey(c:Campaign,a:Connection):string|null{
 const safe=/^[a-zA-Z0-9_-]{1,128}$/;
 return c.channel===a.channel&&safe.test(c.id)&&safe.test(a.accountId)&&channels.includes(c.channel)?[c.channel,a.accountId,c.id].join(":"):null;
}
export function nextDispatchState(state:DispatchState,result:DispatchResult):DispatchState{
 if(state!=="dispatching"&&state!=="uncertain")return state;
 if(result.state==="published")return result.externalId.trim()?"published":"uncertain";
 if(state==="uncertain"&&result.state==="failed")return "uncertain";
 return result.state;
}
export type NativeMetrics={channel:Channel;externalId:string;start:string;end:string;impressions:number|null;reach:number|null;clicks:number|null;saves:number|null;source:"native_export"|"provider_api"};
export function validNativeMetrics(m:NativeMetrics):boolean{
 const start=Date.parse(m.start),end=Date.parse(m.end);
 return channels.includes(m.channel)&&Boolean(m.externalId.trim())&&["native_export","provider_api"].includes(m.source)&&Number.isFinite(start)&&Number.isFinite(end)&&end>start&&[m.impressions,m.reach,m.clicks,m.saves].every(n=>n===null||Number.isSafeInteger(n)&&n>=0);
}
export function measuredClickRate(m:NativeMetrics):number|null{
 return validNativeMetrics(m)&&m.impressions!==null&&m.impressions>0&&m.clicks!==null?m.clicks/m.impressions:null;
}
