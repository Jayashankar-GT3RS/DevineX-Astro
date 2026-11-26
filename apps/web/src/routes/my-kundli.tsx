import { Link } from 'react-router';
import { ArrowUpRight, LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import type { Route } from './+types/my-kundli';
import { seo } from '@/lib/seo';
import { celestialImage } from '@/data/site';
import { requireAuth } from '@/lib/require-auth';
import pb from '@/lib/pocketbase-client';
import { MyKundliDashboard } from '@/components/kundli/my-kundli-dashboard';

export function clientLoader() {
	return { user: requireAuth() };
}
clientLoader.hydrate = true as const;

export function HydrateFallback() {
	return <div aria-hidden />;
}

export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, {
		title: 'My Kundli Dashboard | DevineX Astro',
		description: 'View your Kundli request status and securely download your personalized Vedic Kundli PDF.',
		image: celestialImage,
		noindex: true,
	});
}

export default function MyKundliPage({ loaderData }: Route.ComponentProps) {
	const user = loaderData.user;
	const userData = {
		id: user.id,
		email: user.email,
		name: (user as Record<string, unknown>).name as string | undefined,
	};

	return (
		<main className="dashboard-page">
			<section className="dashboard-hero">
				<div className="dashboard-hero-content">
					<div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>My Kundli</span></div>
					<div className="eyebrow">KUNDLI PORTAL</div>
					<h1>Your Personalized <em>Kundli Dashboard</em></h1>
					<p>Welcome{userData.name ? `, ${userData.name}` : ''}. Track your Kundli request status and securely download your report when ready.</p>
					<div className="dashboard-actions">
						<Link className="button gold-button" to="/kundli">Request a new Kundli <Sparkles size={16} /></Link>
						<button className="button outline-button" onClick={() => { pb.authStore.clear(); window.location.href = '/'; }}><LogOut size={16} /> Sign out</button>
					</div>
				</div>
			</section>

			<section className="section dashboard-body">
				<div className="dashboard-section-head">
					<h2>Your Kundli <em>Requests</em></h2>
					<p>Each request shows its current status. Reports are prepared individually by our astrology team.</p>
				</div>
				<MyKundliDashboard user={userData} />
			</section>
		</main>
	);
}
