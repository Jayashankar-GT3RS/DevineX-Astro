import { Link } from 'react-router';
import { ArrowUpRight, BookOpen, Compass, Sparkles, ArrowDown, MessageCircle, Globe } from 'lucide-react';
import { celestialImage, business } from '@/data/site';
import { useT, useLocalePath, POPULAR_LANGUAGES, LANGUAGES, saveLanguagePreference, DEFAULT_LANGUAGE } from '@/lib/i18n';
import { useState } from 'react';

export function Hero() {
	const t = useT();
	const lp = useLocalePath();
	const [showAll, setShowAll] = useState(false);
	const langs = showAll ? LANGUAGES : POPULAR_LANGUAGES;
	const choose = async (code: string) => {
		await saveLanguagePreference(code);
		const target = code === DEFAULT_LANGUAGE ? '/' : `/${code}`;
		window.location.assign(target);
	};
	return (
		<section className="hero">
			<div className="celestial-orbit orbit-one" />
			<div className="celestial-orbit orbit-two" />
			<img
				className="hero-wheel"
				src={celestialImage}
				width={1024}
				height={1024}
				alt="Golden zodiac wheel against a midnight-blue celestial sky"
				fetchPriority="high"
			/>
			<div className="hero-content">
				<div className="eyebrow hero-eyebrow">
					<span /> {t('hero.eyebrow')}
				</div>
				<h1>
					{t('hero.titleA')}
					<br />
					{t('hero.titleB')} <em>{t('hero.titleEm')}</em>
				</h1>
				<p>{t('hero.p1')}</p>
				<p>{t('hero.p2')}</p>
				<div className="hero-actions">
					<Link to={lp('/courses')} className="button gold-button">{t('hero.ctaCourses')} <ArrowUpRight size={18} /></Link>
					<Link to={lp('/kundli')} className="button outline-button">{t('hero.ctaKundli')} <ArrowUpRight size={16} /></Link>
					<a href={business.whatsapp} target="_blank" rel="noopener noreferrer" className="button outline-button"><MessageCircle size={17} /> {t('hero.ctaWhatsapp')}</a>
				</div>
				<Link to={lp('/login')} className="hero-login-link">{t('hero.loginLink')} <ArrowUpRight size={14} /></Link>
				<div className="hero-note"><span className="status-dot" /> {t('hero.note')}</div>

				<div className="hero-language-section">
					<div className="hero-language-head">
						<Globe size={20} />
						<div>
							<h3>{t('lang.choose')}</h3>
							<p>{t('lang.subtitle')}</p>
						</div>
					</div>
					<div className="hero-language-grid">
						{langs.map(lang => (
							<button key={lang.code} className="hero-language-btn" onClick={() => choose(lang.code)}>
								{lang.native}
							</button>
						))}
					</div>
					<button className="hero-language-toggle" onClick={() => setShowAll(s => !s)}>
						{showAll ? t('lang.viewLess') : t('lang.viewAll')}
					</button>
				</div>
			</div>
			<div className="hero-bottom">
				<span><BookOpen size={17} /> {t('hero.tag1')}</span>
				<i />
				<span><Compass size={17} /> {t('hero.tag2')}</span>
				<i />
				<span><Sparkles size={17} /> {t('hero.tag3')}</span>
			</div>
			<a href="#why-devinex" className="scroll-cue" aria-label="Discover DevineX Astro"><ArrowDown size={17} /></a>
		</section>
	);
}
