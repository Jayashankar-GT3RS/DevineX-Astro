import type { Route } from './+types/trainer';
import { redirect } from 'react-router';
import { seo } from '@/lib/seo';
import { celestialImage } from '@/data/site';
import { requireAuth } from '@/lib/require-auth';
import { TrainerPortal } from '@/components/trainer/trainer-portal';

export function clientLoader() {
	const user = requireAuth('/trainer/login');
	const role = (user as Record<string, unknown>).role;
	if (role !== 'trainer' && role !== 'admin') throw redirect('/dashboard');
	return { user };
}
clientLoader.hydrate = true as const;

export function HydrateFallback() {
	return <div aria-hidden />;
}

export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, {
		title: 'Trainer Portal | DevineX Astro',
		description: 'Manage lessons, live classes, assignments and student submissions.',
		image: celestialImage,
		noindex: true,
	});
}

export default function TrainerPage({ loaderData }: Route.ComponentProps) {
	return <TrainerPortal user={loaderData.user} />;
}
