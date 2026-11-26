import { Link } from 'react-router';
import { ArrowUpRight, Compass, Download, Sparkles, TableProperties } from 'lucide-react';
import type { Route } from './+types/free-kundli';
import { seo } from '@/lib/seo';
import { celestialImage, business } from '@/data/site';
import { FreeKundliCalculator } from '@/components/kundli/free-kundli-calculator';
import { KundliFaq } from '@/components/kundli/kundli-faq';

export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, {
		title: 'Free Kundli Chart Instantly | Real Vedic Birth Chart | DevineX Astro',
		description: 'Generate your free Janam Kundli instantly. Enter your birth date, time and place to see a real North or South Indian birth chart, planetary positions, panchang and dashas — no sign-up required.',
		image: celestialImage,
	});
}

const FEATURES = [
	{
		icon: Compass,
		title: 'A real chart, not a template',
		text: 'Planetary longitudes are calculated with the astronomy-engine ephemeris and the Lahiri ayanamsa for the exact minute and place of birth.',
	},
	{
		icon: TableProperties,
		title: 'Full position tables',
		text: 'Every planet with its sign, degree, house, nakshatra, pada, dignity and navamsa, plus the Vimshottari dasha timeline.',
	},
	{
		icon: Download,
		title: 'Download as PDF',
		text: 'Save the chart, positions and panchang as a branded PDF for your records, and print it or share it with your astrologer.',
	},
];

export default function FreeKundliPage() {
	return (
		<main>
			<section className="page-intro">
				<div className="page-intro-content">
					<div className="breadcrumb"><span>Home</span><span>/</span><span>Free Kundli</span></div>
					<div className="eyebrow">INSTANT FREE KUNDLI · NO SIGN-UP</div>
					<h1>See your <em>real birth chart</em> in seconds</h1>
					<p>
						Enter your birth details and get an astronomically calculated Janam Kundli — North or South Indian chart,
						planetary positions, panchang and dashas — straight away. Nothing is stored and no account is needed.
					</p>
					<div className="hero-actions">
						<a href="#free-kundli-form" className="button gold-button">Calculate My Chart <ArrowUpRight size={16} /></a>
						<Link to="/kundli" className="button outline-button">Want the full written report?</Link>
					</div>
					<span className="badge"><Sparkles size={11} /> Lahiri ayanamsa · whole-sign houses · live calculation</span>
					<img className="page-wheel" src={celestialImage} width={1024} height={1024} alt="" aria-hidden="true" loading="lazy" />
				</div>
			</section>

			<section className="section kundli-form-section" id="free-kundli-form">
				<div className="kundli-form-wrap">
					<div className="kundli-form-intro">
						<div className="eyebrow">YOUR BIRTH DETAILS</div>
						<h2>Generate your <em>Janam Kundli</em></h2>
						<p>
							Date, time and place of birth are enough. You can also add details you already know — your zodiac sign,
							birth star, exact coordinates — to cross-check the calculation.
						</p>
						<div className="kundli-form-features">
							<span><Compass size={15} /> Free 30-second chart calculation</span>
							<span><TableProperties size={15} /> North &amp; South Indian chart styles</span>
							<span><Download size={15} /> PDF download of the chart</span>
						</div>
						<p className="fk-intro-note">
							Not sure about your birth time? Use the closest time you know and select “Approximate”. The ascendant and
							house placements can shift within minutes, so a recorded time is always best.
						</p>
					</div>
					<div>
						<FreeKundliCalculator />
					</div>
				</div>
			</section>

			<section className="section fk-features-section">
				<div className="center-heading">
					<div className="eyebrow">WHAT YOU GET</div>
					<h2>Calculated from <em>real planetary data</em></h2>
				</div>
				<div className="benefit-list">
					{FEATURES.map(feature => {
						const Icon = feature.icon;
						return (
							<article key={feature.title}>
								<Icon size={27} strokeWidth={1.3} />
								<h3>{feature.title}</h3>
								<p>{feature.text}</p>
							</article>
						);
					})}
				</div>
				<p className="section-disclaimer">
					The free chart is a calculation, not a prediction. For the traditional written interpretation,{' '}
					<Link to="/kundli" className="gold">request the full Kundli report</Link> or{' '}
					<a href={business.whatsapp} target="_blank" rel="noopener noreferrer" className="gold">ask us on WhatsApp</a>.
				</p>
			</section>

			<KundliFaq />
		</main>
	);
}
