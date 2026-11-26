import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, Sun, Orbit, Hash, Sparkles, Compass, Clock, BarChart3, MessageCircle, Tag, Globe } from 'lucide-react';
import type { Course } from '@/lib/types';
import { courseEnrollmentLabel, taxConfigLabel } from '@/lib/types';
import { formatMoney } from '@/lib/intl-format';
import { business } from '@/data/site';
import { whatsappUrl } from '@/lib/contact-links';
import { useT, getLanguage } from '@/lib/i18n';

const iconMap: Record<string, typeof Sun> = {
	sun: Sun,
	orbit: Orbit,
	hash: Hash,
	sparkles: Sparkles,
	compass: Compass,
};

/** Parse the deliveryLanguages JSON field into a locale-code array. */
function deliveryLangs(course: Course): string[] {
	const raw = (course as unknown as { deliveryLanguages?: unknown }).deliveryLanguages;
	if (!raw) return [];
	let arr: unknown = raw;
	if (typeof raw === 'string') {
		try { arr = JSON.parse(raw); } catch { return []; }
	}
	return Array.isArray(arr) ? arr.filter((c): c is string => typeof c === 'string') : [];
}

export function CourseCatalog({ courses }: { courses: Course[] }) {
	const t = useT();
	const [langFilter, setLangFilter] = useState('');

	// Build the set of delivery languages actually offered across published
	// courses. Only languages a course has a trainer assigned to deliver in
	// appear here — never inferred from the site display language.
	const offered = new Set<string>();
	for (const c of courses) for (const code of deliveryLangs(c)) offered.add(code);
	const offeredList = [...offered].sort();

	const visible = langFilter
		? courses.filter(c => deliveryLangs(c).includes(langFilter))
		: courses;

	return (
		<section className="section courses-section" id="catalog">
			<div className="section-intro">
				<div>
					<div className="eyebrow">{t('courses.catalogEyebrow')}</div>
					<h2>{t('courses.catalogTitleA')}<br /><em>{t('courses.catalogTitleB')}</em></h2>
				</div>
				<div>
					<p>Every programme below is proposed and administrator-controlled. Fees, durations, batch dates, taxes, discounts, and enrollment availability are managed from the DevineX Astro admin dashboard and reflect the latest confirmed information.</p>
				</div>
			</div>

			{offeredList.length > 0 && (
				<div className="catalog-lang-filter">
					<Globe size={15} />
					<span className="small-label">{t('common.learnFilter')}</span>
					<button className={`blog-chip ${langFilter === '' ? 'active' : ''}`} onClick={() => setLangFilter('')}>{t('common.allLangs')}</button>
					{offeredList.map(code => (
						<button key={code} className={`blog-chip ${langFilter === code ? 'active' : ''}`} onClick={() => setLangFilter(code)}>
							{getLanguage(code)?.native ?? code}
						</button>
					))}
				</div>
			)}

			<div className="catalog-grid">
				{visible.map(course => {
					const Icon = iconMap[course.icon] ?? Sun;
					const baseFee = course.fee ?? 0;
					const discount = course.discount ?? 0;
					const finalFee = Math.max(0, baseFee - discount);
					const hasDiscount = discount > 0;
					const feeText = baseFee ? formatMoney(finalFee, { locale: 'en-IN', currency: 'INR' }) : 'To be announced';
					const enrollLabel = courseEnrollmentLabel[course.enrollmentStatus] ?? 'Enquire to Enroll';
					const langs = deliveryLangs(course);
					return (
						<article className="catalog-card" key={course.id}>
							<div className="catalog-top">
								<Icon size={34} strokeWidth={1.1} />
								<span className="badge">{course.level}</span>
							</div>
							<h3>{course.title}</h3>
							<p className="catalog-desc">{course.shortDescription}</p>
							<div className="catalog-meta">
								<span><Clock size={14} /> {course.duration}</span>
								<span><BarChart3 size={14} /> {course.level}</span>
							</div>
							{langs.length > 0 && (
								<div className="catalog-delivery-langs">
									<span className="small-label">{t('common.deliveryLang')}</span>
									<div className="catalog-lang-chips">
										{langs.map(code => <span key={code} className="badge">{getLanguage(code)?.native ?? code}</span>)}
									</div>
								</div>
							)}
							<div className="catalog-fee">
								<span className="small-label">PROPOSED FEE</span>
								<strong>{feeText}</strong>
								{hasDiscount && (
									<span className="catalog-fee-original"><s>{formatMoney(baseFee, { locale: 'en-IN', currency: 'INR' })}</s> {course.discountLabel ? `· ${course.discountLabel}` : ''}</span>
								)}
								<span className="catalog-tax-note">{taxConfigLabel[course.taxConfig] ?? 'Tax pending approval'}</span>
							</div>
							<div className="catalog-actions">
								<Link className="button gold-button" to={`/courses/${course.slug}`}>View programme <ArrowUpRight size={15} /></Link>
								<a className="button outline-button" href={whatsappUrl({ phone: business.phone, text: `I'd like to enquire about: ${course.title}` })} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> WhatsApp</a>
							</div>
							<p className="catalog-status">
								{course.paymentEnabled ? <><Tag size={11} /> Paid enrollment · </> : null}
								{enrollLabel} · Payment not yet activated
							</p>
						</article>
					);
				})}
			</div>
			{langFilter && visible.length === 0 && (
				<p className="section-disclaimer">No courses are currently offered in {getLanguage(langFilter)?.name ?? langFilter}. Delivery languages reflect only languages a trainer is assigned to teach in — check back as new batches are scheduled.</p>
			)}
			<p className="section-disclaimer">Proposed programmes. Curriculum, trainers, fees, duration, batch dates, taxes, discounts, and certification details are administrator-controlled and will be confirmed at launch. Tax (GST) treatment is pending approval. Paid enrollment remains disabled until a payment gateway is configured and server-side payment verification is tested. Course delivery languages reflect only languages a trainer is assigned to teach in — they are distinct from the website display language.</p>
		</section>
	);
}
