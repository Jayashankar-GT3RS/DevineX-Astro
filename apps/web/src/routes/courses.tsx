import type { Route } from './+types/courses';
import { seo, siteOriginFrom, absoluteUrl } from '@/lib/seo';
import { pocketbasePublic } from '@/lib/pocketbase-public.server';
import { celestialImage, faqs, pages } from '@/data/site';
import type { Course } from '@/lib/types';
import { useT } from '@/lib/i18n';
import { PageIntro } from '@/components/page-intro';
import { CourseCatalog } from '@/components/courses/catalog';
import { LearningJourney } from '@/components/home/learning-journey';
import { Faq } from '@/components/home/faq';
import { EnrollmentForm } from '@/components/enrollment-form';

export async function loader({ request }: Route.LoaderArgs) {
	const pb = pocketbasePublic(request);
	const result = await pb.listRecords<Course>('courses', {
		filter: 'status = \'published\'',
		sort: 'fee',
		perPage: 100,
	});
	return { courses: result.items };
}

export function meta({ matches, location }: Route.MetaArgs) {
	const p = pages.courses;
	const origin = siteOriginFrom(matches);
	const url = absoluteUrl(origin, '/courses');
	return seo({ matches, location }, {
		title: p.seoTitle,
		description: p.description,
		image: celestialImage,
		jsonLd: [
			{
				'@context': 'https://schema.org',
				'@type': 'CollectionPage',
				name: 'DevineX Astro Course Catalog',
				description: p.description,
				url,
			},
			{
				'@context': 'https://schema.org',
				'@type': 'FAQPage',
				mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
			},
		],
	});
}

export default function CoursesPage({ loaderData }: Route.ComponentProps) {
	const t = useT();
	return (
		<main>
			<PageIntro eyebrow={t('courses.eyebrow')} title={t('courses.title')} description={t('courses.desc')} />
			<CourseCatalog courses={loaderData.courses} />
			<LearningJourney />
			<Faq />
			<EnrollmentForm />
		</main>
	);
}
