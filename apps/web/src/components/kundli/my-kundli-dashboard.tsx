import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Loader2, Download, FileText, Clock, MapPin, Calendar, ShieldCheck, CheckCircle2, AlertCircle, ArrowUpRight, Sparkles } from 'lucide-react';
import pb from '@/lib/pocketbase-client';
import type { KundliRequest } from '@/lib/types';
import { kundliStatusLabel, kundliBirthAccuracyLabel } from '@/lib/types';
import { reportStatusLabel } from '@/lib/kundli/types';
import { formatDate } from '@/lib/intl-format';

const STATUS_FLOW = ['submitted', 'validating', 'calculating', 'interpreting', 'creating_pdf', 'awaiting_review', 'ready', 'completed'];

function statusPercent(status: string): number {
	const idx = STATUS_FLOW.indexOf(status);
	if (idx < 0) return 0;
	return Math.round(((idx + 1) / STATUS_FLOW.length) * 100);
}

interface ReportSection {
	title: string;
	body: string;
}

interface KundliReportView {
	available: boolean;
	requestId?: string;
	status?: string;
	aiModel?: string;
	reportStatus?: string;
	generatedAt?: string;
	sections: ReportSection[];
	chart?: {
		ascendant: string;
		ascendantNakshatra: string;
		moonSign: string;
		sunSign: string;
		janmaNakshatra: string;
		nakshatraPada: number;
		ayanamsa: string;
		planets: {
			name: string;
			sign: string;
			degreeInSign: number;
			house: number;
			nakshatra: string;
			pada: number;
			retrograde: boolean;
			dignity: string;
		}[];
	} | null;
	limitations?: string[];
}

export function MyKundliDashboard({ user }: { user: { id: string; email: string; name?: string } }) {
	const [requests, setRequests] = useState<KundliRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [downloadingId, setDownloadingId] = useState<string | null>(null);
	const [downloadError, setDownloadError] = useState('');
	const [openReportId, setOpenReportId] = useState<string | null>(null);
	const [reportData, setReportData] = useState<Record<string, KundliReportView>>({});
	const [reportLoadingId, setReportLoadingId] = useState<string | null>(null);
	const [reportError, setReportError] = useState('');

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				// Link any requests submitted with this email before registration.
				await fetch('/api/kundli/link', {
					method: 'POST',
					headers: { Authorization: `Bearer ${pb.authStore.token}` },
				}).catch(() => {});

				const records = await pb.collection('kundli_requests').getFullList<KundliRequest>({
					filter: pb.filter('customer = {:id}', { id: user.id }),
					sort: '-created',
					// StrictMode's double mount must not abort the first load.
					requestKey: null,
				});
				if (!cancelled) setRequests(records as unknown as KundliRequest[]);
			} catch {
				if (!cancelled) setError('Could not load your Kundli requests. Please try again.');
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => { cancelled = true; };
	}, [user.id]);

	const download = async (req: KundliRequest) => {
		setDownloadError('');
		setDownloadingId(req.id);
		try {
			const res = await fetch(`/api/kundli/download/${req.id}`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${pb.authStore.token}` },
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || 'Download failed');
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `DevineX-Astro-Kundli-${req.requestId}.pdf`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
			// Refresh to update download count
			setRequests(prev => prev.map(r => r.id === req.id ? { ...r, downloadCount: (r.downloadCount || 0) + 1, lastDownloadAt: new Date().toISOString() } : r));
		} catch (err) {
			setDownloadError(err instanceof Error ? err.message : 'Could not download your report.');
		} finally {
			setDownloadingId(null);
		}
	};

	/** Loads (once per card) the AI interpretation for the signed-in owner. */
	const toggleReport = async (req: KundliRequest) => {
		if (openReportId === req.id) {
			setOpenReportId(null);
			return;
		}

		setOpenReportId(req.id);
		setReportError('');

		if (reportData[req.id]) {
			return;
		}

		setReportLoadingId(req.id);
		try {
			const res = await fetch(`/api/kundli/report/${req.id}`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${pb.authStore.token}` },
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error((data as { error?: string }).error || 'Could not load your interpretation.');
			}
			setReportData(prev => ({ ...prev, [req.id]: data as KundliReportView }));
		} catch (err) {
			setReportError(err instanceof Error ? err.message : 'Could not load your interpretation.');
		} finally {
			setReportLoadingId(null);
		}
	};

	if (loading) {
		return <div className="dashboard-loading"><Loader2 size={24} className="spin" /> Loading your Kundli requests…</div>;
	}

	if (error) {
		return <div className="dashboard-empty"><AlertCircle size={44} strokeWidth={1} /><h3>Something went wrong</h3><p className="error">{error}</p></div>;
	}

	if (requests.length === 0) {
		return (
			<div className="dashboard-empty">
				<FileText size={44} strokeWidth={1} />
				<h3>No Kundli requests yet</h3>
				<p>You have not submitted any Kundli requests. Generate your free Vedic Kundli to get started.</p>
				<Link to="/kundli" className="button gold-button">Generate My Free Kundli <ArrowUpRight size={16} /></Link>
			</div>
		);
	}

	return (
		<div className="kundli-dashboard-list">
			{downloadError && <div className="admin-error" role="alert">{downloadError}</div>}
			{requests.map(req => {
				const pct = statusPercent(req.status);
				const isReady = req.status === 'ready' && req.reportReleased;
				const inProgress = !isReady && req.status !== 'completed';
				return (
					<article className="kundli-request-card" key={req.id}>
						<div className="kundli-card-head">
							<div>
								<span className="small-label">REQUEST ID</span>
								<h3>{req.requestId}</h3>
							</div>
							<span className={`badge kundli-status-badge status-${req.status}`}>{kundliStatusLabel[req.status] ?? req.status}</span>
						</div>

						<div className="kundli-progress-wrap">
							<div className="learn-progress-track">
								<div className="learn-progress-fill" style={{ width: `${pct}%` }} />
							</div>
							<span className="learn-progress-text">{pct}%</span>
						</div>

						<div className="kundli-card-details">
							<div><Calendar size={14} /> <span>Date of birth:</span> <strong>{req.dateOfBirth ? formatDate(req.dateOfBirth, { locale: 'en-IN' }) : '—'}</strong></div>
							<div><Clock size={14} /> <span>Time of birth:</span> <strong>{req.timeOfBirth || '—'}</strong></div>
							<div><MapPin size={14} /> <span>Place of birth:</span> <strong>{req.placeOfBirth || '—'}</strong></div>
							<div><FileText size={14} /> <span>Accuracy:</span> <strong>{kundliBirthAccuracyLabel[req.birthTimeAccuracy] ?? req.birthTimeAccuracy}</strong></div>
							<div><Calendar size={14} /> <span>Submitted:</span> <strong>{req.created ? formatDate(req.created, { locale: 'en-IN' }) : '—'}</strong></div>
						</div>

						{inProgress && (
							<div className="kundli-status-msg preparing">
								<Clock size={18} />
								<p>Your Kundli is being prepared by our astrology team. You will be notified when your report is ready.</p>
							</div>
						)}

						{isReady && (
							<div className="kundli-status-msg ready">
								<CheckCircle2 size={18} />
								<p>Your personalized Kundli report is ready!</p>
							</div>
						)}

						{req.status === 'completed' && (
							<div className="kundli-status-msg completed">
								<CheckCircle2 size={18} />
								<p>Your Kundli has been delivered. You can download it again below.</p>
							</div>
						)}

						{isReady || req.status === 'completed' ? (
							<div className="kundli-download-row">
								<button
									className="button gold-button"
									onClick={() => download(req)}
									disabled={downloadingId === req.id}
								>
									{downloadingId === req.id
										? <><Loader2 size={16} className="spin" /> Preparing download…</>
										: <><Download size={16} /> Download My Kundli PDF</>}
								</button>
								{req.downloadCount > 0 && (
									<span className="kundli-download-count">Downloaded {req.downloadCount} time{req.downloadCount > 1 ? 's' : ''}</span>
								)}
							</div>
						) : (
							<div className="kundli-download-row">
								<button className="button outline-button" disabled>
									<Download size={16} /> Download available when ready
								</button>
							</div>
						)}

						<div className="kundli-download-row">
							<button
								className="button outline-button"
								onClick={() => toggleReport(req)}
								disabled={reportLoadingId === req.id}
							>
								{reportLoadingId === req.id
									? <><Loader2 size={16} className="spin" /> Loading interpretation…</>
									: <><Sparkles size={16} /> {openReportId === req.id ? 'Hide AI Interpretation' : 'View AI Interpretation'}</>}
							</button>
						</div>

						{openReportId === req.id && (() => {
							const view = reportData[req.id];
							return (
								<div className="kundli-report-panel">
									<div className="kundli-report-head">
										<h4>AI Kundli Interpretation</h4>
										{view?.available && (
											<span className="kundli-report-meta">
												Powered by Groq · <span>{view.aiModel || 'AI'}</span>
												{view.reportStatus ? ` · ${reportStatusLabel[view.reportStatus] ?? view.reportStatus}` : ''}
											</span>
										)}
									</div>

									{reportLoadingId === req.id && (
										<div className="kundli-report-loading"><Loader2 size={16} className="spin" /> Loading your interpretation…</div>
									)}

									{reportError && (
										<div className="kundli-report-error" role="alert"><AlertCircle size={15} /> {reportError}</div>
									)}

									{view && !view.available && (
										<div className="kundli-report-loading">
											<Clock size={16} /> Your interpretation is not ready yet. Current status: {kundliStatusLabel[view.status || req.status] ?? (view.status || req.status)}.
										</div>
									)}

									{view?.available && (
										<>
											{view.chart && (
												<div className="kundli-report-chart">
													<div>Ascendant (Lagna)<strong>{view.chart.ascendant} · {view.chart.ascendantNakshatra}</strong></div>
													<div>Moon Sign<strong>{view.chart.moonSign}</strong></div>
													<div>Sun Sign<strong>{view.chart.sunSign}</strong></div>
													<div>Janma Nakshatra<strong>{view.chart.janmaNakshatra} (Pada {view.chart.nakshatraPada})</strong></div>
												</div>
											)}

											<div className="kundli-report-sections">
												{view.sections.map((section, i) => (
													<div className="kundli-report-section" key={`${section.title}-${i}`}>
														<h5>{section.title}</h5>
														<p>{section.body}</p>
													</div>
												))}
											</div>

											{view.limitations && view.limitations.length > 0 && (
												<p className="kundli-report-note">Limitations: {view.limitations.join(' ')}</p>
											)}

											<p className="kundli-report-note">
												The chart positions above are calculated astronomically (Lahiri ayanamsa, whole-sign houses).
												The narrative is a traditional Vedic interpretation generated from those calculated positions for cultural and personal-interest purposes only.
											</p>
										</>
									)}
								</div>
							);
						})()}
					</article>
				);
			})}

			<div className="admin-notice">
				<ShieldCheck size={18} />
				<p>Your Kundli report can only be downloaded by your verified account. Birth details and reports are stored privately and are never publicly accessible. SMS mobile verification is pending setup — your account is secured through verified email login.</p>
			</div>
		</div>
	);
}
