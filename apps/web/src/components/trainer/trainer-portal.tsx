import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
	Loader2, ShieldCheck, LogOut, BookOpen, Video, ClipboardList, Megaphone,
	Save, Plus, Inbox, ArrowUpRight, Calendar, Clock, GraduationCap,
	Users, UserCircle, MessageSquare, Camera, CheckCircle2, TrendingUp,
} from 'lucide-react';
import pb from '@/lib/pocketbase-client';
import type { Course, Lesson, LiveClass, Assignment, Submission, Announcement, Enrollment, Batch, Trainer } from '@/lib/types';
import { submissionStatusLabel, liveClassStatusLabel, enrollmentStatusLabel } from '@/lib/types';

type Tab = 'overview' | 'lessons' | 'live' | 'assignments' | 'submissions' | 'students' | 'calendar' | 'announcements' | 'communication' | 'profile';

const TABS: { key: Tab; label: string; icon: typeof BookOpen }[] = [
	{ key: 'overview', label: 'Overview', icon: TrendingUp },
	{ key: 'lessons', label: 'Lessons', icon: BookOpen },
	{ key: 'live', label: 'Live Classes', icon: Video },
	{ key: 'assignments', label: 'Assignments', icon: ClipboardList },
	{ key: 'submissions', label: 'Submissions', icon: Inbox },
	{ key: 'students', label: 'Students', icon: Users },
	{ key: 'calendar', label: 'Calendar', icon: Calendar },
	{ key: 'announcements', label: 'Announcements', icon: Megaphone },
	{ key: 'communication', label: 'Communication', icon: MessageSquare },
	{ key: 'profile', label: 'My Profile', icon: UserCircle },
];

interface Props {
	user: { id: string; email?: string; name?: string };
}

export function TrainerPortal({ user }: Props) {
	const [tab, setTab] = useState<Tab>('overview');
	const [courses, setCourses] = useState<Course[]>([]);
	const [batches, setBatches] = useState<Batch[]>([]);
	const [lessons, setLessons] = useState<Lesson[]>([]);
	const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
	const [assignments, setAssignments] = useState<Assignment[]>([]);
	const [submissions, setSubmissions] = useState<Submission[]>([]);
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
	const [trainerProfile, setTrainerProfile] = useState<Trainer | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const isAdmin = (user as Record<string, unknown>).role === 'admin';

	const loadAll = useCallback(async () => {
		// Scope courses to the trainer's assignments; admins see all.
		const courseFilter = isAdmin ? {} : { filter: pb.filter('assignedTrainer = {:id}', { id: user.id }), requestKey: 'tr-courses' };
		const courseList = await pb.collection('courses').getFullList<Course>({ sort: 'title', ...courseFilter });
		const scopedCourses = courseList as unknown as Course[];
		setCourses(scopedCourses);

		const courseIds = scopedCourses.map(c => c.id);

		// Batches assigned to this trainer (or all for admin).
		const batchOpts = isAdmin
			? { sort: '-created', requestKey: 'tr-batches', expand: 'course' }
			: { sort: '-created', requestKey: 'tr-batches', expand: 'course', filter: pb.filter('trainer = {:id}', { id: user.id }) };
		const batchList = await pb.collection('batches').getFullList<Batch>(batchOpts);
		setBatches(batchList as unknown as Batch[]);

		// Load lessons, live classes, assignments, announcements — filter to
		// assigned courses client-side. Protected fields are hidden server-side
		// by the protect-course-content hook for non-assigned courses.
		const [l, lc, a, an, enr] = await Promise.all([
			pb.collection('lessons').getFullList<Lesson>({ sort: '-created', requestKey: 'tr-lessons', expand: 'course' }),
			pb.collection('live_classes').getFullList<LiveClass>({ sort: '-scheduledAt', requestKey: 'tr-live', expand: 'course' }),
			pb.collection('assignments').getFullList<Assignment>({ sort: '-created', requestKey: 'tr-assign', expand: 'course' }),
			pb.collection('announcements').getFullList<Announcement>({ sort: '-created', requestKey: 'tr-ann', expand: 'course' }),
			pb.collection('enrollments').getFullList<Enrollment>({ sort: '-created', requestKey: 'tr-enr', expand: 'course,student' }),
		]);

		const inScope = (cid: string) => courseIds.length === 0 ? false : courseIds.includes(cid);
		setLessons((l as unknown as Lesson[]).filter(x => inScope(x.course)));
		setLiveClasses((lc as unknown as LiveClass[]).filter(x => inScope(x.course)));
		setAssignments((a as unknown as Assignment[]).filter(x => inScope(x.course)));
		setAnnouncements((an as unknown as Announcement[]).filter(x => !x.course || inScope(x.course) || x.audience === 'all'));
		setEnrollments((enr as unknown as Enrollment[]).filter(x => inScope(x.course)));

		// Submissions for assignments in scope.
		const assignmentIds = (a as unknown as Assignment[]).filter(x => inScope(x.course)).map(x => x.id);
		const subs = await pb.collection('submissions').getFullList<Submission>({ expand: 'assignment,student', sort: '-created', requestKey: 'tr-subs' });
		setSubmissions((subs as unknown as Submission[]).filter(s => assignmentIds.includes(s.assignment)));

		// Trainer profile linked to this user account.
		try {
			const profile = await pb.collection('trainers').getFirstListItem<Trainer>(pb.filter('user = {:id}', { id: user.id }), { requestKey: 'tr-profile' });
			setTrainerProfile(profile as unknown as Trainer);
		} catch {
			setTrainerProfile(null);
		}
	}, [user.id, isAdmin]);

	useEffect(() => {
		loadAll().catch(() => setError('Could not load trainer data.')).finally(() => setLoading(false));
	}, [loadAll]);

	const pendingSubs = submissions.filter(s => s.status === 'submitted');
	const activeBatches = batches.filter(b => b.status === 'active');
	const upcomingClasses = liveClasses.filter(lc => lc.status === 'scheduled' || lc.status === 'live');
	const completedSessions = liveClasses.filter(lc => lc.status === 'completed');
	const assignedStudents = enrollments.filter(e => e.status === 'active' || e.status === 'completed');

	return (
		<main className="trainer-page">
			<section className="dashboard-hero">
				<div className="dashboard-hero-content">
					<div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>Trainer Portal</span></div>
					<div className="eyebrow">TRAINER PORTAL</div>
					<h1>Manage your <em>teaching</em></h1>
					<p>Create lessons, schedule live classes, set assignments, track student progress, manage your calendar and publish announcements for your assigned courses.</p>
					<div className="dashboard-actions">
						<Link className="button outline-button" to="/dashboard">Student dashboard <ArrowUpRight size={16} /></Link>
						<Link className="button outline-button" to="/trainer/login">Trainer login <ArrowUpRight size={16} /></Link>
						<button className="button outline-button" onClick={() => { pb.authStore.clear(); window.location.href = '/'; }}><LogOut size={16} /> Sign out</button>
					</div>
				</div>
			</section>

			<section className="section">
				{error && <div className="admin-error" role="alert">{error}</div>}

				<nav className="dashboard-nav" aria-label="Trainer sections">
					{TABS.map(item => {
						const Icon = item.icon;
						const count = item.key === 'submissions' ? pendingSubs.length : undefined;
						return (
							<button key={item.key} className={`dashboard-nav-item ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}>
								<Icon size={15} /> <span>{item.label}</span>
								{count !== undefined && count > 0 && <span className="widget-count">{count}</span>}
							</button>
						);
					})}
				</nav>

				{loading ? (
					<div className="dashboard-loading"><Loader2 size={24} className="spin" /> Loading…</div>
				) : (
					<div className="dashboard-content">
						{tab === 'overview' && (
							<>
								<div className="admin-stats-grid">
									<StatCard label="ASSIGNED COURSES" value={courses.length} sub="Courses you teach" />
									<StatCard label="ACTIVE BATCHES" value={activeBatches.length} sub={`${batches.length} total batches`} />
									<StatCard label="ASSIGNED STUDENTS" value={assignedStudents.length} sub="Active & completed enrollments" />
									<StatCard label="UPCOMING CLASSES" value={upcomingClasses.length} sub={`${completedSessions.length} completed sessions`} />
									<StatCard label="LESSONS PUBLISHED" value={lessons.filter(l => l.status === 'published').length} sub={`${lessons.length} total lessons`} />
									<StatCard label="PENDING SUBMISSIONS" value={pendingSubs.length} sub={`${submissions.length} total submissions`} />
									<StatCard label="ASSIGNMENTS" value={assignments.filter(a => a.status === 'published').length} sub={`${assignments.length} total created`} />
									<StatCard label="ANNOUNCEMENTS" value={announcements.length} sub="Published notices" />
								</div>
								{courses.length === 0 && !isAdmin && (
									<div className="trainer-empty-card" style={{ marginTop: 24 }}>
										<BookOpen size={36} strokeWidth={1} />
										<h3>No courses assigned yet</h3>
										<p>The Super Admin has not assigned any courses to your account. Once assigned, your courses, batches, students and teaching tools will appear here. Contact the administrator if you believe this is an error.</p>
									</div>
								)}
							</>
						)}
						{tab === 'lessons' && <LessonsManager courses={courses} lessons={lessons} onChanged={loadAll} />}
						{tab === 'live' && <LiveClassesManager courses={courses} liveClasses={liveClasses} onChanged={loadAll} />}
						{tab === 'assignments' && <AssignmentsManager courses={courses} assignments={assignments} onChanged={loadAll} />}
						{tab === 'submissions' && <SubmissionsManager submissions={submissions} onChanged={loadAll} />}
						{tab === 'students' && <StudentsManager enrollments={enrollments} lessons={lessons} />}
						{tab === 'calendar' && <CalendarManager liveClasses={liveClasses} batches={batches} onChanged={loadAll} />}
						{tab === 'announcements' && <AnnouncementsManager courses={courses} announcements={announcements} userId={user.id} onChanged={loadAll} />}
						{tab === 'communication' && <CommunicationManager announcements={announcements} />}
						{tab === 'profile' && <ProfileManager user={user} trainerProfile={trainerProfile} onChanged={loadAll} />}
					</div>
				)}

				<div className="admin-notice">
					<ShieldCheck size={18} />
					<p>Trainer access is role-scoped: you can view and manage only the courses, batches, students and lessons assigned to you. Company revenue, customer payment records, other trainers' private information, Super Admin settings and unassigned Kundli requests are not accessible. Protected meeting links and video resources are only visible to enrolled students and the assigned trainer. Rescheduling live classes requires administrator approval.</p>
				</div>
			</section>
		</main>
	);
}

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
	return (
		<div className="admin-stat-card">
			<span className="small-label">{label}</span>
			<div className="admin-stat-value">{value}</div>
			<div className="admin-stat-sub">{sub}</div>
		</div>
	);
}

function CourseSelect({ courses, value, onChange }: { courses: Course[]; value: string; onChange: (v: string) => void }) {
	return (
		<label>Course
			<select value={value} onChange={e => onChange(e.target.value)} required>
				<option value="">Select a course</option>
				{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
			</select>
		</label>
	);
}

function LessonsManager({ courses, lessons, onChanged }: { courses: Course[]; lessons: Lesson[]; onChanged: () => Promise<void> }) {
	const [courseId, setCourseId] = useState('');
	const [module, setModule] = useState('');
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [videoUrl, setVideoUrl] = useState('');
	const [videoProvider, setVideoProvider] = useState('none');
	const [notes, setNotes] = useState('');
	const [order, setOrder] = useState(0);
	const [saving, setSaving] = useState(false);
	const [err, setErr] = useState('');

	const create = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!courseId || !title) { setErr('Course and title are required.'); return; }
		setSaving(true); setErr('');
		try {
			await pb.collection('lessons').create({
				course: courseId, module, title, description, videoUrl, videoProvider, notes,
				order: Number(order) || 0, status: 'draft', isPreview: false,
			}, { requestKey: null });
			setModule(''); setTitle(''); setDescription(''); setVideoUrl(''); setNotes(''); setOrder(0);
			await onChanged();
		} catch { setErr('Could not create the lesson. Please try again.'); }
		finally { setSaving(false); }
	};

	const togglePublish = async (lesson: Lesson) => {
		try {
			await pb.collection('lessons').update(lesson.id, { status: lesson.status === 'published' ? 'draft' : 'published' }, { requestKey: null });
			await onChanged();
		} catch { /* ignore */ }
	};

	return (
		<div>
			<div className="admin-module-head"><h2>Course Materials &amp; Lessons</h2></div>
			<div className="admin-create-panel">
				<h3>Create a lesson / upload material</h3>
				<form onSubmit={create}>
					<div className="admin-create-row">
						<CourseSelect courses={courses} value={courseId} onChange={setCourseId} />
						<label>Module <small>(grouping)</small><input value={module} onChange={e => setModule(e.target.value)} placeholder="e.g. Module 1" /></label>
					</div>
					<label>Lesson title<input value={title} onChange={e => setTitle(e.target.value)} required /></label>
					<label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></label>
					<div className="admin-create-row">
						<label>Video provider
							<select value={videoProvider} onChange={e => setVideoProvider(e.target.value)}>
								<option value="none">None yet</option>
								<option value="youtube">YouTube</option>
								<option value="vimeo">Vimeo</option>
								<option value="uploaded">Uploaded file URL</option>
							</select>
						</label>
						<label>Video URL <small>(protected — enrolled students only)</small><input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://…" /></label>
					</div>
					<label>Lesson notes / study material<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Paste notes, PDF links or presentation content" /></label>
					<label>Display order<input type="number" min={0} value={order} onChange={e => setOrder(Number(e.target.value))} /></label>
					{err && <p className="error">{err}</p>}
					<button className="button gold-button" disabled={saving}><Plus size={15} /> {saving ? 'Creating…' : 'Create lesson (draft)'}</button>
				</form>
			</div>
			{lessons.length === 0 ? (
				<div className="trainer-empty-card"><BookOpen size={36} strokeWidth={1} /><h3>No lessons yet</h3><p>Create your first lesson above. Upload video links, notes and study materials for your assigned courses.</p></div>
			) : (
				lessons.map(l => (
					<div className="admin-list-card" key={l.id}>
						<div className="admin-list-card-head">
							<div>
								<h4>{l.title}</h4>
								<p>{l.module || 'Ungrouped'} · {l.videoProvider !== 'none' ? 'Video linked' : 'No video'} · {l.expand?.course?.title ?? ''}</p>
							</div>
							<button className={`button ${l.status === 'published' ? 'outline-button' : 'gold-button'}`} onClick={() => togglePublish(l)}>
								{l.status === 'published' ? 'Unpublish' : 'Publish'}
							</button>
						</div>
					</div>
				))
			)}
		</div>
	);
}

function LiveClassesManager({ courses, liveClasses, onChanged }: { courses: Course[]; liveClasses: LiveClass[]; onChanged: () => Promise<void> }) {
	const [courseId, setCourseId] = useState('');
	const [title, setTitle] = useState('');
	const [scheduledAt, setScheduledAt] = useState('');
	const [durationMins, setDurationMins] = useState(60);
	const [meetingUrl, setMeetingUrl] = useState('');
	const [meetingProvider, setMeetingProvider] = useState('none');
	const [description, setDescription] = useState('');
	const [saving, setSaving] = useState(false);
	const [err, setErr] = useState('');

	const create = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!courseId || !title || !scheduledAt) { setErr('Course, title and date/time are required.'); return; }
		setSaving(true); setErr('');
		try {
			await pb.collection('live_classes').create({
				course: courseId, title, description, scheduledAt: new Date(scheduledAt).toISOString(),
				durationMins: Number(durationMins) || 60, meetingUrl, meetingProvider, status: 'scheduled',
			}, { requestKey: null });
			setTitle(''); setScheduledAt(''); setMeetingUrl(''); setDescription('');
			await onChanged();
		} catch { setErr('Could not schedule the live class.'); }
		finally { setSaving(false); }
	};

	const requestReschedule = async (id: string) => {
		// Reschedule requests require admin approval — flag the session for review.
		try {
			await pb.collection('live_classes').update(id, { description: `[RESCHEDULE REQUESTED — pending admin approval] ` }, { requestKey: null });
			await onChanged();
		} catch { /* ignore */ }
	};

	const cancel = async (id: string) => {
		try { await pb.collection('live_classes').update(id, { status: 'cancelled' }, { requestKey: null }); await onChanged(); } catch { /* ignore */ }
	};

	return (
		<div>
			<div className="admin-module-head"><h2>Live Classes &amp; Recordings</h2></div>
			<div className="admin-create-panel">
				<h3>Schedule a live session</h3>
				<form onSubmit={create}>
					<CourseSelect courses={courses} value={courseId} onChange={setCourseId} />
					<label>Session title<input value={title} onChange={e => setTitle(e.target.value)} required /></label>
					<div className="admin-create-row">
						<label>Date &amp; time <small>(IST)</small><input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required /></label>
						<label>Duration (minutes)<input type="number" min={1} value={durationMins} onChange={e => setDurationMins(Number(e.target.value))} /></label>
					</div>
					<div className="admin-create-row">
						<label>Meeting provider
							<select value={meetingProvider} onChange={e => setMeetingProvider(e.target.value)}>
								<option value="none">None yet</option>
								<option value="zoom">Zoom</option>
								<option value="google_meet">Google Meet</option>
								<option value="other">Other</option>
							</select>
						</label>
						<label>Meeting link <small>(protected — enrolled students only)</small><input value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} placeholder="https://…" /></label>
					</div>
					<label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></label>
					{err && <p className="error">{err}</p>}
					<button className="button gold-button" disabled={saving}><Calendar size={15} /> {saving ? 'Scheduling…' : 'Schedule session'}</button>
				</form>
			</div>
			{liveClasses.length === 0 ? (
				<div className="trainer-empty-card"><Video size={36} strokeWidth={1} /><h3>No live classes scheduled</h3><p>Schedule a session above. Only real, confirmed sessions are shown to students.</p></div>
			) : (
				liveClasses.map(lc => (
					<div className="admin-list-card" key={lc.id}>
						<div className="admin-list-card-head">
							<div>
								<h4>{lc.title}</h4>
								<div className="admin-list-meta">
									<span><Calendar size={12} /> {lc.scheduledAt ? new Date(lc.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</span>
									<span><Clock size={12} /> {lc.durationMins || 60} min</span>
									<span><Video size={12} /> {lc.meetingProvider !== 'none' ? 'Link set' : 'No link'}</span>
									<span>{lc.expand?.course?.title ?? ''}</span>
								</div>
							</div>
							<span className="badge">{liveClassStatusLabel[lc.status] ?? lc.status}</span>
						</div>
						{lc.status === 'scheduled' && (
							<div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
								<button className="auth-back" onClick={() => requestReschedule(lc.id)}>Request reschedule</button>
								<button className="auth-back" onClick={() => cancel(lc.id)}>Cancel session</button>
							</div>
						)}
					</div>
				))
			)}
		</div>
	);
}

function AssignmentsManager({ courses, assignments, onChanged }: { courses: Course[]; assignments: Assignment[]; onChanged: () => Promise<void> }) {
	const [courseId, setCourseId] = useState('');
	const [title, setTitle] = useState('');
	const [instructions, setInstructions] = useState('');
	const [deadline, setDeadline] = useState('');
	const [maxMarks, setMaxMarks] = useState(100);
	const [saving, setSaving] = useState(false);
	const [err, setErr] = useState('');

	const create = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!courseId || !title) { setErr('Course and title are required.'); return; }
		setSaving(true); setErr('');
		try {
			await pb.collection('assignments').create({
				course: courseId, title, instructions, deadline: deadline ? new Date(deadline).toISOString() : '',
				maxMarks: Number(maxMarks) || 0, status: 'draft',
			}, { requestKey: null });
			setTitle(''); setInstructions(''); setDeadline(''); setMaxMarks(100);
			await onChanged();
		} catch { setErr('Could not create the assignment.'); }
		finally { setSaving(false); }
	};

	const togglePublish = async (a: Assignment) => {
		try { await pb.collection('assignments').update(a.id, { status: a.status === 'published' ? 'draft' : 'published' }, { requestKey: null }); await onChanged(); } catch { /* ignore */ }
	};

	return (
		<div>
			<div className="admin-module-head"><h2>Assignments &amp; Assessments</h2></div>
			<div className="admin-create-panel">
				<h3>Create an assignment</h3>
				<form onSubmit={create}>
					<CourseSelect courses={courses} value={courseId} onChange={setCourseId} />
					<label>Title<input value={title} onChange={e => setTitle(e.target.value)} required /></label>
					<label>Instructions<textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={3} /></label>
					<div className="admin-create-row">
						<label>Deadline <small>(IST)</small><input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} /></label>
						<label>Maximum marks<input type="number" min={0} value={maxMarks} onChange={e => setMaxMarks(Number(e.target.value))} /></label>
					</div>
					{err && <p className="error">{err}</p>}
					<button className="button gold-button" disabled={saving}><Plus size={15} /> {saving ? 'Creating…' : 'Create assignment (draft)'}</button>
				</form>
			</div>
			{assignments.length === 0 ? (
				<div className="trainer-empty-card"><ClipboardList size={36} strokeWidth={1} /><h3>No assignments yet</h3><p>Create assignments and assessments for your students above.</p></div>
			) : (
				assignments.map(a => (
					<div className="admin-list-card" key={a.id}>
						<div className="admin-list-card-head">
							<div>
								<h4>{a.title}</h4>
								<p>{a.expand?.course?.title ?? ''} · {a.deadline ? `Due ${new Date(a.deadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` : 'No deadline'} · Max marks: {a.maxMarks || 0}</p>
							</div>
							<button className={`button ${a.status === 'published' ? 'outline-button' : 'gold-button'}`} onClick={() => togglePublish(a)}>
								{a.status === 'published' ? 'Unpublish' : 'Publish'}
							</button>
						</div>
					</div>
				))
			)}
		</div>
	);
}

function SubmissionsManager({ submissions, onChanged }: { submissions: Submission[]; onChanged: () => Promise<void> }) {
	const [active, setActive] = useState<string | null>(null);
	const [marks, setMarks] = useState('');
	const [feedback, setFeedback] = useState('');
	const [saving, setSaving] = useState(false);

	const review = async (sub: Submission) => {
		setSaving(true);
		try {
			await pb.collection('submissions').update(sub.id, {
				marks: Number(marks) || 0, feedback, status: 'reviewed',
			}, { requestKey: null });
			setActive(null); setMarks(''); setFeedback('');
			await onChanged();
		} catch { /* ignore */ }
		finally { setSaving(false); }
	};

	return (
		<div>
			<div className="admin-module-head"><h2>Evaluate Student Submissions</h2></div>
			{submissions.length === 0 ? (
				<div className="trainer-empty-card"><Inbox size={36} strokeWidth={1} /><h3>No submissions yet</h3><p>Student assignment submissions will appear here for evaluation and feedback.</p></div>
			) : (
				submissions.map(s => {
					const assignment = s.expand?.assignment;
					const student = s.expand?.student;
					return (
						<div className="admin-list-card" key={s.id}>
							<div className="admin-list-card-head">
								<div>
									<h4>{assignment?.title ?? 'Assignment'}</h4>
									<p>By {student?.name || student?.email || 'Student'} · {s.content ? 'Text response' : 'No text'} {s.fileUrl && '· File attached'}</p>
									<div className="admin-list-meta">
										<span><Clock size={12} /> {s.created ? new Date(s.created).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : ''}</span>
										<span><GraduationCap size={12} /> {s.marks ?? 0}/{assignment?.maxMarks ?? 0} marks</span>
									</div>
								</div>
								<span className="badge">{submissionStatusLabel[s.status] ?? s.status}</span>
							</div>
							{s.content && <p style={{ fontSize: 12, marginTop: 8 }}>{s.content}</p>}
							{s.fileUrl && <a className="text-link" href={s.fileUrl} target="_blank" rel="noopener noreferrer">View attached file <ArrowUpRight size={13} /></a>}
							{active === s.id ? (
								<div className="trainer-form" style={{ marginTop: 14 }}>
									<label>Marks<input type="number" min={0} value={marks} onChange={e => setMarks(e.target.value)} placeholder={`out of ${assignment?.maxMarks ?? 0}`} /></label>
									<label>Feedback<textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={2} /></label>
									<div style={{ display: 'flex', gap: 10 }}>
										<button className="button gold-button" disabled={saving} onClick={() => review(s)}><Save size={15} /> {saving ? 'Saving…' : 'Save review'}</button>
										<button className="auth-back" onClick={() => setActive(null)}>Cancel</button>
									</div>
								</div>
							) : (
								s.status !== 'reviewed' && <button className="auth-back" onClick={() => { setActive(s.id); setMarks(String(s.marks ?? '')); setFeedback(s.feedback ?? ''); }}>Evaluate &amp; grade</button>
							)}
							{s.feedback && s.status === 'reviewed' && <p style={{ fontSize: 11, marginTop: 8, color: 'var(--gold)' }}>Feedback: {s.feedback}</p>}
						</div>
					);
				})
			)}
		</div>
	);
}

function StudentsManager({ enrollments, lessons }: { enrollments: Enrollment[]; lessons: Lesson[] }) {
	const students = enrollments.filter(e => e.status === 'active' || e.status === 'completed');
	return (
		<div>
			<div className="admin-module-head"><h2>Student Management</h2></div>
			{students.length === 0 ? (
				<div className="trainer-empty-card"><Users size={36} strokeWidth={1} /><h3>No assigned students yet</h3><p>Students enrolled in your assigned courses will appear here. Track their progress, mark attendance and provide individual feedback.</p></div>
			) : (
				students.map(e => {
					const student = e.expand?.student;
					const course = e.expand?.course;
					const courseLessons = lessons.filter(l => l.course === e.course);
					return (
						<div className="trainer-student-card" key={e.id}>
							<div className="trainer-student-head">
								<div>
									<h4>{student?.name || student?.email || 'Student'}</h4>
									<div className="trainer-student-meta">
										<span><GraduationCap size={12} /> {course?.title ?? 'Course'}</span>
										<span><Clock size={12} /> {e.created ? new Date(e.created).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : ''}</span>
									</div>
								</div>
								<span className="badge">{enrollmentStatusLabel[e.status] ?? e.status}</span>
							</div>
							<div className="trainer-student-progress">
								<div className="trainer-student-meta">
									<span>Course lessons: {courseLessons.length}</span>
									<span>Email: {student?.email || '—'}</span>
								</div>
								<div className="trainer-progress-track"><div className="trainer-progress-fill" style={{ width: '0%' }} /></div>
								<p style={{ fontSize: 10, color: '#868ca6', marginTop: 6 }}>Individual lesson-progress tracking and attendance marking will be available once lesson-progress records are created for this student.</p>
							</div>
						</div>
					);
				})
			)}
			<div className="admin-protected-note">
				<ShieldCheck size={16} />
				<p>You can view students enrolled in your assigned courses. Student attendance marking and individual feedback are tracked through lesson-progress and submission records. You cannot access student payment records, Kundli requests, or students assigned to other trainers.</p>
			</div>
		</div>
	);
}

function CalendarManager({ liveClasses, batches, onChanged }: { liveClasses: LiveClass[]; batches: Batch[]; onChanged: () => Promise<void> }) {
	const upcoming = liveClasses.filter(lc => lc.status === 'scheduled' || lc.status === 'live')
		.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
	const activeBatches = batches.filter(b => b.status === 'active' || b.status === 'planned');

	return (
		<div>
			<div className="admin-module-head"><h2>Calendar &amp; Scheduling</h2></div>
			<h3 style={{ fontSize: 15, marginBottom: 14 }}>Upcoming classes</h3>
			{upcoming.length === 0 ? (
				<div className="trainer-empty-card"><Calendar size={36} strokeWidth={1} /><h3>No upcoming classes</h3><p>Scheduled live sessions for your assigned courses will appear here.</p></div>
			) : (
				<div className="trainer-calendar-grid">
					{upcoming.map(lc => (
						<div className="trainer-calendar-item" key={lc.id}>
							<h4>{lc.title}</h4>
							<div className="admin-list-meta">
								<span><Calendar size={12} /> {lc.scheduledAt ? new Date(lc.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</span>
								<span><Clock size={12} /> {lc.durationMins || 60} min</span>
								<span>{lc.expand?.course?.title ?? ''}</span>
							</div>
							{lc.status === 'scheduled' && <button className="auth-back" style={{ marginTop: 8 }} onClick={async () => { try { await pb.collection('live_classes').update(lc.id, { description: `[RESCHEDULE REQUESTED — pending admin approval] ` }, { requestKey: null }); await onChanged(); } catch { /* ignore */ } }}>Request reschedule</button>}
						</div>
					))}
				</div>
			)}
			<h3 style={{ fontSize: 15, margin: '28px 0 14px' }}>Batch timings</h3>
			{activeBatches.length === 0 ? (
				<div className="trainer-empty-card"><Users size={36} strokeWidth={1} /><h3>No active batches</h3><p>Batches assigned to you will appear here with their schedules.</p></div>
			) : (
				activeBatches.map(b => (
					<div className="admin-list-card" key={b.id}>
						<div className="admin-list-card-head">
							<div><h4>{b.name}</h4><p>{b.expand?.course?.title ?? 'Course'}</p></div>
							<span className="badge">{b.status}</span>
						</div>
						{b.startDate && <p style={{ fontSize: 11, color: 'var(--soft-text)' }}>Starts: {new Date(b.startDate).toLocaleDateString('en-IN', { timeZone: 'UTC' })}</p>}
					</div>
				))
			)}
			<div className="admin-protected-note">
				<ShieldCheck size={16} />
				<p>Rescheduling a live session requires administrator approval. When you request a reschedule, the session is flagged for admin review and students are notified once the change is approved. You cannot reschedule sessions for courses not assigned to you.</p>
			</div>
		</div>
	);
}

function AnnouncementsManager({ courses, announcements, userId, onChanged }: { courses: Course[]; announcements: Announcement[]; userId: string; onChanged: () => Promise<void> }) {
	const [courseId, setCourseId] = useState('');
	const [title, setTitle] = useState('');
	const [message, setMessage] = useState('');
	const [audience, setAudience] = useState('course');
	const [saving, setSaving] = useState(false);
	const [err, setErr] = useState('');

	const create = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title || !message) { setErr('Title and message are required.'); return; }
		setSaving(true); setErr('');
		try {
			await pb.collection('announcements').create({
				course: audience === 'course' ? courseId : '', title, message, author: userId, audience,
			}, { requestKey: null });
			setTitle(''); setMessage(''); setCourseId('');
			await onChanged();
		} catch { setErr('Could not publish the announcement.'); }
		finally { setSaving(false); }
	};

	return (
		<div>
			<div className="admin-module-head"><h2>Announcements</h2></div>
			<div className="admin-create-panel">
				<h3>Send an announcement</h3>
				<form onSubmit={create}>
					<label>Audience
						<select value={audience} onChange={e => setAudience(e.target.value)}>
							<option value="course">Specific course</option>
							<option value="all">All your students</option>
						</select>
					</label>
					{audience === 'course' && <CourseSelect courses={courses} value={courseId} onChange={setCourseId} />}
					<label>Title<input value={title} onChange={e => setTitle(e.target.value)} required /></label>
					<label>Message<textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} required /></label>
					{err && <p className="error">{err}</p>}
					<button className="button gold-button" disabled={saving}><Megaphone size={15} /> {saving ? 'Publishing…' : 'Publish announcement'}</button>
				</form>
			</div>
			{announcements.length === 0 ? (
				<div className="trainer-empty-card"><Megaphone size={36} strokeWidth={1} /><h3>No announcements</h3><p>Published announcements appear on enrolled students' dashboards.</p></div>
			) : (
				announcements.map(a => (
					<div className="admin-list-card" key={a.id}>
						<div className="admin-list-card-head">
							<div><h4>{a.title}</h4><p>{a.audience === 'all' ? 'All students' : 'Course announcement'}</p></div>
							<span className="badge">{a.created ? new Date(a.created).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : ''}</span>
						</div>
						<p style={{ fontSize: 12 }}>{a.message}</p>
					</div>
				))
			)}
		</div>
	);
}

function CommunicationManager({ announcements }: { announcements: Announcement[] }) {
	const adminNotices = announcements.filter(a => a.audience === 'all').slice(0, 5);
	return (
		<div>
			<div className="admin-module-head"><h2>Communication</h2></div>
			<div className="admin-create-panel">
				<h3>Student questions</h3>
				<p style={{ fontSize: 12, color: 'var(--soft-text)' }}>Student questions and messages will appear here once a dedicated messaging system is configured. Currently, students receive your announcements on their dashboard and can respond through the contact form.</p>
				<Link className="button outline-button" to="/contact">Open contact inbox <ArrowUpRight size={14} /></Link>
			</div>
			<h3 style={{ fontSize: 15, margin: '24px 0 14px' }}>Notifications from administration</h3>
			{adminNotices.length === 0 ? (
				<div className="trainer-empty-card"><MessageSquare size={36} strokeWidth={1} /><h3>No admin notifications</h3><p>Announcements and notices from the administration will appear here.</p></div>
			) : (
				adminNotices.map(a => (
					<div className="trainer-comm-thread" key={a.id}>
						<div className="trainer-comm-head">
							<h4>{a.title}</h4>
							<span className="badge">{a.created ? new Date(a.created).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : ''}</span>
						</div>
						<p className="trainer-comm-body">{a.message}</p>
					</div>
				))
			)}
		</div>
	);
}

function ProfileManager({ user, trainerProfile, onChanged }: { user: { id: string; email?: string; name?: string }; trainerProfile: Trainer | null; onChanged: () => Promise<void> }) {
	const [fullName, setFullName] = useState(trainerProfile?.fullName ?? user.name ?? '');
	const [specialization, setSpecialization] = useState(trainerProfile?.specialization ?? '');
	const [experience, setExperience] = useState(trainerProfile?.experience ?? '');
	const [biography, setBiography] = useState(trainerProfile?.biography ?? '');
	const [qualifications, setQualifications] = useState(trainerProfile?.qualifications ?? '');
	const [languages, setLanguages] = useState(trainerProfile?.languages ?? '');
	const [availability, setAvailability] = useState(trainerProfile?.availability ?? '');
	const [socialLinks, setSocialLinks] = useState(trainerProfile?.socialLinks ?? '');
	const [photo, setPhoto] = useState<File | null>(null);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [err, setErr] = useState('');

	const photoUrl = trainerProfile?.photo ? pb.files.getURL(trainerProfile as unknown as { id: string; collectionId: string }, trainerProfile.photo) : '';

	const save = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!fullName) { setErr('Full name is required.'); return; }
		setSaving(true); setErr('');
		try {
			const data: Record<string, unknown> = {
				fullName, specialization, experience, biography, qualifications, languages, availability, socialLinks,
			};
			if (photo) data.photo = photo;
			if (trainerProfile) {
				await pb.collection('trainers').update(trainerProfile.id, data, { requestKey: null });
			} else {
				const slug = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
				await pb.collection('trainers').create({ ...data, slug, user: user.id, status: 'draft' }, { requestKey: null });
			}
			setSaved(true);
			setTimeout(() => setSaved(false), 2500);
			await onChanged();
		} catch { setErr('Could not save your profile. Please try again.'); }
		finally { setSaving(false); }
	};

	return (
		<div>
			<div className="admin-module-head"><h2>Trainer Profile</h2></div>
			{!trainerProfile && (
				<div className="admin-protected-note" style={{ marginBottom: 16 }}>
					<ShieldCheck size={16} />
					<p>No trainer profile is linked to your account yet. Fill in your details below to create one. The Super Admin must publish your profile before it appears on the public trainers page.</p>
				</div>
			)}
			<div className="admin-create-panel">
				<form onSubmit={save} className="trainer-profile-form">
					<div className="trainer-photo-upload">
						{photoUrl ? <img src={photoUrl} alt="Profile" className="trainer-photo-preview" /> : <div className="profile-avatar"><Camera size={28} /></div>}
						<label>Profile photograph <small>(JPG/PNG/WebP, max 5 MB)</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setPhoto(e.target.files?.[0] ?? null)} /></label>
					</div>
					<div className="admin-create-row">
						<label>Full name<input value={fullName} onChange={e => setFullName(e.target.value)} required /></label>
						<label>Astrology specialization<input value={specialization} onChange={e => setSpecialization(e.target.value)} placeholder="e.g. Vedic Astrology, Numerology" /></label>
					</div>
					<div className="admin-create-row">
						<label>Experience<input value={experience} onChange={e => setExperience(e.target.value)} placeholder="e.g. 10 years teaching Jyotish" /></label>
						<label>Languages spoken<input value={languages} onChange={e => setLanguages(e.target.value)} placeholder="e.g. English, Hindi, Bengali" /></label>
					</div>
					<label>Professional biography<textarea value={biography} onChange={e => setBiography(e.target.value)} rows={3} /></label>
					<label>Qualifications<textarea value={qualifications} onChange={e => setQualifications(e.target.value)} rows={2} /></label>
					<label>Availability <small>(teaching hours / days)</small><input value={availability} onChange={e => setAvailability(e.target.value)} placeholder="e.g. Weekdays 4–7 PM IST" /></label>
					<label>Social / professional links <small>(comma-separated URLs)</small><input value={socialLinks} onChange={e => setSocialLinks(e.target.value)} placeholder="https://linkedin.com/in/…" /></label>
					{err && <p className="error">{err}</p>}
					<div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
						<button className="button gold-button" disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Save profile'}</button>
						{saved && <span className="admin-saved"><CheckCircle2 size={16} /> Saved</span>}
					</div>
				</form>
			</div>
			<div className="admin-protected-note">
				<ShieldCheck size={16} />
				<p>Bank and payment information is managed separately by authorized administrative personnel only and is not visible or editable from this portal. Your public profile (photograph, biography, specialization, languages, experience) appears on the DevineX Astro trainers page once the Super Admin publishes it.</p>
			</div>
		</div>
	);
}
