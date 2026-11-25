import Link from "next/link";
import {editorialEdit} from "../lib/catalog/discovery-edit";
import "./discovery-edit.css";
export default function DiscoveryEdit({now}:{now:number}){
 const edit=editorialEdit(now);
 return <section className="wrap dw-discovery-edit" id="daily-discovery" aria-labelledby="dw-discovery-title">
 <div className="dw-discovery-panel"><header><span className="dw2-eyebrow">COME CURIOUS. LEAVE INSPIRED.</span><h2 id="dw-discovery-title">A little inspiration for today.</h2><h3>{edit.title}</h3><p>{edit.description}</p></header>
 <div className="dw-discovery-ideas">{edit.ideas.map((idea,i)=><article key={idea.title}><span aria-hidden="true">0{i+1} / EXPLORE</span><h3>{idea.title}</h3><p>{idea.copy}</p><Link href={idea.href}>Discover more <span aria-hidden="true">↗</span></Link></article>)}</div>
 <p className="dw-discovery-note">Our evergreen editorial themes rotate by UTC day each week. These are ideas, not newly listed products or verified deals.</p>
 <Link href="/lifestyle">Explore all lifestyle ideas ↗</Link>
 </div></section>;
}
