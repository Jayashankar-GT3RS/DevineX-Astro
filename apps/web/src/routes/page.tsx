import type { Route } from './+types/page';
import { seo } from '@/lib/seo';
import { pages, type PageKey, celestialImage, faqs } from '@/data/site';
import { PageIntro } from '@/components/page-intro';
import { PageContent } from '@/components/page-content';
import { CourseList } from '@/components/home/course-list';
import { LearningJourney } from '@/components/home/learning-journey';
import { Faq } from '@/components/home/faq';
import { EnrollmentForm } from '@/components/enrollment-form';
import { pocketbasePublic } from '@/lib/pocketbase-public.server';
import { isLocale } from '@/lib/i18n/languages';
import type { PublicTrainer } from '@/lib/types';
export async function loader({ params, request }: Route.LoaderArgs) {
 const routeParams = params as Record<string, string | undefined>;
 if (routeParams.lang && !isLocale(routeParams.lang)) throw new Response('Page not found', { status: 404 });
 const segments = new URL(request.url).pathname.split('/').filter(Boolean);
 const segment = segments[segments.length - 1]?.replace(/\.data$/, '');
 const page = routeParams.page || segment;
 if (!page || !Object.hasOwn(pages, page)) throw new Response('Page not found', { status: 404 });
 const trainers = page === 'trainers' ? (await pocketbasePublic(request).listRecords<PublicTrainer>('trainers', {
  filter: "status = 'published'", sort: 'fullName', perPage: 100,
  fields: 'id,collectionId,fullName,slug,designation,specialization,experience,biography,socialLinks,photo,photoUrl',
 })).items : [];
 return { page: page as PageKey, trainers };
}
export function meta({ matches, location, loaderData }: Route.MetaArgs) {
 if (!loaderData) return seo({ matches, location }, { title: 'Page not found | DevineX Astro', description: 'This page is not available. Discover upcoming Vedic astrology courses and learning pathways at DevineX Astro.', noindex: true });
 const p = pages[loaderData.page];
 const training = ['vedic', 'numerology', 'courses'].includes(p.kind);
 return seo({ matches, location }, { title: p.seoTitle, description: p.description, image: celestialImage, jsonLd: training ? [{ '@context': 'https://schema.org', '@type': 'Service', name: p.seoTitle, description: p.description, provider: { '@type': 'Organization', name: 'DevineX Astro' } }, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) }] : undefined });
}
export default function ContentPage({ loaderData }: Route.ComponentProps) {
 const { page } = loaderData; const p = pages[page];
 const training = ['vedic', 'numerology', 'courses'].includes(p.kind);
 return <main><PageIntro eyebrow={p.eyebrow} title={p.title} description={p.description} comingSoon={['consultations', 'shop', 'blog'].includes(p.kind)}/><PageContent page={page} trainers={loaderData.trainers}/>{training && <><CourseList full filter={p.kind === 'vedic' ? 'vedic' : p.kind === 'numerology' ? 'numerology' : undefined}/><LearningJourney/><Faq/></>}{page !== 'privacy' && <EnrollmentForm/>}</main>;
}
