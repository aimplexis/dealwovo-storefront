"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "./RotatingDiscoveryHero.css";

type Feature = {
  id: string;
  title: string;
  subheading: string;
  cta: string;
  destination: string;
  image: string;
  alt: string;
};

const features: Feature[] = [
  {
    id: "tech",
    title: "TECH & GADGETS",
    subheading: "Clever finds worth discovering",
    cta: "Explore tech & trending",
    destination: "/trending",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1280&q=85",
    alt: "Headphones against a vivid yellow background",
  },
  {
    id: "gifts",
    title: "GIFT IDEAS",
    subheading: "The feel-good finds for someone special",
    cta: "Explore thoughtful gifts",
    destination: "/gifts",
    image: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1280&q=85",
    alt: "Decorative gift boxes wrapped for a celebration",
  },
  {
    id: "essentials",
    title: "EVERYDAY ESSENTIALS",
    subheading: "Make the ordinary a little better",
    cta: "Discover everyday essentials",
    destination: "/essentials",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1280&q=85",
    alt: "Warm coffee and home lifestyle setting",
  },
];

export default function RotatingDiscoveryHero() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isHovering, setHovering] = useState(false);
  const [isFocused, setFocused] = useState(false);
  const [isVisible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const section = useRef<HTMLElement>(null);
  const current = features[active];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => setReducedMotion(media.matches);
    const onVisibilityChange = () => setPageVisible(!document.hidden);
    onMotionChange();
    onVisibilityChange();
    media.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      media.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!section.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.05 }
    );
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || isHovering || isFocused || !isVisible || !pageVisible) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % features.length), 7000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, isHovering, isFocused, isVisible, pageVisible]);

  function select(index: number) {
    setActive((index + features.length) % features.length);
    setPaused(true); // Manual selection should not unexpectedly rotate away.
  }

  return (
    <section className={"dw-rotate" + (paused ? " dw-rotate-paused" : "")} ref={section} aria-label="Dealwovo featured shopping discovery">
      <div className="dw-rotate__content">
        <div className="dw-rotate__eyebrow">✳ THE GOOD-FINDS CLUB</div>
        <h1>FIND YOUR<br /><em>NEXT WOW.</em></h1>
        <p>Discover gifts, trending ideas and the useful little things that make life better.</p>
        <div className="dw-rotate__actions">
          <Link href="/gifts" className="dw-rotate__primary">Find a gift <span aria-hidden="true">↗</span></Link>
          <Link href="/trending" className="dw-rotate__secondary">Explore discoveries →</Link>
        </div>
        <div className="dw-rotate__chooser">
          <div className="dw-rotate__chooser-top"><strong>EXPLORE THE EDIT</strong><span>{String(active + 1).padStart(2, "0")} / 03</span></div>
          <div className="dw-rotate__tabs" role="group" aria-label="Choose a shopping category">
            {features.map((feature, index) => (
              <button type="button" aria-pressed={index === active} className={index === active ? "dw-rotate__tab is-active" : "dw-rotate__tab"} key={feature.id} onClick={() => select(index)}>
                {feature.title}<span aria-hidden="true">{index === active ? "↗" : "+"}</span>
              </button>
            ))}
          </div>
          <div className="dw-rotate__controls">
            <button type="button" onClick={() => select(active - 1)} aria-label="Previous featured category">←</button>
            <button type="button" onClick={() => select(active + 1)} aria-label="Next featured category">→</button>
            <button type="button" className="dw-rotate__pause" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>{paused ? "▶ Resume rotation" : "Ⅱ Pause rotation"}</button>
          </div>
        </div>
      </div>
      <div className="dw-rotate__visual" onPointerEnter={(e) => { if (e.pointerType !== "touch") setHovering(true); }} onPointerLeave={() => setHovering(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
        <div className="dw-rotate__orb" aria-hidden="true" />
        <Link href={current.destination} className="dw-rotate__feature" aria-label={current.cta + " — " + current.subheading}>
          <div className="dw-rotate__poster">
            <img key={current.id} src={current.image} alt={current.alt} fetchPriority={active === 0 ? "high" : undefined} />
            <div className="dw-rotate__poster-caption"><small>THE DISCOVERY EDIT</small><strong>{current.subheading}</strong></div>
          </div>
          <div className="dw-rotate__bubble" aria-hidden="true">✦<small>THERE'S MORE<br />TO DISCOVER</small></div>
          <div className="dw-rotate__sticker" aria-hidden="true">GOOD<br /><strong>FEELINGS.</strong></div>
          <span className="dw-rotate__link-label">EXPLORE {current.title} <b aria-hidden="true">↗</b></span>
        </Link>
        <div className="dw-rotate__caption"><strong>{current.title}</strong><span>{current.subheading}</span></div>
      </div>
      <div className="dw-rotate__legal">PRELAUNCH INSPIRATION ONLY · VERIFIED RETAILER OFFERS COMING SOON</div>
    </section>
  );
}
