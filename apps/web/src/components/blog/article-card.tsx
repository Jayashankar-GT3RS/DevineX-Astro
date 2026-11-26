import { Link } from 'react-router';
import { ArrowUpRight, Calendar } from 'lucide-react';
import type { BlogPost } from '@/lib/types';

export function ArticleCard({ post }: { post: BlogPost }) {
	return (
		<article className="blog-card">
			<div className="blog-card-top">
				<span className="badge">{post.category}</span>
			</div>
			<h3>{post.title}</h3>
			<p className="blog-card-excerpt">{post.excerpt}</p>
			<div className="blog-card-meta">
				<span><Calendar size={12} /> {post.created ? new Date(post.created).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : ''}</span>
			</div>
			<Link className="blog-card-link" to={`/blog/${post.slug}`}>Read article <ArrowUpRight size={15} /></Link>
		</article>
	);
}
