import { useCallback, useEffect, useState } from 'react';
import { redirect } from 'react-router';
import { Loader2, ShieldCheck, BookOpen, Users, Save, CheckCircle2, LogOut, ArrowUpRight, LayoutDashboard, Inbox, GraduationCap, Calendar, FileText, ClipboardList, Banknote, Award, Layers, UserCog, Video, Newspaper, Bell, BarChart3, Settings, Cpu, Languages } from 'lucide-react';
import { Link } from 'react-router';
import type { Route } from './+types/admin';
import { seo } from '@/lib/seo';
import { celestialImage } from '@/data/site';
import { requireAuth } from '@/lib/require-auth';
import pb from '@/lib/pocketbase-client';
import type { Course, Enrollment } from '@/lib/types';
import { enrollmentStatusLabel, taxConfigLabel, paymentStatusLabel } from '@/lib/types';
import { formatMoney } from '@/lib/intl-format';
import { AdminOverview, LeadsManager, StudentsManager, BatchesManager, LessonsAdmin, LiveClassesAdmin, AssignmentsAdmin, PaymentsManager, CertificatesManager, TrainerManagement, RecordingsResources, BlogContent, Notifications, ReportsAnalytics, SettingsPermissions, KundliManager } from '@/components/admin/admin-modules';
import { KundliEnginePanel } from '@/components/admin/kundli-engine';
import { LanguageManagement } from '@/components/admin/language-management';
import { LANGUAGES, getLanguage } from '@/lib/i18n';

export function clientLoader() {
	const user = requireAuth();
	if ((user as Record<string, unknown>).role !== 'admin') throw redirect('/dashboard');
	return { user };
}
clientLoader.hydrate = true as const;

export function HydrateFallback() {
	return <div aria-hidden />;
}

export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, {
		title: 'Admin Panel | DevineX Astro',
		description: 'Course, enrollment, payment and certificate management for DevineX Astro administrators.',
		image: celestialImage,
		noindex: true,
	});
}

const ENROLLMENT_STATUSES = ['pending', 'active', 'completed', 'cancelled'];
const COURSE_ENROLLMENT_STATUSES = ['enquire', 'open', 'closed'];
const COURSE_STATUSES = ['draft', 'published'];
const TAX_CONFIGS = ['pending', 'included', 'excluded', 'exempt'];
const PAYMENT_STATUSES = ['disabled', 'pending', 'configured', 'tested'];

type Tab = 'overview' | 'courses' | 'enrollments' | 'leads' | 'students' | 'batches' | 'trainers' | 'lessons' | 'live' | 'recordings' | 'assignments' | 'payments' | 'certificates' | 'kundli' | 'kundli-engine' | 'blog' | 'notifications' | 'reports' | 'language' | 'settings';

const TABS: { key: Tab; label: string; icon: typeof BookOpen }[] = [
	{ key: 'overview', label: 'Overview', icon: LayoutDashboard },
	{ key: 'courses', label: 'Courses', icon: BookOpen },
	{ key: 'enrollments', label: 'Enrollments', icon: Users },
	{ key: 'leads', label: 'Leads', icon: Inbox },
	{ key: 'students', label: 'Students', icon: GraduationCap },
	{ key: 'batches', label: 'Batches', icon: Layers },
	{ key: 'lessons', label: 'Lessons', icon: FileText },
	{ key: 'live', label: 'Live Classes', icon: Calendar },
	{ key: 'assignments', label: 'Assignments', icon: ClipboardList },
	{ key: 'payments', label: 'Payments', icon: Banknote },
	{ key: 'kundli', label: 'Kundli Requests', icon: FileText },
	{ key: 'kundli-engine', label: 'Kundli Engine', icon: Cpu },
	{ key: 'trainers', label: 'Trainers', icon: UserCog },
	{ key: 'recordings', label: 'Recordings', icon: Video },
	{ key: 'blog', label: 'Blog Content', icon: Newspaper },
	{ key: 'notifications', label: 'Notifications', icon: Bell },
	{ key: 'reports', label: 'Reports', icon: BarChart3 },
	{ key: 'language', label: 'Languages', icon: Languages },
	{ key: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminPage({ loaderData }: Route.ComponentProps) {
	const [tab, setTab] = useState<Tab>('overview');
	const [courses, setCourses] = useState<Course[]>([]);
	const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
	const [trainerUsers, setTrainerUsers] = useState<Record<string, unknown>[]>([]);
	const [loading, setLoading] = useState(true);
	const [savingId, setSavingId] = useState<string | null>(null);
	const [savedId, setSavedId] = useState<string | null>(null);
	const [error, setError] = useState('');

	const loadCourses = useCallback(async () => {
		// `requestKey: null` — StrictMode's double mount would otherwise cancel the
		// first request and surface a false "Could not load admin data" error.
		const items = await pb.collection('courses').getFullList({ sort: 'fee', requestKey: null });
		setCourses(items as unknown as Course[]);
	}, []);

	const loadEnrollments = useCallback(async () => {
		const items = await pb.collection('enrollments').getFullList({ expand: 'course,student', sort: '-created', requestKey: null });
		setEnrollments(items as unknown as Enrollment[]);
	}, []);

	const loadTrainerUsers = useCallback(async () => {
		try {
			const items = await pb.collection('users').getFullList({ filter: "role = 'trainer'", sort: 'name', requestKey: null });
			setTrainerUsers(items as unknown as Record<string, unknown>[]);
		} catch { /* ignore */ }
	}, []);

	useEffect(() => {
		Promise.all([loadCourses(), loadEnrollments(), loadTrainerUsers()])
			.catch(() => setError('Could not load admin data.'))
			.finally(() => setLoading(false));
	}, [loadCourses, loadEnrollments, loadTrainerUsers]);

	const updateCourseField = (id: string, field: keyof Course, value: string | number | boolean) => {
		setCourses(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
	};

	const parseDeliveryLangs = (raw: string): string[] => {
		try { const a = JSON.parse(raw || '[]'); return Array.isArray(a) ? a.filter((c): c is string => typeof c === 'string') : []; } catch { return []; }
	};

	const toggleDeliveryLang = (id: string, code: string) => {
		setCourses(prev => prev.map(c => {
			if (c.id !== id) return c;
			const current = parseDeliveryLangs(c.deliveryLanguages);
			const next = current.includes(code) ? current.filter(x => x !== code) : [...current, code];
			return { ...c, deliveryLanguages: JSON.stringify(next) };
		}));
	};

	const saveCourse = async (course: Course) => {
		setSavingId(course.id);
		setError('');
		try {
			await pb.collection('courses').update(course.id, {
				enrollmentStatus: course.enrollmentStatus, status: course.status, fee: course.fee,
				duration: course.duration, batchStartDate: course.batchStartDate || '',
				enrollmentDeadline: course.enrollmentDeadline || '', maxCapacity: course.maxCapacity,
				trainer: course.trainer, assignedTrainer: course.assignedTrainer || '', deliveryMethod: course.deliveryMethod, taxConfig: course.taxConfig,
				taxRate: course.taxRate, discount: course.discount, discountLabel: course.discountLabel,
				paymentEnabled: course.paymentEnabled, paymentStatus: course.paymentStatus,
				deliveryLanguages: course.deliveryLanguages || '[]',
			}, { requestKey: null });
			setSavedId(course.id);
			setTimeout(() => setSavedId(null), 2500);
		} catch {
			setError('Could not save course changes. Please try again.');
		} finally {
			setSavingId(null);
		}
	};

	const updateEnrollmentStatus = async (id: string, status: string) => {
		try {
			await pb.collection('enrollments').update(id, { status }, { requestKey: null });
			setEnrollments(prev => prev.map(e => e.id === id ? { ...e, status } : e));
		} catch {
			setError('Could not update enrollment status.');
		}
	};

	return (
		<main className="admin-page">
			<section className="dashboard-hero">
				<div className="dashboard-hero-content">
					<div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>Admin</span></div>
					<div className="eyebrow">ADMINISTRATION</div>
					<h1>Course &amp; enrollment <em>management</em></h1>
					<p>Manage courses, batches, lessons, live classes, assignments, enrollments, payments and certificates.</p>
					<div className="dashboard-actions">
						<Link className="button outline-button" to="/dashboard">Student dashboard <ArrowUpRight size={16} /></Link>
						<button className="button outline-button" onClick={() => { pb.authStore.clear(); window.location.href = '/'; }}><LogOut size={16} /> Sign out</button>
					</div>
				</div>
			</section>

			<section className="section">
				{error && <div className="admin-error" role="alert">{error}</div>}

				<nav className="dashboard-nav" aria-label="Admin modules">
					{TABS.map(item => {
						const Icon = item.icon;
						return (
							<button key={item.key} className={`dashboard-nav-item ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}>
								<Icon size={15} /> <span>{item.label}</span>
							</button>
						);
					})}
				</nav>

				{tab === 'overview' && <AdminOverview />}

				{tab === 'courses' && (
					loading ? <div className="dashboard-loading"><Loader2 size={24} className="spin" /> Loading…</div> : (
						<div className="admin-courses">
							{courses.map(course => (
								<article className="admin-course-card" key={course.id}>
									<div className="admin-course-head">
										<div>
											<h3>{course.title}</h3>
											<span className="small-label">SLUG: {course.slug}</span>
										</div>
										<div className="admin-course-fee">{course.fee ? formatMoney(course.fee, { locale: 'en-IN', currency: 'INR' }) : '—'}</div>
									</div>
									<div className="admin-course-fields">
										<label>Visibility
											<select value={course.status} onChange={e => updateCourseField(course.id, 'status', e.target.value)}>
												{COURSE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
											</select>
										</label>
										<label>Enrollment availability
											<select value={course.enrollmentStatus} onChange={e => updateCourseField(course.id, 'enrollmentStatus', e.target.value)}>
												{COURSE_ENROLLMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
											</select>
										</label>
										<label>Proposed fee (INR)
											<input type="number" min={0} value={course.fee ?? 0} onChange={e => updateCourseField(course.id, 'fee', Number(e.target.value))} />
										</label>
										<label>Duration
											<input type="text" value={course.duration || ''} onChange={e => updateCourseField(course.id, 'duration', e.target.value)} />
										</label>
										<label>Batch start date
											<input type="date" value={course.batchStartDate ? course.batchStartDate.slice(0, 10) : ''} onChange={e => updateCourseField(course.id, 'batchStartDate', e.target.value)} />
										</label>
										<label>Enrollment deadline
											<input type="date" value={course.enrollmentDeadline ? course.enrollmentDeadline.slice(0, 10) : ''} onChange={e => updateCourseField(course.id, 'enrollmentDeadline', e.target.value)} />
										</label>
										<label>Max batch capacity
											<input type="number" min={0} value={course.maxCapacity ?? 0} onChange={e => updateCourseField(course.id, 'maxCapacity', Number(e.target.value))} />
										</label>
										<label>Trainer <small>(display name)</small>
											<input type="text" value={course.trainer || ''} onChange={e => updateCourseField(course.id, 'trainer', e.target.value)} />
										</label>
										<label>Assigned trainer account
											<select value={course.assignedTrainer || ''} onChange={e => updateCourseField(course.id, 'assignedTrainer', e.target.value)}>
												<option value="">Unassigned</option>
												{trainerUsers.map(u => <option key={u.id as string} value={u.id as string}>{String(u.name || u.email)}</option>)}
											</select>
										</label>
										<label>Delivery method
											<input type="text" value={course.deliveryMethod || ''} onChange={e => updateCourseField(course.id, 'deliveryMethod', e.target.value)} />
										</label>
										<label>Discount amount (INR)
											<input type="number" min={0} value={course.discount ?? 0} onChange={e => updateCourseField(course.id, 'discount', Number(e.target.value))} />
										</label>
										<label>Discount label <small>(optional)</small>
											<input type="text" value={course.discountLabel || ''} placeholder="e.g. Early bird" onChange={e => updateCourseField(course.id, 'discountLabel', e.target.value)} />
										</label>
										<label>Tax configuration
											<select value={course.taxConfig || 'pending'} onChange={e => updateCourseField(course.id, 'taxConfig', e.target.value)}>
												{TAX_CONFIGS.map(s => <option key={s} value={s}>{taxConfigLabel[s] ?? s}</option>)}
											</select>
										</label>
										<label>Tax rate % <small>(0–100)</small>
											<input type="number" min={0} max={100} value={course.taxRate ?? 0} onChange={e => updateCourseField(course.id, 'taxRate', Number(e.target.value))} />
										</label>
										<label>Payment gateway status
											<select value={course.paymentStatus || 'disabled'} onChange={e => updateCourseField(course.id, 'paymentStatus', e.target.value)}>
												{PAYMENT_STATUSES.map(s => <option key={s} value={s}>{paymentStatusLabel[s] ?? s}</option>)}
											</select>
										</label>
										<label className="admin-toggle-label">Paid enrollment enabled
											<label className="admin-switch">
												<input type="checkbox" checked={Boolean(course.paymentEnabled)} onChange={e => updateCourseField(course.id, 'paymentEnabled', e.target.checked)} />
												<span className="admin-switch-track" />
											</label>
											<small>{course.paymentEnabled ? 'Checkout active' : 'Enquiry-only (recommended)'}</small>
										</label>
									</div>
									<div className="admin-delivery-langs">
										<span className="small-label">COURSE DELIVERY LANGUAGES</span>
										<p className="admin-delivery-hint">Select only languages a trainer is assigned to teach this course in. These appear on the public catalog's "Learn in Your Language" filter — distinct from the website display language.</p>
										<div className="admin-delivery-chips">
											{LANGUAGES.map(l => {
												const active = parseDeliveryLangs(course.deliveryLanguages).includes(l.code);
												return (
													<button key={l.code} type="button" className={`blog-chip ${active ? 'active' : ''}`} onClick={() => toggleDeliveryLang(course.id, l.code)}>
														{l.native}
													</button>
												);
											})}
										</div>
									</div>
									<div className="admin-course-actions">
										<button className="button gold-button" onClick={() => saveCourse(course)} disabled={savingId === course.id}>
											{savingId === course.id ? <><Loader2 size={15} className="spin" /> Saving…</> : <><Save size={15} /> Save changes</>}
										</button>
										{savedId === course.id && <span className="admin-saved"><CheckCircle2 size={16} /> Saved</span>}
									</div>
								</article>
							))}
						</div>
					)
				)}

				{tab === 'enrollments' && (
					loading ? <div className="dashboard-loading"><Loader2 size={24} className="spin" /> Loading…</div> : (
						<div>
							<div className="admin-module-head"><h2>Enrollments</h2></div>
							{enrollments.length === 0 ? (
								<div className="dashboard-empty"><Users size={44} strokeWidth={1} /><h3>No enrollments yet</h3><p>Student enrollment enquiries will appear here once submitted.</p></div>
							) : (
								<div className="admin-table-wrap">
									<table className="admin-table">
										<thead><tr><th>Student</th><th>Course</th><th>Status</th><th>Submitted</th><th>Update</th></tr></thead>
										<tbody>
											{enrollments.map(enrollment => {
												const student = enrollment.expand?.student;
												const course = enrollment.expand?.course;
												return (
													<tr key={enrollment.id}>
														<td>{student ? (student.name || student.email) : '—'}</td>
														<td>{course?.title ?? '—'}</td>
														<td><span className="badge">{enrollmentStatusLabel[enrollment.status] ?? enrollment.status}</span></td>
														<td>{enrollment.created ? new Date(enrollment.created).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : '—'}</td>
														<td>
															<select value={enrollment.status} onChange={e => updateEnrollmentStatus(enrollment.id, e.target.value)}>
																{ENROLLMENT_STATUSES.map(s => <option key={s} value={s}>{enrollmentStatusLabel[s] ?? s}</option>)}
															</select>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							)}
						</div>
					)
				)}

				{tab === 'leads' && <LeadsManager />}
				{tab === 'students' && <StudentsManager />}
				{tab === 'batches' && <BatchesManager courses={courses} />}
				{tab === 'lessons' && <LessonsAdmin courses={courses} />}
				{tab === 'live' && <LiveClassesAdmin courses={courses} />}
				{tab === 'assignments' && <AssignmentsAdmin courses={courses} />}
				{tab === 'payments' && <PaymentsManager courses={courses} />}
				{tab === 'certificates' && <CertificatesManager courses={courses} />}
				{tab === 'kundli' && <KundliManager />}
				{tab === 'kundli-engine' && <KundliEnginePanel />}
				{tab === 'trainers' && <TrainerManagement />}
				{tab === 'recordings' && <RecordingsResources />}
				{tab === 'blog' && <BlogContent />}
				{tab === 'notifications' && <Notifications />}
				{tab === 'reports' && <ReportsAnalytics />}
				{tab === 'language' && <LanguageManagement />}
				{tab === 'settings' && <SettingsPermissions />}

				<div className="admin-notice">
					<ShieldCheck size={18} />
					<p>Payment processing is not yet activated. Enrollment calls to action are enquiry-only. Tax (GST) configuration is pending approval. Offline payment entries are explicitly labeled, verifiable, and audit-logged. Do not mark enrollments as active until secure payment verification is configured and tested. Certificates are issued only after completion criteria and template approval.</p>
				</div>
			</section>
		</main>
	);
}
