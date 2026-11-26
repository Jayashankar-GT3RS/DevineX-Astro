import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, CheckCircle2, LogIn, Loader2 } from 'lucide-react';
import pb from '@/lib/pocketbase-client';
import { useAuth } from '@/hooks/use-auth';
import type { Course } from '@/lib/types';

export function EnrollAction({ course }: { course: Course }) {
	const { user, isAuthed, isLoading } = useAuth();
	const [existing, setExisting] = useState<string | null>(null);
	const [checking, setChecking] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [enrolled, setEnrolled] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!isAuthed || !user) return;
		setChecking(true);
		pb.collection('enrollments')
			.getFullList({
				filter: pb.filter('student = {:student} && course = {:course}', { student: user.id, course: course.id }),
				requestKey: `enroll-check-${course.id}`,
			})
			.then(records => setExisting(records.length > 0 ? records[0].id : null))
			.catch(() => {})
			.finally(() => setChecking(false));
	}, [isAuthed, user, course.id]);

	const handleEnroll = async () => {
		if (!user) return;
		setSubmitting(true);
		setError('');
		try {
			await pb.collection('enrollments').create({
				student: user.id,
				course: course.id,
				status: 'pending',
			}, { requestKey: null });
			setEnrolled(true);
			setExisting('new');
		} catch {
			setError('We could not submit your enrollment enquiry. Please try again or contact us.');
		} finally {
			setSubmitting(false);
		}
	};

	if (isLoading || checking) {
		return <div className="enroll-action"><Loader2 size={20} className="spin" /> Checking enrollment status…</div>;
	}

	if (enrolled || existing) {
		return (
			<div className="enroll-action enrolled">
				<CheckCircle2 size={22} />
				<div>
					<strong>Your enquiry is registered.</strong>
					<span>This programme will appear in your student dashboard. Enrollment is enquiry-only until payment processing is activated.</span>
				</div>
				<Link className="button outline-button" to="/dashboard">Go to dashboard <ArrowUpRight size={15} /></Link>
			</div>
		);
	}

	if (!isAuthed) {
		return (
			<div className="enroll-action">
				<Link className="button gold-button enroll-cta" to={`/login?redirect=/courses/${course.slug}`}>
					<LogIn size={16} /> Login to enquire
				</Link>
				<p className="enroll-note">Enrollment is enquiry-only. No payment is required or processed until secure payment activation is configured and tested.</p>
			</div>
		);
	}

	return (
		<div className="enroll-action">
			<button className="button gold-button enroll-cta" onClick={handleEnroll} disabled={submitting}>
				{submitting ? 'Submitting enquiry…' : 'Enquire to Enroll'}
				{!submitting && <ArrowUpRight size={16} />}
			</button>
			<p className="enroll-note">Submits a pending enrollment enquiry. Payment is not yet activated.</p>
			{error && <p className="error" role="alert">{error}</p>}
		</div>
	);
}
