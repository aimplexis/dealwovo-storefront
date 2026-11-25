"use client";
import {useState} from "react";
import {interests,type Interest} from "../../src/lib/marketing/newsletter";
export default function PreviewPreferences(){const [choice,setChoice]=useState<Interest>("all");return <div className="dw-newsletter-preferences"><fieldset><legend>Preview your shopping interests</legend>{interests.map(([v,label])=><label key={v}><input type="radio" name="newsletter-preview" value={v} checked={choice===v} onChange={()=>setChoice(v)}/>{label}</label>)}</fieldset><p role="status">Your preview: {interests.find(([v])=>v===choice)?.[1]}. This selection is not saved.</p><button type="button" disabled>Subscriptions coming soon</button></div>;}
