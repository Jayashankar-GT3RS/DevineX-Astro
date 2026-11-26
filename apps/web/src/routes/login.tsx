import { useState } from 'react';
import { redirect, useNavigate, useSearchParams, Link } from 'react-router';
import { ArrowUpRight, Mail, KeyRound, ShieldCheck, Loader2, Sun, Smartphone, AlertCircle, Clock } from 'lucide-react';
import type { Route } from './+types/login';
import { seo } from '@/lib/seo';
import { celestialImage, business } from '@/data/site';
import pb from '@/lib/pocketbase-client';

export function clientLoader() {
	if (pb.authStore.isValid) throw redirect('/dashboard');
	return null;
}
clientLoader.hydrate = true as const;

export function HydrateFallback() {
	return null;
}

export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, {
		title: 'Student Login | DevineX Astro',
		description: 'Sign in to your DevineX Astro student learning portal. Secure email OTP login — no password required for new students.',
		image: celestialImage,
		noindex: true,
	});
}

const COUNTRY_CODES = [
	{ code: '+91', label: 'India (+91)' },
	{ code: '+1', label: 'USA/Canada (+1)' },
	{ code: '+44', label: 'UK (+44)' },
	{ code: '+971', label: 'UAE (+971)' },
	{ code: '+65', label: 'Singapore (+65)' },
];

export default function LoginPage() {
	const [params] = useSearchParams();
	const navigate = useNavigate();
	const redirectTo = params.get('redirect') || '/dashboard';

	const [mode, setMode] = useState<'sms' | 'email' | 'password'>('email');
	const [email, setEmail] = useState('');
	const [otpId, setOtpId] = useState('');
	const [code, setCode] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [otpSent, setOtpSent] = useState(false);
	const [resendIn, setResendIn] = useState(0);

	const startResendCooldown = () => {
		setResendIn(30);
		const timer = setInterval(() => {
			setResendIn(prev => {
				if (prev <= 1) { clearInterval(timer); return 0; }
				return prev - 1;
			});
		}, 1000);
	};

	const requestOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			const result = await pb.collection('users').requestOTP(email);
			setOtpId(result.otpId);
			setOtpSent(true);
			startResendCooldown();
		} catch {
			setError('Could not send a login code. Please check your email address and try again.');
		} finally {
			setLoading(false);
		}
	};

	const resendOtp = async () => {
		if (resendIn > 0) return;
		setError('');
		setLoading(true);
		try {
			const result = await pb.collection('users').requestOTP(email);
			setOtpId(result.otpId);
			startResendCooldown();
		} catch {
			setError('Could not resend the login code. Please try again shortly.');
		} finally {
			setLoading(false);
		}
	};

	const verifyOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			await pb.collection('users').authWithOTP(otpId, code.trim());
			navigate(redirectTo, { replace: true });
		} catch {
			setError('Invalid or expired code. Please request a new code and try again.');
		} finally {
			setLoading(false);
		}
	};

	const loginPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			await pb.collection('users').authWithPassword(email, password);
			navigate(redirectTo, { replace: true });
		} catch {
			setError('Invalid email or password. If you signed up via OTP, use the email code option.');
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
					<div className="eyebrow">STUDENT PORTAL</div>
					<h2>Welcome Back to DevineX Astro</h2>
					<p>Access your courses, learning materials, assignments and progress in one secure place.</p>

					<div className="auth-tabs">
						<button className={`auth-tab ${mode === 'sms' ? 'active' : ''}`} onClick={() => { setMode('sms'); setError(''); setOtpSent(false); }}>
							<Smartphone size={15} /> Mobile
						</button>
						<button className={`auth-tab ${mode === 'email' ? 'active' : ''}`} onClick={() => { setMode('email'); setError(''); setOtpSent(false); }}>
							<Mail size={15} /> Email code
						</button>
						<button className={`auth-tab ${mode === 'password' ? 'active' : ''}`} onClick={() => { setMode('password'); setError(''); }}>
							<KeyRound size={15} /> Password
						</button>
					</div>

					{mode === 'sms' && (
						<div className="sms-pending">
							<div className="sms-pending-banner">
								<AlertCircle size={20} />
								<div>
									<strong>SMS verification is not yet configured.</strong>
									<p>Mobile number login with one-time SMS code is the planned primary sign-in method. SMS delivery requires a configured SMS provider (e.g. Supabase Phone Auth or an Indian SMS gateway) and merchant approval, which is pending.</p>
								</div>
							</div>
							<div className="sms-form-preview" aria-hidden>
								<label>Country code
									<select defaultValue="+91" disabled>
										{COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
									</select>
								</label>
								<label>Mobile number
									<input type="tel" placeholder="98765 43210" disabled />
								</label>
								<button className="button gold-button submit-button" disabled>
									<Smartphone size={16} /> Send SMS code
								</button>
							</div>
							<div className="sms-setup-note">
								<ShieldCheck size={16} />
								<p>Until SMS authentication is operational, please sign in with your verified email. No phone number is treated as authenticated without a verified SMS code — DevineX Astro never generates or accepts unverified credentials.</p>
							</div>
							<button type="button" className="auth-back" onClick={() => { setMode('email'); setError(''); }}>
								<Mail size={14} /> Use email login instead
							</button>
						</div>
					)}

					{mode === 'email' && !otpSent && (
						<form onSubmit={requestOtp}>
							<label>Email address
								<input name="email" type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
							</label>
							{error && <p className="error" role="alert">{error}</p>}
							<button className="button gold-button submit-button" disabled={loading}>
								{loading ? <><Loader2 size={16} className="spin" /> Sending code…</> : <>Send login code <ArrowUpRight size={16} /></>}
							</button>
						</form>
					)}

					{mode === 'email' && otpSent && (
						<form onSubmit={verifyOtp}>
							<div className="auth-otp-sent">
								<ShieldCheck size={20} />
								<p>We sent a 6-digit code to <strong>{email}</strong>. Enter it below to sign in. New students are registered automatically. The code expires after 5 minutes.</p>
							</div>
							<label>Verification code
								<input name="code" placeholder="123456" required maxLength={8} value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" />
							</label>
							{error && <p className="error" role="alert">{error}</p>}
							<button className="button gold-button submit-button" disabled={loading}>
								{loading ? <><Loader2 size={16} className="spin" /> Verifying…</> : <>Sign in <ArrowUpRight size={16} /></>}
							</button>
							<div className="otp-resend">
								<Clock size={13} />
								{resendIn > 0
									? <span>Resend code in {resendIn}s</span>
									: <button type="button" onClick={resendOtp} disabled={loading}>Resend code</button>}
							</div>
							<button type="button" className="auth-back" onClick={() => { setOtpSent(false); setError(''); }}>Use a different email</button>
						</form>
					)}

					{mode === 'password' && (
						<form onSubmit={loginPassword}>
							<label>Email address
								<input name="email" type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
							</label>
							<label>Password
								<input name="password" type="password" placeholder="Your password" required value={password} onChange={e => setPassword(e.target.value)} />
							</label>
							{error && <p className="error" role="alert">{error}</p>}
							<button className="button gold-button submit-button" disabled={loading}>
								{loading ? <><Loader2 size={16} className="spin" /> Signing in…</> : <>Sign in <ArrowUpRight size={16} /></>}
							</button>
						</form>
					)}

					<p className="auth-note">
						Email OTP login creates a student account automatically — no separate registration is needed. OTP delivery depends on the platform mailer configuration. If you do not receive a code, contact <Link to="/contact">our team</Link> or call <a href={`tel:${business.phoneTel}`}>{business.phone}</a>. Are you a trainer? <Link to="/trainer/login">Sign in to the trainer portal</Link>.
					</p>
				</div>
			</section>
		</main>
	);
}
