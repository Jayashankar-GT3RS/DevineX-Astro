import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { celestialImage } from '@/data/site';
export function PageIntro({ eyebrow, title, description, comingSoon = false }: { eyebrow: string; title: string; description: string; comingSoon?: boolean }) {
 return <section className="page-intro"><img src={celestialImage} width={1024} height={1024} alt="" className="page-wheel"/><div className="page-intro-content"><div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>{eyebrow.toLowerCase()}</span></div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p>{comingSoon && <span className="badge">Coming soon · Not yet available</span>}<div className="hero-actions"><Link className="button gold-button" to="/contact">{comingSoon ? 'Register your interest' : 'Apply now'}<ArrowUpRight size={17}/></Link><Link className="text-link" to="/courses">Explore learning paths <ArrowUpRight size={16}/></Link></div></div></section>;
}
