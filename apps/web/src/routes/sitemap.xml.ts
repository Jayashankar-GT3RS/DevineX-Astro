import type { Route } from './+types/sitemap.xml';
import { siteOrigin } from '@/lib/site-origin.server';
import { pocketbasePublic } from '@/lib/pocketbase-public.server';
import type { Course } from '@/lib/types';

type SitemapEntry = {
	path: string;
	lastmod?: string;
};

const STATIC_PATHS = ['/', '/about', '/courses', '/vedic-astrology-training', '/numerology-training', '/trainers', '/blog', '/kundli', '/consultations', '/astro-shop', '/contact', '/privacy'];

function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function toLoc(origin: string, path: string): string {
	return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function serializeSitemap(origin: string, entries: SitemapEntry[]): string {
	const locales = ['en','hi','bn','te','mr','ta','gu','kn','ml','or','pa','as'];
	const urls = entries
		.map(entry => {
			const loc = escapeXml(toLoc(origin, entry.path));
			const lastmod = entry.lastmod
				? `\n\t\t<lastmod>${escapeXml(entry.lastmod)}</lastmod>`
				: '';
			const alternates = locales
				.map(l => {
					const altPath = l === 'en' ? entry.path : entry.path === '/' ? `/${l}` : `/${l}${entry.path}`;
					return `\n\t\t<xhtml:link rel="alternate" hreflang="${l}" href="${escapeXml(toLoc(origin, altPath))}" />`;
				})
				.join('');
			const xdefault = `\n\t\t<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(toLoc(origin, entry.path))}" />`;
			return `\t<url>\n\t\t<loc>${loc}</loc>${lastmod}${alternates}${xdefault}\n\t</url>`;
		})
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

/**
 * Public dynamic URLs (blog posts, PDPs, articles).
 * Return `{ path, lastmod }` in the same change that adds a collection.
 * Return `[]` only while the site has no public records; clear those URLs
 * again in the same change that removes the collection.
 */
async function getDynamicEntries(): Promise<SitemapEntry[]> {
	return [];
}

async function getBlogEntries(request: Request): Promise<SitemapEntry[]> {
	const pb = pocketbasePublic(request);
	const result = await pb.listRecords<{ slug: string; updated: string; created: string }>('blog_posts', {
		filter: 'status = \'published\'',
		perPage: 100,
	});
	return result.items.map(post => ({
		path: `/blog/${post.slug}`,
		lastmod: post.updated || post.created,
	}));
}

async function getCourseEntries(request: Request): Promise<SitemapEntry[]> {
	const pb = pocketbasePublic(request);
	const result = await pb.listRecords<Course>('courses', {
		filter: 'status = \'published\'',
		perPage: 100,
	});
	return result.items.map(course => ({
		path: `/courses/${course.slug}`,
		lastmod: course.updated || course.created,
	}));
}

export async function loader({ request }: Route.LoaderArgs) {
	const origin = siteOrigin(request);
	const entries: SitemapEntry[] = [
		...STATIC_PATHS.map(path => ({ path })),
		...(await getDynamicEntries()),
		...(await getCourseEntries(request)),
		...(await getBlogEntries(request)),
	];

	return new Response(serializeSitemap(origin, entries), {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
}
