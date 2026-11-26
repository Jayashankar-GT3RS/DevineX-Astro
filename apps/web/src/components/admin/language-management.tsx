import { Fragment, useCallback, useEffect, useState } from 'react';
import {
	Loader2, ShieldCheck, Settings, Save, CheckCircle2, Globe,
	AlertCircle, Languages, FileText, Search,
} from 'lucide-react';
import pb from '@/lib/pocketbase-client';
import { LANGUAGES, VERIFIED_LOCALES, getLanguage } from '@/lib/i18n';

interface SiteLanguagesRecord {
	id: string;
	defaultLanguage: string;
	enabledLanguages: string[] | string;
}

interface ContentTranslation {
	id: string;
	contentType: string;
	recordId: string;
	field: string;
	locale: string;
	sourceText: string;
	translatedText: string;
	status: string;
	method: string;
	created: string;
	updated: string;
}

const TRANSLATION_STATUSES = ['pending', 'generated', 'approved', 'rejected'];

/**
 * Super Admin Language Management module.
 *
 * Manages the site_languages config record (default + enabled languages),
 * and lets administrators review AI-generated / manual content translations
 * before they are published. Only reviewed, approved translations are ever
 * shown to visitors — pending or missing translations fall back to English,
 * never to a fake or machine-unreviewed string.
 */
export function LanguageManagement() {
	const [config, setConfig] = useState<SiteLanguagesRecord | null>(null);
	const [translations, setTranslations] = useState<ContentTranslation[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState('');
	const [statusFilter, setStatusFilter] = useState('');
	const [localeFilter, setLocaleFilter] = useState('');
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [editedText, setEditedText] = useState<Record<string, string>>({});

	const load = useCallback(async () => {
		try {
			const [cfg, trans] = await Promise.all([
				pb.collection('site_languages').getFullList<SiteLanguagesRecord>({ requestKey: 'lm-config' }),
				pb.collection('content_translations').getFullList<ContentTranslation>({ sort: '-created', requestKey: 'lm-trans' }),
			]);
			setConfig(cfg[0] ?? null);
			setTranslations(trans as unknown as ContentTranslation[]);
		} catch {
			setError('Could not load language configuration.');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { load(); }, [load]);

	const enabledList = (): string[] => {
		if (!config) return VERIFIED_LOCALES;
		const raw = config.enabledLanguages;
		if (Array.isArray(raw)) return raw;
		try { return JSON.parse(raw || '[]') as string[]; } catch { return []; }
	};

	const toggleLanguage = (code: string) => {
		if (!config) return;
		const current = enabledList();
		const next = current.includes(code) ? current.filter(c => c !== code) : [...current, code];
		setConfig({ ...config, enabledLanguages: next });
	};

	const setDefault = (code: string) => {
		if (!config) return;
		setConfig({ ...config, defaultLanguage: code });
	};

	const saveConfig = async () => {
		if (!config) return;
		setSaving(true);
		setError('');
		try {
			await pb.collection('site_languages').update(config.id, {
				defaultLanguage: config.defaultLanguage || 'en',
				enabledLanguages: JSON.stringify(enabledList()),
			}, { requestKey: null });
			setSaved(true);
			setTimeout(() => setSaved(false), 2500);
		} catch {
			setError('Could not save language configuration.');
		} finally {
			setSaving(false);
		}
	};

	const updateTranslationStatus = async (id: string, status: string) => {
		try {
			await pb.collection('content_translations').update(id, { status, reviewedBy: pb.authStore.record?.id ?? '' }, { requestKey: null });
			setTranslations(prev => prev.map(t => t.id === id ? { ...t, status } : t));
		} catch {
			setError('Could not update translation status.');
		}
	};

	const saveEditedText = async (t: ContentTranslation) => {
		const text = editedText[t.id] ?? t.translatedText;
		try {
			await pb.collection('content_translations').update(t.id, { translatedText: text, method: 'manual', status: 'approved', reviewedBy: pb.authStore.record?.id ?? '' }, { requestKey: null });
			setTranslations(prev => prev.map(x => x.id === t.id ? { ...x, translatedText: text, method: 'manual', status: 'approved' } : x));
			setExpandedId(null);
		} catch {
			setError('Could not save the edited translation.');
		}
	};

	if (loading) return <div className="dashboard-loading"><Loader2 size={24} className="spin" /> Loading language settings…</div>;

	const enabled = enabledList();
	const filtered = translations.filter(t => {
		const matchesStatus = !statusFilter || t.status === statusFilter;
		const matchesLocale = !localeFilter || t.locale === localeFilter;
		return matchesStatus && matchesLocale;
	});

	// Count missing translations: for each enabled non-English locale, how many
	// content_translations are pending/missing. This is an honest gap report.
	const pendingByLocale = VERIFIED_LOCALES.filter(l => l !== 'en').map(locale => ({
		locale,
		pending: translations.filter(t => t.locale === locale && t.status !== 'approved').length,
		total: translations.filter(t => t.locale === locale).length,
	}));

	return (
		<div>
			<div className="admin-module-head"><h2>Language Management</h2></div>
			{error && <div className="admin-error" role="alert">{error}</div>}

			{/* Site language configuration */}
			<div className="admin-create-panel">
				<h3><Settings size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Site Language Configuration</h3>
				{config ? (
					<div className="admin-course-fields">
						<label>Default website language
							<select value={config.defaultLanguage || 'en'} onChange={e => setDefault(e.target.value)}>
								{LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.native} ({l.name})</option>)}
							</select>
						</label>
						<label className="admin-toggle-label">Enabled languages
							<small>Languages visitors can select. Disabled languages are hidden from the selector. English cannot be disabled.</small>
						</label>
					</div>
				) : <p>Configuration record not found. A default record is seeded by migration.</p>}
				{config && (
					<div className="lang-mgmt-grid">
						{LANGUAGES.map(l => {
							const isEnabled = l.code === 'en' || enabled.includes(l.code);
							const isVerified = VERIFIED_LOCALES.includes(l.code);
							return (
								<div key={l.code} className={`lang-mgmt-item ${isEnabled ? 'enabled' : ''}`}>
									<div className="lang-mgmt-item-head">
										<strong>{l.native}</strong>
										<span className="badge">{l.code}</span>
									</div>
									<div className="lang-mgmt-item-meta">
										{isVerified
											? <span className="lang-mgmt-verified"><CheckCircle2 size={11} /> Reviewed UI</span>
											: <span className="lang-mgmt-pending"><AlertCircle size={11} /> Translations pending</span>}
									</div>
									{l.code !== 'en' && (
										<label className="admin-switch" title={isEnabled ? 'Disable' : 'Enable'}>
											<input type="checkbox" checked={isEnabled} onChange={() => toggleLanguage(l.code)} />
											<span className="admin-switch-track" />
										</label>
									)}
								</div>
							);
						})}
					</div>
				)}
				<div className="admin-course-actions">
					<button className="button gold-button" onClick={saveConfig} disabled={saving}>
						{saving ? <><Loader2 size={15} className="spin" /> Saving…</> : <><Save size={15} /> Save configuration</>}
					</button>
					{saved && <span className="admin-saved"><CheckCircle2 size={16} /> Saved</span>}
				</div>
				<div className="admin-protected-note">
					<ShieldCheck size={16} />
					<p>Languages marked "Translations pending" are selectable but their UI dictionary has not been reviewed. Visitors selecting a pending language see English content with an honest notice — no fake or machine-unreviewed translations are displayed as final. Enable a language only when its reviewed dictionary is ready.</p>
				</div>
			</div>

			{/* Translation gap report */}
			<h3 style={{ fontSize: 15, margin: '30px 0 14px' }}><Languages size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Translation Coverage</h3>
			<div className="admin-stats-grid">
				{pendingByLocale.map(item => {
					const info = getLanguage(item.locale);
					return (
						<div className="admin-stat-card" key={item.locale}>
							<span className="small-label">{info?.native ?? item.locale}</span>
							<div className="admin-stat-value">{item.total}</div>
							<div className="admin-stat-sub">{item.pending} pending review</div>
						</div>
					);
				})}
			</div>

			{/* Content translations review */}
			<h3 style={{ fontSize: 15, margin: '30px 0 14px' }}><FileText size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Content Translations</h3>
			<div className="lead-crm-bar">
				<label>Filter by language<select value={localeFilter} onChange={e => setLocaleFilter(e.target.value)}>
					<option value="">All languages</option>
					{VERIFIED_LOCALES.map(c => <option key={c} value={c}>{getLanguage(c)?.native}</option>)}
				</select></label>
				<label>Filter by status<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
					<option value="">All statuses</option>
					{TRANSLATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
				</select></label>
				<span className="admin-stat-sub">{filtered.length} of {translations.length} translations</span>
			</div>
			{filtered.length === 0 ? (
				<div className="trainer-empty-card"><Globe size={36} strokeWidth={1} /><h3>No translations yet</h3><p>AI-generated or manually entered translations for dynamic content (course descriptions, blog articles, trainer profiles) will appear here for review. Only approved translations are shown to visitors.</p></div>
			) : (
				<div className="admin-table-wrap">
					<table className="admin-table">
						<thead><tr><th>Content</th><th>Language</th><th>Field</th><th>Status</th><th>Method</th><th></th></tr></thead>
						<tbody>
							{filtered.map(t => (
								<Fragment key={t.id}>
									<tr style={{ cursor: 'pointer' }} onClick={() => { setExpandedId(expandedId === t.id ? null : t.id); setEditedText(prev => ({ ...prev, [t.id]: t.translatedText })); }}>
										<td>{t.contentType} <small style={{ color: '#868ca6' }}>· {t.recordId}</small></td>
										<td>{getLanguage(t.locale)?.native ?? t.locale}</td>
										<td>{t.field}</td>
										<td><span className="badge">{t.status}</span></td>
										<td>{t.method}</td>
										<td>{expandedId === t.id ? <Search size={14} /> : <Search size={14} />}</td>
									</tr>
									{expandedId === t.id && (
										<tr>
											<td colSpan={6} style={{ background: '#0e1225' }}>
												<div className="lang-trans-detail">
													<div><strong>Source (English):</strong></div>
													<p className="lang-trans-source">{t.sourceText || '—'}</p>
													<div><strong>Translation ({getLanguage(t.locale)?.native}):</strong></div>
													<textarea value={editedText[t.id] ?? t.translatedText} onChange={e => setEditedText(prev => ({ ...prev, [t.id]: e.target.value }))} rows={4} />
													<div className="lang-trans-actions">
														<button className="button gold-button" onClick={() => saveEditedText(t)}><Save size={14} /> Save &amp; approve</button>
														{t.status !== 'approved' && <button className="button outline-button" onClick={() => updateTranslationStatus(t.id, 'approved')}><CheckCircle2 size={14} /> Approve</button>}
														{t.status !== 'rejected' && <button className="button outline-button" onClick={() => updateTranslationStatus(t.id, 'rejected')}>Reject</button>}
													</div>
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
				<p>Only approved translations are displayed to visitors. Pending, generated or rejected translations are never shown. When a translation is missing for a locale, the site falls back to English — it never invents or displays an unreviewed translation. Preserve traditional Vedic terminology (Kundli, Nakshatra, Rashi, Lagna, Dasha, Graha, Gochar, Panchang) across all languages.</p>
			</div>
		</div>
	);
}
