import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { FacultyProfile } from '@/components/trainers/faculty-profile';
import type { PublicTrainer } from '@/lib/types';

export function Experts({ trainer }: { trainer: PublicTrainer | null }) {
	return <section className="section experts-section faculty-home" aria-labelledby="faculty-home-heading">
		<div className="faculty-home-intro">
			<div className="eyebrow">04 / KNOWLEDGE MEETS GUIDANCE</div>
			<h2 id="faculty-home-heading">Learn from the Masters of <em>Vedic Astrology</em></h2>
			<p className="faculty-subtitle">Ancient Wisdom. Expert Guidance. Modern Learning.</p>
			<p>Discover the timeless wisdom of Jyotish through structured learning and thoughtful mentorship.</p>
			<Link to="/trainers" className="text-link">Explore our faculty <ArrowUpRight size={17}/></Link>
		</div>
		{trainer ? <FacultyProfile trainer={trainer} compact /> : <div className="faculty-empty"><p>Explore our faculty and learn more about our approach to mentorship.</p><Link to="/trainers" className="text-link">Our trainers <ArrowUpRight size={16}/></Link></div>}
	</section>;
}
