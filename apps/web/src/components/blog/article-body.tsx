import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import type { BlogPost } from '@/lib/types';

export function ArticleBody({ post }: { post: BlogPost }) {
	const paragraphs = post.content.split('\n\n').filter(Boolean);
	return (
		<article className="blog-article">
			<div className="blog-article-head">
				<span className="badge">{post.category}</span>
				<h1>{post.title}</h1>
				<p className="blog-article-excerpt">{post.excerpt}</p>
				<div className="blog-article-meta">
					<span>By {post.author || 'DevineX Astro'}</span>
					{post.created && <span>· {new Date(post.created).toLocaleDateString('en-IN', { timeZone: 'UTC' })}</span>}
				</div>
			</div>
			<div className="blog-article-content">
				{paragraphs.map((p, i) => <p key={i}>{p}</p>)}
			</div>
			<div className="blog-article-foot">
				<p>Astrology and numerology are traditional interpretive disciplines. This article is for educational purposes and does not constitute medical, legal, financial, or professional advice.</p>
				<Link className="button outline-button" to="/blog">Back to Knowledge Centre <ArrowUpRight size={16} /></Link>
			</div>
		</article>
	);
}
