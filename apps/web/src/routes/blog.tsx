import { Search } from 'lucide-react';
import type { Route } from './+types/blog';
import { seo } from '@/lib/seo';
import { celestialImage } from '@/data/site';
import { pocketbasePublic } from '@/lib/pocketbase-public.server';
import type { BlogPost } from '@/lib/types';
import { blogCategories } from '@/lib/types';
import { useListFilter } from '@/hooks/use-list-filter';
import { ArticleCard } from '@/components/blog/article-card';

export async function loader({ request }: Route.LoaderArgs) {
	const pb = pocketbasePublic(request);
	const result = await pb.listRecords<BlogPost>('blog_posts', {
		filter: 'status = \'published\'',
		sort: '-created',
		perPage: 100,
	});
	return { posts: result.items };
}

export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, {
		title: 'Vedic Astrology Blog & Knowledge Centre | DevineX Astro',
		description: 'Guides, concepts and practical learning resources from the world of Vedic Astrology. Browse original articles on Jyotish, Kundli analysis, Nakshatras, Navagraha and numerology.',
		image: celestialImage,
		jsonLd: [
			{
				'@context': 'https://schema.org',
				'@type': 'CollectionPage',
				name: 'DevineX Astro Knowledge Centre',
				description: 'Guides, concepts and practical learning resources from the world of Vedic Astrology.',
				url: '',
			},
		],
	});
}

export default function BlogIndex({ loaderData }: Route.ComponentProps) {
	const { posts } = loaderData;
	const filter = useListFilter({
		items: posts,
		searchText: (p) => p.title + ' ' + p.excerpt + ' ' + p.category,
		categoryOf: (p) => p.category,
	});
	const visible = filter.results;

	return (
		<main>
			<section className="page-intro">
				<div className="page-intro-content">
					<div className="breadcrumb"><a href="/">Home</a><span>/</span><span>Knowledge Centre</span></div>
					<div className="eyebrow">KNOWLEDGE CENTRE</div>
					<h1>Explore the DevineX Astro <em>Knowledge Centre</em></h1>
					<p>Guides, concepts and practical learning resources from the world of Vedic Astrology.</p>
				</div>
				<img className="page-wheel" src={celestialImage} alt="" aria-hidden />
			</section>

			<section className="section">
				<div className="blog-filter-bar">
					<label className="blog-search">
						<Search size={16} />
						<input
							type="search"
							placeholder="Search articles…"
							value={filter.query}
							onChange={(e) => filter.setQuery(e.target.value)}
						/>
					</label>
					<div className="blog-chips">
						<button
							className={`blog-chip ${filter.category === null ? 'active' : ''}`}
							onClick={() => filter.setCategory(null)}
						>All</button>
						{blogCategories.map(cat => (
							<button
								key={cat}
								className={`blog-chip ${filter.category === cat ? 'active' : ''}`}
								onClick={() => filter.setCategory(cat)}
							>{cat}</button>
						))}
					</div>
				</div>

				{visible.length === 0 ? (
					<div className="dashboard-empty">
						<Search size={40} strokeWidth={1} />
						<h3>No articles found</h3>
						<p>Try a different search term or category.</p>
					</div>
				) : (
					<div className="blog-grid">
						{visible.map(post => <ArticleCard key={post.id} post={post} />)}
					</div>
				)}
			</section>
		</main>
	);
}
