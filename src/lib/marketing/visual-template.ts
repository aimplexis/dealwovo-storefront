// Version 1 is immutable: retain this renderer for saved v1 assets.
export const themes={holiday:["MAKE THE MOMENT","Seasonal inspiration"],gifts:["GIFT THE FEELING","Thoughtful discoveries"],tech:["FIND YOUR NEXT WOW","Clever tech inspiration"],essentials:["EVERYDAY, BETTER","Little everyday discoveries"]} as const;
export const formats={square:[1080,1080],portrait:[1080,1350],story:[1080,1920],landscape:[1200,630]} as const;
export const palettes={midnight:["#0D0B18","#E6FF78","#FFFDF9"],cream:["#F7F4EF","#5535A0","#181426"],violet:["#3B226F","#E6FF78","#FFFDF9"]} as const;
export type Creative={theme:keyof typeof themes;format:keyof typeof formats;palette:keyof typeof palettes};
export function validCreative(t:unknown,f:unknown,p:unknown):Creative|null{
 if(typeof t!=="string"||typeof f!=="string"||typeof p!=="string"||!Object.hasOwn(themes,t)||!Object.hasOwn(formats,f)||!Object.hasOwn(palettes,p))return null;
 return {theme:t as Creative["theme"],format:f as Creative["format"],palette:p as Creative["palette"]};
}
export function creativeSvg(c:Creative):string{
 const [w,h]=formats[c.format], [bg,accent,ink]=palettes[c.palette], [heading,sub]=themes[c.theme];
 const size=Math.min(76,Math.floor((w-140)/(heading.length*.63)));
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><title>${heading} — Dealwovo</title><rect width="${w}" height="${h}" fill="${bg}"/><circle cx="${w*.86}" cy="${h*.25}" r="${Math.min(w,h)*.18}" fill="${accent}" opacity=".16"/><circle cx="${w*.86}" cy="${h*.25}" r="${Math.min(w,h)*.12}" fill="none" stroke="${accent}" stroke-width="3"/><g font-family="Arial,Helvetica,sans-serif" fill="${ink}"><text x="70" y="105" font-size="44" font-weight="700">dealwovo.</text><text x="70" y="${h*.47}" font-size="${size}" font-weight="700" fill="${accent}">${heading}</text><text x="70" y="${h*.47+65}" font-size="38">${sub}</text><text x="70" y="${h*.47+120}" font-size="30">Discover More. Save Smarter.</text><text x="70" y="${h-95}" font-size="29" font-weight="700">Explore dealwovo.com</text><text x="70" y="${h-48}" font-size="19">Editorial inspiration · Not a verified product offer</text></g></svg>`;
}
