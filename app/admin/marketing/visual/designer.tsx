"use client";
import {useState} from "react";
import {creativeSvg,themes,formats,palettes,type Creative} from "../../../../src/lib/marketing/visual-template";
import {createVisual} from "./actions";
export default function Designer(){
 const [c,set]=useState<Creative>({theme:"holiday",format:"square",palette:"midnight"});
 return <section className="dw-admin-panel dw-visual-designer"><div><h2>Design your creative</h2><p>Choose an original editorial template. No stock, price, discount or product claims.</p><form action={createVisual} className="dw-admin-form">
 <label>Theme<select name="theme" value={c.theme} onChange={e=>set({...c,theme:e.target.value as Creative["theme"]})}>{Object.entries(themes).map(([k,v])=><option key={k} value={k}>{v[1]}</option>)}</select></label>
 <label>Format<select name="format" value={c.format} onChange={e=>set({...c,format:e.target.value as Creative["format"]})}>{Object.entries(formats).map(([k,v])=><option key={k} value={k}>{k} · {v[0]} × {v[1]}</option>)}</select></label>
 <label>Brand palette<select name="palette" value={c.palette} onChange={e=>set({...c,palette:e.target.value as Creative["palette"]})}>{Object.keys(palettes).map(k=><option key={k}>{k}</option>)}</select></label>
 <button type="submit">Save private draft</button></form></div>
 <figure><img src={"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(creativeSvg(c))} alt={themes[c.theme][0]+" — editorial creative preview"}/><figcaption>Live template preview · {formats[c.format].join(" × ")} px</figcaption></figure></section>;
}
