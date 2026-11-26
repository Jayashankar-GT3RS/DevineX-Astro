import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, Loader2, LogOut, ShieldCheck, PlayCircle, FileText, ClipboardList, FileQuestion, Award } from 'lucide-react';
import type { Route } from './+types/dashboard';
import { seo } from '@/lib/seo';
import { celestialImage } from '@/data/site';
import { requireAuth } from '@/lib/require-auth';
import pb from '@/lib/pocketbase-client';
import type { Enrollment } from '@/lib/types';
import {
	DASHBOARD_NAV, EmptyWidget, EnrolledCoursesWidget, CompletionWidget,
	ProfileWidget, SupportWidget, AnnouncementsWidget, UpcomingLiveWidget,
	type DashboardTab,
} from '@/components/dashboard/widgets';

export function clientLoader() {
	return { user: requireAuth() };
}
clientLoader.hydrate = true as const;

export function HydrateFallback() {
	return <div aria-hidden />;
}

export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, {
		title: 'Student Dashboard | DevineX Astro',
		description: 'Your DevineX Astro learning dashboard — view enrolled programmes, enrollment status, and learning progress.',
		image: celestialImage,
		noindex: true,
	});
}

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
	const user = loaderData.user;
	const [tab, setTab] = useState<DashboardTab>('overview');
	const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		pb.collection('enrollments')
			.getFullList({
				filter: pb.filter('student = {:student}', { student: user.id }),
				expand: 'course',
				sort: '-created',
				requestKey: null,
			})
			.then(records => setEnrollments(records as unknown as Enrollment[]))
			.catch(() => setError('Could not load your enrollments. Please try again.'))
			.finally(() => setLoading(false));
	}, [user.id]);

	const isAdmin = (user as Record<string, unknown>).role === 'admin';
	const isTrainer = (user as Record<string, unknown>).role === 'trainer';
	const userData = { email: user.email, name: (user as Record<string, unknown>).name as string | undefined, phone: (user as Record<string, unknown>).phone as string | undefined, id: user.id };

	return (
		<main className="dashboard-page">
			<section className="dashboard-hero">
				<div className="dashboard-hero-content">
					<div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>Dashboard</span></div>
					<div className="eyebrow">STUDENT PORTAL</div>
					<h1>Welcome to Your <em>Learning Journey!</em></h1>
					<p>Continue exploring Vedic knowledge, track your lessons and access your enrolled courses.</p>
					<div className="dashboard-actions">
						<Link className="button gold-button" to="/courses">Explore courses <ArrowUpRight size={16} /></Link>
						{isAdmin && <Link className="button outline-button" to="/admin">Admin panel <ShieldCheck size={16} /></Link>}
						{isTrainer && <Link className="button outline-button" to="/trainer">Trainer portal <ShieldCheck size={16} /></Link>}
						<button className="button outline-button" onClick={() => { pb.authStore.clear(); window.location.href = '/'; }}><LogOut size={16} /> Sign out</button>
					</div>
				</div>
			</section>

			<section className="section dashboard-body">
				<nav className="dashboard-nav" aria-label="Dashboard sections">
					{DASHBOARD_NAV.map(item => {
						const Icon = item.icon;
						return (
							<button key={item.key} className={`dashboard-nav-item ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}>
								<Icon size={15} /> <span>{item.label}</span>
							</button>
						);
					})}
				</nav>

				{loading ? (
					<div className="dashboard-loading"><Loader2 size={24} className="spin" /> Loading your dashboard…</div>
				) : error ? (
					<div className="dashboard-empty"><p className="error">{error}</p></div>
				) : (
					<div className="dashboard-content">
						{tab === 'overview' && (
							<div className="dashboard-grid">
								<EnrolledCoursesWidget enrollments={enrollments} />
								<CompletionWidget enrollments={enrollments} />
								<UpcomingLiveWidget enrollments={enrollments} />
								<EmptyWidget icon={PlayCircle} title="Continue Learning" message="No lessons in progress yet. Lesson-level content will appear here once your enrolled course content is published." action={{ label: 'Browse courses', to: '/courses' }} />
								<AnnouncementsWidget enrollments={enrollments} />
								<EmptyWidget icon={FileText} title="Study Materials" message="Study materials will be available here once your course content is published." />
							</div>
						)}
						{tab === 'courses' && (
							<div className="dashboard-grid dashboard-grid-wide">
								<EnrolledCoursesWidget enrollments={enrollments} />
							</div>
						)}
						{tab === 'live' && <UpcomingLiveWidget enrollments={enrollments} />}
						{tab === 'recordings' && <EmptyWidget icon={PlayCircle} title="Recorded Lessons" message="Recorded lessons will appear here once your course content is published and recordings are uploaded." />}
						{tab === 'materials' && <EmptyWidget icon={FileText} title="Study Materials" message="Study materials will be available here once your course content is published." />}
						{tab === 'assignments' && <EmptyWidget icon={ClipboardList} title="Assignments" message="No assignments yet. Assignments will appear here once your course content is published." />}
						{tab === 'assessments' && <EmptyWidget icon={FileQuestion} title="Quizzes & Assessments" message="No assessments yet. Quizzes and assessments will appear here once your course content is published." />}
						{tab === 'certificates' && <EmptyWidget icon={Award} title="Certificates" message="You are not eligible for any certificates yet. Certificates will appear here when you complete an approved programme." />}
						{tab === 'support' && <SupportWidget />}
						{tab === 'profile' && <ProfileWidget user={userData} />}
					</div>
				)}

				<div className="admin-notice">
					<ShieldCheck size={18} />
					<p>Your dashboard shows only your verified enrollments from the database. No simulated progress or placeholder lessons are displayed. Course content (live classes, recordings, materials, assignments, assessments) will appear as it is published and you are granted access. Payment processing is not yet activated — enrollment remains enquiry-only until a payment gateway is configured and server-side payment verification is tested.</p>
				</div>
			</section>
		</main>
	);
}
