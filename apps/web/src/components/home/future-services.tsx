import { Link } from 'react-router';
import { ArrowUpRight, Orbit, ShoppingBag } from 'lucide-react';
export function FutureServices() {
 return <section className="section future-section"><div className="eyebrow">05 / A GROWING UNIVERSE</div><h2>Beyond learning.<br/><em>More to discover.</em></h2><div className="future-rows"><Link to="/consultations"><Orbit size={32} strokeWidth={1}/><div><h3>Personalised astrology consultations</h3><p>Individual guidance and related services, planned for our next chapter.</p></div><span className="badge">Coming soon</span><ArrowUpRight/></Link><Link to="/astro-shop"><ShoppingBag size={30} strokeWidth={1}/><div><h3>The DevineX Astro Shop</h3><p>A future collection of spiritual products and thoughtful essentials.</p></div><span className="badge">Coming soon</span><ArrowUpRight/></Link></div></section>;
}
