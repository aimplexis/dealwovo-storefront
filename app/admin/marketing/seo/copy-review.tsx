"use client";
import {useState} from "react";
import {reviewCopy} from "../../../../src/lib/marketing/seo-readiness";
export default function CopyReview(){const [copy,set]=useState("");const flags=reviewCopy(copy);return <section className="dw-admin-panel"><h2>SEO Guardian — private copy review</h2><p>Local rule-based flags only. No external calls, no saving, no proof of accuracy or legal compliance.</p><label>Paste draft editorial copy<textarea rows={6} maxLength={5000} value={copy} onChange={e=>set(e.target.value)}/></label><ul>{flags.map(f=><li key={f}>{f}</li>)}</ul>{!flags.length&&<p>No configured rules triggered. Human evidence review still required.</p>}</section>;}
