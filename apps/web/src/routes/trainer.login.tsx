import { useState } from 'react';
import { redirect, useNavigate, Link } from 'react-router';
import { ArrowUpRight, KeyRound, Loader2, Sun, ShieldCheck, AlertCircle, GraduationCap } from 'lucide-react';
import type { Route } from './+types/trainer.login';
import { seo } from '@/lib/seo';
import { celestialImage, business } from '@/data/site';
import pb from '@/lib/pocketbase-client';

export function clientLoader() {
	// Already-signed-in trainers/admins skip the login page.
	if (pb.authStore.isValid) {
		const role = (pb.authStore.record as Record<string, unknown> | null)?.role;
		if (role === 'trainer' || role === 'admin') throw redirect('/trainer');
	}
	return null;
}
clientLoader.hydrate = true as const;

export function HydrateFallback() {
	return null;
}

export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, {
		title: 'Trainer Login | DevineX Astro',
		description: 'Secure login for DevineX Astro trainers. Access your assigned courses, batches, students and teaching tools.',
		image: celestialImage,
		noindex: true,
	});
}

export default function TrainerLoginPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [remember, setRemember] = useState(true);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [resetSent, setResetSent] = useState(false);

	const signIn = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			await pb.collection('users').authWithPassword(email.trim(), password);
			const role = (pb.authStore.record as Record<string, unknown> | null)?.role;
			if (role !== 'trainer' && role !== 'admin') {
				// A student account signed in here — sign them out and explain.
				pb.authStore.clear();
				setError('This login is for trainers and administrators only. Students should use the student login page.');
				return;
			}
			navigate('/trainer', { replace: true });
		} catch {
			setError('Invalid email or password. If you are a student, please use the student login. Trainer accounts are created by the Super Admin.');
		} finally {
			setLoading(false);
		}
	};

	const resetPassword = async () => {
		if (!email.trim()) {
			setError('Enter your registered email address first, then click "Forgot password".');
			return;
		}
		setError('');
		setLoading(true);
		try {
			await pb.collection('users').requestPasswordReset(email.trim());
			setResetSent(true);
		} catch {
			setError('Could not send a password reset email. Please check the email address and try again, or contact the administrator.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="auth-page">
			<section className="auth-panel-wrap">
				<div className="auth-brand">
					<Sun size={36} strokeWidth={1.1} />
					<span>Devine<span className="gold">X</span> <span className="brand-astro">ASTRO</span></span>
				</div>
				<div className="form-panel auth-panel">
					<div className="eyebrow">TRAINER PORTAL</div>
					<h2>Trainer Login</h2>
					<p>Access your assigned courses, batches, students and teaching tools. Trainer accounts are created and activated by the Super Admin — self-registration is not available.</p>

					{resetSent ? (
						<div className="auth-otp-sent">
							<ShieldCheck size={20} />
							<p>If an account exists for <strong>{email}</strong>, a password reset link has been sent. Check your inbox and follow the link to set a new password.</p>
						</div>
					) : (
						<form onSubmit={signIn}>
							<label>Email address
								<input name="email" type="email" placeholder="trainer@devinexastro.com" required value={email} onChange={e => setEmail(e.target.value)} />
							</label>
							<label>Password
								<input name="password" type="password" placeholder="Your password" required value={password} onChange={e => setPassword(e.target.value)} />
							</label>
							<div className="trainer-login-options">
								<label className="consent-label">
									<input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
									<span>Remember me on this device</span>
								</label>
								<button type="button" className="trainer-forgot" onClick={resetPassword} disabled={loading}>Forgot password?</button>
							</div>
							{error && <p className="error" role="alert">{error}</p>}
							<button className="button gold-button submit-button" disabled={loading}>
								{loading ? <><Loader2 size={16} className="spin" /> Signing in…</> : <><KeyRound size={16} /> Sign in to trainer portal <ArrowUpRight size={16} /></>}
							</button>
						</form>
					)}

					<div className="admin-protected-note" style={{ marginTop: 18 }}>
						<ShieldCheck size={16} />
						<p>Trainer access is role-scoped. You can only view and manage courses, batches and students assigned to you. Company revenue, customer payments, other trainers' private information, Super Admin settings and unassigned Kundli requests are not accessible.</p>
					</div>

					<Link to="/login" className="auth-back"><GraduationCap size={14} /> Student login</Link>
					<p className="auth-note">
						Need a trainer account? Contact the Super Admin at <a href={`mailto:${business.email}`}>{business.email}</a> or call <a href={`tel:${business.phoneTel}`}>{business.phone}</a>. Mobile number login requires additional identity configuration; use your registered email for now.
					</p>
				</div>
			</section>
		</main>
	);
}
