import Link from "next/link";
export default function SiteFooter(){
 return <footer className="dw2-footer">
  <div className="wrap dw2-footer-inner">
   <div className="dw2-footer-first">
    <span className="dw2-eyebrow">THE GOOD-FINDS CLUB ✳</span>
    <Link href="/" className="dw2-footer-logo">deal<span>wovo</span><b>.</b></Link>
    <p>Thoughtful discoveries, beautiful little upgrades, and more reasons to say “oh, wow.”</p>
    <Link href="/shop" className="dw2-footer-primary">Explore the edit <span aria-hidden="true">↗</span></Link>
   </div>
   <div className="dw2-footer-links"><h2>Discover</h2><Link href="/shop">The Shop</Link><Link href="/gifts">Gift Finder</Link><Link href="/trending">Tech & trends</Link><Link href="/essentials">Everyday living</Link><Link href="/deals">Seasonal edit</Link><Link href="/newsletter">Weekly edit</Link><Link href="/wishlist">Saved products</Link></div>
   <div className="dw2-footer-links"><h2>Dealwovo</h2><Link href="/about">Our story</Link><Link href="/contact">Get in touch</Link><Link href="/affiliate-disclosure">Affiliate disclosure</Link><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms of use</Link></div>
   <div className="dw2-footer-note"><span aria-hidden="true">✳</span><strong>GOOD TASTE.<br/>NO SHORTCUTS.</strong><p>Retailer offers appear only after review. We never invent products, prices, or discounts.</p></div>
  </div>
  <div className="wrap dw2-footer-bottom"><span>© 2026 Dealwovo. Crafted for the curious.</span><span>PRELAUNCH PREVIEW · NO DIRECT CHECKOUT</span><Link href="#main-content">Back to top ↑</Link></div>
 </footer>;
}
