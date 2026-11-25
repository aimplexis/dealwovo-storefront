import {indexingHold} from "../src/lib/marketing/seo-readiness";
import type {Metadata} from "next";
import "./globals.css";
import "./experience.css";
import "./dealwovo-v2.css";
import "./dealwovo-v2-shop.css";
import "./dealwovo-v2-gifts.css";
import "./dealwovo-v2-product.css";
import "./shop/discovery.css";
import "./compare/compare.css";
import ExperienceMotion from "./ExperienceMotion";
import SiteHeader from "../src/components/SiteHeader";
import SiteFooter from "../src/components/SiteFooter";
export const metadata:Metadata={
 title:{default:"Dealwovo — Discover More. Save Smarter.",template:"%s | Dealwovo"},
 description:"Meet your next favorite find. Explore thoughtful gifts, clever tech and everyday inspiration with Dealwovo.",
 robots:indexingHold
};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body>
  <a className="dw2-skip" href="#main-content">Skip to content</a>
  <SiteHeader/>
  <div id="main-content" tabIndex={-1}>{children}</div>
  <SiteFooter/>
  <ExperienceMotion/>
 </body></html>;
}
