import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
	ArrowUpRight, CalendarDays, Download, FileText, Loader2, MapPin, RefreshCw,
	Sparkles, Star, Compass,
} from 'lucide-react';
import type { ChartStyle, KundliCalculationData } from '@/lib/kundli/types';
import { KundliChart } from './kundli-chart';

const RASHI = [
	'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
	'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const NAKSHATRAS = [
	'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
	'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
	'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
	'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
	'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

const TODAY = new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
	fullName: '',
	gender: '',
	dateOfBirth: '',
	timeOfBirth: '',
	birthTimeAccuracy: 'exact',
	placeOfBirth: '',
	birthState: '',
	birthCountry: '',
	chartStyle: 'north',
	knownRashi: '',
	knownNakshatra: '',
	latitude: '',
	longitude: '',
	timezone: '',
};

// A birth detail set that always resolves, so the page can be tested in one click.
const SAMPLE_FORM = {
	...EMPTY_FORM,
	fullName: 'Test Chart',
	gender: 'Prefer not to say',
	dateOfBirth: '1990-01-15',
	timeOfBirth: '10:30',
	placeOfBirth: 'Bengaluru',
	birthState: 'Karnataka',
	birthCountry: 'India',
};

type FormValues = typeof EMPTY_FORM;

interface ChartResponse {
	chart: KundliCalculationData;
	verification: string[];
}

export function FreeKundliCalculator() {
	const [values, setValues] = useState<FormValues>(EMPTY_FORM);
	const [result, setResult] = useState<ChartResponse | null>(null);
	const [lastPayload, setLastPayload] = useState<Record<string, string> | null>(null);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [pdfLoading, setPdfLoading] = useState(false);
	const [pdfError, setPdfError] = useState('');
	const [style, setStyle] = useState<ChartStyle>('north');
	const resultRef = useRef<HTMLDivElement>(null);

	const update = (field: keyof FormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		setValues(prev => ({ ...prev, [field]: event.target.value }));
	};

	useEffect(() => {
		if (result && resultRef.current) {
			resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}, [result]);

	async function calculate(payload: Record<string, string>) {
		setLoading(true);
		setError('');
		setPdfError('');
		try {
			const res = await fetch('/api/kundli/chart', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(typeof data?.error === 'string' ? data.error : 'Could not calculate this chart.');
			}
			const response = data as ChartResponse;
			setResult(response);
			setStyle(response.chart.chartStyle === 'south' ? 'south' : 'north');
			setLastPayload(payload);
		} catch (err) {
			setResult(null);
			setError(err instanceof Error ? err.message : 'Could not calculate this chart.');
		} finally {
			setLoading(false);
		}
	}

	const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void calculate({ ...values });
	};

	async function downloadPdf() {
		if (!lastPayload) return;
		setPdfLoading(true);
		setPdfError('');
		try {
			const res = await fetch('/api/kundli/chart-pdf', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(lastPayload),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(typeof data?.error === 'string' ? data.error : 'Could not create the PDF.');
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = 'DevineXAstro_Kundli_Chart.pdf';
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
		} catch (err) {
			setPdfError(err instanceof Error ? err.message : 'Could not create the PDF.');
		} finally {
			setPdfLoading(false);
		}
	}

	const chart = result?.chart;

	return (
		<>
			<div className="form-panel fk-form-panel">
				<div className="fk-form-head">
					<div>
						<h3>Enter your birth details</h3>
						<p>Only date, time and place are required. Everything else helps refine or cross-check the chart.</p>
					</div>
					<button
						type="button"
						className="button outline-button fk-sample"
						onClick={() => setValues(SAMPLE_FORM)}
					>
						<Sparkles size={14} /> Use sample details
					</button>
				</div>

				<form onSubmit={onSubmit} className="fk-form">
					<div className="form-row">
						<label>Full name <small>(optional)</small>
							<input name="fullName" value={values.fullName} onChange={update('fullName')} placeholder="Your full name" maxLength={200} />
						</label>
						<label>Gender <small>(optional)</small>
							<select name="gender" value={values.gender} onChange={update('gender')}>
								<option value="">Prefer not to say</option>
								<option value="Female">Female</option>
								<option value="Male">Male</option>
								<option value="Other">Other</option>
							</select>
						</label>
					</div>

					<div className="form-row">
						<label>Date of birth <small>*</small>
							<input name="dateOfBirth" type="date" min="1800-01-01" max={TODAY} required value={values.dateOfBirth} onChange={update('dateOfBirth')} />
						</label>
						<label>Time of birth <small>* — 24-hour</small>
							<input name="timeOfBirth" type="time" required value={values.timeOfBirth} onChange={update('timeOfBirth')} />
						</label>
					</div>

					<div className="form-row">
						<label>Birth time accuracy
							<select name="birthTimeAccuracy" value={values.birthTimeAccuracy} onChange={update('birthTimeAccuracy')}>
								<option value="exact">Exact — from a birth certificate or record</option>
								<option value="approximate">Approximate — remembered or rounded</option>
							</select>
						</label>
						<label>Chart style
							<select name="chartStyle" value={values.chartStyle} onChange={update('chartStyle')}>
								<option value="north">North Indian (diamond)</option>
								<option value="south">South Indian (square)</option>
							</select>
						</label>
					</div>

					<label>Place of birth <small>* — city or town</small>
						<input name="placeOfBirth" value={values.placeOfBirth} onChange={update('placeOfBirth')} placeholder="e.g. Bengaluru" required minLength={2} maxLength={500} />
					</label>
					<div className="form-row">
						<label>State / Province <small>(optional)</small>
							<input name="birthState" value={values.birthState} onChange={update('birthState')} placeholder="e.g. Karnataka" maxLength={200} />
						</label>
						<label>Country <small>(optional)</small>
							<input name="birthCountry" value={values.birthCountry} onChange={update('birthCountry')} placeholder="e.g. India" maxLength={200} />
						</label>
					</div>

					<div className="form-row">
						<label>Zodiac sign you know <small>(optional — Moon sign)</small>
							<select name="knownRashi" value={values.knownRashi} onChange={update('knownRashi')}>
								<option value="">Not sure</option>
								{RASHI.map(sign => <option key={sign} value={sign}>{sign}</option>)}
							</select>
						</label>
						<label>Birth star you know <small>(optional — Nakshatra)</small>
							<select name="knownNakshatra" value={values.knownNakshatra} onChange={update('knownNakshatra')}>
								<option value="">Not sure</option>
								{NAKSHATRAS.map(nak => <option key={nak} value={nak}>{nak}</option>)}
							</select>
						</label>
					</div>

					<details className="fk-advanced">
						<summary>Advanced: exact coordinates and timezone</summary>
						<p>Use these when the city name is ambiguous or you have coordinates from a map. Latitude and longitude must be entered together; the timezone overrides the one detected from the place name.</p>
						<div className="form-row">
							<label>Latitude
								<input name="latitude" type="number" step="any" min={-90} max={90} value={values.latitude} onChange={update('latitude')} placeholder="e.g. 12.9716" />
							</label>
							<label>Longitude
								<input name="longitude" type="number" step="any" min={-180} max={180} value={values.longitude} onChange={update('longitude')} placeholder="e.g. 77.5946" />
							</label>
						</div>
						<label>Timezone <small>(IANA name)</small>
							<input name="timezone" value={values.timezone} onChange={update('timezone')} placeholder="e.g. Asia/Kolkata" list="fk-timezones" maxLength={100} />
							<datalist id="fk-timezones">
								<option value="Asia/Kolkata" />
								<option value="Asia/Dubai" />
								<option value="Asia/Singapore" />
								<option value="Europe/London" />
								<option value="America/New_York" />
								<option value="America/Los_Angeles" />
								<option value="Australia/Sydney" />
							</datalist>
						</label>
					</details>

					{error && <p className="error fk-error" role="alert">{error}</p>}

					<button className="button gold-button submit-button" disabled={loading}>
						{loading ? <><Loader2 size={16} className="spin" /> Calculating your chart…</> : <>Show My Kundli Chart <ArrowUpRight size={16} /></>}
					</button>
					<p className="fk-privacy">Calculated live from real planetary positions — no sign-up, no payment. We do not store this free chart.</p>
				</form>
			</div>

			{loading && (
				<div className="fk-loading" role="status">
					<Loader2 size={22} className="spin" />
					<span>Resolving the birthplace, historical timezone and planetary longitudes…</span>
				</div>
			)}

			{chart && (
				<div className="fk-result" ref={resultRef}>
					<div className="fk-result-head">
						<div>
							<div className="eyebrow" style={{ marginBottom: 8 }}>YOUR JANAM KUNDLI</div>
							<h3>{values.fullName || 'Your'} birth chart</h3>
							<p className="fk-result-meta">
								<CalendarDays size={13} /> {values.dateOfBirth} · {values.timeOfBirth}
								<MapPin size={13} /> {chart.birthplaceName}
								<span className="fk-meta-note">{chart.timezone} · Lahiri ayanamsa {chart.ayanamsaValue}° · whole-sign houses</span>
							</p>
						</div>
						<div className="fk-result-actions">
							<button type="button" className="button gold-button" onClick={downloadPdf} disabled={pdfLoading}>
								{pdfLoading ? <><Loader2 size={14} className="spin" /> Preparing…</> : <><Download size={14} /> Download PDF</>}
							</button>
							<button type="button" className="button outline-button" onClick={() => setResult(null)}>
								<RefreshCw size={14} /> New chart
							</button>
						</div>
					</div>

					{pdfError && <p className="error fk-error" role="alert">{pdfError}</p>}

					<div className="fk-summary">
						<div><span><Compass size={13} /> Ascendant (Lagna)</span><strong>{chart.ascendant.sign}</strong><small>{chart.ascendant.nakshatra} · Pada {chart.ascendant.pada}</small></div>
						<div><span><Star size={13} /> Moon sign (Rashi)</span><strong>{chart.moonSign}</strong><small>Chandra Rashi</small></div>
						<div><span>Sun sign</span><strong>{chart.sunSign}</strong><small>Surya Rashi</small></div>
						<div><span>Janma Nakshatra</span><strong>{chart.janmaNakshatra}</strong><small>Pada {chart.nakshatraPada}</small></div>
					</div>

					{result.verification.length > 0 && (
						<ul className="fk-verify">
							{result.verification.map(line => <li key={line}>{line}</li>)}
						</ul>
					)}

					{chart.panchang && (
						<div className="fk-panchang">
							<div className="fk-panchang-title">Panchang at birth</div>
							<div className="fk-panchang-grid">
								<div><span>Tithi</span><strong>{chart.panchang.tithi}</strong></div>
								<div><span>Yoga</span><strong>{chart.panchang.yoga}</strong></div>
								<div><span>Karana</span><strong>{chart.panchang.karana}</strong></div>
								<div><span>Weekday</span><strong>{chart.panchang.weekday}</strong></div>
							</div>
						</div>
					)}

					<div className="fk-chart-block">
						<div className="fk-chart-head">
							<h4>Birth chart</h4>
							<div className="fk-style-toggle" role="group" aria-label="Chart style">
								<button type="button" className={style === 'north' ? 'active' : ''} onClick={() => setStyle('north')}>North Indian</button>
								<button type="button" className={style === 'south' ? 'active' : ''} onClick={() => setStyle('south')}>South Indian</button>
							</div>
						</div>
						<KundliChart chart={chart} style={style} />
					</div>

					<div className="fk-block">
						<h4>Planetary positions</h4>
						<div className="fk-table-wrap">
							<table className="fk-table">
								<thead>
									<tr>
										<th>Planet</th><th>Sign</th><th>Degree</th><th>House</th><th>Nakshatra</th><th>Pada</th><th>Dignity</th><th>Navamsa</th><th>Retro</th>
									</tr>
								</thead>
								<tbody>
									{chart.planets.map(p => (
										<tr key={p.name}>
											<td className="gold">{p.name}</td>
											<td>{p.sign}</td>
											<td>{p.degreeInSign.toFixed(2)}°</td>
											<td>{p.house}</td>
											<td>{p.nakshatra}</td>
											<td>{p.pada}</td>
											<td>{p.dignity}</td>
											<td>{p.navamsaSign}</td>
											<td>{p.retrograde ? 'Yes' : '—'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					<div className="fk-two-col">
						<div className="fk-block">
							<h4>Vimshottari dasha</h4>
							<ul className="fk-list">
								{chart.dashas.map(d => (
									<li key={d.lord + d.start}>
										<strong>{d.lord}</strong>
										<span>{d.start.slice(0, 10)} → {d.end.slice(0, 10)}</span>
									</li>
								))}
							</ul>
						</div>
						<div className="fk-block">
							<h4>Yogas &amp; doshas</h4>
							{chart.yogas.length === 0 && chart.doshas.length === 0 ? (
								<p className="fk-muted">No classical yoga or dosha from this engine's limited set was detected.</p>
							) : (
								<ul className="fk-findings">
									{[...chart.yogas, ...chart.doshas].map(f => (
										<li key={f.name}><strong>{f.name}</strong><span>{f.description}</span></li>
									))}
								</ul>
							)}
							{chart.limitations.length > 0 && (
								<ul className="fk-limits">
									{chart.limitations.map(line => <li key={line}>{line}</li>)}
								</ul>
							)}
						</div>
					</div>

					<div className="fk-result-footer">
						<div>
							<h4>Want the written interpretation?</h4>
							<p>The chart above is the raw calculation. The full free report adds a 14-section Vedic interpretation, PDF delivery and your account dashboard.</p>
						</div>
						<Link to="/kundli" className="button gold-button">Request the full report <FileText size={15} /></Link>
					</div>
				</div>
			)}
		</>
	);
}
