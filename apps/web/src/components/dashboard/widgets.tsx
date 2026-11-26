import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import pb from '@/lib/pocketbase-client';
import {
	BookOpen, Video, PlayCircle, FileText, ClipboardList, FileQuestion,
	Award, Megaphone, HelpCircle, User, ArrowUpRight, Sun, Clock,
	GraduationCap, BarChart3, Monitor, Calendar, ShieldCheck, Phone, Mail,
} from 'lucide-react';
import type { Enrollment, LiveClass, Announcement } from '@/lib/types';
import { enrollmentStatusLabel, liveClassStatusLabel } from '@/lib/types';
import { business } from '@/data/site';
import { telHref, mailtoHref } from '@/lib/contact-links';

export type DashboardTab =
	| 'overview' | 'courses' | 'live' | 'recordings' | 'materials'
	| 'assignments' | 'assessments' | 'certificates' | 'support' | 'profile';

export const DASHBOARD_NAV: { key: DashboardTab; label: string; icon: typeof BookOpen }[] = [
	{ key: 'overview', label: 'Dashboard', icon: BarChart3 },
	{ key: 'courses', label: 'My Courses', icon: BookOpen },
	{ key: 'live', label: 'Live Classes', icon: Video },
	{ key: 'recordings', label: 'Recordings', icon: PlayCircle },
	{ key: 'materials', label: 'Materials', icon: FileText },
	{ key: 'assignments', label: 'Assignments', icon: ClipboardList },
	{ key: 'assessments', label: 'Assessments', icon: FileQuestion },
	{ key: 'certificates', label: 'Certificates', icon: Award },
	{ key: 'support', label: 'Support', icon: HelpCircle },
	{ key: 'profile', label: 'Profile', icon: User },
];

export function EmptyWidget({ icon: Icon, title, message, action }: {
	icon: typeof BookOpen;
	title: string;
	message: string;
	action?: { label: string; to: string };
}) {
	return (
		<div className="dashboard-widget">
			<div className="dashboard-widget-head">
				<Icon size={18} strokeWidth={1.4} />
				<h3>{title}</h3>
			</div>
			<div className="dashboard-widget-empty">
				<Icon size={36} strokeWidth={1} />
				<p>{message}</p>
				{action && <Link className="text-link" to={action.to}>{action.label} <ArrowUpRight size={14} /></Link>}
			</div>
		</div>
	);
}

export function EnrolledCoursesWidget({ enrollments }: { enrollments: Enrollment[] }) {
	return (
		<div className="dashboard-widget">
			<div className="dashboard-widget-head">
				<BookOpen size={18} strokeWidth={1.4} />
				<h3>My Enrolled Courses</h3>
				<span className="widget-count">{enrollments.length}</span>
			</div>
			{enrollments.length === 0 ? (
				<div className="dashboard-widget-empty">
					<BookOpen size={36} strokeWidth={1} />
					<p>You have no enrolled courses yet. Explore the catalog to begin.</p>
					<Link className="text-link" to="/courses">Browse courses <ArrowUpRight size={14} /></Link>
				</div>
			) : (
				<div className="widget-course-list">
					{enrollments.map(enrollment => {
						const course = enrollment.expand?.course;
						return (
							<article className="widget-course-card" key={enrollment.id}>
								<div className="widget-course-icon"><Sun size={22} strokeWidth={1.1} /></div>
								<div className="widget-course-body">
									<span className="badge">{enrollmentStatusLabel[enrollment.status] ?? enrollment.status}</span>
									<h4>{course?.title ?? 'Programme'}</h4>
									<div className="enrollment-meta">
										{course && <span><Clock size={12} /> {course.duration}</span>}
										{course && <span><GraduationCap size={12} /> {course.level}</span>}
										{course && <span><Monitor size={12} /> {course.deliveryMethod || course.format}</span>}
									</div>
									<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
										{(enrollment.status === 'active' || enrollment.status === 'completed') && course && (
											<Link className="text-link" to={`/learn/${course.slug}`}>Continue learning <ArrowUpRight size={13} /></Link>
										)}
										{course && <Link className="text-link" to={`/courses/${course.slug}`}>View programme <ArrowUpRight size={13} /></Link>}
									</div>
								</div>
							</article>
						);
					})}
				</div>
			)}
		</div>
	);
}

export function CompletionWidget({ enrollments }: { enrollments: Enrollment[] }) {
	const active = enrollments.filter(e => e.status === 'active' || e.status === 'completed').length;
	const completed = enrollments.filter(e => e.status === 'completed').length;
	const pct = enrollments.length > 0 ? Math.round((completed / enrollments.length) * 100) : 0;
	return (
		<div className="dashboard-widget">
			<div className="dashboard-widget-head">
				<BarChart3 size={18} strokeWidth={1.4} />
				<h3>Course Completion</h3>
			</div>
			<div className="completion-body">
				<div className="completion-ring" style={{ ['--pct' as string]: `${pct}%` }}>
					<span>{pct}%</span>
				</div>
				<div className="completion-stats">
					<div><strong>{enrollments.length}</strong><span>Total enquiries</span></div>
					<div><strong>{active}</strong><span>Active / completed</span></div>
					<div><strong>{completed}</strong><span>Completed</span></div>
				</div>
				<p className="completion-note">Progress is based on verified enrollment status from the database. Lesson-level completion tracking will appear once course content is published.</p>
			</div>
		</div>
	);
}

export function ProfileWidget({ user }: { user: { email: string; name?: string; phone?: string; id: string } }) {
	return (
		<div className="dashboard-widget profile-widget">
			<div className="dashboard-widget-head">
				<User size={18} strokeWidth={1.4} />
				<h3>My Profile</h3>
			</div>
			<div className="profile-body">
				<div className="profile-avatar"><Sun size={40} strokeWidth={1} /></div>
				<dl className="profile-details">
					<div><dt>Name</dt><dd>{user.name || 'Not set'}</dd></div>
					<div><dt>Email</dt><dd>{user.email}</dd></div>
					<div><dt>Phone</dt><dd>{user.phone || 'Not set'}</dd></div>
					<div><dt>Account ID</dt><dd><code>{user.id}</code></dd></div>
				</dl>
				<p className="profile-note">Your records are protected. Only you and DevineX Astro administrators can view your enrollment and profile information.</p>
			</div>
		</div>
	);
}

export function SupportWidget() {
	return (
		<div className="dashboard-widget">
			<div className="dashboard-widget-head">
				<HelpCircle size={18} strokeWidth={1.4} />
				<h3>Help &amp; Support</h3>
			</div>
			<div className="support-body">
				<p>Need help with your courses or account? Reach out to the DevineX Astro team.</p>
				<a className="support-contact" href={telHref(business.phone)}><Phone size={15} /> {business.phone}</a>
				<a className="support-contact" href={mailtoHref({ email: business.email })}><Mail size={15} /> {business.email}</a>
				<div className="support-hours"><Clock size={14} /> {business.hours}</div>
				<Link className="button outline-button" to="/contact">Contact form <ArrowUpRight size={15} /></Link>
			</div>
		</div>
	);
}

export function AnnouncementsWidget({ enrollments }: { enrollments: Enrollment[] }) {
	const [items, setItems] = useState<Announcement[]>([]);
	const [loading, setLoading] = useState(true);
	const courseIds = enrollments.map(e => e.course).filter(Boolean);

	useEffect(() => {
		if (courseIds.length === 0) { setLoading(false); return; }
		const filter = courseIds.map((_, i) => `course = {:c${i}}`).join(' || ') + ' || audience = \'all\'';
		const params: Record<string, unknown> = {};
		courseIds.forEach((c, i) => { params[`c${i}`] = c; });
		pb.collection('announcements').getFullList<Announcement>({
			filter: pb.filter(filter, params), sort: '-created', requestKey: 'dash-ann',
		}).then(r => setItems(r as unknown as Announcement[])).catch(() => {}).finally(() => setLoading(false));
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [courseIds.join(',')]);

	return (
		<div className="dashboard-widget">
			<div className="dashboard-widget-head">
				<Megaphone size={18} strokeWidth={1.4} />
				<h3>Announcements</h3>
				{items.length > 0 && <span className="widget-count">{items.length}</span>}
			</div>
			{loading ? (
				<div className="dashboard-widget-empty"><Megaphone size={36} strokeWidth={1} /><p>Loading announcements…</p></div>
			) : items.length === 0 ? (
				<div className="dashboard-widget-empty">
					<Megaphone size={36} strokeWidth={1} />
					<p>No announcements yet. Course launch updates and batch schedules will appear here when published.</p>
				</div>
			) : (
				<div className="widget-course-list">
					{items.slice(0, 5).map(a => (
						<article className="widget-course-card" key={a.id}>
							<div className="widget-course-icon"><Megaphone size={20} strokeWidth={1.1} /></div>
							<div className="widget-course-body">
								<h4>{a.title}</h4>
								<p style={{ fontSize: 11, marginTop: 6 }}>{a.message}</p>
								<div className="enrollment-meta"><span><Clock size={12} /> {a.created ? new Date(a.created).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : ''}</span></div>
							</div>
						</article>
					))}
				</div>
			)}
		</div>
	);
}

export function UpcomingLiveWidget({ enrollments }: { enrollments: Enrollment[] }) {
	const [items, setItems] = useState<LiveClass[]>([]);
	const [loading, setLoading] = useState(true);
	const courseIds = enrollments.map(e => e.course).filter(Boolean);

	useEffect(() => {
		if (courseIds.length === 0) { setLoading(false); return; }
		const filter = courseIds.map((_, i) => `course = {:c${i}}`).join(' || ');
		const params: Record<string, unknown> = {};
		courseIds.forEach((c, i) => { params[`c${i}`] = c; });
		pb.collection('live_classes').getFullList<LiveClass>({
			filter: pb.filter(filter, params), sort: 'scheduledAt', requestKey: 'dash-live',
		}).then(r => setItems((r as unknown as LiveClass[]).filter(lc => lc.status === 'scheduled' || lc.status === 'live')))
			.catch(() => {}).finally(() => setLoading(false));
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [courseIds.join(',')]);

	return (
		<div className="dashboard-widget">
			<div className="dashboard-widget-head">
				<Video size={18} strokeWidth={1.4} />
				<h3>Upcoming Live Classes</h3>
				{items.length > 0 && <span className="widget-count">{items.length}</span>}
			</div>
			{loading ? (
				<div className="dashboard-widget-empty"><Calendar size={36} strokeWidth={1} /><p>Loading live classes…</p></div>
			) : items.length === 0 ? (
				<div className="dashboard-widget-empty">
					<Calendar size={36} strokeWidth={1} />
					<p>No live classes scheduled yet. Live session timings will appear here once your batch begins.</p>
				</div>
			) : (
				<div className="widget-course-list">
					{items.slice(0, 5).map(lc => (
						<article className="widget-course-card" key={lc.id}>
							<div className="widget-course-icon"><Video size={20} strokeWidth={1.1} /></div>
							<div className="widget-course-body">
								<span className="badge">{liveClassStatusLabel[lc.status] ?? lc.status}</span>
								<h4>{lc.title}</h4>
								<div className="enrollment-meta">
									<span><Calendar size={12} /> {lc.scheduledAt ? new Date(lc.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''}</span>
									{lc.durationMins && <span><Clock size={12} /> {lc.durationMins} min</span>}
								</div>
								{lc.meetingUrl && <a className="text-link" href={lc.meetingUrl} target="_blank" rel="noopener noreferrer">Join meeting <ArrowUpRight size={13} /></a>}
							</div>
						</article>
					))}
				</div>
			)}
		</div>
	);
}
