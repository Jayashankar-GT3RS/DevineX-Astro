import { Fragment, useCallback, useEffect, useState } from 'react';
import {
	Loader2, ShieldCheck, Settings, RefreshCw, Play, CheckCircle2, XCircle,
	FileText, Sparkles, AlertCircle, Activity, Save, Cpu,
} from 'lucide-react';
import pb from '@/lib/pocketbase-client';
import type { KundliSettings, KundliCalculationRecord, KundliReportRecord, GenerationJobRecord } from '@/lib/kundli/types';
import { kundliEngineStatusLabel, reportStatusLabel, jobStatusLabel } from '@/lib/kundli/types';
import type { KundliRequest as Req } from '@/lib/types';

const ADMIN_API = '/api/kundli/admin';

async function adminCall(body: Record<string, unknown>): Promise<Record<string, unknown>> {
	const res = await fetch(ADMIN_API, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${pb.authStore.token}`,
		},
		body: JSON.stringify(body),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { message?: string }).message || `Request failed (${res.status})`);
	return data as Record<string, unknown>;
}

export function KundliEnginePanel() {
	const [settings, setSettings] = useState<KundliSettings | null>(null);
	const [jobs, setJobs] = useState<GenerationJobRecord[]>([]);
	const [requests, setRequests] = useState<Req[]>([]);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState('');
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [calcs, setCalcs] = useState<Record<string, KundliCalculationRecord>>({});
	const [reports, setReports] = useState<Record<string, KundliReportRecord>>({});

	const load = useCallback(async () => {
		try {
			const [s, j, r] = await Promise.all([
				// `requestKey: null` — StrictMode's double mount would otherwise cancel the
				// first load and show a false "Could not load engine data" error.
				pb.collection('kundli_settings').getFullList<KundliSettings>({ requestKey: null }),
				pb.collection('generation_jobs').getFullList<GenerationJobRecord>({ sort: '-created', requestKey: null }),
				pb.collection('kundli_requests').getFullList<Req>({ sort: '-created', expand: 'customer', requestKey: null }),
			]);
			setSettings(s[0] ?? null);
			setJobs(j as unknown as GenerationJobRecord[]);
			setRequests(r as unknown as Req[]);
		} catch {
			setError('Could not load engine data.');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { load(); }, [load]);

	const loadDetail = async (reqId: string) => {
		try {
			const [c, rep] = await Promise.all([
				pb.collection('kundli_calculations').getFullList<KundliCalculationRecord>({ filter: pb.filter('request = {:id}', { id: reqId }), requestKey: `ke-calc-${reqId}` }),
				pb.collection('kundli_reports').getFullList<KundliReportRecord>({ filter: pb.filter('request = {:id}', { id: reqId }), sort: '-created', requestKey: `ke-rep-${reqId}` }),
			]);
			if (c[0]) setCalcs(prev => ({ ...prev, [reqId]: c[0] as unknown as KundliCalculationRecord }));
			if (rep[0]) setReports(prev => ({ ...prev, [reqId]: rep[0] as unknown as KundliReportRecord }));
		} catch { /* ignore */ }
	};

	const toggle = (key: keyof KundliSettings) => {
		if (!settings) return;
		setSettings({ ...settings, [key]: !settings[key] });
	};

	const saveSettings = async () => {
		if (!settings) return;
		setBusy('settings');
		setError('');
		try {
			await adminCall({ action: 'updateSettings', settings });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not save settings.');
		} finally { setBusy(null); }
	};

	const runAction = async (action: string, reqId: string) => {
		setBusy(`${action}-${reqId}`);
		setError('');
		try {
			await adminCall({ action, requestId: reqId });
			await load();
			await loadDetail(reqId);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Action failed.');
		} finally { setBusy(null); }
	};

	if (loading) return <div className="dashboard-loading"><Loader2 size={24} className="spin" /> Loading engine…</div>;

	const totalCost = jobs.reduce((sum, j) => sum + (j.estimatedApiCost || 0), 0);
	const completed = jobs.filter(j => j.processingStatus === 'completed').length;
	const failed = jobs.filter(j => j.processingStatus === 'failed').length;

	return (
		<div>
			<div className="admin-module-head"><h2>AI Kundli Engine</h2></div>
			{error && <div className="admin-error" role="alert">{error}</div>}

			{/* Settings */}
			<div className="admin-create-panel">
				<h3><Settings size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Engine Configuration</h3>
				{settings ? (
					<div className="admin-course-fields">
						<label className="admin-toggle-label">Automatic Generation
							<label className="admin-switch"><input type="checkbox" checked={settings.autoGenerationEnabled} onChange={() => toggle('autoGenerationEnabled')} /><span className="admin-switch-track" /></label>
							<small>{settings.autoGenerationEnabled ? 'New requests auto-generate' : 'Manual trigger only (recommended initially)'}</small>
						</label>
						<label className="admin-toggle-label">Automatic PDF Release
							<label className="admin-switch"><input type="checkbox" checked={settings.autoReleaseEnabled} onChange={() => toggle('autoReleaseEnabled')} /><span className="admin-switch-track" /></label>
							<small>{settings.autoReleaseEnabled ? 'Reports released to customer automatically' : 'Reports await admin review'}</small>
						</label>
						<label className="admin-toggle-label">Manual Review Required
							<label className="admin-switch"><input type="checkbox" checked={settings.manualReviewRequired} onChange={() => toggle('manualReviewRequired')} /><span className="admin-switch-track" /></label>
							<small>Admin approves before release</small>
						</label>
						<label>Default Ayanamsa<select value={settings.ayanamsa} onChange={e => setSettings({ ...settings, ayanamsa: e.target.value })}>
							<option value="lahiri">Lahiri (Chitrapaksha)</option>
						</select></label>
						<label>Default Chart Style<select value={settings.chartStyle} onChange={e => setSettings({ ...settings, chartStyle: e.target.value })}>
							<option value="north">North Indian</option>
							<option value="south">South Indian</option>
						</select></label>
						<label>House System<select value={settings.houseSystem} onChange={e => setSettings({ ...settings, houseSystem: e.target.value })}>
							<option value="whole_sign">Whole Sign</option>
						</select></label>
						<label>Report Language<select value={settings.reportLanguage} onChange={e => setSettings({ ...settings, reportLanguage: e.target.value })}>
							<option value="en">English</option>
						</select></label>
						<label>AI Model<input value={settings.aiModel} onChange={e => setSettings({ ...settings, aiModel: e.target.value })} /></label>
						<label>Calculation Provider<input value={settings.calculationProvider} onChange={e => setSettings({ ...settings, calculationProvider: e.target.value })} /></label>
						<label>PDF Template<input value={settings.pdfTemplate} onChange={e => setSettings({ ...settings, pdfTemplate: e.target.value })} /></label>
					</div>
				) : <p>Settings record not found.</p>}
				<div className="admin-course-actions">
					<button className="button gold-button" onClick={saveSettings} disabled={busy === 'settings'}>
						{busy === 'settings' ? <><Loader2 size={15} className="spin" /> Saving…</> : <><Save size={15} /> Save settings</>}
					</button>
				</div>
				<div className="admin-protected-note">
					<ShieldCheck size={16} />
					<p>Automatic generation and release start DISABLED. Enable automatic generation only after validating chart accuracy against trusted reference outputs. API credentials are stored as server-side secrets and never exposed in this interface.</p>
				</div>
			</div>

			{/* Monitoring stats */}
			<div className="admin-stats-grid">
				<div className="admin-stat-card"><span className="small-label">TOTAL JOBS</span><div className="admin-stat-value">{jobs.length}</div><div className="admin-stat-sub">Generation runs</div></div>
				<div className="admin-stat-card"><span className="small-label">COMPLETED</span><div className="admin-stat-value">{completed}</div><div className="admin-stat-sub">Successful generations</div></div>
				<div className="admin-stat-card"><span className="small-label">FAILED</span><div className="admin-stat-value">{failed}</div><div className="admin-stat-sub">Need attention / retry</div></div>
				<div className="admin-stat-card"><span className="small-label">EST. COST</span><div className="admin-stat-value">₹{totalCost.toFixed(2)}</div><div className="admin-stat-sub">Cumulative API cost</div></div>
			</div>

			{settings?.lastErrorLog && (
				<div className="admin-error"><AlertCircle size={14} style={{ display: 'inline', marginRight: 6 }} /> Last error: {settings.lastErrorLog.slice(-500)}</div>
			)}

			{/* Requests with generation actions */}
			<h3 style={{ fontSize: 15, margin: '30px 0 14px' }}><Cpu size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Kundli Requests &amp; Generation</h3>
			{requests.length === 0 ? (
				<div className="trainer-empty-card"><FileText size={36} strokeWidth={1} /><h3>No Kundli requests</h3><p>Customer requests will appear here with generation controls.</p></div>
			) : (
				<div className="admin-table-wrap">
					<table className="admin-table">
						<thead><tr><th>Request</th><th>Customer</th><th>Status</th><th>Actions</th><th></th></tr></thead>
						<tbody>
							{requests.map(r => {
								const calc = calcs[r.id];
								const rep = reports[r.id];
								const job = jobs.find(j => j.request === r.id);
								return (
									<Fragment key={r.id}>
										<tr key={r.id}>
											<td><strong className="gold">{r.requestId}</strong></td>
											<td>{r.fullName}<br /><small style={{ color: '#868ca6' }}>{r.email}</small></td>
											<td><span className={`badge status-${r.status}`}>{kundliEngineStatusLabel[r.status] ?? r.status}</span></td>
											<td>
												<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
													<button className="button gold-button" style={{ fontSize: 9, minHeight: 32, padding: '6px 10px' }} onClick={() => runAction('generate', r.id)} disabled={busy === `generate-${r.id}`} title="Generate / regenerate full report">
														{busy === `generate-${r.id}` ? <Loader2 size={13} className="spin" /> : <Play size={13} />} Generate
													</button>
													<button className="button outline-button" style={{ fontSize: 9, minHeight: 32, padding: '6px 10px' }} onClick={() => runAction('regenerate', r.id)} disabled={busy === `regenerate-${r.id}`} title="Regenerate AI interpretation only">
														{busy === `regenerate-${r.id}` ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />} AI
													</button>
													<button className="button outline-button" style={{ fontSize: 9, minHeight: 32, padding: '6px 10px' }} onClick={() => runAction('retry', r.id)} disabled={busy === `retry-${r.id}`} title="Retry failed generation">
														{busy === `retry-${r.id}` ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />} Retry
													</button>
													{r.reportPdf && !r.reportReleased && <button className="button outline-button" style={{ fontSize: 9, minHeight: 32, padding: '6px 10px' }} onClick={() => runAction('release', r.id)} disabled={busy === `release-${r.id}`}><CheckCircle2 size={13} /> Release</button>}
													{r.reportPdf && <button className="button outline-button" style={{ fontSize: 9, minHeight: 32, padding: '6px 10px' }} onClick={() => runAction('reject', r.id)} disabled={busy === `reject-${r.id}`}><XCircle size={13} /> Reject</button>}
												</div>
											</td>
											<td><button className="auth-back" onClick={() => { setExpandedId(expandedId === r.id ? null : r.id); if (expandedId !== r.id) loadDetail(r.id); }}>{expandedId === r.id ? 'Hide' : 'View'}</button></td>
										</tr>
										{expandedId === r.id && (
											<tr key={r.id + '-detail'}>
												<td colSpan={5} style={{ background: '#0e1225' }}>
													{job && (
														<p style={{ fontSize: 11, color: 'var(--soft-text)', marginBottom: 12 }}>
															<Activity size={12} style={{ display: 'inline', marginRight: 6, color: 'var(--gold)' }} />
															Job: {jobStatusLabel[job.processingStatus] ?? job.processingStatus} · Attempts: {job.attempts}
															{job.errorMessage && <span style={{ color: '#ff9ca7' }}> · Error: {job.errorMessage}</span>}
														</p>
													)}
													{calc ? (
														<div className="kundli-detail-grid">
															<div><strong>Engine:</strong> {calc.engineName} {calc.engineVersion}</div>
															<div><strong>Ayanamsa:</strong> {calc.ayanamsa} ({calc.ayanamsaValue}°)</div>
															<div><strong>Birthplace:</strong> {calc.birthplaceName}</div>
															<div><strong>Coordinates:</strong> {calc.latitude}, {calc.longitude}</div>
															<div><strong>Timezone:</strong> {calc.timezone}</div>
															<div><strong>Validation:</strong> {calc.validationStatus}</div>
															<div><strong>Ascendant:</strong> {calc.calculationData?.ascendant?.sign}</div>
															<div><strong>Moon Sign:</strong> {calc.calculationData?.moonSign}</div>
															<div><strong>Janma Nakshatra:</strong> {calc.calculationData?.janmaNakshatra} (P{calc.calculationData?.nakshatraPada})</div>
														</div>
													) : <p style={{ fontSize: 11, color: '#868ca6' }}>No calculation data yet. Run generation to compute the chart.</p>}

													{calc?.calculationData && (
														<div style={{ marginTop: 14 }}>
															<strong style={{ color: 'var(--gold)', fontSize: 11 }}>Planetary Positions:</strong>
															<table className="admin-table" style={{ marginTop: 8, fontSize: 10 }}>
																<thead><tr><th>Planet</th><th>Sign</th><th>Degree</th><th>House</th><th>Nakshatra</th><th>Pada</th><th>Retro</th><th>Dignity</th></tr></thead>
																<tbody>
																	{calc.calculationData.planets.map(p => (
																		<tr key={p.name}><td>{p.name}</td><td>{p.sign}</td><td>{p.degreeInSign.toFixed(2)}°</td><td>{p.house}</td><td>{p.nakshatra}</td><td>{p.pada}</td><td>{p.retrograde ? 'R' : ''}</td><td>{p.dignity}</td></tr>
																	))}
																</tbody>
															</table>
															{calc.calculationData.yogas.length > 0 && <p style={{ fontSize: 10, color: 'var(--gold)', marginTop: 8 }}>Yogas: {calc.calculationData.yogas.map(y => y.name).join(', ')}</p>}
															{calc.calculationData.doshas.length > 0 && <p style={{ fontSize: 10, color: '#ff9ca7', marginTop: 4 }}>Doshas: {calc.calculationData.doshas.map(d => d.name).join(', ')}</p>}
															{calc.limitations && <p style={{ fontSize: 10, color: '#ff9ca7', marginTop: 4 }}>Limitations: {calc.limitations}</p>}
														</div>
													)}

													{rep && (
														<div style={{ marginTop: 14 }}>
															<strong style={{ color: 'var(--gold)', fontSize: 11 }}>AI Interpretation ({reportStatusLabel[rep.reportStatus] ?? rep.reportStatus}):</strong>
															<div style={{ maxHeight: 300, overflowY: 'auto', marginTop: 8, padding: 12, border: '1px solid var(--line)', borderRadius: 8, background: '#0e1225' }}>
																{rep.interpretationData?.sections?.map((s, i) => (
																	<div key={i} style={{ marginBottom: 14 }}>
																		<h4 style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 4 }}>{s.title}</h4>
																		<p style={{ fontSize: 10, color: 'var(--soft-text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.body}</p>
																	</div>
																))}
															</div>
														</div>
													)}
													{r.reportPdf && (
														<p style={{ fontSize: 10, color: 'var(--gold)', marginTop: 12 }}>
															<FileText size={12} style={{ display: 'inline', marginRight: 4 }} /> PDF attached: {r.reportPdf}
															{r.reportApproved && ' · Approved'}{r.reportReleased && ' · Released'}
														</p>
													)}
												</td>
											</tr>
										)}
									</Fragment>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			{/* Recent jobs */}
			<h3 style={{ fontSize: 15, margin: '30px 0 14px' }}><Activity size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Generation History</h3>
			{jobs.length === 0 ? (
				<div className="trainer-empty-card"><Activity size={36} strokeWidth={1} /><h3>No generation jobs yet</h3><p>Run generation on a request to see processing history here.</p></div>
			) : (
				<div className="admin-table-wrap">
					<table className="admin-table">
						<thead><tr><th>Request</th><th>Status</th><th>Attempts</th><th>Started</th><th>Completed</th><th>Error</th></tr></thead>
						<tbody>
							{jobs.slice(0, 20).map(j => (
								<tr key={j.id}>
									<td>{j.request}</td>
									<td><span className="badge">{jobStatusLabel[j.processingStatus] ?? j.processingStatus}</span></td>
									<td>{j.attempts}</td>
									<td>{j.startedAt ? new Date(j.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</td>
									<td>{j.completedAt ? new Date(j.completedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</td>
									<td style={{ maxWidth: 300, color: j.errorMessage ? '#ff9ca7' : undefined }}>{j.errorMessage ? j.errorMessage.slice(0, 120) : '—'}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
