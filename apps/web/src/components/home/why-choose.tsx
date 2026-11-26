import { Route, BookOpen, BarChart3, Monitor, CalendarClock, Orbit, ShieldCheck, MoveUpRight } from 'lucide-react';
import { Link } from 'react-router';

const benefits = [
	{ icon: Route, title: 'Structured Learning Paths', body: 'Progress from foundational topics to advanced study through a clear, organised curriculum.' },
	{ icon: BarChart3, title: 'Practical Interpretation', body: 'Develop skills using examples and chart-reading exercises that connect theory to practice.' },
	{ icon: Monitor, title: 'Digital Learning Experience', body: 'Access organized course content through a personal student portal designed for online study.' },
	{ icon: CalendarClock, title: 'Flexible Learning', body: 'Learn through available online lessons and scheduled classes that fit different routines.' },
	{ icon: Orbit, title: 'Traditional Knowledge', body: 'Explore classical Jyotish concepts in an organized educational setting rooted in Indian tradition.' },
	{ icon: ShieldCheck, title: 'Responsible Practice', body: 'Understand ethical interpretation and the limitations of astrological predictions.' },
];

export function WhyChoose() {
	return (
		<section className="section why-section" id="why-devinex">
			<div className="section-intro">
				<div>
					<div className="eyebrow">01 / THE DEVINEX DIFFERENCE</div>
					<h2>A modern way to explore<br/><em>traditional Vedic knowledge.</em></h2>
				</div>
				<p>DevineX Astro is designed to bring clarity and structure to the study of traditional astrology. We focus on organizing complex concepts into understandable learning pathways, connecting theoretical knowledge with practical exercises, and making education accessible through digital learning tools.</p>
			</div>
			<div className="benefit-list">
				{benefits.map(b => {
					const Icon = b.icon;
					return (
						<article key={b.title}>
							<Icon />
							<h3>{b.title}</h3>
							<p>{b.body}</p>
						</article>
					);
				})}
			</div>
			<Link className="text-link" to="/about">Discover the DevineX Astro vision <MoveUpRight size={16} /></Link>
		</section>
	);
}
