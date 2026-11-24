import Link from "next/link";
import Image from "next/image";
export type EditorialCard={
 label:string;name:string;description:string;href:string;image:string;alt:string;
};
export type EditorialCategoryData={
 eyebrow:string;title:string;accent:string;intro:string;heroImage:string;heroAlt:string;
 stamp:string;sectionEyebrow:string;sectionTitle:string;sectionAccent:string;sectionIntro:string;
 cards:EditorialCard[];closingTitle:string;closingCopy:string;
};
export default function EditorialCategory({data}:{data:EditorialCategoryData}){
 return <main className="dw2-editorial">
  <section className="wrap dw2-editorial-hero">
   <div><span className="dw2-eyebrow">{data.eyebrow}</span>
    <h1>{data.title}<br/><em>{data.accent}</em></h1>
    <p>{data.intro}</p>
    <Link href="#explore" className="dw2-button-dark">Explore the edit <span aria-hidden="true">↘</span></Link>
   </div>
   <div className="dw2-editorial-image">
    <Image src={data.heroImage} alt={data.heroAlt} fill sizes="(max-width: 720px) 92vw, 45vw" priority quality={80}/>
    <div className="dw2-editorial-image-stamp">{data.stamp}<br/>✳</div>
   </div>
  </section>
  <section className="dw2-editorial-explore" id="explore"><div className="wrap dw2-editorial-explore-inner">
   <div className="dw2-editorial-explore-header"><div>
    <span className="dw2-eyebrow">{data.sectionEyebrow}</span>
    <h2>{data.sectionTitle}<br/><em>{data.sectionAccent}</em></h2>
   </div><p>{data.sectionIntro}</p></div>
   <div className="dw2-editorial-card-grid">{data.cards.map((item,index)=><Link href={item.href} className="dw2-editorial-card" key={item.label}>
    <Image src={item.image} alt={item.alt} fill sizes="(max-width: 720px) 90vw, 33vw" quality={75}/>
    <span className="dw2-editorial-card-top">{String(index+1).padStart(2,"0")} / {item.label}</span>
    <span className="dw2-editorial-card-bottom"><strong>{item.name}</strong><small>{item.description}</small><b>Explore the story ↗</b></span>
   </Link>)}</div>
   <p className="dw2-editorial-note">Editorial lifestyle inspiration only. Verified merchant products and prices appear in the Shop after independent approval.</p>
  </div></section>
  <section className="wrap dw2-editorial-signoff"><div><span className="dw2-eyebrow">A GOOD FIND IS WORTH SHARING</span><h2>{data.closingTitle}</h2><p>{data.closingCopy}</p></div><Link className="dw2-button-dark" href="/shop">Visit the curated Shop <span aria-hidden="true">↗</span></Link></section>
 </main>;
}
