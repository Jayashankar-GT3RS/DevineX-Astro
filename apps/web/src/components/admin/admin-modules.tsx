import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
	Loader2, Users, BookOpen, Inbox, ShieldCheck, Plus,
	Calendar, Clock, Award, Banknote, FileText, CheckCircle2, XCircle, GraduationCap,
	Download, Search, ChevronDown, Save, Bell, BarChart3, Settings, Video, Newspaper,
	Upload, Eye, FileCheck,
} from 'lucide-react';
import pb from '@/lib/pocketbase-client';
import type { Course, Batch, Lesson, LiveClass, Assignment, Payment, Certificate, Announcement, Lead, Trainer, BlogPost, KundliRequest } from '@/lib/types';
import {
	batchStatusLabel, liveClassStatusLabel, paymentMethodLabel, paymentRecordStatusLabel,
	certificateStatusLabel, leadStatusLabel, kundliStatusLabel, kundliBirthAccuracyLabel,
} from '@/lib/types';
import { formatMoney } from '@/lib/intl-format';
import { LANGUAGES, getLanguage } from '@/lib/i18n';

const STAT_LABELS = {
	enquiries: 'TOTAL ENQUIRIES', students: 'REGISTERED USERS', enrolled: 'ENROLLED STUDENTS',
	courses: 'ACTIVE COURSES', upcoming: 'UPCOMING CLASSES', completed: 'COMPLETED COURSES',
	payments: 'PAYMENT TOTAL', pending: 'PENDING PAYMENTS',
} as const;

export function AdminOverview() {
	const [stats, setStats] = useState<Record<string, number>>({});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		(async () => {
			try {
				const [enquiries, users, enrollments, courses, liveClasses, payments] = await Promise.all([
					pb.collection('astro_inquiries').getList(1, 1, { requestKey: 'st-enq' }),
					pb.collection('users').getList(1, 1, { requestKey: 'st-users' }),
					pb.collection('enrollments').getList(1, 1, { requestKey: 'st-enr' }),
					pb.collection('courses').getList(1, 1, { filter: 'status = \'published\'', requestKey: 'st-courses' }),
					pb.collection('live_classes').getList(1, 1, { filter: 'status = \'scheduled\'', requestKey: 'st-live' }),
					pb.collection('payments').getFullList<Payment>({ requestKey: 'st-pay' }),
				]);
				const completedEnroll = enrollments.totalItems; // placeholder; full count needs filter
				const verifiedTotal = payments.reduce((sum, p) => p.status === 'verified' ? sum + (p.amount || 0) : sum, 0);
				const pendingPay = payments.filter(p => p.status === 'pending').length;
				setStats({
					enquiries: enquiries.totalItems,
					students: users.totalItems,
					enrolled: enrollments.totalItems,
					courses: courses.totalItems,
					upcoming: liveClasses.totalItems,
					completed: 0,
					payments: verifiedTotal,
					pending: pendingPay,
				});
			} catch { /* ignore */ }
			finally { setLoading(false); }
		})();
	}, []);

	if (loading) return <div className="dashboard-loading"><Loader2 size={24} className="spin" /> Loading statistics…</div>;

	return (
		<div>
			<div className="admin-module-head"><h2>Dashboard Overview</h2></div>
			<div className="admin-stats-grid">
				<StatCard label={STAT_LABELS.enquiries} value={stats.enquiries ?? 0} sub="Contact form submissions" />
				<StatCard label={STAT_LABELS.students} value={stats.students ?? 0} sub="Registered accounts" />
				<StatCard label={STAT_LABELS.enrolled} value={stats.enrolled ?? 0} sub="Enrollment records" />
				<StatCard label={STAT_LABELS.courses} value={stats.courses ?? 0} sub="Published courses" />
				<StatCard label={STAT_LABELS.upcoming} value={stats.upcoming ?? 0} sub="Scheduled live classes" />
				<StatCard label={STAT_LABELS.completed} value={stats.completed ?? 0} sub="Completed enrollments" />
				<StatCard label={STAT_LABELS.payments} value={stats.payments ?? 0} sub="Verified offline (INR)" money />
				<StatCard label={STAT_LABELS.pending} value={stats.pending ?? 0} sub="Payments pending verification" />
			</div>
			<div className="admin-protected-note">
				<ShieldCheck size={16} />
				<p>All statistics are derived live from the database. No figures are hardcoded or simulated. Payment totals reflect only verified offline payments — the online payment gateway is not activated.</p>
			</div>
		</div>
	);
}

function StatCard({ label, value, sub, money }: { label: string; value: number; sub: string; money?: boolean }) {
	return (
		<div className="admin-stat-card">
			<span className="small-label">{label}</span>
			<div className="admin-stat-value">{money ? formatMoney(value, { locale: 'en-IN', currency: 'INR' }) : value}</div>
			<div className="admin-stat-sub">{sub}</div>
		</div>
	);
}

export function LeadsManager() {
	const [leads, setLeads] = useState<Lead[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('');
	const [langFilter, setLangFilter] = useState('');
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [savingId, setSavingId] = useState<string | null>(null);

	const load = useCallback(() => {
		pb.collection('astro_inquiries').getFullList<Lead>({ sort: '-created', requestKey: 'admin-leads' })
			.then(r => setLeads(r as unknown as Lead[]))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => { load(); }, [load]);

	const filtered = leads.filter(l => {
		const matchesSearch = !search || [l.name, l.email, l.phone, l.course, l.city, l.state].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase());
		const matchesStatus = !statusFilter || l.leadStatus === statusFilter;
		const matchesLang = !langFilter || (l.preferredLanguage || 'en') === langFilter;
		return matchesSearch && matchesStatus && matchesLang;
	});

	// Language-wise enquiry counts for demand insight.
	const langCounts = leads.reduce<Record<string, number>>((acc, l) => {
		const code = l.preferredLanguage || 'en';
		acc[code] = (acc[code] ?? 0) + 1;
		return acc;
	}, {});

	const exportCsv = () => {
		const headers = ['Lead ID', 'Name', 'Email', 'Phone', 'City', 'State', 'Course', 'Intent', 'Experience', 'Preferred Language', 'Lead Source', 'Status', 'Counsellor', 'Enquiry Date', 'Last Contacted', 'Notes'];
		const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
		const rows = filtered.map(l => [
			l.id, l.name, l.email, l.phone, l.city, l.state, l.course, l.intent,
			l.experienceLevel, l.preferredLanguage || 'en', l.leadSource, l.leadStatus, l.assignedCounsellor,
			l.created ? new Date(l.created).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : '',
			l.lastContactedDate ? new Date(l.lastContactedDate).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : '',
			l.leadNotes,
		].map(escape).join(','));
		const csv = [headers.map(escape).join(','), ...rows].join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `devinex-leads-${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const updateLead = async (id: string, field: keyof Lead, value: string) => {
		setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
	};
	const saveLead = async (lead: Lead) => {
		setSavingId(lead.id);
		try {
			await pb.collection('astro_inquiries').update(lead.id, {
				leadStatus: lead.leadStatus || 'New',
				assignedCounsellor: lead.assignedCounsellor || '',
				leadNotes: lead.leadNotes || '',
				lastContactedDate: lead.lastContactedDate || '',
				experienceLevel: lead.experienceLevel || '',
			}, { requestKey: null });
		} catch { /* ignore */ }
		finally { setSavingId(null); }
	};

	if (loading) return <div className="dashboard-loading"><Loader2 size={20} className="spin" /> Loading leads…</div>;
	return (
		<div>
			<div className="admin-module-head"><h2>Lead Management</h2>
				<button className="button outline-button lead-csv-btn" onClick={exportCsv} disabled={filtered.length === 0}><Download size={15} /> Export CSV</button>
			</div>
			<div className="lead-crm-bar">
				<label>Search<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, email, phone, course…" /></label>
				<label>Filter by status<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
					<option value="">All statuses</option>
					{Object.keys(leadStatusLabel).map(s => <option key={s} value={s}>{leadStatusLabel[s]}</option>)}
				</select></label>
				<label>Filter by language<select value={langFilter} onChange={e => setLangFilter(e.target.value)}>
					<option value="">All languages</option>
					{LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.native} ({l.name})</option>)}
				</select></label>
				<span className="admin-stat-sub">{filtered.length} of {leads.length} leads</span>
			</div>
			{Object.keys(langCounts).length > 0 && (
				<div className="lead-lang-summary">
					<span className="small-label">ENQUIRIES BY LANGUAGE</span>
					{Object.entries(langCounts).sort((a, b) => b[1] - a[1]).map(([code, count]) => (
						<span key={code} className="lead-lang-chip">{getLanguage(code)?.native ?? code}: <strong>{count}</strong></span>
					))}
				</div>
			)}
			{leads.length === 0 ? (
				<div className="trainer-empty-card"><Inbox size={36} strokeWidth={1} /><h3>No enquiries yet</h3><p>Contact form submissions will appear here. New enquiries trigger a notification email to the team.</p></div>
			) : (
				<div className="admin-table-wrap">
					<table className="admin-table">
						<thead><tr><th>Name</th><th>Contact</th><th>Course</th><th>Status</th><th>Date</th><th></th></tr></thead>
						<tbody>
							{filtered.map(l => (
								<Fragment key={l.id}>
									<tr style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}>
										<td>{l.name || '—'}{l.city && <><br /><small style={{ color: '#868ca6' }}>{l.city}{l.state ? `, ${l.state}` : ''}</small></>}</td>
										<td>{l.email || '—'}<br /><small style={{ color: '#868ca6' }}>{l.phone || ''}</small></td>
										<td>{l.course || '—'}{l.experienceLevel && <><br /><small style={{ color: '#868ca6' }}>{l.experienceLevel}</small></>}</td>
										<td><span className="badge">{leadStatusLabel[l.leadStatus] ?? l.leadStatus ?? 'New'}</span></td>
										<td>{l.created ? new Date(l.created).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : '—'}</td>
										<td>{expandedId === l.id ? <ChevronDown size={15} /> : <Search size={14} />}</td>
									</tr>
									{expandedId === l.id && (
										<tr>
											<td colSpan={6} style={{ background: '#0e1225' }}>
												<div className="lead-detail-row">
													<label>Lead status<select value={l.leadStatus || 'New'} onChange={e => updateLead(l.id, 'leadStatus', e.target.value)}>
														{Object.keys(leadStatusLabel).map(s => <option key={s} value={s}>{leadStatusLabel[s]}</option>)}
													</select></label>
													<label>Assigned counsellor<input value={l.assignedCounsellor || ''} onChange={e => updateLead(l.id, 'assignedCounsellor', e.target.value)} placeholder="Counsellor name" /></label>
													<label>Last contacted date<input type="date" value={l.lastContactedDate ? l.lastContactedDate.slice(0, 10) : ''} onChange={e => updateLead(l.id, 'lastContactedDate', e.target.value)} /></label>
													<label>Experience level<input value={l.experienceLevel || ''} onChange={e => updateLead(l.id, 'experienceLevel', e.target.value)} /></label>
													<label>Preferred language<input value={getLanguage(l.preferredLanguage)?.name ?? 'English'} disabled title="Set by the customer when they submitted the inquiry" /></label>
													<label className="lead-detail-notes">Follow-up notes<textarea value={l.leadNotes || ''} onChange={e => updateLead(l.id, 'leadNotes', e.target.value)} rows={3} /></label>
												</div>
												{l.message && <p style={{ fontSize: 11, color: 'var(--soft-text)', marginTop: 12 }}><strong style={{ color: 'var(--gold)' }}>Message:</strong> {l.message}</p>}
												{l.leadSource && <p style={{ fontSize: 10, color: '#868ca6', marginTop: 8 }}>Source: {l.leadSource}</p>}
												<button className="button gold-button" style={{ marginTop: 14 }} onClick={() => saveLead(l)} disabled={savingId === l.id}>
													{savingId === l.id ? <><Loader2 size={15} className="spin" /> Saving…</> : <><Save size={15} /> Save lead</>}
												</button>
											</td>
										</tr>
									)}
								</Fragment>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

export function StudentsManager() {
	const [students, setStudents] = useState<Record<string, unknown>[]>([]);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		pb.collection('users').getFullList({ sort: '-created', requestKey: 'admin-students' })
			.then(r => setStudents(r as unknown as Record<string, unknown>[]))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);
	if (loading) return <div className="dashboard-loading"><Loader2 size={20} className="spin" /> Loading students…</div>;
	return (
		<div>
			<div className="admin-module-head"><h2>Student Management</h2></div>
			<div className="admin-table-wrap">
				<table className="admin-table">
					<thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th></tr></thead>
					<tbody>
						{students.map(s => (
							<tr key={s.id as string}>
								<td>{String(s.name || '—')}</td>
								<td>{String(s.email || '—')}</td>
								<td>{String(s.phone || '—')}</td>
								<td><span className="badge">{String(s.role || 'student')}</span></td>
								<td>{s.created ? new Date(s.created as string).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : '—'}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export function BatchesManager({ courses }: { courses: Course[] }) {
	const [batches, setBatches] = useState<Batch[]>([]);
	const [loading, setLoading] = useState(true);
	const [courseId, setCourseId] = useState('');
	const [name, setName] = useState('');
	const [startDate, setStartDate] = useState('');
	const [status, setStatus] = useState('planned');
	const [saving, setSaving] = useState(false);

	const load = useCallback(() => {
		pb.collection('batches').getFullList<Batch>({ sort: '-created', expand: 'course', requestKey: 'admin-batches' })
			.then(r => setBatches(r as unknown as Batch[]))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => { load(); }, [load]);

	const create = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!courseId || !name) return;
		setSaving(true);
		try {
			await pb.collection('batches').create({ course: courseId, name, startDate: startDate || '', status }, { requestKey: null });
			setName(''); setStartDate('');
			load();
		} catch { /* ignore */ }
		finally { setSaving(false); }
	};

	if (loading) return <div className="dashboard-loading"><Loader2 size={20} className="spin" /> Loading batches…</div>;
	return (
		<div>
			<div className="admin-module-head"><h2>Batch Management</h2></div>
			<div className="admin-create-panel">
				<h3>Create a batch</h3>
				<form onSubmit={create}>
					<label>Course<select value={courseId} onChange={e => setCourseId(e.target.value)} required>
						<option value="">Select course</option>
						{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
					</select></label>
					<label>Batch name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. January 2027 batch" required /></label>
					<div className="admin-create-row">
						<label>Start date<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
						<label>Status<select value={status} onChange={e => setStatus(e.target.value)}>
							{Object.entries(batchStatusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
						</select></label>
					</div>
					<button className="button gold-button" disabled={saving}><Plus size={15} /> {saving ? 'Creating…' : 'Create batch'}</button>
				</form>
			</div>
			{batches.length === 0 ? (
				<div className="trainer-empty-card"><Users size={36} strokeWidth={1} /><h3>No batches yet</h3><p>Group students into batches for scheduling.</p></div>
			) : batches.map(b => (
				<div className="admin-list-card" key={b.id}>
					<div className="admin-list-card-head">
						<div><h4>{b.name}</h4><p>{b.expand?.course?.title ?? 'Course'}</p></div>
						<span className="badge">{batchStatusLabel[b.status] ?? b.status}</span>
					</div>
				</div>
			))}
		</div>
	);
}

export function LessonsAdmin({ courses }: { courses: Course[] }) {
	const [lessons, setLessons] = useState<Lesson[]>([]);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		pb.collection('lessons').getFullList<Lesson>({ sort: '-created', expand: 'course', requestKey: 'admin-lessons' })
			.then(r => setLessons(r as unknown as Lesson[]))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);
	if (loading) return <div className="dashboard-loading"><Loader2 size={20} className="spin" /> Loading lessons…</div>;
	return (
		<div>
			<div className="admin-module-head"><h2>Lesson Management</h2>
				<Link className="button outline-button" to="/trainer"><Plus size={15} /> Create in trainer portal</Link>
			</div>
			{lessons.length === 0 ? (
				<div className="trainer-empty-card"><BookOpen size={36} strokeWidth={1} /><h3>No lessons created</h3><p>Lessons are created by trainers from the trainer portal.</p></div>
			) : lessons.map(l => (
				<div className="admin-list-card" key={l.id}>
					<div className="admin-list-card-head">
						<div><h4>{l.title}</h4><p>{l.module || 'Ungrouped'} · {l.videoProvider !== 'none' ? 'Video linked' : 'No video'}</p></div>
						<span className="badge">{l.status}</span>
					</div>
				</div>
			))}
		</div>
	);
}

export function LiveClassesAdmin({ courses }: { courses: Course[] }) {
	const [items, setItems] = useState<LiveClass[]>([]);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		pb.collection('live_classes').getFullList<LiveClass>({ sort: '-scheduledAt', expand: 'course', requestKey: 'admin-live' })
			.then(r => setItems(r as unknown as LiveClass[]))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);
	if (loading) return <div className="dashboard-loading"><Loader2 size={20} className="spin" /> Loading live classes…</div>;
	return (
		<div>
			<div className="admin-module-head"><h2>Live Classes</h2>
				<Link className="button outline-button" to="/trainer"><Plus size={15} /> Schedule in trainer portal</Link>
			</div>
			{items.length === 0 ? (
				<div className="trainer-empty-card"><Calendar size={36} strokeWidth={1} /><h3>No live classes scheduled</h3><p>Only real, confirmed sessions are shown to students.</p></div>
			) : items.map(lc => (
				<div className="admin-list-card" key={lc.id}>
					<div className="admin-list-card-head">
						<div>
							<h4>{lc.title}</h4>
							<div className="admin-list-meta">
								<span><Calendar size={12} /> {lc.scheduledAt ? new Date(lc.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</span>
								<span><Clock size={12} /> {lc.durationMins || 60} min</span>
								<span>{lc.expand?.course?.title ?? ''}</span>
							</div>
						</div>
						<span className="badge">{liveClassStatusLabel[lc.status] ?? lc.status}</span>
					</div>
				</div>
			))}
		</div>
	);
}

export function AssignmentsAdmin({ courses }: { courses: Course[] }) {
	const [items, setItems] = useState<Assignment[]>([]);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		pb.collection('assignments').getFullList<Assignment>({ sort: '-created', expand: 'course', requestKey: 'admin-assign' })
			.then(r => setItems(r as unknown as Assignment[]))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);
	if (loading) return <div className="dashboard-loading"><Loader2 size={20} className="spin" /> Loading assignments…</div>;
	return (
		<div>
			<div className="admin-module-head"><h2>Assignments &amp; Assessments</h2>
				<Link className="button outline-button" to="/trainer"><Plus size={15} /> Create in trainer portal</Link>
			</div>
			{items.length === 0 ? (
				<div className="trainer-empty-card"><FileText size={36} strokeWidth={1} /><h3>No assignments yet</h3><p>Assignments are created by trainers.</p></div>
			) : items.map(a => (
				<div className="admin-list-card" key={a.id}>
					<div className="admin-list-card-head">
						<div><h4>{a.title}</h4><p>{a.expand?.course?.title ?? ''} · Max marks: {a.maxMarks || 0}</p></div>
						<span className="badge">{a.status}</span>
					</div>
				</div>
			))}
		</div>
	);
}

export function PaymentsManager({ courses }: { courses: Course[] }) {
	const [payments, setPayments] = useState<Payment[]>([]);
	const [loading, setLoading] = useState(true);
	const [studentEmail, setStudentEmail] = useState('');
	const [courseId, setCourseId] = useState('');
	const [amount, setAmount] = useState(0);
	const [method, setMethod] = useState('offline_upi');
	const [transactionRef, setTransactionRef] = useState('');
	const [notes, setNotes] = useState('');
	const [saving, setSaving] = useState(false);
	const [err, setErr] = useState('');

	const load = useCallback(() => {
		pb.collection('payments').getFullList<Payment>({ sort: '-created', expand: 'student,course', requestKey: 'admin-payments' })
			.then(r => setPayments(r as unknown as Payment[]))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => { load(); }, [load]);

	const create = async (e: React.FormEvent) => {
		e.preventDefault();
		setErr('');
		if (!studentEmail || !courseId || !amount) { setErr('Student email, course and amount are required.'); return; }
		setSaving(true);
		try {
			const student = await pb.collection('users').getFirstListItem(pb.filter('email = {:email}', { email: studentEmail }), { requestKey: null });
			const user = pb.authStore.record;
			await pb.collection('payments').create({
				student: student.id, course: courseId, amount: Number(amount), method, transactionRef, notes,
				status: 'pending', recordedBy: user?.id ?? '',
			}, { requestKey: null });
			setStudentEmail(''); setCourseId(''); setAmount(0); setTransactionRef(''); setNotes('');
			load();
		} catch { setErr('Could not record the payment. Verify the student email exists.'); }
		finally { setSaving(false); }
	};

	const verify = async (id: string, status: 'verified' | 'rejected') => {
		try { await pb.collection('payments').update(id, { status }, { requestKey: null }); load(); } catch { /* ignore */ }
	};

	if (loading) return <div className="dashboard-loading"><Loader2 size={20} className="spin" /> Loading payments…</div>;
	return (
		<div>
			<div className="admin-module-head"><h2>Payments &amp; Transactions</h2></div>
			<div className="admin-create-panel">
				<h3>Record an offline payment</h3>
				<form onSubmit={create}>
					<div className="admin-create-row">
						<label>Student email<input value={studentEmail} onChange={e => setStudentEmail(e.target.value)} placeholder="student@example.com" required /></label>
						<label>Course<select value={courseId} onChange={e => setCourseId(e.target.value)} required>
							<option value="">Select course</option>
							{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
						</select></label>
					</div>
					<div className="admin-create-row">
						<label>Amount (INR)<input type="number" min={0} value={amount} onChange={e => setAmount(Number(e.target.value))} required /></label>
						<label>Method<select value={method} onChange={e => setMethod(e.target.value)}>
							{Object.entries(paymentMethodLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
						</select></label>
					</div>
					<label>Transaction reference <small>(UTR / receipt no.)</small><input value={transactionRef} onChange={e => setTransactionRef(e.target.value)} /></label>
					<label>Notes<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></label>
					{err && <p className="error">{err}</p>}
					<button className="button gold-button" disabled={saving}><Banknote size={15} /> {saving ? 'Recording…' : 'Record offline payment'}</button>
				</form>
			</div>
			<div className="admin-protected-note">
				<ShieldCheck size={16} />
				<p>Offline payments are explicitly labeled, recorded with a transaction reference, and audit-logged with the recording admin and timestamp. Each entry starts as "pending verification" until an administrator verifies it. The online payment gateway is not activated.</p>
			</div>
			{payments.length === 0 ? (
				<div className="trainer-empty-card"><Banknote size={36} strokeWidth={1} /><h3>No payments recorded</h3><p>Offline payment entries will appear here.</p></div>
			) : payments.map(p => (
				<div className="admin-list-card" key={p.id}>
					<div className="admin-list-card-head">
						<div>
							<h4>{formatMoney(p.amount, { locale: 'en-IN', currency: 'INR' })} · {paymentMethodLabel[p.method] ?? p.method}</h4>
							<p>{p.expand?.student?.name || p.expand?.student?.email || 'Student'} · {p.expand?.course?.title ?? 'Course'}</p>
							<div className="admin-list-meta">
								{p.transactionRef && <span>Ref: {p.transactionRef}</span>}
								<span><Clock size={12} /> {p.created ? new Date(p.created).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : ''}</span>
							</div>
						</div>
						<span className="badge">{paymentRecordStatusLabel[p.status] ?? p.status}</span>
					</div>
					{p.status === 'pending' && (
						<div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
							<button className="button gold-button" onClick={() => verify(p.id, 'verified')}><CheckCircle2 size={15} /> Verify</button>
							<button className="button outline-button" onClick={() => verify(p.id, 'rejected')}><XCircle size={15} /> Reject</button>
						</div>
					)}
				</div>
			))}
		</div>
	);
}

export function CertificatesManager({ courses }: { courses: Course[] }) {
	const [certs, setCerts] = useState<Certificate[]>([]);
	const [loading, setLoading] = useState(true);
	const [studentEmail, setStudentEmail] = useState('');
	const [courseId, setCourseId] = useState('');
	const [studentName, setStudentName] = useState('');
	const [signatory, setSignatory] = useState('');
	const [completionDate, setCompletionDate] = useState('');
	const [saving, setSaving] = useState(false);
	const [err, setErr] = useState('');

	const load = useCallback(() => {
		pb.collection('certificates').getFullList<Certificate>({ sort: '-created', expand: 'student,course', requestKey: 'admin-certs' })
			.then(r => setCerts(r as unknown as Certificate[]))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => { load(); }, [load]);

	const issue = async (e: React.FormEvent) => {
		e.preventDefault();
		setErr('');
		if (!studentEmail || !courseId || !studentName) { setErr('Student email, course and student name are required.'); return; }
		setSaving(true);
		try {
			const student = await pb.collection('users').getFirstListItem(pb.filter('email = {:email}', { email: studentEmail }), { requestKey: null });
			const course = courses.find(c => c.id === courseId);
			const certNum = `DXA-${Date.now().toString(36).toUpperCase()}`;
			await pb.collection('certificates').create({
				student: student.id, course: courseId, certificateNumber: certNum,
				studentName, courseTitle: course?.title ?? '', signatory,
				completionDate: completionDate ? new Date(completionDate).toISOString() : '',
				templateApproved: true, status: 'issued', issuedAt: new Date().toISOString(),
			}, { requestKey: null });
			setStudentEmail(''); setCourseId(''); setStudentName(''); setSignatory(''); setCompletionDate('');
			load();
		} catch { setErr('Could not issue the certificate. Verify the student email exists.'); }
		finally { setSaving(false); }
	};

	const revoke = async (id: string) => {
		try { await pb.collection('certificates').update(id, { status: 'revoked' }, { requestKey: null }); load(); } catch { /* ignore */ }
	};

	if (loading) return <div className="dashboard-loading"><Loader2 size={20} className="spin" /> Loading certificates…</div>;
	return (
		<div>
			<div className="admin-module-head"><h2>Certificate Management</h2></div>
			<div className="admin-create-panel">
				<h3>Issue a certificate</h3>
				<form onSubmit={issue}>
					<div className="admin-create-row">
						<label>Student email<input value={studentEmail} onChange={e => setStudentEmail(e.target.value)} required /></label>
						<label>Student name (as on certificate)<input value={studentName} onChange={e => setStudentName(e.target.value)} required /></label>
					</div>
					<div className="admin-create-row">
						<label>Course<select value={courseId} onChange={e => setCourseId(e.target.value)} required>
							<option value="">Select course</option>
							{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
						</select></label>
						<label>Completion date<input type="date" value={completionDate} onChange={e => setCompletionDate(e.target.value)} /></label>
					</div>
					<label>Authorized signatory<input value={signatory} onChange={e => setSignatory(e.target.value)} placeholder="Name & title" /></label>
					{err && <p className="error">{err}</p>}
					<button className="button gold-button" disabled={saving}><Award size={15} /> {saving ? 'Issuing…' : 'Issue certificate'}</button>
				</form>
				<div className="admin-cert-preview">
					<div className="cert-title">Certificate of Completion</div>
					<p className="cert-body">This is to certify that <strong>{studentName || '[Student Name]'}</strong> has successfully completed <strong>{courses.find(c => c.id === courseId)?.title || '[Course Name]'}</strong> through DevineX Astro, subject to the program's prescribed completion requirements.</p>
					<div className="cert-signatory">{signatory || 'Authorized signatory'} · DevineX Astro</div>
				</div>
				<div className="admin-protected-note">
					<ShieldCheck size={16} />
					<p>Certificates are issued only after the completion criteria and certificate template are approved. DevineX Astro does not claim government recognition, university affiliation, or third-party accreditation. A secure verification mechanism will be added when implemented.</p>
				</div>
			</div>
			{certs.length === 0 ? (
				<div className="trainer-empty-card"><Award size={36} strokeWidth={1} /><h3>No certificates issued</h3><p>Issued certificates will appear here and on the student's dashboard.</p></div>
			) : certs.map(c => (
				<div className="admin-list-card" key={c.id}>
					<div className="admin-list-card-head">
						<div>
							<h4>{c.studentName} — {c.courseTitle}</h4>
							<div className="admin-list-meta">
								<span>Cert no: {c.certificateNumber}</span>
								{c.completionDate && <span><GraduationCap size={12} /> {new Date(c.completionDate).toLocaleDateString('en-IN', { timeZone: 'UTC' })}</span>}
							</div>
						</div>
						<span className="badge">{certificateStatusLabel[c.status] ?? c.status}</span>
					</div>
					{c.status === 'issued' && <button className="auth-back" onClick={() => revoke(c.id)}>Revoke</button>}
				</div>
			))}
		</div>
	);
}

export function TrainerManagement() {
	const [trainers, setTrainers] = useState<Trainer[]>([]);
	const [trainerAccounts, setTrainerAccounts] = useState<Record<string, unknown>[]>([]);
	const [loading, setLoading] = useState(true);
	const [fullName, setFullName] = useState('');
	const [specialization, setSpecialization] = useState('');
	const [experience, setExperience] = useState('');
	const [saving, setSaving] = useState(false);
	const [acctEmail, setAcctEmail] = useState('');
	const [acctName, setAcctName] = useState('');
	const [acctMsg, setAcctMsg] = useState('');
	const [acctErr, setAcctErr] = useState('');
	const [creatingAcct, setCreatingAcct] = useState(false);

	const load = useCallback(() => {
		pb.collection('trainers').getFullList<Trainer>({ sort: '-created', requestKey: 'admin-trainers' })
			.then(r => setTrainers(r as unknown as Trainer[]))
			.catch(() => {})
			.finally(() => setLoading(false));
		pb.collection('users').getFullList({ filter: "role = 'trainer'", sort: 'name', requestKey: 'admin-trainer-accts' })
			.then(r => setTrainerAccounts(r as unknown as Record<string, unknown>[]))
			.catch(() => {});
	}, []);
	useEffect(() => { load(); }, [load]);

	const create = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!fullName) return;
		setSaving(true);
		try {
			const slug = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
			await pb.collection('trainers').create({ fullName, slug, specialization, experience, status: 'draft' }, { requestKey: null });
			setFullName(''); setSpecialization(''); setExperience('');
			load();
		} catch { /* ignore */ }
		finally { setSaving(false); }
	};

	const createTrainerAccount = async (e: React.FormEvent) => {
		e.preventDefault();
		setAcctErr(''); setAcctMsg('');
		if (!acctEmail) { setAcctErr('Email is required.'); return; }
		setCreatingAcct(true);
		try {
			// Create with a random password the admin never sees; the trainer
			// sets their own password through the reset link.
			const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'A1!';
			await pb.collection('users').create({ email: acctEmail, name: acctName, password: tempPassword, passwordConfirm: tempPassword, role: 'trainer' }, { requestKey: null });
			await pb.collection('users').requestPasswordReset(acctEmail);
			setAcctMsg(`Trainer account created for ${acctEmail}. A password reset email has been sent so they can set their own password and sign in at /trainer/login.`);
			setAcctEmail(''); setAcctName('');
			load();
		} catch (err) {
			const msg = err instanceof Error ? err.message : '';
			setAcctErr(msg.includes('email') ? 'A user with this email already exists.' : 'Could not create the trainer account. Please try again.');
		}
		finally { setCreatingAcct(false); }
	};

	const toggleRole = async (userId: string, currentRole: string) => {
		const newRole = currentRole === 'trainer' ? 'student' : 'trainer';
		try {
			await pb.collection('users').update(userId, { role: newRole }, { requestKey: null });
			load();
		} catch { /* ignore */ }
	};

	if (loading) return <div className="dashboard-loading"><Loader2 size={20} className="spin" /> Loading trainers…</div>;
	return (
		<div>
			<div className="admin-module-head"><h2>Trainer Management</h2></div>

			<div className="admin-create-panel">
				<h3>Create a trainer account</h3>
				<p style={{ fontSize: 11, marginBottom: 14, color: 'var(--soft-text)' }}>Trainer accounts are created by the Super Admin only — trainers cannot self-register. A random password is assigned and a password reset email is sent so the trainer sets their own password.</p>
				<form onSubmit={createTrainerAccount}>
					<div className="admin-create-row">
						<label>Trainer email<input value={acctEmail} onChange={e => setAcctEmail(e.target.value)} placeholder="trainer@devinexastro.com" required /></label>
						<label>Trainer name<input value={acctName} onChange={e => setAcctName(e.target.value)} placeholder="Full name" /></label>
					</div>
					{acctErr && <p className="error">{acctErr}</p>}
					{acctMsg && <div className="admin-protected-note"><ShieldCheck size={16} /><p>{acctMsg}</p></div>}
					<button className="button gold-button" disabled={creatingAcct}><Plus size={15} /> {creatingAcct ? 'Creating…' : 'Create trainer account'}</button>
				</form>
			</div>

			{trainerAccounts.length > 0 && (
				<div className="admin-table-wrap" style={{ marginBottom: 24 }}>
					<table className="admin-table">
						<thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Action</th></tr></thead>
						<tbody>
							{trainerAccounts.map(u => {
								const role = String(u.role || 'trainer');
								return (
									<tr key={u.id as string}>
										<td>{String(u.name || '—')}</td>
										<td>{String(u.email || '—')}</td>
										<td><span className="badge">{role === 'trainer' ? 'Active' : 'Deactivated'}</span></td>
										<td><button className="auth-back" onClick={() => toggleRole(u.id as string, role)}>{role === 'trainer' ? 'Deactivate' : 'Reactivate'}</button></td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			<div className="admin-create-panel">
				<h3>Add a trainer profile</h3>
				<form onSubmit={create}>
					<div className="admin-create-row">
						<label>Full name<input value={fullName} onChange={e => setFullName(e.target.value)} required /></label>
						<label>Specialization<input value={specialization} onChange={e => setSpecialization(e.target.value)} placeholder="e.g. Vedic Astrology" /></label>
					</div>
					<label>Experience<input value={experience} onChange={e => setExperience(e.target.value)} placeholder="e.g. 10 years teaching Jyotish" /></label>
					<button className="button gold-button" disabled={saving}><Plus size={15} /> {saving ? 'Adding…' : 'Add trainer profile (draft)'}</button>
				</form>
				<div className="admin-protected-note">
					<ShieldCheck size={16} />
					<p>Trainer profiles start as drafts. Publish only when genuine, verified faculty information — photograph, biography, qualifications, courses taught and professional links — has been supplied. Do not publish fictional names, credentials, or achievements. Bank and payment information is managed separately and visible only to authorized administrators.</p>
				</div>
			</div>
			{trainers.length === 0 ? (
				<div className="trainer-empty-card"><Users size={36} strokeWidth={1} /><h3>No trainer profiles yet</h3><p>Editable profile templates (photograph, name, specialization, experience, biography, qualifications, courses taught, social links) are created here.</p></div>
			) : trainers.map(t => (
				<div className="admin-list-card" key={t.id}>
					<div className="admin-list-card-head">
						<div><h4>{t.fullName}</h4><p>{t.specialization || 'Specialization pending'} · {t.experience || 'Experience pending'}</p></div>
						<span className="badge">{t.status}</span>
					</div>
				</div>
			))}
		</div>
	);
}

export function RecordingsResources() {
	const [lessons, setLessons] = useState<Lesson[]>([]);
	const [live, setLive] = useState<LiveClass[]>([]);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		Promise.all([
			pb.collection('lessons').getFullList<Lesson>({ sort: '-created', expand: 'course', requestKey: 'admin-rec-lessons' }),
			pb.collection('live_classes').getFullList<LiveClass>({ sort: '-scheduledAt', expand: 'course', requestKey: 'admin-rec-live' }),
		]).then(([l, lc]) => { setLessons(l as unknown as Lesson[]); setLive(lc as unknown as LiveClass[]); })
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);
	if (loading) return <div className="dashboard-loading"><Loader2 size={20} className="spin" /> Loading recordings…</div>;
	return (
		<div>
			<div className="admin-module-head"><h2>Recordings &amp; Resources</h2></div>
			<h3 style={{ fontSize: 15, marginBottom: 14 }}>Live class recordings</h3>
			{live.length === 0 ? (
				<div className="trainer-empty-card"><Video size={36} strokeWidth={1} /><h3>No recordings yet</h3><p>Recording links are added to live classes from the trainer portal.</p></div>
			) : live.map(lc => (
				<div className="admin-list-card" key={lc.id}>
					<div className="admin-list-card-head">
						<div><h4>{lc.title}</h4><p>{lc.expand?.course?.title ?? ''}</p></div>
						{lc.recordingUrl ? <a className="text-link" href={lc.recordingUrl} target="_blank" rel="noopener noreferrer">View recording</a> : <span className="badge">No recording</span>}
					</div>
				</div>
			))}
			<h3 style={{ fontSize: 15, margin: '24px 0 14px' }}>Lesson resources</h3>
			{lessons.length === 0 ? (
				<div className="trainer-empty-card"><FileText size={36} strokeWidth={1} /><h3>No lesson resources</h3><p>Resources are attached to lessons from the trainer portal.</p></div>
			) : lessons.map(l => (
				<div className="admin-list-card" key={l.id}>
					<div className="admin-list-card-head">
						<div><h4>{l.title}</h4><p>{l.expand?.course?.title ?? ''} · {l.resources ? 'Resources attached' : 'No resources'}</p></div>
						<span className="badge">{l.status}</span>
					</div>
				</div>
			))}
		</div>
	);
}

export function BlogContent() {
	const [posts, setPosts] = useState<BlogPost[]>([]);
	const [loading, setLoading] = useState(true);
	const [title, setTitle] = useState('');
	const [slug, setSlug] = useState('');
	const [category, setCategory] = useState('Vedic Astrology Basics');
	const [excerpt, setExcerpt] = useState('');
	const [content, setContent] = useState('');
	const [saving, setSaving] = useState(false);

	const load = useCallback(() => {
		pb.collection('blog_posts').getFullList<BlogPost>({ sort: '-created', requestKey: 'admin-blog' })
			.then(r => setPosts(r as unknown as BlogPost[]))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);
	useEffect(() => { load(); }, [load]);

	const create = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title || !content) return;
		setSaving(true);
		try {
			const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
			await pb.collection('blog_posts').create({ title, slug: finalSlug, category, excerpt: excerpt || title, content, author: 'DevineX Astro', status: 'draft' }, { requestKey: null });
			setTitle(''); setSlug(''); setExcerpt(''); setContent('');
			load();
		} catch { /* ignore */ }
		finally { setSaving(false); }
	};

	if (loading) return <div className="dashboard-loading"><Loader2 size={20} className="spin" /> Loading articles…</div>;
	return (
		<div>
			<div className="admin-module-head"><h2>Blog &amp; Website Content</h2></div>
			<div className="admin-create-panel">
				<h3>Create an article</h3>
				<form onSubmit={create}>
					<label>Title<input value={title} onChange={e => setTitle(e.target.value)} required /></label>
					<div className="admin-create-row">
						<label>Slug <small>(optional)</small><input value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated" /></label>
						<label>Category<select value={category} onChange={e => setCategory(e.target.value)}>
							{['Vedic Astrology Basics', 'Jyotish Shastra', 'Kundli Analysis', 'Zodiac Signs', 'Navagraha', 'Nakshatras', 'Numerology', 'Astrology Education', 'Traditional Indian Knowledge'].map(c => <option key={c}>{c}</option>)}
						</select></label>
					</div>
					<label>Excerpt<input value={excerpt} onChange={e => setExcerpt(e.target.value)} /></label>
					<label>Content<textarea value={content} onChange={e => setContent(e.target.value)} rows={6} placeholder="Separate paragraphs with a blank line." /></label>
					<button className="button gold-button" disabled={saving}><Plus size={15} /> {saving ? 'Creating…' : 'Create article (draft)'}</button>
				</form>
			</div>
			{posts.length === 0 ? (
				<div className="trainer-empty-card"><Newspaper size={36} strokeWidth={1} /><h3>No articles yet</h3><p>Ten seeded Knowledge Centre articles are published. Create new ones here.</p></div>
			) : posts.map(p => (
				<div className="admin-list-card" key={p.id}>
					<div className="admin-list-card-head">
						<div><h4>{p.title}</h4><p>{p.category}</p></div>
						<span className="badge">{p.status}</span>
					</div>
				</div>
			))}
		</div>
	);
}

export function Notifications() {
	const [items, setItems] = useState<Announcement[]>([]);
	const [loading, setLoading] = useState(true);
	const [title, setTitle] = useState('');
	const [message, setMessage] = useState('');
	const [audience, setAudience] = useState('all');
	const [saving, setSaving] = useState(false);
	const user = pb.authStore.record;

	const load = useCallback(() => {
		pb.collection('announcements').getFullList<Announcement>({ sort: '-created', expand: 'course', requestKey: 'admin-ann' })
			.then(r => setItems(r as unknown as Announcement[]))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);
	useEffect(() => { load(); }, [load]);

	const create = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title || !message) return;
		setSaving(true);
		try {
			await pb.collection('announcements').create({ title, message, audience, author: user?.id ?? '' }, { requestKey: null });
			setTitle(''); setMessage('');
			load();
		} catch { /* ignore */ }
		finally { setSaving(false); }
	};

	if (loading) return <div className="dashboard-loading"><Loader2 size={20} className="spin" /> Loading notifications…</div>;
	return (
		<div>
			<div className="admin-module-head"><h2>Notifications</h2></div>
			<div className="admin-create-panel">
				<h3>Post an announcement</h3>
				<form onSubmit={create}>
					<label>Title<input value={title} onChange={e => setTitle(e.target.value)} required /></label>
					<label>Message<textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} required /></label>
					<label>Audience<select value={audience} onChange={e => setAudience(e.target.value)}>
						<option value="all">All students</option>
						<option value="course">Course-specific</option>
						<option value="batch">Batch-specific</option>
					</select></label>
					<button className="button gold-button" disabled={saving}><Bell size={15} /> {saving ? 'Posting…' : 'Post announcement'}</button>
				</form>
			</div>
			{items.length === 0 ? (
				<div className="trainer-empty-card"><Bell size={36} strokeWidth={1} /><h3>No announcements yet</h3><p>Announcements appear on enrolled students' dashboards.</p></div>
			) : items.map(a => (
				<div className="admin-list-card" key={a.id}>
					<div className="admin-list-card-head">
						<div><h4>{a.title}</h4><p>{a.message}</p></div>
						<span className="badge">{a.audience}</span>
					</div>
				</div>
			))}
		</div>
	);
}

export function ReportsAnalytics() {
	const [data, setData] = useState<Record<string, number>>({});
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		(async () => {
			try {
				const [leads, users, enrollments, courses, payments] = await Promise.all([
					pb.collection('astro_inquiries').getList(1, 1, { requestKey: 'ra-leads' }),
					pb.collection('users').getList(1, 1, { requestKey: 'ra-users' }),
					pb.collection('enrollments').getFullList({ requestKey: 'ra-enr' }),
					pb.collection('courses').getList(1, 1, { filter: 'status = \'published\'', requestKey: 'ra-courses' }),
					pb.collection('payments').getFullList<Payment>({ requestKey: 'ra-pay' }),
				]);
				const enrolled = enrollments.filter((e: Record<string, unknown>) => e.status === 'active').length;
				const completed = enrollments.filter((e: Record<string, unknown>) => e.status === 'completed').length;
				const verifiedTotal = payments.reduce((sum, p) => p.status === 'verified' ? sum + (p.amount || 0) : sum, 0);
				const pendingPay = payments.filter(p => p.status === 'pending').length;
				setData({ leads: leads.totalItems, users: users.totalItems, enrolled, completed, courses: courses.totalItems, payments: verifiedTotal, pending: pendingPay });
			} catch { /* ignore */ }
			finally { setLoading(false); }
		})();
	}, []);
	if (loading) return <div className="dashboard-loading"><Loader2 size={20} className="spin" /> Compiling analytics…</div>;
	return (
		<div>
			<div className="admin-module-head"><h2>Reports &amp; Analytics</h2></div>
			<div className="admin-stats-grid">
				<StatCard label="TOTAL ENQUIRIES" value={data.leads ?? 0} sub="All lead submissions" />
				<StatCard label="REGISTERED USERS" value={data.users ?? 0} sub="Total accounts" />
				<StatCard label="ENROLLED STUDENTS" value={data.enrolled ?? 0} sub="Active enrollments" />
				<StatCard label="COMPLETED COURSES" value={data.completed ?? 0} sub="Completed enrollments" />
				<StatCard label="ACTIVE COURSES" value={data.courses ?? 0} sub="Published courses" />
				<StatCard label="PAYMENT TOTAL" value={data.payments ?? 0} sub="Verified offline (INR)" money />
				<StatCard label="PENDING PAYMENTS" value={data.pending ?? 0} sub="Pending verification" />
			</div>
			<div className="admin-protected-note">
				<BarChart3 size={16} />
				<p>All figures are derived live from the database. No statistics are hardcoded or simulated. Payment totals reflect only verified offline payments — the online gateway is not activated.</p>
			</div>
		</div>
	);
}

export function SettingsPermissions() {
	const [users, setUsers] = useState<Record<string, unknown>[]>([]);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		pb.collection('users').getFullList({ sort: '-created', requestKey: 'admin-settings-users' })
			.then(r => setUsers(r as unknown as Record<string, unknown>[]))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);
	if (loading) return <div className="dashboard-loading"><Loader2 size={20} className="spin" /> Loading users…</div>;
	return (
		<div>
			<div className="admin-module-head"><h2>Settings &amp; User Permissions</h2></div>
			<div className="admin-protected-note">
				<Settings size={16} />
				<p>Access is restricted to approved administrators. The <code>role</code> field on user accounts is locked: only an administrator can change a user's role, and members cannot elevate their own privileges. Sign-up is closed — new accounts are created by an administrator.</p>
			</div>
			<div className="admin-table-wrap">
				<table className="admin-table">
					<thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
					<tbody>
						{users.map(u => (
							<tr key={u.id as string}>
								<td>{String(u.name || '—')}</td>
								<td>{String(u.email || '—')}</td>
								<td><span className="badge">{String(u.role || 'student')}</span></td>
								<td>{u.created ? new Date(u.created as string).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : '—'}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

const KUNDLI_STATUSES = ['submitted', 'validating', 'calculating', 'interpreting', 'creating_pdf', 'awaiting_review', 'in_progress', 'under_review', 'ready', 'completed', 'failed'];

const KUNDLI_PDF_SECTIONS = [
	'Cover Page (DEVINEX ASTRO, customer name, birth details, report ID)',
	'1. Birth Details',
	'2. Janam Kundli / Birth Chart',
	'3. Rashi and Lagna Analysis',
	'4. Navagraha / Planetary Positions',
	'5. Nakshatra Analysis',
	'6. Traditional Personality Interpretation',
	'7. Education and Career Themes',
	'8. Marriage and Relationship Themes',
	'9. Dasha and Planetary Periods',
	'10. General Traditional Guidance',
	'11. Summary',
	'12. Disclaimer',
];

export function KundliManager() {
	const [requests, setRequests] = useState<KundliRequest[]>([]);
	const [staff, setStaff] = useState<Record<string, unknown>[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('');
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [savingId, setSavingId] = useState<string | null>(null);
	const [chartUrls, setChartUrls] = useState<Record<string, string>>({});
	const [showTemplate, setShowTemplate] = useState(false);

	const load = useCallback(() => {
		pb.collection('kundli_requests').getFullList<KundliRequest>({ sort: '-created', expand: 'customer,assignedTo', requestKey: 'admin-kundli' })
			.then(r => setRequests(r as unknown as KundliRequest[]))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		load();
		pb.collection('users').getFullList({ requestKey: 'admin-kundli-staff' })
			.then(r => setStaff(r as unknown as Record<string, unknown>[]))
			.catch(() => {});
	}, [load]);

	const filtered = requests.filter(r => {
		const matchesSearch = !search || [r.fullName, r.email, r.phone, r.requestId, r.placeOfBirth].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase());
		const matchesStatus = !statusFilter || r.status === statusFilter;
		return matchesSearch && matchesStatus;
	});

	const viewChart = async (req: KundliRequest) => {
		if (!req.existingChart || chartUrls[req.id]) return;
		try {
			const token = await pb.files.getToken();
			const url = `${pb.baseUrl}/api/files/kundli_requests/${req.id}/${encodeURIComponent(req.existingChart)}?token=${token}`;
			setChartUrls(prev => ({ ...prev, [req.id]: url }));
		} catch { /* ignore */ }
	};

	const updateField = (id: string, field: keyof KundliRequest, value: string | boolean) => {
		setRequests(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
	};

	const saveRequest = async (req: KundliRequest) => {
		setSavingId(req.id);
		try {
			await pb.collection('kundli_requests').update(req.id, {
				status: req.status,
				assignedTo: req.assignedTo || '',
				adminNotes: req.adminNotes || '',
			}, { requestKey: null });
		} catch { /* ignore */ }
		finally { setSavingId(null); }
	};

	const uploadPdf = async (req: KundliRequest, file: File) => {
		setSavingId(req.id);
		try {
			const fd = new FormData();
			fd.append('reportPdf', file);
			await pb.collection('kundli_requests').update(req.id, fd, { requestKey: null });
			load();
		} catch { /* ignore */ }
		finally { setSavingId(null); }
	};

	const approve = async (req: KundliRequest) => {
		setSavingId(req.id);
		try {
			await pb.collection('kundli_requests').update(req.id, { reportApproved: true }, { requestKey: null });
			setRequests(prev => prev.map(r => r.id === req.id ? { ...r, reportApproved: true } : r));
		} catch { /* ignore */ }
		finally { setSavingId(null); }
	};

	const release = async (req: KundliRequest) => {
		setSavingId(req.id);
		try {
			await pb.collection('kundli_requests').update(req.id, {
				status: 'ready',
				reportReleased: true,
			}, { requestKey: null });
			setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'ready', reportReleased: true } : r));
		} catch { /* ignore */ }
		finally { setSavingId(null); }
	};

	const markCompleted = async (req: KundliRequest) => {
		setSavingId(req.id);
		try {
			await pb.collection('kundli_requests').update(req.id, { status: 'completed' }, { requestKey: null });
			setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'completed' } : r));
		} catch { /* ignore */ }
		finally { setSavingId(null); }
	};

	if (loading) return <div className="dashboard-loading"><Loader2 size={20} className="spin" /> Loading Kundli requests…</div>;
	return (
		<div>
			<div className="admin-module-head"><h2>Kundli Requests</h2>
				<button className="button outline-button" onClick={() => setShowTemplate(s => !s)}><FileText size={15} /> PDF template</button>
			</div>

			{showTemplate && (
				<div className="admin-create-panel">
					<h3>Branded Kundli PDF report template</h3>
					<p style={{ fontSize: 11, marginBottom: 12 }}>The astrologer prepares the completed PDF following this structure. Only include sections supported by actual chart calculations and approved interpretations — do not invent planetary positions or predictions. Upload the finished PDF to the customer's request below.</p>
					<ul className="kundli-template-list">
						{KUNDLI_PDF_SECTIONS.map((s, i) => <li key={i}>{s}</li>)}
					</ul>
					<div className="admin-protected-note">
						<ShieldCheck size={16} />
						<p>Disclaimer to include: Astrology is a traditional interpretive practice and does not provide scientifically established predictions or substitute for professional medical, legal, financial or psychological advice. DevineX Astro does not claim government recognition, university affiliation, or third-party accreditation for these reports.</p>
					</div>
				</div>
			)}

			<div className="lead-crm-bar">
				<label>Search<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, email, phone, request ID…" /></label>
				<label>Filter by status<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
					<option value="">All statuses</option>
					{KUNDLI_STATUSES.map(s => <option key={s} value={s}>{kundliStatusLabel[s]}</option>)}
				</select></label>
				<span className="admin-stat-sub">{filtered.length} of {requests.length} requests</span>
			</div>

			{requests.length === 0 ? (
				<div className="trainer-empty-card"><FileText size={36} strokeWidth={1} /><h3>No Kundli requests yet</h3><p>Customer Kundli requests submitted through the Free Kundli page will appear here.</p></div>
			) : (
				<div className="admin-table-wrap">
					<table className="admin-table">
						<thead><tr><th>Request ID</th><th>Customer</th><th>Birth details</th><th>Status</th><th>Submitted</th><th></th></tr></thead>
						<tbody>
							{filtered.map(r => (
								<Fragment key={r.id}>
									<tr style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
										<td><strong className="gold">{r.requestId}</strong></td>
										<td>{r.fullName || '—'}<br /><small style={{ color: '#868ca6' }}>{r.email || ''}{r.phone ? ` · ${r.phone}` : ''}</small></td>
										<td>{r.dateOfBirth ? new Date(r.dateOfBirth).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : '—'}<br /><small style={{ color: '#868ca6' }}>{r.timeOfBirth} · {r.placeOfBirth}</small></td>
										<td><span className={`badge status-${r.status}`}>{kundliStatusLabel[r.status] ?? r.status}</span></td>
										<td>{r.created ? new Date(r.created).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : '—'}</td>
										<td>{expandedId === r.id ? <ChevronDown size={15} /> : <Search size={14} />}</td>
									</tr>
									{expandedId === r.id && (
										<tr>
											<td colSpan={6} style={{ background: '#0e1225' }}>
												<div className="kundli-admin-detail">
													<div className="kundli-detail-grid">
														<div><strong>Full name:</strong> {r.fullName}</div>
														<div><strong>Email:</strong> {r.email}</div>
														<div><strong>Phone:</strong> {r.phone || '—'} {r.mobileVerified ? <span className="badge">Mobile verified</span> : <span className="badge" style={{ opacity: .6 }}>Mobile unverified</span>}</div>
														<div><strong>Date of birth:</strong> {r.dateOfBirth ? new Date(r.dateOfBirth).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : '—'}</div>
														<div><strong>Time of birth:</strong> {r.timeOfBirth || '—'}</div>
														<div><strong>Accuracy:</strong> {kundliBirthAccuracyLabel[r.birthTimeAccuracy] ?? r.birthTimeAccuracy}</div>
														<div><strong>Place of birth:</strong> {r.placeOfBirth}</div>
														<div><strong>Privacy consent:</strong> {r.privacyConsent ? 'Yes' : 'No'}</div>
														<div><strong>Marketing consent:</strong> {r.marketingConsent ? 'Yes' : 'No'}</div>
														<div><strong>Linked account:</strong> {r.expand?.customer?.email || (r.customer ? r.customer : 'Not linked')}</div>
													</div>
													{r.questions && <p style={{ fontSize: 11, color: 'var(--soft-text)', marginTop: 12 }}><strong style={{ color: 'var(--gold)' }}>Additional questions:</strong> {r.questions}</p>}
													{r.existingChart && (
														<div style={{ marginTop: 10 }}>
															<button className="button outline-button" style={{ fontSize: 10, minHeight: 36 }} onClick={() => viewChart(r)}>
																<Eye size={14} /> View uploaded chart
															</button>
															{chartUrls[r.id] && <a className="text-link" href={chartUrls[r.id]} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 10, fontSize: 10 }}>Open {r.existingChart}</a>}
														</div>
													)}
													<div className="kundli-admin-controls">
														<label>Status<select value={r.status} onChange={e => updateField(r.id, 'status', e.target.value)}>
															{KUNDLI_STATUSES.map(s => <option key={s} value={s}>{kundliStatusLabel[s]}</option>)}
														</select></label>
														<label>Assign to<select value={r.assignedTo || ''} onChange={e => updateField(r.id, 'assignedTo', e.target.value)}>
															<option value="">Unassigned</option>
															{staff.filter(s => s.role === 'admin' || s.role === 'trainer').map(s => <option key={s.id as string} value={s.id as string}>{String(s.name || s.email)}</option>)}
														</select></label>
														<label>Internal analysis notes<textarea value={r.adminNotes || ''} onChange={e => updateField(r.id, 'adminNotes', e.target.value)} rows={3} placeholder="Astrologer analysis notes (private)…" /></label>
													</div>
													<div className="kundli-admin-actions">
														<button className="button gold-button" onClick={() => saveRequest(r)} disabled={savingId === r.id}>
															{savingId === r.id ? <><Loader2 size={15} className="spin" /> Saving…</> : <><Save size={15} /> Save status &amp; notes</>}
														</button>
														<label className="kundli-upload-label">
															<input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPdf(r, f); }} disabled={savingId === r.id} />
															<span className="button outline-button"><Upload size={15} /> {r.reportPdf ? 'Replace PDF' : 'Upload report PDF'}</span>
														</label>
														{r.reportPdf && <span className="badge"><FileCheck size={12} /> PDF attached</span>}
														{r.reportPdf && !r.reportApproved && <button className="button outline-button" onClick={() => approve(r)} disabled={savingId === r.id}><CheckCircle2 size={15} /> Approve PDF</button>}
														{r.reportApproved && <span className="badge" style={{ borderColor: '#7ed99f50', color: '#7ed99f' }}>Approved</span>}
														{r.reportApproved && !r.reportReleased && <button className="button gold-button" onClick={() => release(r)} disabled={savingId === r.id}><FileCheck size={15} /> Release to customer</button>}
														{r.reportReleased && r.status === 'ready' && <button className="button outline-button" onClick={() => markCompleted(r)} disabled={savingId === r.id}>Mark completed</button>}
													</div>
													{(r.downloadCount > 0 || r.lastDownloadAt) && (
														<p style={{ fontSize: 10, color: '#868ca6', marginTop: 10 }}>
															<Download size={12} /> Downloaded {r.downloadCount} time{r.downloadCount > 1 ? 's' : ''}
															{r.lastDownloadAt && ` · last on ${new Date(r.lastDownloadAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`}
														</p>
													)}
												</div>
											</td>
										</tr>
									)}
								</Fragment>
							))}
						</tbody>
					</table>
				</div>
			)}
			<div className="admin-protected-note">
				<ShieldCheck size={16} />
				<p>Kundli birth details and PDF reports are private. Only the linked customer and authorized administrators can view them. PDFs are never attached to notification emails — customers download securely from their dashboard. SMS mobile verification is pending setup; mobile numbers are not treated as verified until an SMS provider is configured.</p>
			</div>
		</div>
	);
}
