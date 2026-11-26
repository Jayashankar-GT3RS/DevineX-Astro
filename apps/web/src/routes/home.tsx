import type { Route } from './+types/home';
import { seo } from '@/lib/seo';
import { celestialImage, faqs, business } from '@/data/site';
import { pocketbasePublic } from '@/lib/pocketbase-public.server';
import type { Course, PublicTrainer } from '@/lib/types';
import { Hero } from '@/components/home/hero';
import { WhyChoose } from '@/components/home/why-choose';
import { CourseCatalog } from '@/components/courses/catalog';
import { LearningJourney } from '@/components/home/learning-journey';
import { Experts } from '@/components/home/experts';
import { FutureServices } from '@/components/home/future-services';
import { Faq } from '@/components/home/faq';
import { EnrollmentForm } from '@/components/enrollment-form';

export async function loader({ request }: Route.LoaderArgs) {
	const pb = pocketbasePublic(request);
	const result = await pb.listRecords<Course>('courses', {
		filter: 'status = \'published\'',
		sort: 'fee',
		perPage: 100,
	});
	const trainer = await pb.findFirstRecord<PublicTrainer>('trainers', "status = 'published' && slug = 'pt-m-k-vasantha-kumar'", {
		fields: 'id,collectionId,fullName,slug,designation,specialization,experience,biography,socialLinks,photo,photoUrl',
	});
	return { courses: result.items, trainer }; 
}

export function meta({ matches, location }: Route.MetaArgs) {
 return seo({ matches, location }, { title: 'DevineX Astro | Vedic Astrology Training & Courses in India', description: 'Discover Vedic Astrology education with DevineX Astro. Explore upcoming courses in Jyotish, Kundli analysis, Nakshatras and numerology.', image: celestialImage, jsonLd: [
 { '@context': 'https://schema.org', '@type': 'WebSite', name: 'DevineX Astro', url: business.domain },
 { '@context': 'https://schema.org', '@type': 'Organization', name: 'DevineX Astro', url: business.domain, email: business.email, telephone: business.phoneTel, description: 'An Indian astrology education initiative of DevineX focused on structured Vedic Astrology training.', contactPoint: { '@type': 'ContactPoint', telephone: business.phoneTel, email: business.email, contactType: 'customer service', areaServed: 'IN', availableLanguage: ['en', 'hi'] } },
 { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) }
 ] });
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
 return <main><Hero/><WhyChoose/><CourseCatalog courses={loaderData.courses}/><LearningJourney/><Experts trainer={loaderData.trainer}/><FutureServices/><Faq/><EnrollmentForm/></main>;
}
