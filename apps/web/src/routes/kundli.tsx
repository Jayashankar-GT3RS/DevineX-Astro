import { Link } from 'react-router';
import { ArrowUpRight, Sparkles, ShieldCheck, FileText, Clock, MapPin } from 'lucide-react';
import type { Route } from './+types/kundli';
import { seo } from '@/lib/seo';
import { celestialImage, business, kundliFaqs } from '@/data/site';
import { KundliForm } from '@/components/kundli/kundli-form';
import { KundliFaq } from '@/components/kundli/kundli-faq';

export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, {
		title: 'Free Kundli Online | Personalized Janam Kundli PDF | DevineX Astro',
		description: 'Request your personalized Vedic Kundli with DevineX Astro. Enter your name, date of birth, birth time and birthplace, register securely and download your Kundli PDF when ready.',
		image: celestialImage,
		jsonLd: [
			{
				'@context': 'https://schema.org',
				'@type': 'Service',
				name: 'Free Vedic Kundli Generation',
				serviceType: 'Astrology birth chart preparation',
				provider: { '@type': 'Organization', name: 'DevineX Astro', url: business.domain },
				areaServed: 'IN',
				offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
			},
			{
				'@context': 'https://schema.org',
				'@type': 'FAQPage',
				mainEntity: kundliFaqs.map(f => ({
					'@type': 'Question',
					name: f.question,
					acceptedAnswer: { '@type': 'Answer', text: f.answer },
				})),
			},
		],
	});
}

const STEPS = [
	{ icon: FileText, title: 'Enter birth details', text: 'Provide your name, date, time and place of birth through our secure form.' },
	{ icon: ShieldCheck, title: 'Register & verify', text: 'Create a verified account with email confirmation to protect your private report.' },
	{ icon: Clock, title: 'We prepare your report', text: 'Our astrology team reviews your details and prepares your personalized Kundli.' },
	{ icon: Sparkles, title: 'Download securely', text: 'Receive an email when ready and download your Kundli PDF from your dashboard.' },
];

export default function KundliPage() {
	return (
		<main>
			<section className="kundli-hero">
				<div className="celestial-orbit orbit-one" />
				<div className="celestial-orbit orbit-two" />
				<img className="hero-wheel kundli-wheel" src={celestialImage} width={1024} height={1024} alt="Golden zodiac wheel" loading="eager" />
				<div className="kundli-hero-content">
					<div className="eyebrow hero-eyebrow">
						<span /> Free Vedic Kundli · Secure PDF Delivery
					</div>
					<h1>Get Your Personalized <em>Vedic Kundli</em></h1>
					<p>
						Discover the traditional insights of Vedic Astrology. Enter your birth details to request your personalized Kundli report,
						prepared by our astrology team and delivered securely in PDF format.
					</p>
					<div className="hero-actions">
						<a href="#kundli-form" className="button gold-button">Generate My Free Kundli <ArrowUpRight size={18} /></a>
						<Link to="/login?redirect=/my-kundli" className="button outline-button">Already Registered? Login <ArrowUpRight size={16} /></Link>
					</div>
					<div className="hero-note"><span className="status-dot" /> Free of charge · No payment required · Private &amp; secure</div>
				</div>
			</section>

			<section className="section kundli-steps-section">
				<div className="center-heading">
					<div className="eyebrow">HOW IT WORKS</div>
					<h2>Four simple steps to your <em>birth chart</em></h2>
				</div>
				<div className="journey-steps">
					{STEPS.map((step, i) => {
						const Icon = step.icon;
						return (
							<article key={i}>
								<span>0{i + 1}</span>
								<Icon size={26} strokeWidth={1.3} style={{ color: 'var(--gold)', marginTop: 18 }} />
								<h3>{step.title}</h3>
								<p>{step.text}</p>
							</article>
						);
					})}
				</div>
			</section>

			<section className="section kundli-form-section" id="kundli-form">
				<div className="kundli-form-wrap">
					<div className="kundli-form-intro">
						<div className="eyebrow">YOUR BIRTH DETAILS</div>
						<h2>Request your <em>Janam Kundli</em></h2>
						<p>Fill in your birth information below. Fields marked with an asterisk (*) are required. Your details are kept private and used only to prepare your report.</p>
						<div className="kundli-form-features">
							<span><ShieldCheck size={15} /> Private &amp; secure storage</span>
							<span><MapPin size={15} /> Birth place accuracy matters</span>
							<span><FileText size={15} /> Optional chart upload</span>
						</div>
					</div>
					<div className="form-panel kundli-form-panel">
						<h3>Generate My Kundli</h3>
						<p>Enter your details to begin. You will register or login after submitting.</p>
						<KundliForm />
					</div>
				</div>
			</section>

			<KundliFaq />

			<section className="section kundli-cta-section">
				<div className="center-heading">
					<div className="eyebrow">READY TO BEGIN?</div>
					<h2>Your stars are <em>waiting to be read</em></h2>
					<p>Request your free Vedic Kundli today. Our astrology team prepares each report individually with care.</p>
					<div className="center-action">
						<a href="#kundli-form" className="button gold-button">Generate My Free Kundli <ArrowUpRight size={16} /></a>
						<a href={business.whatsapp} target="_blank" rel="noopener noreferrer" className="button outline-button">Ask on WhatsApp</a>
					</div>
				</div>
			</section>
		</main>
	);
}
