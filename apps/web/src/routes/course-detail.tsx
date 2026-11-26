import type { Route } from './+types/course-detail';
import { Link } from 'react-router';
import { seo, siteOriginFrom, absoluteUrl } from '@/lib/seo';
import { pocketbasePublic } from '@/lib/pocketbase-public.server';
import { celestialImage, business } from '@/data/site';
import type { Course } from '@/lib/types';
import { parseCurriculum, parseCourseFaqs } from '@/lib/types';
import { formatMoney } from '@/lib/intl-format';
import { whatsappUrl } from '@/lib/contact-links';
import { taxConfigLabel } from '@/lib/types';
import { Sun, Orbit, Hash, Sparkles, Compass, Clock, BarChart3, GraduationCap, Monitor, ArrowUpRight, MessageCircle, BookOpen, Target, User } from 'lucide-react';
import { Curriculum } from '@/components/course-detail/curriculum';
import { CourseFaqs } from '@/components/course-detail/course-faqs';
import { EnrollAction } from '@/components/course-detail/enroll-action';

const iconMap: Record<string, typeof Sun> = {
	sun: Sun,
	orbit: Orbit,
	hash: Hash,
	sparkles: Sparkles,
	compass: Compass,
};

export async function loader({ params, request }: Route.LoaderArgs) {
	const pb = pocketbasePublic(request);
	const course = await pb.findFirstRecord<Course>('courses', pb.filter('slug = {:slug} && status = \'published\'', { slug: params.slug }));
	if (!course) throw new Response('Course not found', { status: 404 });
	return { course };
}

export function meta({ matches, location, loaderData }: Route.MetaArgs) {
	if (!loaderData) {
		return seo({ matches, location }, { title: 'Course not found | DevineX Astro', description: 'This course is not available.', noindex: true });
	}
	const course: Course = loaderData.course;
	const origin = siteOriginFrom(matches);
	const url = absoluteUrl(origin, location.pathname);
	return seo({ matches, location }, {
		title: `${course.title} | DevineX Astro`,
		description: course.shortDescription,
		image: celestialImage,
		type: 'article',
		jsonLd: [
			{
				'@context': 'https://schema.org',
				'@type': 'Course',
				name: course.title,
				description: course.shortDescription,
				url,
				provider: { '@type': 'Organization', name: 'DevineX Astro', url: business.domain },
			},
			{
				'@context': 'https://schema.org',
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl(origin, '/') },
					{ '@type': 'ListItem', position: 2, name: 'Courses', item: absoluteUrl(origin, '/courses') },
					{ '@type': 'ListItem', position: 3, name: course.title, item: url },
				],
			},
		],
	});
}

export default function CourseDetailPage({ loaderData }: Route.ComponentProps) {
	const course: Course = loaderData.course;
	const Icon = iconMap[course.icon] ?? Sun;
	const baseFee = course.fee ?? 0;
	const discount = course.discount ?? 0;
	const finalFee = Math.max(0, baseFee - discount);
	const hasDiscount = discount > 0;
	const fee = baseFee ? formatMoney(finalFee, { locale: 'en-IN', currency: 'INR' }) : 'To be announced';
	const curriculum = parseCurriculum(course.curriculum);
	const courseFaqs = parseCourseFaqs(course.faqs);

	return (
		<main>
			<section className="course-hero">
				<img src={celestialImage} width={1024} height={1024} alt="" className="page-wheel" />
				<div className="course-hero-content">
					<div className="breadcrumb">
						<Link to="/">Home</Link><span>/</span>
						<Link to="/courses">Courses</Link><span>/</span>
						<span>{course.level}</span>
					</div>
					<div className="course-hero-top">
						<Icon size={42} strokeWidth={1} />
						<span className="badge">{course.level}</span>
					</div>
					<h1>{course.title}</h1>
					<p className="course-hero-desc">{course.shortDescription}</p>
					<div className="course-info-bar">
						<div><Clock size={16} /><span>{course.duration}</span></div>
						<div><BarChart3 size={16} /><span>{course.level}</span></div>
						<div><GraduationCap size={16} /><span>{fee}</span></div>
						<div><Monitor size={16} /><span>{course.deliveryMethod || course.format}</span></div>
					</div>
				</div>
			</section>

			<section className="section course-overview">
				<div className="course-two-col">
					<div className="course-main">
						<div className="eyebrow">PROGRAMME OVERVIEW</div>
						<h2>About this <em>programme</em></h2>
						<div className="course-overview-text">
							{course.overview.split('\n\n').map((para, i) => <p key={i}>{para}</p>)}
						</div>

						<div className="course-objectives">
							<div className="eyebrow"><Target size={14} /> LEARNING OUTCOMES</div>
							<p>{course.learningObjectives}</p>
						</div>

						<div className="course-curriculum-block">
							<div className="eyebrow">CURRICULUM</div>
							<h2>What you'll <em>explore</em></h2>
							<Curriculum items={curriculum} />
						</div>

						<div className="course-eligibility">
							<div className="eyebrow"><GraduationCap size={14} /> WHO CAN JOIN</div>
							<p>{course.eligibility}</p>
						</div>

						<div className="course-format">
							<div className="eyebrow"><Monitor size={14} /> LEARNING FORMAT</div>
							<p>{course.format}</p>
						</div>
					</div>

					<aside className="course-sidebar">
						<div className="course-fee-card">
							<span className="small-label">PROPOSED COURSE FEE</span>
							<strong className="course-fee-amount">{fee}</strong>
							{hasDiscount && (
								<div className="course-fee-breakdown">
									<span className="course-fee-row"><s>{formatMoney(baseFee, { locale: 'en-IN', currency: 'INR' })}</s></span>
									<span className="course-fee-row gold">− {formatMoney(discount, { locale: 'en-IN', currency: 'INR' })} {course.discountLabel ? `(${course.discountLabel})` : 'discount'}</span>
								</div>
							)}
							<p className="course-fee-note">{taxConfigLabel[course.taxConfig] ?? 'Tax pending approval'}. Payment is not yet activated — enrollment is enquiry-only until a payment gateway is configured and server-side payment verification is tested.</p>
							<EnrollAction course={course} />
							<div className="course-sidebar-actions">
								<a className="button outline-button" href={whatsappUrl({ phone: business.phone, text: `I'd like to enquire about: ${course.title}` })} target="_blank" rel="noopener noreferrer">
									<MessageCircle size={16} /> WhatsApp enquiry
								</a>
								<Link className="button outline-button" to={`/contact?intent=Brochure+request&course=${encodeURIComponent(course.title)}`}>
									<BookOpen size={16} /> Request brochure
								</Link>
							</div>
						</div>

						<div className="course-instructor-card">
							<div className="eyebrow"><User size={14} /> INSTRUCTOR</div>
							<h3>{course.instructorName}</h3>
							<p>{course.instructorBio}</p>
						</div>
					</aside>
				</div>
			</section>

			{courseFaqs.length > 0 && (
				<section className="section course-faqs-section">
					<div className="center-heading">
						<div className="eyebrow">COURSE FAQS</div>
						<h2>Questions about <em>this programme</em></h2>
					</div>
					<div className="course-faqs-wrap">
						<CourseFaqs faqs={courseFaqs} />
					</div>
				</section>
			)}

			<section className="section course-cta-section">
				<div className="center-heading">
					<h2>Ready to begin <em>your journey?</em></h2>
					<p>Submit an enrollment enquiry or explore our full course catalog.</p>
					<div className="hero-actions" style={{ justifyContent: 'center', marginTop: '27px' }}>
						<Link className="button gold-button" to="/courses">Explore all courses <ArrowUpRight size={16} /></Link>
						<Link className="button outline-button" to="/contact">Contact our team <ArrowUpRight size={16} /></Link>
					</div>
				</div>
			</section>
		</main>
	);
}
