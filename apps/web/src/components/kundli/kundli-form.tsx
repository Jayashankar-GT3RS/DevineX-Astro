import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowUpRight, CheckCircle2, ShieldCheck, Upload, Loader2, FileText } from 'lucide-react';
import { useFormSubmission } from '@/hooks/use-form-submission';
import { pocketbaseClient } from '@/lib/pocketbase-client';
import type { KundliRequest } from '@/lib/types';
import { VERIFIED_LOCALES, getLanguage } from '@/lib/i18n';

// `max` on the date input stops a future birth date before it reaches the API.
const TODAY = new Date().toISOString().slice(0, 10);

const ACCURACY_OPTIONS = [
	{ value: 'exact', label: 'Exact' },
	{ value: 'approximate', label: 'Approximate' },
	{ value: 'unknown', label: 'Unknown — please assist' },
];

export function KundliForm() {
	const navigate = useNavigate();
	const [fileName, setFileName] = useState('');
	const [createdRecord, setCreatedRecord] = useState<KundliRequest | null>(null);

	const form = useFormSubmission({
		submit: async (_values, formData) => {
			const file = formData.get('existingChart') as File | null;
			const data: Record<string, unknown> = {
				fullName: String(formData.get('fullName') || ''),
				email: String(formData.get('email') || ''),
				phone: String(formData.get('phone') || ''),
				dateOfBirth: String(formData.get('dateOfBirth') || ''),
				timeOfBirth: String(formData.get('timeOfBirth') || ''),
				placeOfBirth: String(formData.get('placeOfBirth') || ''),
				birthState: String(formData.get('birthState') || ''),
			birthCountry: String(formData.get('birthCountry') || ''),
			birthTimeAccuracy: String(formData.get('birthTimeAccuracy') || 'exact'),
				questions: String(formData.get('questions') || ''),
				privacyConsent: formData.get('privacyConsent') === 'on',
				marketingConsent: formData.get('marketingConsent') === 'on',
				reportLanguage: String(formData.get('reportLanguage') || 'en'),
				aiConsent: formData.get('aiConsent') === 'on',
			};
			if (file && file.size > 0) {
				data.existingChart = file;
			}
			const record = await pocketbaseClient.collection('kundli_requests').create<KundliRequest>(data, { requestKey: null });
			setCreatedRecord(record);
			return record;
		},
		resetOnSuccess: false,
	});

	const reset = () => {
		setCreatedRecord(null);
		setFileName('');
		form.reset();
	};

	if (form.isSuccess && createdRecord) {
		return (
			<div className="form-success" role="status">
				<CheckCircle2 size={42} />
				<h3>Your Kundli request has been received.</h3>
				<p>
					Your request ID is <strong className="gold">{createdRecord.requestId}</strong>. A confirmation email has been sent to your address.
					To view your report status and download your Kundli when ready, please sign in or create your account.
				</p>
				<button
					type="button"
					className="button gold-button"
					onClick={() => navigate('/login?redirect=/my-kundli')}
				>
					Register or Login <ArrowUpRight size={16} />
				</button>
				<button type="button" className="button outline-button" onClick={reset} style={{ marginTop: 10 }}>
					Submit another request
				</button>
			</div>
		);
	}

	return (
		<form onSubmit={form.onSubmit}>
			<input {...form.honeypotProps} />
			<label>Full name <small>*</small>
				<input name="fullName" placeholder="Your full name" required minLength={2} maxLength={200} />
				{form.fieldErrors.fullName && <small className="error">{form.fieldErrors.fullName}</small>}
			</label>
			<div className="form-row">
				<label>Email address <small>*</small>
					<input name="email" type="email" placeholder="you@example.com" required />
					{form.fieldErrors.email && <small className="error">{form.fieldErrors.email}</small>}
				</label>
				<label>Mobile number <small>(+91 India)</small>
					<input name="phone" type="tel" placeholder="+91 98765 43210" maxLength={20} />
					{form.fieldErrors.phone && <small className="error">{form.fieldErrors.phone}</small>}
				</label>
			</div>
			<div className="form-row">
				<label>Date of birth <small>*</small>
					<input name="dateOfBirth" type="date" min="1800-01-01" max={TODAY} required />
					{form.fieldErrors.dateOfBirth && <small className="error">{form.fieldErrors.dateOfBirth}</small>}
				</label>
				<label>Time of birth <small>*</small>
					<input name="timeOfBirth" type="time" required />
					{form.fieldErrors.timeOfBirth && <small className="error">{form.fieldErrors.timeOfBirth}</small>}
				</label>
			</div>
			<label>Place of birth <small>*</small> — city, state, country
				<input name="placeOfBirth" placeholder="e.g. Bengaluru, Karnataka, India" required minLength={2} maxLength={500} />
				{form.fieldErrors.placeOfBirth && <small className="error">{form.fieldErrors.placeOfBirth}</small>}
			</label>
			<div className="form-row">
				<label>State / Province <small>(helps locate the birthplace)</small>
					<input name="birthState" placeholder="e.g. Karnataka" maxLength={200} />
				</label>
				<label>Country <small>(helps locate the birthplace)</small>
					<input name="birthCountry" placeholder="e.g. India" maxLength={200} />
				</label>
			</div>
			<label>Birth time accuracy
				<select name="birthTimeAccuracy" defaultValue="exact">
					{ACCURACY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
				</select>
				<small>If you do not know your birth time, select "Unknown" — our team will contact you for assistance rather than preparing a chart from an incorrect time.</small>
			</label>
			<label>Preferred report language <small>*</small>
				<select name="reportLanguage" defaultValue="en" required>
					{VERIFIED_LOCALES.map(code => <option key={code} value={code}>{getLanguage(code)?.native} ({getLanguage(code)?.name})</option>)}
				</select>
				<small>Your Kundli report narrative will be prepared in this language. Planetary positions and chart calculations remain unchanged.</small>
			</label>
			<label>Upload existing Kundli chart <small>(optional — PDF, JPG or PNG, max 10 MB)</small>
				<div className="kundli-file-upload">
					<input
						name="existingChart"
						type="file"
						accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
						onChange={e => setFileName(e.target.files?.[0]?.name ?? '')}
					/>
					<span className="kundli-file-label">
						{fileName ? <><FileText size={15} /> {fileName}</> : <><Upload size={15} /> Choose file…</>}
					</span>
				</div>
			</label>
			<label>Additional questions <small>(optional)</small>
				<textarea name="questions" rows={3} maxLength={5000} placeholder="Any specific areas you would like the report to address…" />
			</label>
			<label className="consent-label">
				<input type="checkbox" name="privacyConsent" value="on" required />
				<span>I acknowledge that my birth details (name, date, time and place of birth) will be used by DevineX Astro solely to prepare the requested Kundli report, and I have read the <Link to="/privacy">privacy notice</Link>. This consent is required to process my request.</span>
			</label>
			{form.fieldErrors.privacyConsent && <small className="error">{form.fieldErrors.privacyConsent}</small>}
			<label className="consent-label">
				<input type="checkbox" name="marketingConsent" value="on" />
				<span>I would also like to receive occasional updates about DevineX Astro courses, services and offers. This is optional and I can withdraw consent at any time.</span>
			</label>
			<label className="consent-label">
				<input type="checkbox" name="aiConsent" value="on" />
				<span>I consent to my birth-chart calculation data being processed by a third-party AI service to generate the traditional Vedic interpretation for my report. Only the calculated chart data is shared — not my uploaded documents. This is optional; if you decline, your report will be prepared manually by our astrology team.</span>
			</label>
			{form.isError && (
				<p className="error" role="alert">
					{form.errorStatus === 429
						? 'Too many requests. Please wait a few minutes and try again.'
						: 'We could not save your request. Please check your details and connection, then try again.'}
				</p>
			)}
			<button className="button gold-button submit-button" disabled={form.isSubmitting}>
				{form.isSubmitting ? <><Loader2 size={16} className="spin" /> Generating your request…</> : <>Generate My Kundli <ArrowUpRight size={16} /></>}
			</button>
			<div className="kundli-form-note">
				<ShieldCheck size={14} />
				<span>Your birth details are stored securely and never shared publicly. SMS mobile verification is pending setup — your request is linked to your account through verified email login.</span>
			</div>
		</form>
	);
}
