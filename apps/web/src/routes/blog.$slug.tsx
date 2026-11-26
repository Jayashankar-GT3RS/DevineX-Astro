import { redirect } from 'react-router';
import type { Route } from './+types/blog.$slug';
import { seo, siteOriginFrom, absoluteUrl } from '@/lib/seo';
import { celestialImage } from '@/data/site';
import { pocketbasePublic } from '@/lib/pocketbase-public.server';
import type { BlogPost } from '@/lib/types';
import { ArticleBody } from '@/components/blog/article-body';

export async function loader({ request, params }: Route.LoaderArgs) {
	const pb = pocketbasePublic(request);
	const slug = params.slug;
	if (!slug) throw redirect('/blog');
	const post = await pb.findFirstRecord<BlogPost>('blog_posts', pb.filter('slug = {:slug} && status = \'published\'', { slug }));
	if (!post) {
		throw new Response('Article not found', { status: 404 });
	}
	return { post };
}

export function meta({ matches, location, loaderData }: Route.MetaArgs) {
	if (!loaderData) {
		return seo({ matches, location }, { title: 'Article not found | DevineX Astro', description: 'This article is not available.', noindex: true });
	}
	const post = loaderData.post;
	const origin = siteOriginFrom(matches);
	const url = absoluteUrl(origin, location.pathname);
	return seo({ matches, location }, {
		title: `${post.title} | DevineX Astro`,
		description: post.metaDescription || post.excerpt,
		image: celestialImage,
		type: 'article',
		jsonLd: [
			{
				'@context': 'https://schema.org',
				'@type': 'Article',
				headline: post.title,
				description: post.metaDescription || post.excerpt,
				url,
				author: { '@type': 'Organization', name: post.author || 'DevineX Astro' },
				publisher: { '@type': 'Organization', name: 'DevineX Astro' },
				datePublished: post.created,
				dateModified: post.updated,
			},
			{
				'@context': 'https://schema.org',
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl(origin, '/') },
					{ '@type': 'ListItem', position: 2, name: 'Knowledge Centre', item: absoluteUrl(origin, '/blog') },
					{ '@type': 'ListItem', position: 3, name: post.title, item: url },
				],
			},
		],
	});
}

export default function BlogArticle({ loaderData }: Route.ComponentProps) {
	return (
		<main>
			<section className="page-intro blog-article-intro">
				<div className="page-intro-content">
					<div className="breadcrumb"><a href="/">Home</a><span>/</span><a href="/blog">Knowledge Centre</a><span>/</span><span>Article</span></div>
				</div>
				<img className="page-wheel" src={celestialImage} alt="" aria-hidden />
			</section>
			<section className="section">
				<ArticleBody post={loaderData.post} />
			</section>
		</main>
	);
}
